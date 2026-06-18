# TipJar

A small full-stack dApp for the [Base](https://base.org) ecosystem: anyone can
send (tip) ETH with a message, the contract keeps an on-chain leaderboard of
top tippers, and only the owner can withdraw the funds.

Project 2 in a learning series (after the Onchain Guestbook). New concepts:
**handling real ETH** — `payable` functions, a safe `call`-based withdrawal,
and owner-only access control.

## Stack

- [Hardhat 2](https://hardhat.org) — compile, test, deploy
- Solidity `0.8.24`
- Target chain: Base Sepolia (testnet)

## Getting started

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Contract

`contracts/TipJar.sol`

| Function | Description |
| --- | --- |
| `tip(string message)` *(payable)* | Send ETH with an optional message |
| `withdraw()` *(owner)* | Withdraw the full balance to the owner |
| `totalTips()` | Lifetime total tipped (wei) |
| `totalTipped(address)` | Total tipped by one address |
| `getTips()` | All tip records |
| `getLeaderboard()` | Unique tippers + their totals (sort in UI) |
| `contractBalance()` | Current ETH held |

Emits `Tipped` on each tip and `Withdrawn` on withdrawal.

## Roadmap

- [x] TipJar contract + tests
- [ ] Deploy to Base Sepolia
- [ ] Frontend (tip with message, live leaderboard, owner withdraw)

## Security notes

- Withdrawal uses the recommended `call` pattern with a success check.
- Secrets (`.env`, private keys) are git-ignored and never committed.
- All development targets a **testnet** — no real funds.

## License

MIT
