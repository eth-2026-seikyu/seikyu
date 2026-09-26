# Spike: ENSv2 on Sepolia (Seikyu, lane A0)

Date: 2026-09-26. Verdict: **GO**.

## Pin

- Tag `sepolia-deployment-2026-09-15` of `ensdomains/contracts-v2`, commit `f2f0a05e6c1711134b73204a1e37f8e6c1aea6ab`.
- Installed with `forge install ensdomains/contracts-v2@sepolia-deployment-2026-09-15`, which resolved the tag, so the `git clone` fallback was not needed. The install is recursive and took about 7 minutes. `git -C contracts/lib/contracts-v2 rev-parse --short=8 HEAD` returns `f2f0a05e`.
- OZ is `v5.1.0` (`69c8def5`). `--shallow` failed to resolve the tag, so it was installed without it. forge-std is `ba4733c3`.
- The tag's sources are never compiled. `contracts/foundry.toml` sets `auto_detect_remappings = false`, and `remappings.txt` has only the two entries for OZ and forge-std. solc is `0.8.27`, the highest pragma in the tag's `src` (the tag itself uses `0.8.25` and `0.8.27`).
- Addresses in `contracts/lib/contracts-v2/contracts/deployments/sepolia/*.json` match the ground truth:

| Contract | Address |
| --- | --- |
| ETHRegistry | 0x657ea849311d3d5823348dded7c2aaafb3ede09e |
| ETHRegistrar | 0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca |
| UserRegistryImpl | 0xa80338aaa8d23831cea25e858d1774534abb0263 |
| PermissionedResolverImpl | 0x14f09fd05d4585759e54844dc9b00147131cf243 |
| VerifiableFactory | 0x9e726eb570beb6bceb495ab8cda7df517d4e841c |
| UniversalResolverV2 | 0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3 |
| MockUSDC (ENS) | 0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e |

The ENS MockUSDC has 6 decimals and an open `mint(address,uint256)` (tag `test/mocks/MockERC20.sol:26`).

## RPC and fork

- RPC: `https://ethereum-sepolia-rpc.publicnode.com` answered in 0.10s. The backup is `https://1rpc.io/sepolia` (0.81s).
- `sepolia.drpc.org` returns HTTP 400 ("chain is not available on free plan"). `rpc.sepolia.org` returns HTTP 404.
- `FORK_BLOCK=11781431`. It is stored in `contracts/.env`, which is untracked.

## Selector parity

`contracts/script/selector-parity.sh` printed **`PARITY OK (26 selectors)`**. No signature needed fixing: every selector in the spec is present in the deployed bytecode.

## Registrar reads (ETHRegistrar 0xabe7…94ca)

| Read | Value |
| --- | --- |
| `isAvailable("seikyu")` | true |
| `isAvailable("seikyu-rwa")` | true |
| `isAvailable("invoicerwa")` | true |
| `MIN_COMMITMENT_AGE()` | 60 s |
| `MAX_COMMITMENT_AGE()` | 86400 s |
| `MIN_REGISTER_DURATION()` | 2419200 s (28 days) |
| `getRegisterPrice("seikyu", 31536000, ENS MockUSDC)` | base 8000021, premium 0 (about 8.00 mUSDC per year) |

## Vendored role constants (tag source)

Registry roles come from `src/registry/libraries/RegistryRolesLib.sol`:

| Role | Value | Line |
| --- | --- | --- |
| ROLE_REGISTRAR | 1<<0 | :9 |
| ROLE_REGISTER_RESERVED | 1<<4 | :14 |
| ROLE_SET_PARENT | 1<<8 | :19 |
| ROLE_UNREGISTER | 1<<12 | :24 |
| ROLE_RENEW | 1<<16 | :29 |
| ROLE_SET_SUBREGISTRY | 1<<20 | :34 |
| ROLE_SET_RESOLVER | 1<<24 | :39 |
| ROLE_CAN_TRANSFER_ADMIN | (1<<28)<<128 | :45 |
| ROLE_WAS_RESERVED | 1<<32 | :48 |
| ROLE_SET_URI | 1<<36 | :51 |
| ROLE_CAN_NAME | 1<<120 | :56 |
| **ROLE_UPGRADE** | **1<<124** | :61 |
| ROLE_UPGRADE_ADMIN | (1<<124)<<128 | :63 |

Each `*_ADMIN` role is the base role shifted left by 128.

Resolver roles come from `src/resolver/libraries/PermissionedResolverLib.sol`:

| Role | Value | Line |
| --- | --- | --- |
| ROLE_SET_ADDRESS | 1<<0 | :11 |
| **ROLE_SET_TEXT** | **1<<4** (= 16) | :16 |
| **ROLE_SET_TEXT_ADMIN** | **(1<<4)<<128** | :18 |
| ROLE_SET_CONTENTHASH | 1<<8 | :21 |
| ROLE_SET_ABI | 1<<12 | :27 |
| ROLE_SET_INTERFACE | 1<<16 | :32 |
| ROLE_SET_NAME | 1<<20 | :38 |
| ROLE_SET_DATA | 1<<24 | :43 |
| ROLE_LINK | 1<<28 | :48 |
| ROLE_CAN_NAME | 1<<120 | :53 |
| **ROLE_UPGRADE** | **1<<124** | :58 |
| ROLE_UPGRADE_ADMIN | (1<<124)<<128 | :60 |

Derived values, checked with python:

- `DEPLOYER_ADMIN_ONLY` = REGISTRAR_ADMIN | RENEW_ADMIN | UNREGISTER_ADMIN = `23694882055805708026345164039296315868315648`.
- `REGISTRAR_ROOT` = REGISTRAR | RENEW | UNREGISTER = `69633`.

All of these are in `contracts/src/interfaces/ens/EnsV2Types.sol`, in libraries `RegistryRoles` and `ResolverRoles`.

## (a) How `setText(bytes name, …)` derives the storage node

All paths below are under `src/`.

- `setText` is at `resolver/PermissionedResolver.sol:221-228`. Its guard is `onlyRoles(resource(key), ROLE_SET_TEXT)`. It then calls `_ensureRecord(name)` and writes `_records[recordId].texts[key] = value`.
- `_ensureRecord` (`PermissionedResolver.sol:352-360`) computes `node = NameCoder.namehash(name, 0)`. This is the standard ENSIP-1 namehash of the DNS-encoded name (`lib/ens-contracts/contracts/utils/NameCoder.sol:186-194`). A malformed name reverts with `DNSDecodingFailed`. The node maps to a lazily created `recordId`.
- Reads go through `_record(node)` (`PermissionedResolver.sol:381-387`). If the node has no record, it falls back to the default record (node 0), so unset keys read as `""`.
- The role check never looks at the name. It is scoped only by key: `onlyRoles` (`access-control/EnhancedAccessControl.sol:91-94`) calls `hasRoles` (`:185-193`), which checks `roles[root] | roles[resource]` (`_effectiveRoles`, `:463-465`).

## (b) How `grantSetterRoles(bytes setter, …)` parses the setter

- `grantSetterRoles` is at `resolver/PermissionedResolver.sol:254-261`. It calls `decodeSetter(setter)`, then `_checkCanGrantRoles(resource, roleBitmap, msg.sender)`, then `_grantRoles(resource, roleBitmap, account, true)`.
- `decodeSetter` is at `PermissionedResolver.sol:307-338`. It uses `bytes4(setter)` as the selector. For `setText` (`:317-320`) it decodes `abi.decode(setter[4:], (bytes, string))` and **drops the name argument**, keeping only `key`. It then sets `roleBitmap = ROLE_SET_TEXT` and `resource = uint256(keccak256(bytes(key)))` (`:336`).
- The encoding `abi.encodeCall(setText, (bytes(""), "ack", ""))` therefore works. No real name is needed, and the grant covers the key on every name held by that resolver. That is fine here because each invoice has its own resolver.
- The caller needs the admin role on root or on that resource. `_checkCanGrantRoles` is at `access-control/EnhancedAccessControl.sol:396-405`, and `_getSettableRoles` (`:428-435`) applies admin roles over `_effectiveRoles`, which is root | resource. Holding `ROLE_SET_TEXT_ADMIN` on root is enough.
- Each resource allows at most 15 assignees per role (`EACMaxAssignees`, `EnhancedAccessControl.sol:332-340`).
- `grantRoles` is disabled on the resolver (`PermissionedResolver.sol:297-304`).

## (c) `resolve(name, data)` with `multicall(bytes[])` of `text(bytes32,string)`

The logic is in `resolver/AbstractRecordResolver.sol:110-159`.

- If `bytes4(data) == multicall.selector` (`:112-122`), it decodes `bytes[] m`. Each `m[i]` runs through `try this.resolve(name, m[i])`, and the call returns `abi.encode(bytes[])`.
- **A failed sub-call does not revert.** Its revert data is placed in `m[i]` (`:117-118`). `recordsOf` should assume every sub-call succeeds, which is always true for `text`.
- For a single call, `Record r = _record(NameCoder.namehash(name, 0))` (`:123`). **The `bytes32 node` argument inside `text(node, key)` is ignored.** Only `name` selects the record.
- The `text` branch (`:129-131`) returns `abi.encode(r.texts[key])`.
- To decode: `bytes[] res = abi.decode(ret, (bytes[]))`, then `abi.decode(res[i], (string))`.

## (d) Does `initialize` run its calls with permission checks skipped?

**Yes, with one caveat.**

- `initialize(grants, calls)` (`resolver/PermissionedResolver.sol:119-126`) grants each role bitmap on the root resource without checks (`_grantRoles(…, false)`), then calls `multicall(calls)`.
- `_checkRoles` is overridden (`:369-378`) to skip while `_isInitializing()`. This means `setText` calls placed in `calls` run with no permission check.
- **Caveat:** `grantSetterRoles` uses `_checkCanGrantRoles`, which is not skipped. During `initialize`, `msg.sender` is the VerifiableFactory (`lib/verifiable-factory/src/VerifiableFactory.sol:43` calls `IUUPSProxy(proxy).initialize(impl, data)`). So `grantSetterRoles` inside `calls` would revert with `EACCannotGrantRoles`, and the `ack` grant must be its own call after deployment.
- Possible optimisation, not measured: put the 7 `setText` calls inside `initialize` `calls`. This removes 7 external calls through the proxy→logic→impl delegate chain.

## Other facts relevant to InvoiceRegistrar

- VerifiableFactory salt is `keccak256(abi.encode(msg.sender, salt))` (`VerifiableFactory.sol:33`), so a contract can deploy proxies at deterministic addresses.
- UserRegistry:
  - `initialize(grants)` reverts `InvalidOwner` if root ends up with no roles (`registry/UserRegistry.sol:49-57`). The admin-only deployer grant is enough.
  - `register` (`registry/PermissionedRegistry.sol:207-220`, `_register` at `:440-506`) takes an **absolute** expiry. It reverts `CannotSetPastExpiry` if `expiry <= now` (`:478-480`). It also writes the label to the shared LabelStore.
  - Expired means `block.timestamp >= expiry` (`:663-665`). `getState` is at `:353-363`, and `ownerOf` returns 0 when expired (`:371-382`).
  - `unregister` (`:224-235`) reverts `LabelExpired` when the name has expired. Otherwise it burns the token and sets `expiry = now`.
  - `renew` on an expired name needs root `ROLE_RENEW` (`:240-256`, `_canRevive` at `:636-646`).
  - An owner with roleBitmap 0 cannot transfer: `_update` reverts `TransferDisallowed` (`:530-531`).

## GO/NO-GO fork tests

Command:

```
forge test --fork-url $SEPOLIA_RPC_URL --fork-block-number 11781431 --match-contract GoNoGoForkTest -vv
```

- `test_fork_perInvoiceResolver_initialize_setText_grantSetter` **PASS**:
  - `deployProxy` from contract context works.
  - 7× `setText` succeed.
  - `grantSetterRoles(ack)` succeeds.
  - `register("inv-1", issuer, 0, resolver, 0, now+100)` succeeds.
  - The accountant can set `ack`. Setting `amount` reverts with the exact `EACUnauthorizedAccountRoles(keccak("amount"), 16, accountant)`.
  - One `resolve(multicall(8× text))` returns all 8 strings in order, with `ack == "acknowledged"`.
  - `hasRootRoles(ROLE_SET_TEXT, stub)` is true.
- `test_fork_userRegistry_registerExpireRevive` **PASS**:
  - At expiry the name reads AVAILABLE, `ownerOf` returns 0, and `latestOwner` is kept.
  - `unregister` reverts `LabelExpired(tokenId)`.
  - `renew` by the stub revives the name as REGISTERED with the same owner.

Gas was measured with `gasleft()` deltas inside the registrar stub, so it covers only the ENS operations. It excludes the 21k intrinsic cost, calldata and InvoiceMarket overhead.

| Step | Gas |
| --- | --- |
| deployProxy + initialize | 154,853 |
| 7× setText | 383,240 |
| grantSetterRoles(ack) | 55,708 |
| register | 100,531 |
| **Total per invoice** | **694,332** (budget 2,500,000) |

Cost per invoice:

| Gas price | ENS ops only | With about 51k extra (intrinsic plus calldata and market estimate) |
| --- | --- | --- |
| `cast gas-price` at run time: 0.987–1.062 gwei | ≈ 0.00069–0.00074 ETH | ≈ 0.00079 ETH |
| 5 gwei (stress case) | ≈ 0.0035 ETH | ≈ 0.0037 ETH |
