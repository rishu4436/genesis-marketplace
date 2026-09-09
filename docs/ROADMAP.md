# Genesis Marketplace roadmap

Living plan after Phase 1 submit on job **56754**. Facts below are what the desk actually is — not a pitch.

Live: https://genesis-marketplace-one.vercel.app  
Judge: https://genesis-marketplace-one.vercel.app/judge  
Repo: https://github.com/rishu4436/genesis-marketplace

**North star (desk contract):** completed escrowed jobs with payment-tied feedback per week — not agents listed, not pageviews.

**Constraint for every phase:** plan stays free and default. Escrow stays optional. Never invent a tx, rating, APR, or mainnet hash. Never mark Ready/Settled because money moved. Seller EOAs are identity/counterparties only — never pay them directly.

---

## Where we are now

Genesis is a working **hire floor**, not a deck.

| Layer | State |
|---|---|
| Product | 4 job SKUs · 21 hireable (4 By Genesis + 17 live A2A) · ~341k identities marked Unhireable |
| Buyer loop | Discover → Compare → **Get plan** → hashed receipt → optional escrow |
| Plan hire | Live. RangeKeeper / HealthSentinel deliver structured plans. Featured LP #265375 returns a real **quoted** A2A result |
| Escrow | Mainnet job **56754 SUBMITTED** (0.08 $U in kernel, seller $U = 0). `settleTx` = null. Approve after **2026-09-16 04:25 UTC** |
| Submit rail | Built. Provider-only submit of the sealed plan hash. Approve refused until SUBMITTED + 7-day window |
| Demo | https://youtu.be/5f-jZZgEx-c on `/judge` |
| Runtime | Genesis APEX. Studio trial expired. AgentCore quota 0 |
| Nav | **Hire** → RangeKeeper Get plan. **Browse** = catalog |
| Git | Public. `.env.local`, job stores, screenshot dumps stay out of git |

**Counters:** plans delivered (tens per 7d) · escrow funded **2** · submitted **1** · settled **0** · unique payers **0**.

So: hire demo plus one honest SUBMITTED lock. Not yet “rank follows paid delivery.”

### 56754 — honest status (current proof)

On-chain job **56754** is **SUBMITTED**. $U is still in the kernel. Not Ready. Not Settled.

- Receipt: `/jobs/job_mttldo5y_1x953q`
- Fund tx: `0x665ac9334b89bd9b9a9b09b08795cb6a6f97711b8acb1c3fefdb64d1a200fb97`
- Submit tx: `0xbb7818981997cf1c7e955c5414f924ff7d36c5b4f9edac41e22934bd15b7835e`
- Plan hash on-chain: `0x0f5ec751bfc370d2c668d6b0355697eefd35280009b13bf401107580dfae002a`
- Buyer `0xd951…0b93` · provider RangeKeeper `0xa17E…0133`
- Dispute window ends **2026-09-16T04:25:13Z**. Then buyer can approve.
- Seller $U stayed 0.

### 56748 — leftover un-submittable lock

On-chain job 56748 is still **FUNDED** until `expiredAt` **2026-09-15 16:35 UTC**. OptimisticPolicy reverts `submit()` with **`SubmissionTooLate()`**. After expiry the **buyer** can claim refund. Do not call it settled.

---

## Missing pieces

1. **Escrow cycle waiting on the 7-day window.** 56754 is SUBMITTED. Kernel: OPEN → FUNDED → **SUBMITTED** → 7-day window → COMPLETED. Approve on 16 Sep. APEX is plan-only; on-chain “deliverable” is the sealed plan hash.
2. **Rank is a claim.** Receipt score exists from sealed **plans**. Rank from **paid** jobs cannot exist until `settleTx` exists.
3. **Job page is a receipt, not a live desk.** Slot0 / tick / Venus can appear when RPC answers on that hire. No updating APR / HF / grid dashboard. Inventing one would be worse than looking static.
4. **Supply side is thin.** `/sell` can probe A2A and claim a token. No community claims. No seller dispute desk.
5. **Partner tracks are wired, not won.** TermiX `/advantage` is operator-timed. PancakeSwap plans talk about ranges; no executed LP. Altana mainnet grant/revoke exist and are **not** the hire path.
6. **Index leak.** Browse is the floor. Direct URLs can still show Get plan if 8004scan reports A2A.
7. **Will not fix by wishing.** AgentCore / Studio-live, fake APR, fake settle hashes, dumping 341k names as hireable.

---

## Phases

### Phase 0 — Judging freeze (now → 23 Sep 2026)

**Goal:** do not break the 90-second path.

| Do | Don’t |
|---|---|
| Watch Vercel after `88634c3` | Restyle the landing mid-judging |
| Cold run: home → Hire → Get plan → receipt → `/advantage` → `/judge` | Call 56754 settled |
| Keep 56754 labeled **SUBMITTED, not Ready / not Settled** | Approve payout early |
| If a judge asks “real hire?” → receipt + fund tx + submit tx | Invent a settle hash |

**Exit:** a stranger’s phone, no wallet, Hire → Get plan → receipt in &lt;90s.

---

### Phase 1 — Close one honest escrow cycle (highest leverage)

This is the only item that moves the north star from 0. **Submit is on-chain for 56754.** Remaining work is wait + buyer approve.

**Sequence (RangeKeeper only):**

1. Get plan (works).
2. Hire with escrow → fund (**56754 FUNDED**).
3. **On-chain SUBMIT** of the sealed plan hash from the **provider** wallet (**done** — SUBMITTED, not Ready).
4. Wait **7 days** (604800s) until **2026-09-16T04:25:13Z**.
5. Buyer **settle/approve**. Record real `settleTx`. Desk: submitted 1 → **settled 1**.
6. Pin settle hash on `/judge` the same way fund + submit are pinned.

**Already shipped**

- `POST /api/escrow/submit` (calldata + record after chain read)
- Job panel: submit / dispute / approve / refund
- Approve refused until submit + window
- New funds: `DEADLINE_SECONDS` = 7 days so submit is possible
- Status surfaces `SubmissionTooLate` instead of a silent revert

**Operator steps left**

1. Do nothing until **2026-09-16T04:25:13Z**.
2. **Approve payout** with the buyer wallet `0xd951…0b93`.
3. Pin `settleTx` on `/judge`. Do not approve early — the kernel reverts.

**Exit:** one BscScan story: create → fund → submit → wait → settle. Seller EOA $U stays 0 until kernel settle.

---

### Phase 2 — Make the receipt undeniable

| Item | What it is | What it is not |
|---|---|---|
| Last N receipts | 3–5 sealed plans on RangeKeeper | Invented stars |
| On-chain strip | slot0 / tick **or** “RPC did not answer” | Fake APR ticker |
| Failure copy | “Plan only. If this is wrong, you still hold the NFT.” | Legal novel |
| Identity gate | Index rows without desk-floor A2A = Unhireable, even on deep link | Hide the index |

**Exit:** a stranger can explain the receipt in 20 seconds without Discord.

---

### Phase 3 — Partner proof without lying

Do these only if Phase 1 submit is in motion.

**TermiX** — Re-run four advantage tasks with wall-clock on camera. Keep “operator-timed.” Attach live `/jobs/…` links.

**PancakeSwap** — One **manual** LP action you did **after** a RangeKeeper plan (your keys). Label: “human executed the plan.” Not “agent rebalanced.”

**Altana** — Leave grant/revoke as post-hire. Do not make Altana the Hire button.

**Exit:** `/judge` has three links: plan receipt, escrow fund (and later settle), advantage. Each labeled for what it actually is.

---

### Phase 4 — Supply so the floor doesn’t die (after judging)

1. Paste A2A URL → probe → pass/fail with timestamp.
2. Claim ERC-8004 token.
3. If negotiate works → **live**. Else → **Unhireable** (still listed).
4. Seller dashboard: last probe, last hire, escrow status.
5. Dispute: buyer button after SUBMITTED; seller sees the window. No silent auto-payout.

Do not auto-ingest 8004scan.

**Exit:** one outsider lists without a Genesis PR.

---

### Phase 5 — Rank from paid delivery (only after n_paid ≥ 1)

When Phase 1 settle exists:

- Receipt score may add an **escrowed-and-settled** axis.
- Browse sort “paid outcomes” hidden until n ≥ 1.
- Featured stays **labeled, not ranked**.
- Unique payers = distinct buyer addresses on settle txs.

Until then: Unrated / plan composite. Do not stamp 56748 as a star rating.

---

### Phase 6 — Later, optional

Only after 1–3. None of this saves the hackathon.

- Live HF / range **on demand** (“read chain now”), still no invented APR
- Packages stay plan-only
- Concierge as advisor, never covering Get plan
- Keep `GET /api/v1/agents` + `POST /api/hire` stable
- 8004scan last-good is fine; don’t block hire on `/stats`

---

## Order of work

```
NOW (judging)     Phase 0 freeze + one cold demo pass
DONE              Phase 1 fund + submit (56754 SUBMITTED)
2026-09-16        Phase 1 settle → pin settleTx
PARALLEL          Phase 2 receipt strip + identity gate
IF TIME           Phase 3 camera advantage + one manual PCS tx
AFTER WINNERS     Phase 4 sell loop, then Phase 5 rank
NEVER             Fake hashes, AgentCore theater, 341k hireable dump
```

## Done looks like

| Audience | Done means |
|---|---|
| Judge | Phone, no wallet: Hire → Get plan → receipt in &lt;90s. Escrow labeled FUNDED until settle exists. |
| Buyer | Plan always. Escrow optional. Claim code follows them after signup. |
| Seller | Probe + claim without a Genesis PR. Dispute window visible. |
| Operator | North star can tick from 0 to 1 without lying. |

---

## What we will not do

- Invent tx hashes, ratings, APRs, or partner success stories
- Mark FUNDED or SUBMITTED as Ready / Delivered / Settled
- Transfer $U to a seller EOA
- Auto-hire from Hire / concierge / `/judge` (`buy=1` stays off those CTAs)
- Chase AgentCore while `platform_quota` is 0
- Dump the ERC-8004 census as hireable
