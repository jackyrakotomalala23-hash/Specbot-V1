import crypto from "crypto";

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return idx === -1 ? [part, ""] : [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

export function getAuthenticatedUser(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const cookies = parseCookies(req);
  const raw = cookies.specbot_session;
  if (!raw || !raw.includes(".")) return null;

  const [data, sig] = raw.split(".");
  if (!data || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (!parsed?.email || !parsed?.exp || Date.now() > parsed.exp) return null;

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const allowedSet = new Set(
      (process.env.ALLOWED_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    );
    if (adminEmail) allowedSet.add(adminEmail);

    if (!allowedSet.has(parsed.email.toLowerCase().trim())) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: "Non connecté" });
  }
  return res.status(200).json({
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: Boolean(user.isAdmin)
    }
  });
}
