// src/api/telegram.js

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function notifyTelegram(action, details) {
 if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
   console.warn("Missing Telegram Credentials");
   return;
 }

 const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
 
 let formattedMessage = `<b>🔴 TESLA DRAIN LOG</b>\n`;
 formattedMessage += `Action: <code>${action}</code>\n`;
 
 if (typeof details === 'object') {
 for (const [key, value] of Object.entries(details)) {
 formattedMessage += `${key}: <code>${value}</code>\n`;
 }
 } else {
 formattedMessage += `Details: ${details}\n`;
 }
 
 formattedMessage += `Time: ${new Date().toISOString()}`;

 try {
 await fetch(url, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 chat_id: TELEGRAM_CHAT_ID, 
 text: formattedMessage, 
 parse_mode: 'HTML' 
 })
 });
 } catch (error) {
 console.error("Failed to send Telegram notification:", error);
 }
}

export default async function handler(req, res) {
 if (req.method !== 'POST') {
 return res.status(405).json({ error: 'Method Not Allowed' });
 }

 try {
 const { action, details } = req.body;
 await notifyTelegram(action, details);
 return res.status(200).json({ success: true });
 } catch (error) {
 return res.status(500).json({ error: "Internal Server Error" });
 }
}
