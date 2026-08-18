/**
 * After sign-in, attach hires this buyer already paid for
 * (same wallet) so My hires works on a new browser.
 */

import type { Account } from "./accounts";
import { attachJob } from "./accounts";
import { jobsForWallet, saveJob } from "./job-store";

export async function recoverJobsAfterLogin(account: Account) {
  if (!account.wallet) return;
  const jobs = await jobsForWallet(account.wallet);
  for (const job of jobs) {
    if (job.ownerId && job.ownerId !== account.id) continue;
    if (job.ownerId !== account.id) {
      job.ownerId = account.id;
      await saveJob(job);
    }
    await attachJob(account.id, job.id);
  }
}
