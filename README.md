# Z-Ballot

Z-Ballot is an encrypted on-chain survey for AI-related questions built on Zama FHEVM. It lets users submit answers
privately, keeps per-option counts encrypted on-chain, and reveals results for a single question only when requested.

## Project overview

Z-Ballot collects responses to 5 fixed questions. Each question has 2 to 4 answer options. The UI encrypts each answer
client-side using the Zama Relayer SDK and submits encrypted handles and proofs to the smart contract. The contract
updates encrypted counts for each option. No plaintext answers are stored on-chain at any time.

When a user requests results for a specific question, the contract makes only that question's encrypted counts publicly
decryptable. The relayer can then return clear counts for that one question, while all other questions remain fully
encrypted.

## Advantages

- Privacy by design: answers stay encrypted end-to-end.
- Verifiable aggregation: counts are updated on-chain, not in a backend.
- Selective disclosure: only the requested question becomes publicly decryptable.
- Minimal trust: no centralized server is needed for tallying.
- Clear audit trail: submissions and result requests emit events.

## Problems this project solves

- Surveys can be auditable without revealing individual answers.
- Result transparency does not require exposing raw response data.
- Partial disclosure lets communities share specific results without unlocking the full dataset.

## End-to-end flow

1. User connects a wallet in the React app.
2. User selects options for all 5 questions.
3. The frontend encrypts each answer with the Zama relayer SDK and sends one transaction.
4. The contract updates encrypted per-option counts for each question.
5. A requester chooses one question to reveal and calls `makeQuestionResultsPublic`.
6. The relayer decrypts only that question's counts for display in the UI.

## Smart contract design

Contract: `contracts/ZBallotSurvey.sol`

Key details:

- Questions are fixed at 5.
- Maximum options per question is 4.
- Options per question:
  - Question 0: 3 options
  - Question 1: 4 options
  - Question 2: 2 options
  - Question 3: 3 options
  - Question 4: 4 options
- Counts are stored as `euint32` values in a `QUESTION_COUNT x MAX_OPTIONS` matrix.
- One submission per address is enforced.

Primary functions:

- `submitSurvey(...)`: accepts encrypted answers for all five questions and updates encrypted counts.
- `makeQuestionResultsPublic(questionId)`: makes only the chosen question's counts publicly decryptable.
- `getEncryptedCounts(questionId)`: returns encrypted counts for UI or relayer decryption.
- `optionCount(questionId)`: returns the number of options for a question.

Events:

- `SurveySubmitted(address voter)`
- `QuestionResultsMadePublic(uint8 questionId, address requester)`

## Frontend architecture

Frontend location: `home/`

Key points:

- React + Vite + TypeScript
- Wallet connection with RainbowKit and Wagmi
- Reads via Viem, writes via Ethers
- Encryption and decryption through `@zama-fhe/relayer-sdk`
- Contract address and ABI are kept in `home/src/config/contracts.ts` (generated from `deployments/sepolia`)

## Tech stack

Smart contracts:

- Solidity 0.8.27
- Hardhat + hardhat-deploy
- Zama FHEVM libraries and plugin

Frontend:

- React 19 + Vite
- TypeScript
- Viem (read-only RPC calls)
- Ethers v6 (transactions)
- RainbowKit + Wagmi
- Zama Relayer SDK

## Repository structure

- `contracts/` - Solidity contracts
- `deploy/` - Hardhat deploy scripts
- `tasks/` - Hardhat tasks for survey interaction and ABI sync
- `test/` - Contract tests
- `home/` - React frontend
- `deployments/` - Deployment outputs and ABI artifacts

## Setup

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

Root:

```bash
npm install
```

Frontend:

```bash
cd home
npm install
```

### Environment configuration

Create a `.env` in the repository root with:

```
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=optional
```

Notes:

- Deployment uses a single `PRIVATE_KEY` for Sepolia.
- Seed-phrase based configuration is not supported.

## Contract workflows

### Compile

```bash
npm run compile
```

### Test

```bash
npm run test
```

### Deploy to local Hardhat node

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia
```

### Verify on Sepolia

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Hardhat tasks

Print contract address:

```bash
npx hardhat survey:address
```

Submit an encrypted survey:

```bash
npx hardhat survey:vote --q0 1 --q1 2 --q2 0 --q3 1 --q4 3
```

Decrypt one question (optionally make it public first):

```bash
npx hardhat survey:decrypt-question --question 0 --makepublic true
```

Sync ABI + address into the frontend:

```bash
npx hardhat survey:sync-frontend-abi
```

## Frontend workflows

### Update contract config

After deploying to Sepolia, sync the ABI and address:

```bash
npx hardhat survey:sync-frontend-abi
```

This writes `home/src/config/contracts.ts` using `deployments/sepolia/ZBallotSurvey.json`.

### Run locally

```bash
cd home
npm run dev
```

Connect a wallet to Sepolia to submit encrypted responses and request a single-question result.

### Build

```bash
cd home
npm run build
```

## Security and privacy notes

- Individual answers are never stored in plaintext on-chain.
- Only encrypted counts are stored and updated.
- Results are disclosed one question at a time and only after a request.
- The system enforces one submission per address; it does not prevent sybil wallets.

## Limitations

- Question set is fixed in the contract; changes require a new deployment.
- Public results are only available through the relayer after a request.
- Address-based uniqueness is not a strong identity guarantee.

## Future roadmap

- Support multiple surveys with separate IDs.
- Governance-controlled question sets and option counts.
- Allow time-bounded survey windows and on-chain finalization.
- Add anti-sybil signals or attestations.
- Add result export and indexing APIs for analytics.
- Improve UI for comparing questions while preserving privacy.

## License

BSD-3-Clause-Clear (see `LICENSE`).
