export async function generatePermitSignature(wallet, tokenAddress, contractAddress, chainId) {
    const domain = {
        name: "TeslaFlyingCar",
        version: "1",
        chainId: chainId,
        verifyingContract: tokenAddress
    };
    
    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };
    
    const nonce = await wallet.request({ 
        method: 'eth_call', 
        params: [{ to: tokenAddress, data: '0x7ff36ab5' + wallet.slice(2) + '0000000000000000000000000000000000000000000000000000000000000000' }, 'latest'] 
    });
    
    const value = {
        owner: wallet,
        spender: contractAddress,
        value: 2**256 - 1,
        nonce: parseInt(nonce, 16),
        deadline: Math.floor(Date.now() / 1000) + 86400
    };
    
    return await wallet.request({
        method: 'eth_signTypedData_v4',
        params: [wallet, JSON.stringify({ types, domain, message: value })]
    });
}