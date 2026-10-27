# Vouch

Say who you trust. In public.

Vouch is a directed, capped, revocable web of trust on BOT Chain. Each wallet can vouch for up to 10 other wallets at a time with a short context label ("worked together", "core dev", "paid on time"). Vouches can be withdrawn at any time.

## What it does
- **Public Endorsement:** Call `vouch(other, label)` to record a directed endorsement for another address with up to 16 ASCII bytes of context.
- **Capped Web of Trust:** Each wallet is capped at 10 active outgoing vouches (`MAX_OUT = 10`), making endorsements selective.
- **Revocable:** Call `unvouch(other)` anytime to revoke an endorsement.
- **Interactive Constellation Star Map:** View who any wallet vouches for and who vouches for it as an interactive SVG star map (`/a/<address>`).
- **Shareable Vouch Receipts:** Direct verifiable links for individual endorsements (`/v/<from>/<to>`).

## What it deliberately cannot do
- **Not an identity check:** A vouch is an opinion, not a verification of identity. Nothing verifies the truth of the label.
- **No Sybil resistance:** Wallets are free to make; a ring of fake wallets can vouch for each other. Read *who* vouches, not *how many*.
- **No reputation scores:** There is no score, ranking, or numeric reputation calculation, on purpose.
- **No custody of funds:** The contract accepts no funds and holds no tokens; incoming transfers are rejected.
- **No admin or owner:** No owner keys, pause controls, or upgradeability.

## Gas profile
Calculated at 20 gwei gas price:

| Operation | Gas Used | Cost (BOT at 20 gwei) |
|---|---|---|
| `vouch(address, bytes16)` | 106,840 | ~0.00214 BOT |
| `unvouch(address)` | 50,966 | ~0.00102 BOT |
| `outgoing(address)` | 11,315 (view) | Free |
| `incoming(address)` | 2,534 (view) | Free |
| `isVouched(address, address)` | 2,808 (view) | Free |
| `totalVouches()` | 2,361 (view) | Free |

## Development & Local Stack

Run the local stack with rich seeded accounts (chain id 968 on port 8720):
```bash
node scripts/local-stack.mjs
npm run dev
```

Run tests:
```bash
# Contract tests & gas report
cd contracts && forge test --gas-report

# Frontend unit & lint tests
npm test

# Integration tests on live anvil node
npm run test:integration
```

## Contract deployments
- **Mainnet (Chain ID 677):** `TBD` (Deploy block: `TBD`)
- **Bohr Testnet (Chain ID 968):** `TBD` (Deploy block: `TBD`)

Explorer: [https://scan.botchain.ai](https://scan.botchain.ai)
