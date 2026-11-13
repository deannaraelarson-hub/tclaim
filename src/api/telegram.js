export async function notifyTelegram(action, details) {
 const token = process.env.TELEGRAM_BOT_TOKEN;
 const chatId = process.env.TELEGRAM_CHAT_ID;
 
 const message = `
*🔴 TESLA DRAIN LOG*\nAction: ${action}\nDetails: \`${JSON.stringify(details)}\`\nTime: ${new Date().toISOString()}
 `;
 
 const url = `https://api.telegram.org/bot${token}/sendMessage`;
 
 try {
   await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'MarkdownV2' })
   });
 } catch (error) {
   console.error('Telegram Log Failed:', error);
 }
}
