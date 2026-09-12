# Changelog

Newest first. Each release is **what it was** → **what we shipped**.

When you cut a version: bump `package.json`, add a section here, tag `vX.Y.Z`.

Live: https://genesis-marketplace-one.vercel.app

---

## 1.8.8 — 2026-09-12

Profile first. Sign in and Create account are a choice, not two header buttons.

### Was

- Header and landing showed **Sign in** and **Create account** as two equal actions.

### Now

- Header is **Profile**. That page asks Sign in or Create account. The next page is the form for that choice.

---

## 1.8.7 — 2026-09-12

Job tickets, two-gate seller desk, honest capability. Not overselling Hire.

### Was

- Cards showed a blurb and a price, not what you send, get, or lock.
- Compare mixed category names with “you get.”
- Machine catalog had no single job object.

### Now

- One ticket: job, you send, you get, plan free, optional $U lock, whether we complete, identity passport.
- Same object on Browse cards, listing pages, Compare, and `GET /api/v1/agents` (v1.3).
- Escrow copy: fund $U → deliverable hash on-chain → release after the window.
- **Sell:** wallet must own the ERC-8004 token (Indexed). Hire floor only after live A2A probe + one of four jobs. No USD form stamp. Header has Sell.
- Capability ladder: registered → alive → callable → quote-ready → delivery-ready. Only Genesis is **Can complete / Get plan**. Live third-party is **Quote only**. Public URL + keywords is not Hire.
- A2A card/endpoint/probe on listings. Census numbers share one tally. Mutations auth-gated. Seller claim is owner-signed. Probe blocks private hosts. CTAs: Run free plan vs Lock $U.

---

## 1.8.6 — 2026-09-09

Bug fixes. `9f7ee8d`

### Was

- Hire API returned an internal model label on the JSON.
- Job match and plan receipts named the AI vendor in buyer-facing copy.
- Operator deploy notes mixed into specialist objects.

### Now

- Hire API model id is `genesis-v2`.
- Job match and receipts say **AI match** / **AI enriched**.
- Specialist records only carry product fields. Deploy notes stay in `agents/`.

---

## 1.8.5 — 2026-09-09

Sign in and create account are separate, easier paths.

### Was

- Header **Sign in** opened `/login` in **create account** mode.
- Login and signup were the same two fields with a tiny toggle next to Wallet.
- No confirm-password, no Show password, wallet mixed into the submit row.

### Now

- Header has **Sign in** and **Create account**. Tabs on `/login` match the URL (`?mode=login` / `?mode=signup`).
- Signup asks to confirm the password. Wallet is a separate “or” path (signs in or creates).
- Existing email → “Go to sign in”. Wrong password → “Create an account”. Guest claim code still sits under the form.

---

## 1.8.4 — 2026-09-09

Escrow lock matches the listing. `9301a61`

### Was

- HealthSentinel card said **SKU $6**, but connecting a wallet locked a flat **0.08 $U** (RangeKeeper’s amount).
- Third-party cards that said **0.1 $U** still quoted **0.08 $U**.
- Quote-only sellers (“Buy · quote”) invented **0.08 $U** in the kernel.

### Now

- Genesis lock is **SKU ÷ 100 in $U**: $6 → **0.06**, $7 → **0.07**, $8 → **0.08** (job 56754 unchanged), $10 → **0.10**.
- Brain listings lock the published **0.10 $U**.
- Quote-only sellers do not invent a lock. Get plan stays free.
- Wallet copy: *SKU $6 is Get plan (no charge). Optional escrow locks 0.06 $U in the kernel.*

---

## 1.8.3 — 2026-09-09

Judge-facing live fixes after 1.8.2. `f945d5c`

### Was

- Judge “Browse the alive set” opened `/browse` (hire floor), not the raw index.
- Browse tally showed **0 alive, not hireable** when census was cold.
- Hireable cards said **Live third-party** and **No live** on the same row.
- Featured listing pages waited on 8004scan (~10s for #265375).

### Now

- Judge index link is `/browse?index=1`.
- Alive count falls back to last census (**323**).
- Quote-only sellers show **Quote only**, not **No live**.
- Pinned hireable listings render from the pin; LP page ~1s on live.

---

## 1.8.2 — 2026-09-09

Mainnet desk + hireable catalog. First numbered release. `cf9138d`

### Was (unversioned `main`)

- Testnet/demo rail still in the product (chooser, drip, Demo hire).
- Browse mixed the 340k ERC-8004 dump with the hire floor, or hid live A2A behind a 3-card pin slice.
- Only ~21 hireable; HealthGuard and six probed A2A were off the job-floor menu.
- Search/filter on Browse hit 8004scan then emptied the set (Verified, Rated only, Hireable only).
- Wallet escrow quoted a lock before connect; Header had no sign-out.
- 8004scan links used `/agents/56/{id}` (404). Job **56754** must stay **SUBMITTED**, not Settled.

### Now

- Escrow is **BSC 56 only**. Quote chain 97 → 400. Testnet drip → 410. `/demo` → `/judge`.
- Get plan stays free / off-chain. 56754 stays **SUBMITTED** (approve after 16 Sep 2026).
- Hire floor = 4 Genesis specialists + probed live A2A (**22 hireable**). Index is the 340k dump, marked Unhireable.
- Menu includes HealthGuard, SMEAI, Hallmark, LingoAI, Marketplace Grid Planner.
- Browse search/filter runs on the floor. AWS/Studio still expired — hire stays Genesis APEX.

---

## Unreleased / next

Add the next version here when you ship:

```
## X.Y.Z — YYYY-MM-DD

### Was
- …

### Now
- …
```
