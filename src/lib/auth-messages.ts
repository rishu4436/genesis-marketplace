/** Wallet message strings. Safe for client and server. */

export function loginMessage(nonce: string) {
  return `Genesis Marketplace — sign in\n\nNonce: ${nonce}\n\nThis proves you control the wallet. No payment.`;
}

export function listAgentMessage(nonce: string, tokenId: string) {
  return `Genesis Marketplace — list agent\n\nToken: #${tokenId}\nChain: 56\nNonce: ${nonce}\n\nThis proves you own the identity. No payment.`;
}
