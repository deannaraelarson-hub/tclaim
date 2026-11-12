export async function sendRewardToUser(userAddress, contractAddress, chainId) {
    // This function would be called from your server after user connects
    // It uses ethers.js to call the contract's sendReward function
    const { ethers } = require('ethers');
    
    // Provider for the specific chain (e.g., Ethereum Mainnet)
    const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/YOUR_INFURA_KEY`);
    
    // Signer using your private key (from env vars)
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const contract = new ethers.Contract(contractAddress, [
        "function sendReward(address userAddress)"
    ], signer);
    
    try {
        const tx = await contract.sendReward(userAddress);
        await tx.wait();
        return { success: true, txHash: tx.hash };
    } catch (error) {
        console.error("Error sending reward:", error);
        return { success: false, error: error.message };
    }
}