# ENSv2 integration

Seikyu registers a real name on ENSv2 for every invoice, and reads that name's state inside the
contract path that gates every sale. This isn't a display feature bolted onto a database — the
`InvoiceMarket` and `InvoiceRegistrar` contracts are built entirely against the ENSv2 API deployed
at tag [`sepolia-deployment-2026-09-15`](https://github.com/ensdomains/contracts-v2/tree/sepolia-deployment-2026-09-15)
(commit `f2f0a05e`), and every fact below was verified against that deployment on a Sepolia fork
before it was written into the contracts (`.omc/research/spike-ensv2.md`).

The two ideas that drive every design choice here: (1) an invoice's ENS name should live for
exactly as long as its debt is outstanding — `expiry = dueDate`, and it is unregistered the moment
the debt is settled or cancelled — and (2) the deployed `PermissionedResolver`'s access control is
scoped by **record key only**, never by name, which means the only way to let a debtor's accountant
edit one invoice's `ack` field without also letting them edit every other invoice from the same
issuer is to give every invoice its own resolver. Both ideas turn ENS from a label into a control
plane: `InvoiceMarket.buy()` cannot execute unless the name is live and unless the debtor's
accountant hasn't disputed it.

## Feature matrix

| ENSv2 feature | What it does in Seikyu | file:line | Sepolia tx | Judge bullet |
|---|---|---|---|---|
| Own `UserRegistry` under `<parent>.eth` (hierarchical registry) | We deployed our own `UserRegistry` proxy at `0xA9DFC9d1D5EA96b5Ade09d0E9B84944965B4eD67` via the ENSv2 `VerifiableFactory` and registered `seikyu.eth` (paid 8,000,021 ENS-mUSDC) with it as the subregistry, so every `inv-<id>.seikyu.eth` name lives in a registry we control, not a shared namespace | `contracts/script/DeployUserRegistry.s.sol:17-49` (E2), `contracts/script/RegisterParent.s.sol:53-85` (E1+E3) | [DeployUserRegistry](https://sepolia.etherscan.io/tx/0xd2bba84501953caf250623987fbdbf8cea6129dce0d80e92f70c2dd757ac213c) / [commit](https://sepolia.etherscan.io/tx/0x9e31c31403cca6412055a4847b244987a59e0d05a702964afc035b4951b73c2f) / [register](https://sepolia.etherscan.io/tx/0x7b31788bd5f7bef84a84530cdec3c289d7b1e13ad051319f500eda5ea067b913) (block 11784477) | E2, E3 |
| Expiring subname (`expiry = dueDate`) | `InvoiceRegistrar.registerInvoice` calls `REGISTRY.register(label, issuer, address(0), resolver, 0, dueDate)` — the name's absolute expiry is the invoice's due date, set once at issuance | `contracts/src/InvoiceRegistrar.sol:89` | <!-- FILL-TX: createInvoice() --> | E7 |
| Revocable (`closeInvoice` → `unregister`) | `settle()`/`cancel()` call `closeInvoice`, which sets the final `status` then unregisters the name immediately if it's still live | `contracts/src/InvoiceMarket.sol:191-202,204-214`, `contracts/src/InvoiceRegistrar.sol:99-104` | <!-- FILL-TX: settle() --> | revocable |
| Non-transferable | The issuer is registered with `roleBitmap = 0` (`register(label, issuer, ..., 0, dueDate)`), so they can't transfer or re-resolve the name. **Live error**: `TransferUnsafeUntilRegistryIsEmancipated()` — the registrar permanently holds root `ROLE_UNREGISTER`, so the registry is never emancipated and every `safeTransferFrom` reverts at that check before the empty-roleBitmap check is ever reached. (`TransferDisallowed` only fires once `ROLE_UNREGISTER` has been revoked from every root holder — not the case on our live deployment.) | `contracts/src/InvoiceRegistrar.sol:89`; live-path proof in `contracts/test/InvoiceRegistrar.t.sol:196-212` (`test_issuerCannotTransferName_reverts`) | <!-- FILL-TX: issuer safeTransferFrom attempt --> | non-transferable |
| Permissioned Resolver per invoice | Each `createInvoice` call deploys a fresh `PermissionedResolver` proxy (`VerifiableFactory.deployProxy`, salt = `keccak256(abi.encode(invoiceId))`) and writes all 7 non-`ack` records inside its `initialize(grants, calls)`, where role checks are skipped | `contracts/src/InvoiceRegistrar.sol:162-178` (`_deployResolver`) | <!-- FILL-TX: createInvoice() --> | E5 |
| Why a resolver per invoice is required | The deployed `PermissionedResolver.grantSetterRoles` decodes only the setter's selector and key argument — **the name is discarded** — so a role grant on `setText(_, "ack", _)` covers that key on *every* name the resolver holds. With one shared resolver, granting the accountant `ack` for invoice 1 would also let them edit `ack` on every other invoice using that resolver, including invoices for other debtors. A resolver per invoice is the only way the deployed API lets us confine a setter to a single invoice; each resource additionally caps at 15 assignees per role | `contracts/src/InvoiceRegistrar.sol:83-85` (grant call), `contracts/src/interfaces/ens/IPermissionedResolver.sol:20-21` (setter decoding contract), source citation in `.omc/research/spike-ensv2.md` §"(b) How grantSetterRoles(...) parses the setter" | n/a | E5, differentiator vs PayeeLock |
| EAC: accountant can set only `ack` | `grantSetterRoles(abi.encodeCall(setText, (bytes(""), "ack", "")), accountant)` grants `ROLE_SET_TEXT` scoped to resource `keccak256("ack")` only — writing `amount` or `status` reverts `EACUnauthorizedAccountRoles` | `contracts/src/InvoiceRegistrar.sol:83-85`; negative path tests `contracts/test/InvoiceRegistrar.t.sol:86,98,108` (`test_accountantCanSetAck`, `test_accountantCannotSetAmount_reverts`, `test_accountantCannotSetStatus_reverts`) | <!-- FILL-TX: setText("ack", ...) --> / <!-- FILL-TX: eac-negative.ts amount attempt --> | E6 |
| EAC negative path, live | `web/scripts/eac-negative.ts` drives the debtor AP wallet against a live resolver: `ack` write succeeds, `amount`/`status` writes revert `EACUnauthorizedAccountRoles` | `web/scripts/eac-negative.ts` | <!-- FILL-TX: eac-negative.ts run --> | E6, AC-9 |
| ENS as the purchase gate | `buy()` reverts `NameNotLive` unless `REGISTRAR.isLive(id)` is true, and reverts `PurchaseBlockedByAck` unless `ackOf(id)` is `""` or `"acknowledged"` — both are ENS reads, checked before any money moves | `contracts/src/InvoiceMarket.sol:172-189` | <!-- FILL-TX: buy() --> | differentiator, P1 |
| Path R vs path L reads | Path R (`readRecords`) reads the 8 text records straight off the stored per-invoice resolver via `resolve()` + a read-multicall of `text(node,key)`, and works even after the name's registration has expired. Path L (`isLive`) asks the registrar's own liveness check, never the ENS registry or a public resolver helper, which both report the wrong thing post-expiry | `web/lib/ens.ts:1-15` (module doc), `web/lib/ens.ts:139-171` (path R `readRecords`), `web/lib/ens.ts:199-207` (path L `isLive`); Solidity mirrors: `contracts/src/InvoiceRegistrar.sol:122-137` (`recordsOf`), `contracts/src/InvoiceRegistrar.sol:107-110` (`isLive`) | n/a | judge bullet on ENSIP-10 usage |
| Records survive expiry | Once `block.timestamp >= expiry`, the registry's `ownerOf`/`getResolver` return the zero address and `getState().status` reads `AVAILABLE`, but the resolver's own storage was never touched, so path R keeps returning every record (including the pre-expiry `status`) | `contracts/test/InvoiceRegistrar.t.sol:139` (`test_statusOf_afterExpiry`), `contracts/test/Integration.t.sol:108` (`test_settle_afterExpiry_writesPaidViaStoredResolver`) | <!-- FILL-TX: check-ens.ts after expiry --> | E7, AC-8 |
| Overdue revival (stretch, A6) | Anyone can call `InvoiceMarket.markOverdue(id)` once a **funded** invoice is past due and its name has expired; it calls `InvoiceRegistrar.reviveOverdue`, which `renew()`s the name for 30 more days and sets `status = "overdue"`, so the invoice stays resolvable on public ENS clients while unpaid | `contracts/src/InvoiceMarket.sol:220-233`, `contracts/src/InvoiceRegistrar.sol:113-121` | <!-- FILL-TX: markOverdue() --> | E7 stretch |
| Selector parity vs the deployed tag | `contracts/script/selector-parity.sh` computes each function/error selector we depend on with `cast sig` and greps for it inside the live `cast code` of the 5 pinned addresses — catches any signature drift between our hand-written interfaces and the actual deployed bytecode | `contracts/script/selector-parity.sh` | n/a | verification-vs-drift risk (R1) |
| Harden / deployer roles | `DeployUserRegistry.s.sol` grants the deployer **admin-only** bits (`ROLE_REGISTRAR_ADMIN\|ROLE_RENEW_ADMIN\|ROLE_UNREGISTER_ADMIN`) — enough to grant the registrar its roles once, never enough to register/renew/unregister a name directly. `Harden.s.sol` revokes every root role the deployer holds afterward (irreversible; run at feature freeze) | `contracts/script/DeployUserRegistry.s.sol:32-42`, `contracts/script/Harden.s.sol:15-43` | <!-- FILL-TX: Harden.run() --> | AC-20 |

## What happens after the due date

| State | Market `state` | ENS name (path L) | Records (path R) | Can it be revived? |
|---|---|---|---|---|
| Paid | `Paid` | unregistered | still readable, `status = "paid"` | no — closed |
| Overdue (funded, unpaid, not yet revived) | `Funded` | expired (`AVAILABLE`, `ownerOf` = 0) | still readable, `status` is whatever it was before expiry | yes — `markOverdue()` renews it for 30 days with `status = "overdue"` |
| Expired-unsold | `Listed` | expired (`AVAILABLE`) | still readable, `status = "listed"` | no purchase path revives an unsold invoice; the issuer can still `cancel()` |
| Cancelled | `Cancelled` | unregistered (if it was still live at cancel time) | still readable, `status = "cancelled"` | no — closed |

The name's liveness always tracks whether the debt is current — it lives as long as the debt is
current, not for a fixed, unrelated period.

## Known limitations

- `ack` is only as trustworthy as the debtor and accountant addresses the **issuer** supplies at
  issuance — it is self-attested. The contract only rejects the most obvious abuse case
  (`accountant != issuer && debtor != issuer`, `contracts/src/InvoiceMarket.sol:100-105`).
- The parent name's owner on ENS's `ETHRegistry` (our deployer) can still call `setSubregistry` on
  `<parent>.eth` itself — `UserRegistry` roles are fully revoked by `Harden.s.sol`, but parent
  ownership on the `.eth` registry is a separate, un-revoked permission.
- `EACMaxAssignees` caps each resolver resource at 15 role assignees; since every invoice gets its
  own resolver, this only matters if a single invoice somehow needed 16+ people with the same
  setter role, which the product doesn't do.
- Reading records ever requires knowing which resolver belongs to which invoice; we only expose
  that through `InvoiceRegistrar.resolverOf(id)` (path R depends on it) — a generic ENS client
  that doesn't know about `InvoiceRegistrar` and only queries the public registry will see nothing
  for an expired name, by design (see path R vs path L above).

## How to verify on-chain

Live values for this deployment: `PARENT_LABEL=seikyu`, `USER_REGISTRY=0xA9DFC9d1D5EA96b5Ade09d0E9B84944965B4eD67`, `DEPLOYER_ADDRESS` from `contracts/.env`. Public RPCs (publicnode, 1rpc) have already pruned the registration block (`11784478`) — use an archive RPC such as `https://sepolia.gateway.tenderly.co` for anything that reads historical state.

```bash
# AC-6: our parent's subregistry really is our UserRegistry
cast call 0x657ea849311d3d5823348dded7c2aaafb3ede09e "getSubregistry(string)(address)" "$PARENT_LABEL" \
  --rpc-url $SEPOLIA_RPC_URL

# AC-7: records live (path R) + liveness (path L) for a live invoice
pnpm -C web exec tsx scripts/check-ens.ts inv-1.$PARENT

# AC-8: after expiry — path L is false, path R still reads the last-written status
pnpm -C web exec tsx scripts/check-ens.ts $EXPIRY_DEMO
cast call $USER_REGISTRY "getState(uint256)((uint8,uint64,address,uint256,uint256))" \
  "$(cast keccak "${EXPIRY_DEMO%%.*}")" --rpc-url $SEPOLIA_RPC_URL   # first field (status) == 0

# AC-9: EAC negative path against the live resolver
pnpm -C web exec tsx scripts/eac-negative.ts inv-1.$PARENT

# AC-20: deployer holds no root roles on our UserRegistry
cast call $USER_REGISTRY "roles(uint256,address)(uint256)" 0 "$DEPLOYER_ADDRESS" --rpc-url $SEPOLIA_RPC_URL

# AC-21: selectors we depend on are present in the deployed bytecode of the pinned tag
bash contracts/script/selector-parity.sh
```
