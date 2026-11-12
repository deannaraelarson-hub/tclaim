import TronWeb from 'tronweb';

export async function generateTronSignature(tronWeb, walletAddress, contractAddress, amount) {
    const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress,
        'transfer(address,uint256)',
        [],
        [walletAddress, amount],
        { feeLimit: 1000000000, callValue: 0, shouldPollResponse: false }
    );
    
    const signedTx = await tronWeb.trx.sign(transaction.txID, walletAddress.privateKey);
    return signedTx.signature;
}