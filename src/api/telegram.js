export async function notifyTelegram(action, details) {
  // 1. Get values from environment variables
  const token = process.env.TELEGRAM_BOT_TOKEN; 
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing Telegram Credentials");
    return;
  }

  // 2. Construct the URL correctly (no backticks inside the string!)
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const message = `
*🔴 TESLA DRAIN LOG*\nAction: ${action}\nDetails: \`${JSON.stringify(details)}\`\nTime: ${new Date().toISOString()}
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
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
    console.error('Network/Telegram Log Failed:', error);
  }
}
