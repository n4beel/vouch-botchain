# Vouch: design decisions

2026-10-27. Covers `contracts/src/Vouch.sol` as deployed. The contract is immutable once deployed,
so every choice below is permanent for that deployment.

## What the spec fixed
- Single entry contract `Vouch` in `contracts/src/Vouch.sol` with no owner, admin, pause, proxy, or upgradeability.
- `MAX_OUT` constant pinned to 10 active outgoing vouches per wallet.
- Storage schema: `_out` mapping to array of `Edge` structs, `vouched` 2D mapping, `incoming` counter, and `totalVouches` counter.
- Functions: `vouch(address other, bytes16 label)`, `unvouch(address other)`, `outgoing(address who)`, and `isVouched(address from, address to)`.
- Reverts: `BadTarget` on address(0) or self-vouch, `AlreadyVouched` on duplicates, `TooManyVouches` on exceeding 10, `NotVouched` on missing edge.
- Events: `Vouched(address indexed from, address indexed to, bytes16 label)`, `Unvouched(address indexed from, address indexed to)`.
- Pure non-custodial: no payable functions, no native BOT custody (`balance == 0`).

## Choices made beyond the spec

| Decision | Why | Consequence |
|---|---|---|
| Packing `address to` (20B) + `uint64 since` (8B) into slot 0 | Fits within 28 bytes of slot 0, saving 1 full 32-byte storage slot per edge | `since` is capped at uint64 (~584 billion years) |
| Swap-and-pop with `while` loop search bounded to ≤ 10 items | Eliminates need for extra index mapping while bounding loop execution to max 10 iterations | Order of outgoing edges changes upon revocation |
| Strict rejection of native currency without `receive()`/`fallback()` | Prevents accidental loss of user funds sent to contract | Direct transfers fail and return funds immediately |

## Known risks, accepted
1. **Sybil endorsement rings.** Anyone can generate arbitrary keypairs and vouch in circular rings. The protocol makes no claim of Sybil resistance; the UI prominently explains that a vouch is an opinion and users must inspect *who* vouches rather than relying on raw numbers.
2. **Order mutation on unvouch.** Revoking an edge moves the tail edge to the vacated slot. The UI renders nodes deterministically using address hashes and sorting so visual maps remain stable regardless of storage index.

## How it was checked
- Tests: 12 Foundry tests (10 unit/fuzz tests with 256 runs, plus 2 invariant test suites running 256 runs x 128 depth across 5 independent actors).
- Mutation check: `python3 scripts/mutation-check.py vouch`: 9 mutants tested, 9 killed (100% killed, 0 survivors).
- Integration tests: 14 vitest integration tests against live local anvil EVM validating deployment, constants, full transaction lifecycle, every custom error selector/argument, and historical log folding.
- Unit tests: 57 tests covering label encoding/decoding, edge folding, deterministic layout math, and error mapping.
- Not checked: Mainnet fork state (local anvil clean genesis used).
