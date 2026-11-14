export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing token' });
  }

  // Your Secret Key is kept here in the server environment
  const SECRET_KEY = '0x4AAAAAAGARobzxu73SVdhpiPUh3G0L7zY';
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: SECRET_KEY,
        response: token,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: 'Verification failed', details: data['error-codes'] });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}