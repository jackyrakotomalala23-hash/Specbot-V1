export default function handler(req, res) {
  return res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || "" });
}
