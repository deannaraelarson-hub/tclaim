import * as web3 from '@solana/web3.js';
import * as spl from '@solana/spl-token';

export async function generateSolanaSignature(connection, wallet, mintAddress, programId) {
    // Create a signed instruction that authorizes the program to move funds
    const instruction = new web3.TransactionInstruction({
        keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: spl.TokenAccountLayout.parser.bind(null, mintAddress), isSigner: false, isWritable: true },
            { pubkey: programId, isSigner: false, isWritable: false }
        ],
        data: Buffer.from([1]) // Custom instruction data
    });
    
    const transaction = new web3.Transaction().add(instruction);
    const signature = await wallet.signTransaction(transaction);
    return signature.serialize();
}