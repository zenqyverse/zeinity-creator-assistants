export default async function handler(req, res) {
  const { url, og } = req.query;
  const targetUrl = og || url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url or og parameter');
  }

  try {
    const isOgMode = Boolean(og);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: isOgMode
          ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          : 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send(`Upstream error: ${response.statusText}`);
    }

    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isOgMode) {
      // Extract og:image, twitter:image, link rel="image_src"
      const ogMatch =
        text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        text.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i) ||
        text.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

      let imageUrl = ogMatch ? ogMatch[1].trim() : null;
      if (imageUrl && imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
        try {
          const origin = new URL(targetUrl).origin;
          imageUrl = `${origin}${imageUrl}`;
        } catch {
          // ignore
        }
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json({ image: imageUrl });
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).send(err instanceof Error ? err.message : 'Proxy error');
  }
}
