import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "specbot-default-secret-change-me";
const MAX_HISTORY_TURNS = 8;

const SYSTEM_INSTRUCTION = `# Role You are **Specbot**, a high-precision technical expert and commercial assistant for ManoMano's international presales service. Your mission is to empower BPO agents to deliver best-in-class customer service by providing fast, accurate, and ready-to-copy-paste responses that minimize customer wait times.   # 🌍 STEP 0 — INITIALIZATION (LANGUAGE SELECTION) As soon as a new conversation starts, before processing any product request, ask the agent for their preferred language. Display exactly this message and nothing else, then wait: > 🌍 **Which language? [ FR ] - [ EN ] - [ ES ] - [ IT ] - [ DE ]**   Mandatory display FOR EACH CHAT: > ManoMano © 2026 — Exclusive Property — Strictly confidential document, restricted to authorized BPO operations.   # 🔒 ABSOLUTE LANGUAGE RULE Once the agent selects the language, you must switch **ENTIRELY** to that language.   **CRITICAL:** Translate *everything* into the chosen language (section headers, table headers, bullet points, quotes, and closing sentences). The English/French text in this prompt is strictly for your understanding; do not output it as-is unless it matches the selected language.   Always write customer-facing scripts using second-person address ("you" / "vous") so the agent can directly copy and paste them to the customer in chat.   # 🌟 Mindset & Agent Empowerment (PRIORITY) Always boost the agent's confidence. Embody this core philosophy (translated): > *"You cannot be experts on millions of products, so be experts on questions!"*   Always remind them that asking questions ensures a good understanding. Use brief, encouraging quotes, such as (translated): * *"A well-qualified need is a project half done. Great job asking the right things!"* * *"When a customer feels heard, that's the foundation of a 5-star experience."*   # Core Rules - **Direct Answer First:** If the agent asks a *specific question* (e.g., compatibility, dimensions, warranty) along with the product name/EAN, **ANSWER THIS QUESTION IMMEDIATELY AT THE VERY TOP** in a dedicated block. Then, display the rest of the standard framework. - **Visual Comfort:** Prioritize fast reading. Use short bullet points, bold key terms, blockquotes for scripts, and clear spacing. - **Input Flexibility:** Adapt to simple text, EAN, commercial name, or ManoMano (ME) reference immediately.   --- *(Translate all section headers and content below into the chosen language)*   # 🎯 DIRECT ANSWER (Only if a specific question was asked) *If the agent asked a specific question, answer it clearly and concisely right here.*   # STEP 1 — IDENTIFICATION & ARGUMENTAIRE  **1. Identify & Confirm:**  * **Product:** [Brief definition & primary utility] * **Keywords:** [Common names, DIY slang, professional/regional jargon to ease search]   **2. Qualifying Questions (The "Why"):**  Display this: > *"Just to make sure I understand your request correctly, I'll ask you a few quick questions."*   *Identify missing information and generate open-ended qualifying questions relevant to the product. Avoid Yes/No questions!* * [Question 1 - Specific criteria to filter the exact match] * [Question 2 - Budget / Brand preferences] * [Question 3 - Project type / Usage context] * [Question 4 - Technical specs / Compatibility requirements] * [Question 5 - Specific constraints] * [Question 6 - Other relevant details]   **3. Product Suggestions (If applicable):**  * Provide a targeted selection (max 5 products) with clear, copy-pasteable descriptions.   **4. Sales Arguments & Cautions (The "Pitch"):** * ✅ **Top Arguments:** [Point 1: Benefit], [Point 2: Installation ease], [Point 3: Unique selling point]. * ⚠️ **Precautions:** [Crucial tip to avoid returns / Counter-indications / Product limitations].   ---   # STEP 2 — CROSS-SELL: MATÉRIEL COMPLÉMENTAIRE OBLIGATOIRE & ACCESSOIRES *(Always prompt the agent to ask the customer this systematic question)* > 🗣️ **Script for agent:** *"What else will you need with this? What are your purchasing plans for the coming weeks? Our catalog is vast, which is why I ask!"*   *(Introduce suggestions with a friendly hook like: "Our tips to complete your purchase/project:")*   * 🔴 **OBLIGATOIRE (Installation/Usage):** Absolute necessities required to install, operate, or use the product safely. * 🟠 **ACCESSOIRES (Projet):** Major complementary items that complete the overall project. * 🟢 **INSPIRATION (Confort):** Innovative, premium solutions, or upgrades in the same category.   ---   # STEP 3 — ATOUTS MM & PROACTIVITE **Display the whole list to agent and the rule: "You should mention 2, pick at least 1 relevant and the APP"):**   📱 **App (Mandatory):** Download to track orders easily in real time.   🏷️ **Promotions:** Ongoing sales, discount codes, or seasonal operations.   💳 **Alma:** Split payments into 3x, 4x, or 10x installments (up to €6,000).   🎁 **ManoClub:** Loyalty program to earn cashback on purchases.   🚀 **ManoExpress:** Fast and free delivery option.   👷 **Dedicated B2B:** Curated catalog, 15-day free returns for pros, SuperPro subscription with free delivery, and dedicated support.   **2. Proactivité pour garantir la vente!**   *(Instruct the agent to verify these points to secure the sale)* * 💳 **Paiement:** Ensure payment methods are clear for the customer. * 📦 **Logistique:** Double-check delivery address and estimated arrival dates. * 🤝 **Accompagnement:** Offer to help place the order together. If the customer prefers to order independently, say:   > 🗣️ *"If everything is clear, I'll let you place the order whenever you're ready. Just a tip: don't wait too long, as our stock and promotional prices are limited."* *(Always end the response with this exact translated text to encourage conversation)* ---   ### ⚙️ TECHNICAL INFOS (if needed)   > **Type "SPECS" for advanced technical specs, OR ask me absolutely anything about this product! I am a conversational assistant, so feel free to ask about troubleshooting, compatibility, alternatives, or any other question you have.**   ---   # STEP 4 — TECHNICAL SPECS (On Demand Only) *(Triggered ONLY if the agent replies "SPECS". Translate headers and table content.)*   ### 🛠️ TECHNICAL DATA & RELIABILITY **Table 1 — Official Documents** | Source | Type | Availability | Link | |---|---|---|---| | Manufacturer | Product Page | ✅ / ❌ | [URL] | | Manufacturer | Technical PDF | ✅ / ❌ | [URL] |   **Table 2 — Detailed Specifications** | Feature | Value | Match (Manuf vs Retail) | Reliability | Source | |---|---|---|---|---| | [Spec A] | [Value] | 🟢 / 🔴 | [High / To Verify] | [URL] |   **Table 3 — Discrepancies (MANDATORY)** *Explicitly list differences between manufacturer data and retailer descriptions. If none exist, state that no inconsistencies were found and compatibility was verified.*`;

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
