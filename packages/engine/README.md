# @toli/engine

The pure money engine. The spec is [docs/07-calculation-engine.md](../../docs/07-calculation-engine.md); if this code and that doc disagree, one is a bug.

- **Pure:** no I/O, no clock, no randomness. The same source runs in Expo (Hermes) and in Supabase Edge Functions (Deno).
- **Money is `bigint` minor units only.** No `number` ever holds money.
- **Zero runtime dependencies.** Relative imports carry explicit `.ts` extensions so Deno can load the source unchanged.

| Area | API |
|---|---|
| Money | `currencyExponent`, `SUPPORTED_CURRENCIES`, `formatMoney(amount, ccy, { signed })`, `spokenMoney`, `parseMajor`, `ENGINE_VERSION` |
| Rounding | `allocate(total, weights, keys, seed)`, the only function that divides money; `fnv1a32` |
| FX | `parseRate`, `convertToBase`, `crossRate`, `IDENTITY_RATE` |
| Split | `computeShares(expenseId, amount, spec)` for equal, selected, exact, percent, shares, adjustment and itemised; `distributeRemainder`, `validatePayers`, `toBase` |
| Balances | `computeBalances(ledger)` → `{ trip, settle, kittyCash, kittyBalance, kittyHolder, kittyIn, kittySpent }`; `explainBalance(ledger, member, 'trip' \| 'settle')`; `checkRemovedMembers` |
| Settle | `simplify`, `directPayments`, `northWestPairs`, `roundingAdjustments`, `splitForUpi`, `whyLines` |
| Kitty | `kittyRefunds`, `isKittyLow`, `topUpSuggestion` |

```sh
pnpm --filter @toli/engine test             # unit, golden G1–G16, properties (FC_RUNS=200)
FC_RUNS=1000 pnpm --filter @toli/engine test # the weekly CI depth
pnpm --filter @toli/engine test:coverage    # fails below 100% lines/branches/functions
```
