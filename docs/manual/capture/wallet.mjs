/**
 * Test-wallet injection for the manual's capture scripts.
 *
 * Playwright has no MetaMask, so each browser context gets an EIP-1193
 * provider on `window.ethereum` whose signing and sending happen in Node with
 * a viem account built from one of the funded Sepolia keys in web/.env.e2e.
 * The keys are read at runtime and never written into the manual.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const VIEM = path.join(REPO, "web/node_modules/viem/_esm");

const { createWalletClient, createPublicClient, http } = await import(path.join(VIEM, "index.js"));
const { sepolia } = await import(path.join(VIEM, "chains/index.js"));
const { privateKeyToAccount } = await import(path.join(VIEM, "accounts/index.js"));

export const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

function readEnv() {
  const text = readFileSync(path.join(REPO, "web/.env.e2e"), "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const ENV = readEnv();

/** role → env key: SME, INVESTOR_A, INVESTOR_A2, DEBTOR, DEBTOR_AP */
export function accountFor(role) {
  const pk = ENV[`${role}_PK`];
  if (!pk) throw new Error(`web/.env.e2e has no ${role}_PK`);
  return privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
}

/** Every tx hash sent through an injected wallet, in order. */
export const sentTxs = [];

/**
 * Install the provider into a context. Must run before the first navigation
 * of any page that should see the wallet.
 *
 * `chainId` (hex string, default Sepolia `0xaa36a7`) lets a capture script
 * fake a wrong-network wallet cheaply — e.g. `"0x1"` for mainnet — to
 * photograph `ChainGuard`'s banner without a real chain switch.
 */
export async function installWallet(context, role, { origin, chainId = "0xaa36a7" } = {}) {
  const account = accountFor(role);
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });

  await context.exposeFunction("__walletRpc", async (method, params) => {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
    });
    const body = await res.json();
    return body.error ? { error: body.error } : { result: body.result };
  });

  await context.exposeFunction("__walletSend", async (tx) => {
    try {
      const hash = await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        ...(tx.gas ? { gas: BigInt(tx.gas) } : {}),
      });
      sentTxs.push({ role, hash, to: tx.to, selector: (tx.data ?? "").slice(0, 10) });
      console.log(`  ⛓  ${role} sent ${hash}`);
      return { result: hash };
    } catch (e) {
      console.warn(`  ⛓  ${role} send failed: ${e.shortMessage ?? e.message}`);
      return { error: { code: -32603, message: e.shortMessage ?? e.message } };
    }
  });

  await context.exposeFunction("__walletSign", async (kind, payload) => {
    try {
      if (kind === "personal") {
        return { result: await account.signMessage({ message: { raw: payload } }) };
      }
      const typed = typeof payload === "string" ? JSON.parse(payload) : payload;
      const { EIP712Domain: _drop, ...types } = typed.types;
      return {
        result: await account.signTypedData({
          domain: typed.domain,
          types,
          primaryType: typed.primaryType,
          message: typed.message,
        }),
      };
    } catch (e) {
      return { error: { code: -32603, message: e.message } };
    }
  });

  await context.addInitScript(
    ({ address, origin, chainId }) => {
      if (origin && location.origin !== origin) return;
      if (window.top !== window) return;

      const KEY = "__manualWalletAuthorized";
      const authorized = () => {
        try {
          return localStorage.getItem(KEY) === address;
        } catch {
          return false;
        }
      };
      const authorize = (on) => {
        try {
          on ? localStorage.setItem(KEY, address) : localStorage.removeItem(KEY);
        } catch {}
      };
      const listeners = {};
      const emit = (event, ...args) => (listeners[event] ?? []).slice().forEach((fn) => fn(...args));
      const unwrap = (r) => {
        if (r && r.error) {
          throw Object.assign(new Error(r.error.message), { code: r.error.code, data: r.error.data });
        }
        return r.result;
      };

      const provider = {
        isMetaMask: true,
        isManualTestWallet: true,
        chainId,
        on(event, fn) {
          (listeners[event] ??= []).push(fn);
          return provider;
        },
        removeListener(event, fn) {
          listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
          return provider;
        },
        off(event, fn) {
          return provider.removeListener(event, fn);
        },
        isConnected: () => true,
        async request({ method, params }) {
          switch (method) {
            case "eth_chainId":
              return chainId;
            case "net_version":
              return String(parseInt(chainId, 16));
            case "eth_accounts":
              // Like MetaMask: nothing until this origin has been approved once.
              return authorized() ? [address] : [];
            case "eth_requestAccounts":
              authorize(true);
              return [address];
            case "wallet_requestPermissions":
            case "wallet_getPermissions":
              if (method === "wallet_requestPermissions") authorize(true);
              return authorized()
                ? [
                    {
                      parentCapability: "eth_accounts",
                      caveats: [{ type: "restrictReturnedAccounts", value: [address] }],
                    },
                  ]
                : [];
            case "wallet_revokePermissions":
              authorize(false);
              return null;
            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
            case "wallet_watchAsset":
              return null;
            case "personal_sign":
              return unwrap(await window.__walletSign("personal", params[0]));
            case "eth_signTypedData_v4":
              return unwrap(await window.__walletSign("typed", params[1]));
            case "eth_sendTransaction":
              return unwrap(await window.__walletSend(params[0]));
            default:
              return unwrap(await window.__walletRpc(method, params ?? []));
          }
        },
      };
      window.ethereum = provider;

      const info = {
        uuid: "7f1c2b3a-0000-4000-8000-5e1c7a0d0001",
        name: "Manual Test Wallet",
        icon:
          "data:image/svg+xml;base64," +
          btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#e11d48"/></svg>'),
        rdns: "dev.seikyu.manual-wallet",
      };
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }),
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
      setTimeout(() => emit("connect", { chainId: "0xaa36a7" }), 0);
    },
    { address: account.address, origin: origin ?? null, chainId },
  );

  return account;
}

export async function waitReceipt(hash) {
  const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
  console.log(`  ✓ ${hash} ${r.status} (block ${r.blockNumber})`);
  if (r.status !== "success") throw new Error(`tx ${hash} ${r.status}`);
  return r;
}
