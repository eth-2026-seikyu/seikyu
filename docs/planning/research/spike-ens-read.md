# Spike S3: ENS v2 resolver reads (path R / path L)

**Owner:** exec-b1 · **Date:** 2026-09-26 · **Timebox:** 45 min · **Result:** both (a) and (b) PASS. Path R chosen: `resolve()` + read-multicall of `text(node,key)` against the per-invoice `PermissionedResolver` proxy, decoded via `decodeAbiParameters`/`decodeFunctionResult`. No fallback needed.

Code: `spike/ens-read/spike.ts` (gitignored, not committed — run it yourself per its header comment). Implementation landed in `web/lib/ens.ts`.

## Setup

- `anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8546` (chain id stays 11155111; forked at block ~11781484). No fallback RPC needed — `ethereum-sepolia-rpc.publicnode.com` was reachable throughout.
- Sepolia addresses used, tag `sepolia-deployment-2026-09-15` (verified against `contracts/lib/contracts-v2/contracts/deployments/sepolia/addresses.md`):
  - `VerifiableFactory` = `0x9e726eb570beb6bceb495ab8cda7df517d4e841c`
  - `PermissionedResolverImpl` = `0x14f09fd05d4585759e54844dc9b00147131cf243`
  - `UniversalResolverV2` = `0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3`
- `ROLE_SET_TEXT = 1 << 4`, `ROLE_SET_TEXT_ADMIN = ROLE_SET_TEXT << 128` — read from `contracts/src/resolver/libraries/PermissionedResolverLib.sol:16-18` (not guessed).
- Account: anvil's well-known default account #0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`), pre-funded on every fork.

## (a) Resolver read-multicall — PASS

Steps actually run against the fork:

1. **Deploy a resolver proxy**: `factory.deployProxy(PERMISSIONED_RESOLVER_IMPL, salt, initData)` where `initData = encodeFunctionData(initialize, [[{account: acct0, roleBitmap: ROLE_SET_TEXT | ROLE_SET_TEXT_ADMIN}]], [])`.
   - tx gas used: **177,568**.
   - The proxy address is **not** emitted as a return value you can read directly from a `writeContract` call — it's in the `ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)` event log. Pulled it from `receipt.logs[...].topics[2]` (address is the second indexed topic, left-padded to 32 bytes — `` `0x${topic.slice(26)}` ``).
   - Pitfall ruled out: `initialize`'s `calls` param runs via `multicall(calls)` **after** granting roles, but the `msg.sender` seen inside those delegatecalls is the **factory**, not our EOA (the factory calls `proxy.initialize()` as a plain external call, and `UUPSProxyLogic.initialize` delegatecalls into the impl preserving that caller). So bundling `setText` into `initialize`'s `calls` would fail the `ROLE_SET_TEXT` check unless the factory itself were granted the role. Kept `calls: []` at init time and called `setText` separately as the EOA, where `msg.sender` is correctly `acct0` all the way through `multicall`'s delegatecalls.
2. **Write all 8 records in one tx**: `resolverProxy.multicall([...8x encodeFunctionData(setText, [dnsEncode(name), key, value])])`, called directly by `acct0`.
   - tx gas used: **443,405** (8 new records + role check overhead).
3. **Read all 8 records back in one RPC call** (path R):
   ```ts
   const node = namehash(name);
   const readCalls = RECORD_KEYS.map(key =>
     encodeFunctionData({ abi: textAbi, functionName: "text", args: [node, key] })
   );
   const readMulticallData = encodeFunctionData({ abi: multicallAbi, functionName: "multicall", args: [readCalls] });
   const outer = await publicClient.readContract({
     address: resolverProxy, abi: resolveAbi, functionName: "resolve", args: [dnsEncode(name), readMulticallData],
   });
   ```
   `outer` is a `Hex` — because `resolve()`'s read-multicall branch (`AbstractRecordResolver.resolve`, selector-switch on `IMulticallable.multicall.selector`) returns `abi.encode(bytes[] m)`, one layer of encoding **beyond** `resolve`'s own declared `bytes` return type. `readContract` already strips resolve's own ABI-encoding, so `outer` is exactly that inner `abi.encode(bytes[])`. Decode layout:
   ```ts
   const [results] = decodeAbiParameters([{ type: "bytes[]" }], outer); // Hex[], one per inner call
   const value = decodeFunctionResult({ abi: textAbi, functionName: "text", data: results[i] }); // string
   ```
   Each `results[i]` is the raw return data `text()` itself would have produced (i.e. `abi.encode(string)`), because `resolve()`'s multicall branch recurses via `this.resolve(name, m[i])` for each inner call and stores that call's own `resolve()` return bytes (which for the `text` selector is `abi.encode(r.texts[key])`) directly into `m[i]`.
4. **Result**: all 8 values round-tripped byte-for-byte (`amount`, `currency`, `debtor`, `dueDate`, `status`, `ack` (empty string — round-trips fine), `tokenId`, `issuer`). `outer` was 2754 bytes for 8 short strings — cheap enough for one RPC call per invoice page load.

**Note on the `bytes32 node` argument inside each `text(node,key)` call**: `AbstractRecordResolver.resolve()` ignores the caller-supplied node entirely and recomputes it as `NameCoder.namehash(name, 0)` from the outer `resolve(name, data)` call's own `name` argument. So `namehash(name)` passed into the inner `text()` calldata only matters for viem's ABI encoding shape — the contract doesn't trust or use it. Confirmed empirically (records still round-tripped correctly).

## (b) UniversalResolverV2.resolve() — PASS (plus one documented expected revert)

- **Real existing name**: `bnmig-0079-leg-gy-001-r02.eth`, one of the 300 names in the ENSv2 sepolia migration fixture corpus (`contracts/deployments/sepolia/fixtures.md`, v2 state "reserved"). `UniversalResolverV2.resolve(dnsEncode(name), encodeFunctionData(text, [namehash(name), "avatar"]))` **succeeded**, returning resolver `0xb2BF4a9A86d29661EA93223582b9945943931e42` and an empty string (no `avatar` record set — expected, since this is a migration fixture, not one of our invoices). Confirms the `resolve(bytes,bytes) returns (bytes, address)` call shape works end-to-end from viem against a real ENSv2 Sepolia deployment.
- **Negative case, documented not debugged**: calling the same shape against the bare `eth` TLD node (`dnsEncode("eth")`) reverts with a custom error, selector `0x77209fe8`. Decoded via `cast sig "ResolverNotFound(bytes)"` → matches exactly. This is `UniversalResolverV2`'s own `ResolverNotFound(bytes)` error (see `contracts/deployments/sepolia/UniversalResolverV2.json` ABI) — correct behavior, since the bare TLD node has no resolver assigned directly (only names registered under it do). Not a bug, not pursued further.

## Decision for `web/lib/ens.ts`

- **Path R** (`readRecords(resolver, name)`): implemented exactly as proven above — `resolve()` + read-multicall of 8 `text(node,key)` calls, decoded via `decodeAbiParameters([{type:"bytes[]"}], outer)` then `decodeFunctionResult` per element. No registrar-`recordsOf` fallback needed (kill rule not triggered — (a) passed well inside the 45-minute box).
- **Path L** (`isLive(name, registrar)`): uses the InvoiceRegistrar's own `isLive(id)` only. `UniversalResolverV2` was **not** used for liveness — (b) shows it works, but it answers "is there a resolver for this node" via the ENS registry, which is exactly the post-expiry-unreliable signal path R/L are designed to avoid (see the "never use `getEnsText`/registry `getResolver`" note in `web/lib/ens.ts`'s module doc comment). The registrar is the source of truth for our own liveness semantics (ties to `InvoiceRegistrar`'s own state, not ENS's).

## Gas reference (anvil fork, cold contracts)

| Step | Gas used |
| --- | --- |
| `deployProxy` (new proxy + `initialize` with 1 grant) | 177,568 |
| `multicall` of 8x `setText` | 443,405 |
| `resolve()` + read-multicall of 8x `text()` | read-only, no gas cost to the caller (eth_call) |

## `check-ens.ts` validation

Re-ran `spike/ens-read/spike.ts` against a fresh anvil fork to get a new resolver
address with the 8 records set, then pointed the CLI at it directly:

```
NEXT_PUBLIC_SEPOLIA_RPC_URL=http://127.0.0.1:8546 \
  pnpm -C web exec tsx scripts/check-ens.ts --resolver 0x73cbc47eea1204378ce49a39c14d4b619b520822 --name inv-1.seikyu.eth
```

Output matched the spike's `TEST_VALUES` exactly (all 8 `records[<key>]=<value>`
lines). The registrar-backed full mode (`tsx scripts/check-ens.ts <name>`) was
verified for its error path (exits 1 with a clear message when
`NEXT_PUBLIC_INVOICE_REGISTRAR`/`NEXT_PUBLIC_USER_REGISTRY` are unset) since the
real `InvoiceRegistrar` doesn't exist on chain yet; separately confirmed the
`UserRegistryImpl.getState(uint256)` ABI/decode shape used for `LIVE_STATE`
against the real deployed contract (`0xa80338aaa8d23831cea25e858d1774534abb0263`)
on the fork — no revert, returns `{status: 0 (AVAILABLE), expiry: 0, ...}` for
unregistered labels, confirming the tuple decode is correct.

## Pitfalls for whoever touches this next

1. Proxy address comes from the `ProxyDeployed` event log, not a decoded return value, when using `writeContract` (which doesn't return contract call outputs, only the tx hash).
2. Don't bundle role-gated setter calls into `VerifiableFactory.deployProxy`'s `initData` — the effective `msg.sender` for those delegatecalls is the factory, not your EOA.
3. `resolve()`'s multicall branch double-wraps its return value in `abi.encode(bytes[])` — decode the outer `bytes` as a `bytes[]` first, *then* decode each element as the inner call's own return type.
4. The `bytes32 node` argument you put inside an inner `text(node,key)` call is cosmetic — `resolve()` recomputes the real node from the outer DNS-encoded `name`. Still pass `namehash(name)` for correctness/clarity; just know the contract doesn't use it.
