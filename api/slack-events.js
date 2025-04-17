export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (req.body.type === 'url_verification') {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    return res.status(200).end();
  }

  res.setHeader('Allow', 'POST');
  res.status(405).end('Method Not Allowed');
}
