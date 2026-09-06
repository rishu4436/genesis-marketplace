import proofJson from "../../config/judge-proof.json";
import { bscscanTx } from "./erc8183-escrow";

export type EscrowJudgeProof = {
  label: string;
  network: string;
  chainId: number;
  marketplaceJobId: string | null;
  onchainJobId: string | null;
  fundTx: string | null;
  settleTx: string | null;
  disputeTx: string | null;
  note: string;
};

export function escrowJudgeProof(): EscrowJudgeProof {
  return proofJson.escrow as EscrowJudgeProof;
}

export function escrowProofExplorer(hash: string | null): string | null {
  if (!hash) return null;
  return bscscanTx(hash);
}
