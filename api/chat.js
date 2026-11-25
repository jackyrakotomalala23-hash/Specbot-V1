import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "specbot-default-secret-change-me";
const MAX_HISTORY_TURNS = 8;

const SYSTEM_INSTRUCTION = `Tu es Specbot, l'assistant expert avant-vente ManoMano conçu pour les conseillers ADM Value.
Ton rôle : fournir des réponses ultra-claires, structurées en Markdown, immédiatement exploitables par un conseiller en chat client.

Règles de réponse :
- Réponds toujours dans la langue demandée (FR, EN, ES, IT, DE).
- Utilise des titres courts, des listes à puces concises et mets en valeur les points clés en gras.
- Inclus systématiquement un bloc citation (> ...) contenant le message prêt à copier-coller pour le client, chaleureux, rassurant et professionnel.
- Mets en avant lorsque pertinent les atouts ManoMano (livraison rapide ManoExpress, paiement en 3x/4x avec Alma, application mobile ManoMano, garanties et retours simplifiés).
- Reste factuel sur les caractéristiques techniques : si une donnée précise manque (dimensions exactes, compatibilité), indique les points à vérifier sur la fiche produit sans inventer de spécifications.`;

const SKILL_PROMPTS = {
  full_presales:
    "Mode Parcours complet : qualifie rapidement le besoin, donne la recommandation claire, propose un cross-sell pertinent (accessoire/consommable) et rédige un script client prêt à envoyer.",
  qualification:
    "Mode Qualification & Cross-sell : liste 2 à 3 questions de qualification ciblées à poser au client, puis suggère les produits complémentaires indispensables.",
  objections:
    "Mode Objections & Arguments : désamorce l'objection (prix, délai, marque, compatibilité) avec empathie, apporte des arguments de réassurance concrets et fournis un script client convaincant.",
  specs:
    "Mode Specs techniques : présente un tableau Markdown clair des caractéristiques techniques clés, prérequis d'installation et points de vigilance avant achat."
};

function verifySessionCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)specbot_session=([^;]+)/);
  if (!match) return null;

  const token = decodeURIComponent(match[1]);
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getApiKeysPool() {
  const multi = (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (multi.length > 0) return multi;

  const single = (process.env.GEMINI_API_KEY || "").trim();
  return single ? [single] : [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry({ apiKeys, models, contents, systemInstruction }) {
  let lastStatus = 500;
  let lastErrorText = "Erreur inconnue de l'API Gemini.";

  for (let mIndex = 0; mIndex < models.length; mIndex++) {
    const model = models[mIndex];

    for (let attempt = 0; attempt < 3; attempt++) {
      const keyIndex = (attempt + mIndex + Math.floor(Math.random() * apiKeys.length)) % apiKeys.length;
      const apiKey = apiKeys[keyIndex];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 1400
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("")
            .trim() || "";
        return { ok: true, reply };
      }

      lastStatus = response.status;
      try {
        const errJson = await response.json();
        lastErrorText = errJson?.error?.message || lastErrorText;
      } catch {
        lastErrorText = await response.text().catch(() => lastErrorText);
      }

      if (response.status === 429 || response.status === 503) {
        if (attempt < 2) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        break;
      }

      return { ok: false, status: response.status, error: lastErrorText };
    }
  }

  return { ok: false, status: lastStatus, error: lastErrorText };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const user = verifySessionCookie(req);
  if (!user) {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }

  const apiKeys = getApiKeysPool();
  if (apiKeys.length === 0) {
    return res.status(500).json({ error: "Clé API Gemini manquante sur le serveur (GEMINI_API_KEY)." });
  }

  const { message, history = [], skill = "full_presales", language = "FR" } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message vide." });
  }

  const skillGuide = SKILL_PROMPTS[skill] || SKILL_PROMPTS.full_presales;
  const fullSystemPrompt = `${SYSTEM_INSTRUCTION}\n\nLangue imposée : ${language}.\n${skillGuide}`;

  const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
  const contents = trimmedHistory
    .filter((item) => item && typeof item.content === "string" && item.content.trim())
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

  contents.push({
    role: "user",
    parts: [{ text: message.trim() }]
  });

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const modelsToTry = Array.from(new Set([primaryModel, "gemini-2.5-flash-lite"]));

  try {
    const result = await callGeminiWithRetry({
      apiKeys,
      models: modelsToTry,
      contents,
      systemInstruction: fullSystemPrompt
    });

    if (!result.ok) {
      if (result.status === 429) {
        return res.status(429).json({
          code: "QUOTA_EXCEEDED",
          error:
            "Quota Google AI temporairement atteint (trop de demandes simultanées de l'équipe). Patiente 15 à 30 secondes puis clique sur « Réessayer »."
        });
      }
      return res.status(result.status || 500).json({ error: result.error });
    }

    return res.status(200).json({ reply: result.reply });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
}
