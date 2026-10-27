/**
 * Local stack runner and seeder for Vouch.
 *
 * Spawns anvil on port 8720 with chain id 968, deploys Vouch, and seeds:
 * - Account 0: vouches for 4 (labels) & received vouches from Accounts 1-3
 * - Accounts 1-3: each vouches for Account 0
 * - Account 4: vouches for 9 others (one short of the cap: 9/10)
 * - Account 5: vouches for 10 others (at the maximum cap: 10/10)
 * - Account 6: fresh account with 0 outgoing vouches
 *
 * Usage:
 *   node scripts/local-stack.mjs
 *   npm run dev
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodeLabel } from "../lib/vouch.ts";

const PORT = 8720;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // (0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // (1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // (2) 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // (3) 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // (4) 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // (5) 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e", // (6) 0x976EA74026E726554dB657fA54763abd0C3a0aa9
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356", // (7) 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97", // (8) 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", // (9) 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
];

const accounts = KEYS.map((k) => privateKeyToAccount(k));

const local = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
} catch {}

console.log(`Starting anvil on port ${PORT}...`);
spawn(
  "anvil",
  [
    "--port",
    String(PORT),
    "--chain-id",
    String(CHAIN_ID),
    "--accounts",
    "10",
    "--block-time",
    "1",
    "--silent",
  ],
  {
    detached: true,
    stdio: "ignore",
  }
).unref();

const pub = createPublicClient({ chain: local, transport: http() });

// Wait for anvil to answer
for (let i = 0; ; i++) {
  try {
    await pub.getBlockNumber();
    break;
  } catch {
    if (i > 100) throw new Error(`anvil never answered on ${RPC}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const artifact = JSON.parse(
  readFileSync(new URL("../contracts/out/Vouch.sol/Vouch.json", import.meta.url), "utf8"),
);

const deployerWallet = createWalletClient({
  account: accounts[0],
  chain: local,
  transport: http(),
});

const deployHash = await deployerWallet.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
});
const deployed = await pub.waitForTransactionReceipt({ hash: deployHash });
const contractAddress = deployed.contractAddress;
const startBlock = deployed.blockNumber > 1n ? deployed.blockNumber - 1n : 1n;

console.log(`Deployed Vouch to ${contractAddress} at block ${deployed.blockNumber}`);

// Helper to send vouch
async function sendVouch(fromAccount, toAddress, labelText) {
  const w = createWalletClient({ account: fromAccount, chain: local, transport: http() });
  const hash = await w.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "vouch",
    args: [toAddress, encodeLabel(labelText)],
  });
  await pub.waitForTransactionReceipt({ hash });
}

console.log("Seeding states...");

// 1. Account 0 vouches for 4 accounts
await sendVouch(accounts[0], accounts[1].address, "co-founder");
await sendVouch(accounts[0], accounts[2].address, "core dev");
await sendVouch(accounts[0], accounts[3].address, "auditor");
await sendVouch(accounts[0], accounts[7].address, "designer");

// 2. Accounts 1-3 vouch for Account 0
await sendVouch(accounts[1], accounts[0].address, "trusted lead");
await sendVouch(accounts[2], accounts[0].address, "worked together");
await sendVouch(accounts[3], accounts[0].address, "paid on time");

// 3. Account 4 vouches for 9 others (1 short of cap: 9/10)
const targetsFor4 = [
  accounts[0].address,
  accounts[1].address,
  accounts[2].address,
  accounts[3].address,
  accounts[5].address,
  accounts[6].address,
  accounts[7].address,
  accounts[8].address,
  accounts[9].address,
];
for (let i = 0; i < targetsFor4.length; i++) {
  await sendVouch(accounts[4], targetsFor4[i], `peer ${i + 1}`);
}

// 4. Account 5 vouches for 10 others (at max cap: 10/10)
const targetsFor5 = [
  accounts[0].address,
  accounts[1].address,
  accounts[2].address,
  accounts[3].address,
  accounts[4].address,
  accounts[6].address,
  accounts[7].address,
  accounts[8].address,
  accounts[9].address,
  "0x1111111111111111111111111111111111111111",
];
for (let i = 0; i < targetsFor5.length; i++) {
  await sendVouch(accounts[5], targetsFor5[i], `partner ${i + 1}`);
}

// Account 6 has none

console.log("\n--- Vouch Local Stack Ready ---");
console.log(`Contract: ${contractAddress}`);
console.log(`RPC: ${RPC} (chain ${CHAIN_ID})\n`);

console.log("Account Role Table for Manual Verification:");
console.log("--------------------------------------------------------------------------------------");
console.log("| Acc # | Address                                    | Seed State                            |");
console.log("--------------------------------------------------------------------------------------");
console.log(`| 0     | ${accounts[0].address} | 4 outgoing, 5 incoming (mutual star)  |`);
console.log(`| 1     | ${accounts[1].address} | 1 outgoing -> Acc 0, 2 incoming       |`);
console.log(`| 2     | ${accounts[2].address} | 1 outgoing -> Acc 0, 2 incoming       |`);
console.log(`| 3     | ${accounts[3].address} | 1 outgoing -> Acc 0, 2 incoming       |`);
console.log(`| 4     | ${accounts[4].address} | 9 outgoing (1 short of cap: 9/10)     |`);
console.log(`| 5     | ${accounts[5].address} | 10 outgoing (at cap: 10/10)           |`);
console.log(`| 6     | ${accounts[6].address} | 0 outgoing (clean empty state)        |`);
console.log("--------------------------------------------------------------------------------------\n");

// Write .env.local
const envContent = [
  `NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet`,
  `NEXT_PUBLIC_BOHR_RPC=${RPC}`,
  `NEXT_PUBLIC_CONTRACT_968=${contractAddress}`,
  `NEXT_PUBLIC_DEPLOY_BLOCK_968=${startBlock}`,
  "",
].join("\n");

writeFileSync(".env.local", envContent);
console.log("Wrote .env.local");
