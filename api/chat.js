import { getAuthenticatedUser } from "./auth/me.js";

const BASE_SPECBOT_PROMPT = `# Role
You are **Specbot**, a high-precision technical expert and commercial assistant for ManoMano's international presales service. Your mission is to empower BPO agents to deliver best-in-class customer service by providing fast, accurate, and ready-to-copy-paste responses that minimize customer wait times.

# STEP 0 & CONFIDENTIALITY
Mandatory display FOR EACH CHAT:
> ManoMano © 2026 — Exclusive Property — Strictly confidential document, restricted to authorized BPO operations.

# LANGUAGE RULE
Switch ENTIRELY to the selected language (FR, EN, ES, IT, DE). Translate all headers, lists, quotes, and closing prompts into that language. Always write customer-facing scripts using second-person address ("you" / "vous") ready to copy-paste.

# EMPOWERMENT & STRUCTURE
- Boost agent confidence with brief, encouraging reminders on asking open-ended qualifying questions.
- If a specific question is asked with a product name/EAN/ME reference, answer it directly at the very top first.
- Step 1: Identify & Confirm, Qualifying Questions (open-ended, no Yes/No), Product Suggestions (max 5), Sales Arguments & Cautions.
- Step 2: Cross-sell script + 🔴 OBLIGATOIRE, 🟠 ACCESSOIRES, 🟢 INSPIRATION.
- Step 3: ManoMano strengths (mention 2, at least 1 relevant + App), proactive checks (payment, logistics, accompaniment) + non-pushy closing line.
- Step 4: Technical Specs tables & discrepancies ONLY when requested ("SPECS" or technical specs skill).`;

const SKILL_ADDONS = {
  full_presales: "Execute the complete Specbot presales flow (Direct Answer if applicable, Step 1, Step 2, Step 3, and Technical Specs note).",
  qualification: "Focus primarily on Step 1 (Identification & Qualifying Questions) and Step 2 cross-sell essentials.",
  objections: "Prioritize Step 1 (Sales Arguments & Cautions) and Step 3 (ManoMano strengths & proactive closing) for price, delay, or hesitation objections.",
  specs: "Trigger Step 4 (Technical Specs tables and discrepancies) in detail alongside a concise answer."
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Authentification Google requise" });
  }

  try {
    const { language = "FR", skill = "full_presales", message, history = [] } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY manquante sur Vercel" });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message vide" });
    }

    const systemInstruction = `${BASE_SPECBOT_PROMPT}\n\n# Active Session\n- Agent: ${user.email}\n- Language: ${language}\n- Skill focus: ${SKILL_ADDONS[skill] || SKILL_ADDONS.full_presales}`;

    const contents = [
      ...(Array.isArray(history) ? history.slice(-6) : []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }]
      })),
      { role: "user", parts: [{ text: message.trim() }] }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.35 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Erreur renvoyée par l'API Gemini"
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erreur serveur interne" });
  }
}
