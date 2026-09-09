# Genesis Marketplace roadmap

Living plan after `88634c3`. Facts below are what the desk actually is — not a pitch.

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
| Escrow | Mainnet job **56748 FUNDED** (0.08 $U, seller $U stayed 0). `submitTx` = null. `settleTx` = null |
| Submit rail | Built. Provider-only `POST /api/escrow/submit`. Approve refused until SUBMITTED + 7-day window |
| Demo | https://youtu.be/5f-jZZgEx-c on `/judge` |
| Runtime | Genesis APEX. Studio trial expired. AgentCore quota 0 |
| Nav | **Hire** → RangeKeeper Get plan. **Browse** = catalog |
| Git | Public. `.env.local`, job stores, screenshot dumps stay out of git |

**Counters:** plans delivered (tens per 7d) · escrow funded **1** · settled **0** · unique payers **0**.

So: hackathon-ready hire demo. Not yet “rank follows paid delivery.”

### 56748 — honest status

On-chain job 56748 is **FUNDED** until `expiredAt` **2026-09-15 16:35 UTC**. OptimisticPolicy reverts `submit()` with **`SubmissionTooLate()`** unless `expiredAt ≥ now + disputeWindow` (7 days). This lock was created with only ~30 minutes of submit slack, so the kernel will not accept submit on 56748.

- Receipt: `/jobs/job_mtsv2f9d_9yjpwg`
- Fund tx: `0x9a9f3f4531668c4760b5a36a93c005ed0fb0adb93f1caca99334d97bcee7cdbe`
- After expiry the **buyer** can claim refund
- To finish the cycle: fund a **new** lock (now 7-day submit window), then submit from the RangeKeeper **operator** wallet `0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133`. The buyer who funded (`0xd951…0b93`) cannot submit.

---

## Missing pieces

1. **Escrow cycle incomplete.** FUNDED ≠ paid. Kernel: OPEN → FUNDED → **SUBMITTED** → 7-day window → COMPLETED. No on-chain submit yet. APEX is plan-only; on-chain “deliverable” is the sealed plan hash.
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
| Cold run: home → Hire → Get plan → receipt → `/advantage` → `/judge` | Call 56748 settled |
| Keep 56748 labeled **FUNDED, not Ready** | Approve payout early |
| If a judge asks “real hire?” → receipt + BscScan fund tx | Invent a submit/settle hash |

**Exit:** a stranger’s phone, no wallet, Hire → Get plan → receipt in &lt;90s.

---

### Phase 1 — Close one honest escrow cycle (highest leverage)

This is the only item that moves the north star from 0. **Submit rail is in the product.** Remaining work is operator, not code.

**Sequence (RangeKeeper only):**

1. Get plan (works).
2. Hire with escrow → fund (56748 done; **new lock required** for submit).
3. **On-chain SUBMIT** of the sealed plan hash from the **provider** wallet. Status becomes SUBMITTED, not Ready.
4. Wait **7 days** (604800s). UI: “settle unlocks at …”.
5. Buyer **settle/approve**. Record real `settleTx`. Desk: funded 1 → **settled 1**.
6. Pin settle hash on `/judge` the same way fund is pinned.

**Already shipped**

- `POST /api/escrow/submit` (calldata + record after chain read)
- Job panel: submit / dispute / approve / refund
- Approve refused until submit + window
- New funds: `DEADLINE_SECONDS` = 7 days so submit is possible
- Status surfaces `SubmissionTooLate` instead of a silent revert

**Operator steps**

1. Open `/genesis/range-keeper?escrow=1#buy` and fund with the **buyer** wallet.
2. On the receipt, **Submit plan hash on-chain** with RangeKeeper operator `0xa17E…0133`.
3. Wait 7 days, then **Approve payout** with the buyer wallet.

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
THIS WEEK         Phase 1: new fund → operator submit (56748 cannot submit)
+7 DAYS           Phase 1 settle → pin settleTx
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
