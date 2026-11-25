import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

function signSession(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { credential } = req.body || {};
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!credential) {
      return res.status(400).json({ error: "Jeton Google manquant" });
    }
    if (!clientId || !sessionSecret) {
      return res.status(500).json({ error: "Configuration auth incomplète sur Vercel" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();
    const email = (payload?.email || "").toLowerCase().trim();
    const emailVerified = Boolean(payload?.email_verified);

    if (!email || !emailVerified) {
      return res.status(401).json({ error: "Compte Google non vérifié" });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const allowedList = (process.env.ALLOWED_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const allowedSet = new Set(allowedList);
    if (adminEmail) allowedSet.add(adminEmail);

    if (!allowedSet.has(email)) {
      return res.status(403).json({
        error: "Accès refusé : cet email Google n'est pas autorisé par l'administrateur."
      });
    }

    const userSession = {
      email,
      name: payload?.name || email,
      picture: payload?.picture || "",
      isAdmin: Boolean(adminEmail && email === adminEmail),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7
    };

    const token = signSession(userSession, sessionSecret);
    const isHttps = req.headers["x-forwarded-proto"] === "https" || process.env.VERCEL === "1";

    res.setHeader(
      "Set-Cookie",
      `specbot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isHttps ? "; Secure" : ""}`
    );

    return res.status(200).json({
      user: {
        email: userSession.email,
        name: userSession.name,
        picture: userSession.picture,
        isAdmin: userSession.isAdmin
      }
    });
  } catch (err) {
    return res.status(401).json({ error: "Authentification Google invalide : " + err.message });
  }
}
