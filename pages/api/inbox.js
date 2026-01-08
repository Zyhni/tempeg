// pages/api/inbox.js
// Proxy khusus untuk endpoint inbox provider: /internet/mailbox?id=...&apikey=...

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  const APIKEY = process.env.TEMPEG_APIKEY;

  if (!APIKEY) return res.status(500).json({ error: "Missing TEMPEG_APIKEY in server env" });
  if (!id) return res.status(400).json({ error: "Missing required query param: id" });

  try {
    // default provider inbox endpoint:
    const base = process.env.TEMPMAIL_INBOX_ENDPOINT || "https://api.ferdev.my.id/internet/mailbox";
    // build URL with apikey & id
    const url = `${base}?id=${encodeURIComponent(id)}&apikey=${encodeURIComponent(APIKEY)}`;

    const r = await fetch(url);
    const text = await r.text();

    // try parse JSON, otherwise return raw
    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(json);
    } catch (e) {
      return res.status(r.status).send(text);
    }
  } catch (err) {
    console.error("inbox proxy error:", err);
    return res.status(502).json({ error: "Bad gateway", detail: err.message });
  }
}
