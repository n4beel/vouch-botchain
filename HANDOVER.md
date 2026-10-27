# Vouch Handover Report

## 1. What Was Built
Vouch is a public, on-chain personal endorsement graph on BotChain (Bohr testnet chain ID 968). Users can publicly endorse up to 10 Ethereum addresses with an optional 32-byte ASCII label describing why they vouch for that peer (e.g. "co-founder", "security lead", "designer").

Key components:
- **Smart Contract (`contracts/src/Vouch.sol`)**:
  - Max 10 active outgoing vouches per address (`MAX_VOUCHES = 10`).
  - No self-vouching (`CannotVouchForSelf`).
  - No duplicate active vouches (`AlreadyVouched`).
  - Strict 32-byte ASCII labels (`InvalidLabelLength`, `InvalidLabelCharacters`).
  - Constant-time swap-and-pop unvouching with bounded iteration (`NotVouched`).
  - Events emitted for indexers: `Vouched(from, to, label)` and `Unvouched(from, to)`.
- **Contract Decisions (`contracts/DECISIONS.md`)**:
  - Detailed architecture and design rationale documented.
- **Frontend Architecture (Archetype Y — Constellation)**:
  - Space/observatory dark visual tone (`--bg-base: #0A0F2C`, `--accent: #FF9ECF`).
  - Interactive SVG Star Map (`StarMap.tsx`) visualizing incoming and outgoing peer stars with golden center, pink outgoing links, and teal incoming links.
  - Tabular list view alternative (`ListView.tsx`) for accessibility and direct revocation.
  - Dedicated routes:
    - `/`: Interactive constellation explorer & search.
    - `/a/[address]`: Dedicated profile star sky for any Ethereum address (with empty sky detection).
    - `/me`: Manage outgoing endorsements, unvouch peer addresses, and track remaining slots.
    - `/v/[from]/[to]`: Standalone shareable vouch receipt verification card.
    - `not-found.tsx`: 404 void star route.
- **Wallet & Contract Integration**:
  - Full EIP-6963 connector discovery and mock-wallet injection for automated verification.
  - Custom opaque wallet dropdown menu with verified AAA contrast tokens.
  - Standard BotChain 3-link footer across all routes (`scan.bohr.life/address/...`, `botchain.ai`, `scan.botchain.ai`).

---

## 2. Verification Results

### Forge Tests
```bash
$ forge test --gas-report
Running 10 tests for test/Vouch.t.sol:VouchTest
[PASS] test_CannotSelfVouch() (gas: 13248)
[PASS] test_CapEnforcedAt10() (gas: 742110)
[PASS] test_DuplicateVouchReverts() (gas: 89412)
[PASS] test_FuzzLabelValidation(string) (runs: 256, μ: 24102, ~: 24102)
[PASS] test_GetIncomingVouchesViaLogs() (gas: 88204)
[PASS] test_GetOutgoingVouches() (gas: 181290)
[PASS] test_InvalidLabelReverts() (gas: 14510)
[PASS] test_UnvouchRemovesAndReclaimsSlot() (gas: 121540)
[PASS] test_UnvouchRevertsWhenNotVouched() (gas: 15120)
[PASS] test_VouchEmitsEvent() (gas: 85210)
Test result: ok. 10 passed; 0 failed; 0 skipped; finished in 18.42ms

Running 2 tests for test/VouchInvariant.t.sol:VouchInvariantTest
[PASS] invariant_AddressCannotExceed10Outgoing() (runs: 256, calls: 32768, reverts: 0)
[PASS] invariant_NoSelfVouches() (runs: 256, calls: 32768, reverts: 0)
Test result: ok. 2 passed; 0 failed; 0 skipped; finished in 4.12s
```
**Total Forge Suites**: 2 suites, 12 tests passed, 0 failures.

### Unit Tests
```bash
$ npm run test:unit
Test Files  11 passed (11)
     Tests  57 passed (57)
  Duration  1.42s
```

### Integration Tests
```bash
$ npm run test:integration
Test Files  2 passed (2)
     Tests  14 passed (14)
  Duration  3.88s
```
Includes ABI parity check against compiled artifacts (`abi-matches-contract`).

### Mutation Check
```bash
$ python3 scripts/mutation-check.py vouch
Mutants generated: 9
Mutants killed: 9
Mutants survived: 0
Kill rate: 100.0%
```

### Static Analysis & Contract Checks
```bash
$ python3 scripts/check-tokens.py vouch
Checked vouch: 0 undefined tokens found.

$ python3 scripts/check-ui-contract.py vouch
Checked vouch: 0 contract violations found.

$ python3 scripts/check-distinct.py vouch
Checked vouch: 0 distinctness issues found across all 31 projects.

$ python3 scripts/check-honesty.py vouch
Checked vouch: 0 honesty violations found.
```

---

## 3. Measured Contrast Pairs (Wallet Menu)
Evaluated against WCAG AAA standards:
- `--menu-fg` (`#E7ECFF`) on `--menu-bg` (`#141B45`): **14.1:1** (Target: ≥ 4.5:1, Pass AAA)
- `--menu-muted` (`#A2ABDE`) on `--menu-bg` (`#141B45`): **8.8:1** (Target: ≥ 4.5:1, Pass AAA)
- `--menu-danger` (`#FFB3C7`) on `--menu-bg` (`#141B45`): **9.8:1** (Target: ≥ 4.5:1, Pass AAA)
- `--menu-fg` (`#E7ECFF`) on `--menu-hover-bg` (`#252F70`): **11.4:1** (Target: ≥ 4.5:1, Pass AAA)
- `--menu-border` (`#4A5496`) on `--menu-bg` (`#141B45`): **2.4:1** (Target: ≥ 2.0:1 UI boundary)

---

## 4. Gas Table at 20 gwei
| Operation | Min Gas | Avg Gas | Max Gas | Cost at 20 gwei ($2000 ETH) |
| :--- | :--- | :--- | :--- | :--- |
| `vouch(address, string)` (initial) | 68,410 | 72,126 | 89,400 | ~\$0.0029 |
| `vouch(address, string)` (subsequent) | 48,200 | 51,340 | 54,200 | ~\$0.0021 |
| `unvouch(address)` | 31,450 | 38,241 | 42,800 | ~\$0.0015 |

---

## 5. Local Stack Role Table
| Role / Account | Address | Outgoing | Incoming | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Account 0 (Hub) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | 4 | 5 | Core founder account ("founder", "co-founder", "auditor", "designer") |
| Account 1 (Peer) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | 3 | 2 | Vouched by Acc 0 & Acc 4 |
| Account 2 (Peer) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | 2 | 2 | Vouched by Acc 0 & Acc 4 |
| Account 3 (Peer) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | 1 | 2 | Vouched by Acc 0 & Acc 4 |
| Account 4 (Capped) | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | 9 | 1 | 9/10 cap test account (exercises limits banner and near-cap states) |
| Account 5 (Leaf) | `0x9965507D1a55bcC7856379543965542b40F11226` | 0 | 2 | Endorsed peer |
| Account 6 (Leaf) | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | 0 | 2 | Endorsed peer |
| Dead / Empty Address | `0x000000000000000000000000000000000000dEaD` | 0 | 0 | Tests the Empty Sky state |

---

## 6. Browser Pass Walkthrough Log
Verified via automated Chrome DevTools Protocol pass across desktop (1280px) and mobile (360px):
- **`/` (Disconnected, 1280px)**: Title rendered, all 3 footer links present, no overflow (`scrollWidth: 1265px`).
- **Connected State**: Injected mock wallet, clicked dropdown trigger, verified Radix menu styling:
  - `bg`: `rgb(20, 27, 69)`
  - `border`: `rgb(74, 84, 150)`
  - `color`: `rgb(231, 236, 255)`
  - Menu items: `["Copy address", "Disconnect"]`.
- **`/a/[ACC_0]` (1280px)**: SVG StarMap rendered with gold center star, incoming/outgoing orbits, 3 footer links.
- **`/a/[ACC_4]` (1280px)**: Outgoing count banner rendered ("9 outgoing"), star map rendered.
- **`/a/0x...dEaD` (1280px)**: Empty sky message rendered ("No one has vouched for this address yet..."), 0 outgoing / 0 incoming.
- **`/a/invalid` (1280px)**: "That isn't a valid address" error state rendered, 3 footer links.
- **`/me` (Connected, 1280px)**: "Manage Vouches: 0xf39F…2266", 4 of 10 outgoing endorsements active, 5 incoming, Revoke buttons present.
- **`/v/[ACC_0]/[ACC_1]` (1280px)**: Receipt card rendered, "Active Endorsement" badge, label `"co-founder"`, 3 footer links.
- **`/random-void-route` (1280px)**: 404 page rendered ("404 — Void in the Sky"), 3 footer links.
- **`/` (Mobile, 360px)**: `scrollWidth: 360px`, `clientWidth: 360px`, `noHorizontalOverflow: true`, 3 footer links.
- **`/a/[ACC_0]` (Mobile, 360px)**: `scrollWidth: 360px`, `clientWidth: 360px`, `noHorizontalOverflow: true`, 3 footer links.
- **Console Errors logged**: 0.
- **Hydration Warnings**: 0.

---

## 7. Deviations, Open Questions, and Suggestions
- **Deviations**: None.
- **Open Questions**: None.
- **Suggestions**: None.
