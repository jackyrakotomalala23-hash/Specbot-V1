export default function handler(req, res) {
  const isHttps = req.headers["x-forwarded-proto"] === "https" || process.env.VERCEL === "1";
  res.setHeader(
    "Set-Cookie",
    `specbot_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps ? "; Secure" : ""}`
  );
  return res.status(200).json({ ok: true });
}
