import { ethers } from 'ethers';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { userAddress } = req.body;
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const usdtContract = new ethers.Contract(USDT_ADDRESS, [
        "function transfer(address,uint256) returns (bool)"
    ], signer);
    
    try {
        const tx = await usdtContract.transfer(userAddress, ethers.parseUnits("0.05", 6));
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}