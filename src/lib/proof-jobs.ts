/**
 * Live proof hires (2026-09-06) used by Advantage, /judge, and receipt scoring.
 * These ids exist in production KV even when listJobs cannot see disk.
 */

export const PROOF_JOBS = {
  "range-keeper": "job_mtphh1fs_hvnpd7",
  gridwright: "job_mtphh262_191700",
  "yield-router": "job_mtphh2ss_6dken9",
  "health-sentinel": "job_mtphh38g_l69uoy",
} as const;

export const PROOF_JOB_IDS: string[] = Object.values(PROOF_JOBS);

export const ERC8004_IDENTITY_REGISTRY =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

export function scanAgentUrl(chainId: number, tokenId: string): string {
  const id = String(tokenId || "").trim();
  if (!id || id.startsWith("genesis:") || !/^\d+$/.test(id)) {
    return "https://8004scan.io/agents?chain=56";
  }
  return `https://8004scan.io/agents/${Number(chainId) || 56}/${id}`;
}

export function bscscanNftUrl(tokenId: string): string {
  const id = String(tokenId || "").trim();
  if (!id || !/^\d+$/.test(id)) {
    return `https://bscscan.com/address/${ERC8004_IDENTITY_REGISTRY}`;
  }
  return `https://bscscan.com/token/${ERC8004_IDENTITY_REGISTRY}?a=${id}`;
}
