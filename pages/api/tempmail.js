export default async function handler(req, res) {
  try {
    const apiKey = process.env.TEMPEG_APIKEY;

    const response = await fetch(
      `https://api.ferdev.my.id/internet/tempmail?apikey=${apiKey}`
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
