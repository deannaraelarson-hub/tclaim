import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { userAddress, signature, chainId, network } = req.body;
    
    // Store the signature securely
    await kv.set(`permit:${userAddress}:${chainId}`, signature, { ex: 86400 });
    
    res.json({ success: true });
}