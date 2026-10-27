import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  BaseError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { vouchAbi } from "@/lib/botchain/abi";
import {
  MAX_OUT,
  encodeLabel,
  decodeLabel,
  foldIncomingEdges,
} from "@/lib/vouch";
import { getLogsChunked } from "@/lib/logs";

const PORT = 8620;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968 as const;

const KEY_ALICE = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const KEY_BOB = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const KEY_CHARLIE = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const local = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

let node: ChildProcess;
let publicClient: PublicClient;
let walletAlice: WalletClient;
let walletBob: WalletClient;
let address: Address;
let deployBlock: bigint;

const accountAlice = privateKeyToAccount(KEY_ALICE);
const accountBob = privateKeyToAccount(KEY_BOB);
const accountCharlie = privateKeyToAccount(KEY_CHARLIE);

function revertDetails(err: unknown): { errorName?: string; args?: readonly unknown[] } | undefined {
  if (!(err instanceof BaseError)) return undefined;
  const found = err.walk(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      "data" in e &&
      Boolean((e as { data?: { errorName?: string } }).data?.errorName),
  ) as { data?: { errorName?: string; args?: readonly unknown[] } } | null;
  return found?.data;
}

beforeAll(async () => {
  node = spawn(
    "anvil",
    ["--port", String(PORT), "--chain-id", String(CHAIN_ID), "--silent"],
    { stdio: ["ignore", "ignore", "inherit"] }
  );

  publicClient = createPublicClient({ chain: local, transport: http(), cacheTime: 0 }) as PublicClient;
  walletAlice = createWalletClient({ account: accountAlice, chain: local, transport: http() });
  walletBob = createWalletClient({ account: accountBob, chain: local, transport: http() });

  for (let i = 0; ; i++) {
    try {
      await publicClient.getBlockNumber();
      break;
    } catch {
      if (i > 100) throw new Error(`anvil never answered on ${RPC}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const artifact = JSON.parse(
    readFileSync(
      new URL("../../contracts/out/Vouch.sol/Vouch.json", import.meta.url),
      "utf8",
    ),
  ) as { bytecode: { object: Hex } };

  const hash = await walletAlice.deployContract({
    abi: vouchAbi,
    bytecode: artifact.bytecode.object,
    account: accountAlice,
    chain: local,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  expect(receipt.status).toBe("success");
  address = receipt.contractAddress!;
  deployBlock = receipt.blockNumber;

  process.env.NEXT_PUBLIC_BOHR_RPC = RPC;
  process.env.NEXT_PUBLIC_BOTCHAIN_NETWORK = "testnet";
  process.env.NEXT_PUBLIC_CONTRACT_968 = address;
  process.env.NEXT_PUBLIC_DEPLOY_BLOCK_968 = String(deployBlock > 1n ? deployBlock - 1n : 1n);
}, 60_000);

afterAll(() => {
  node?.kill("SIGTERM");
});

describe("Vouch integration on local EVM", () => {
  it("deploys successfully", () => {
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("MAX_OUT constant matches between contract and TypeScript lib", async () => {
    const onChainMax = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "MAX_OUT",
    });
    expect(Number(onChainMax)).toBe(MAX_OUT);
  });

  it("happy path: vouch and outgoing/incoming reads", async () => {
    const rawLabel = encodeLabel("colleague");
    const hash = await walletAlice.writeContract({
      address,
      abi: vouchAbi,
      functionName: "vouch",
      args: [accountBob.address, rawLabel],
      chain: local,
      account: accountAlice,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const isV = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "isVouched",
      args: [accountAlice.address, accountBob.address],
    });
    expect(isV).toBe(true);

    const [tos, labels, sinces] = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "outgoing",
      args: [accountAlice.address],
    });
    expect(tos.length).toBe(1);
    expect(tos[0].toLowerCase()).toBe(accountBob.address.toLowerCase());
    expect(decodeLabel(labels[0])).toBe("colleague");
    expect(sinces[0]).toBeGreaterThan(0n);

    const inc = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "incoming",
      args: [accountBob.address],
    });
    expect(inc).toBe(1);

    const total = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "totalVouches",
    });
    expect(total).toBe(1n);
  });

  it("happy path: unvouch restores zero state", async () => {
    const hash = await walletAlice.writeContract({
      address,
      abi: vouchAbi,
      functionName: "unvouch",
      args: [accountBob.address],
      chain: local,
      account: accountAlice,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const isV = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "isVouched",
      args: [accountAlice.address, accountBob.address],
    });
    expect(isV).toBe(false);

    const [tos] = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "outgoing",
      args: [accountAlice.address],
    });
    expect(tos.length).toBe(0);

    const inc = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "incoming",
      args: [accountBob.address],
    });
    expect(inc).toBe(0);
  });

  it("reverts on BadTarget(0)", async () => {
    try {
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "vouch",
        args: ["0x0000000000000000000000000000000000000000", encodeLabel("test")],
        chain: local,
        account: accountAlice,
      });
      expect.unreachable("expected BadTarget revert");
    } catch (err) {
      const details = revertDetails(err);
      expect(details?.errorName).toBe("BadTarget");
    }
  });

  it("reverts on BadTarget(self)", async () => {
    try {
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "vouch",
        args: [accountAlice.address, encodeLabel("self")],
        chain: local,
        account: accountAlice,
      });
      expect.unreachable("expected BadTarget revert");
    } catch (err) {
      const details = revertDetails(err);
      expect(details?.errorName).toBe("BadTarget");
    }
  });

  it("reverts on AlreadyVouched", async () => {
    await walletAlice.writeContract({
      address,
      abi: vouchAbi,
      functionName: "vouch",
      args: [accountBob.address, encodeLabel("first")],
      chain: local,
      account: accountAlice,
    });

    try {
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "vouch",
        args: [accountBob.address, encodeLabel("duplicate")],
        chain: local,
        account: accountAlice,
      });
      expect.unreachable("expected AlreadyVouched revert");
    } catch (err) {
      const details = revertDetails(err);
      expect(details?.errorName).toBe("AlreadyVouched");
    }

    // cleanup
    await walletAlice.writeContract({
      address,
      abi: vouchAbi,
      functionName: "unvouch",
      args: [accountBob.address],
      chain: local,
      account: accountAlice,
    });
  });

  it("reverts on NotVouched", async () => {
    try {
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "unvouch",
        args: [accountCharlie.address],
        chain: local,
        account: accountAlice,
      });
      expect.unreachable("expected NotVouched revert");
    } catch (err) {
      const details = revertDetails(err);
      expect(details?.errorName).toBe("NotVouched");
    }
  });

  it("reverts on TooManyVouches when reaching eleventh", async () => {
    // Fill up to 10 vouches for Alice
    for (let i = 1; i <= 10; i++) {
      const target = `0x${String(i).padStart(40, "0")}` as Address;
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "vouch",
        args: [target, encodeLabel(`idx-${i}`)],
        chain: local,
        account: accountAlice,
      });
    }

    try {
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "vouch",
        args: [accountBob.address, encodeLabel("eleventh")],
        chain: local,
        account: accountAlice,
      });
      expect.unreachable("expected TooManyVouches revert");
    } catch (err) {
      const details = revertDetails(err);
      expect(details?.errorName).toBe("TooManyVouches");
    }

    // cleanup 10 vouches
    for (let i = 1; i <= 10; i++) {
      const target = `0x${String(i).padStart(40, "0")}` as Address;
      await walletAlice.writeContract({
        address,
        abi: vouchAbi,
        functionName: "unvouch",
        args: [target],
        chain: local,
        account: accountAlice,
      });
    }
  });

  it("fold of logs equals contract state", async () => {
    const hash = await walletBob.writeContract({
      address,
      abi: vouchAbi,
      functionName: "vouch",
      args: [accountCharlie.address, encodeLabel("stellar dev")],
      chain: local,
      account: accountBob,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const vouchEvent = vouchAbi.find((e) => e.type === "event" && e.name === "Vouched") as any;
    const { logs } = await getLogsChunked({
      client: publicClient,
      address,
      event: vouchEvent,
      fromBlock: deployBlock,
    });
    const parsedLogs = logs.map((l: any) => ({
      eventName: "Vouched" as const,
      args: l.args,
      blockNumber: l.blockNumber,
      logIndex: l.logIndex,
    }));

    const folded = foldIncomingEdges(parsedLogs, accountCharlie.address);
    expect(folded.length).toBe(1);
    expect(folded[0].from.toLowerCase()).toBe(accountBob.address.toLowerCase());
    expect(folded[0].label).toBe("stellar dev");

    const onChainInc = await publicClient.readContract({
      address,
      abi: vouchAbi,
      functionName: "incoming",
      args: [accountCharlie.address],
    });
    expect(Number(onChainInc)).toBe(folded.length);
  });
});
