# Invoice RWA (ชื่อทำงาน: Seikyu 請求) — แผนลงมือ ETHGlobal Tokyo 2026

- **Status: APPROVED — Critic APPROVE round 2 (v2.1); user pre-approved execution via /ralph on 2026-09-26 02:45 JST**
- Mode: RALPLAN (short) · **Plan v2.2 (final)** — ผ่าน Architect (7 BLOCKING + N1–N4) และ Critic (11 must-fix + should-fix + 8 improvements) ดูรายการที่แก้ใน §14
- T+0 = 2026-09-26 (เสาร์) 02:30 JST · T+20 = 2026-09-26 22:30 JST (ถ้า deadline ส่งงานจริงไม่ตรงนี้ ให้เลื่อนตารางทั้งหมดไป โดยคง buffer 2 ชม. สุดท้ายไว้ท้ายสุดเหมือนเดิม)
- Project root: `/Users/ikhalas/Documents/side-projects/eth-2026` (ยังไม่ได้ `git init`)
- **ENSv2 pin**: `ensdomains/contracts-v2` tag `sepolia-deployment-2026-09-15` (commit `f2f0a05e`) — signature และ address ของ ENSv2 ทุกตัวในแผนนี้อ้างอิง deployment JSON ของ tag นี้เท่านั้น
- เครื่องที่ใช้ dev: **ยังไม่มี forge/cast/anvil/vercel CLI** (A0 step 0 จะติดตั้ง foundry, ส่วน Vercel deploy ผ่าน dashboard) · ที่มีแล้ว: pnpm, node 24, gh, jq
- รางวัลเป้าหมาย: ENS Best Use of ENSv2 ($6k) · World Best Use of IDKit ($2.5k/ทีม) · Curvegrid Best RWA Tokenization ($1k)
- ป้าย `[UNVERIFIED→Sx]` = ยังไม่ได้ยืนยัน ต้องปิดใน spike `Sx` ภายในเวลาที่กำหนดใน §12 · ป้าย `[VERIFIED@tag]` = ยืนยันแล้วจาก deployment ABI ของ tag

---

## 0. RALPLAN-DR Summary

### 0.1 Principles
1. **P1 — ENS คือบันทึกสาธารณะของ invoice และเป็นประตูกั้นการซื้อ 2 ชั้น**
   - ข้อมูล invoice 8 records อ่านได้จาก ENS client ทุกตัว
   - `InvoiceMarket.buy()` จะผ่านได้ต้องครบ 2 เงื่อนไข:
     - (a) **ชื่อยัง live** คือ `getState(labelhash).status == REGISTERED && now < expiry`
     - (b) **`ack` ของฝ่ายบัญชีลูกหนี้** มีค่าเป็น `""` หรือ `"acknowledged"` เท่านั้น
   - ส่วนเงื่อนไขทางเศรษฐกิจ (faceValue, price, dueDate, holder) อยู่ใน storage ของ `InvoiceMarket` ซึ่งเป็นแหล่งข้อมูลจริงเรื่องเงิน
   - ENS จึงเป็นส่วนที่รับภาระจริงของ logic ไม่ใช่แค่ป้ายชื่อ และไม่ถือค่าเงินที่ต้องเชื่อ
2. **P2 — กฎเรื่องความเชื่อใจทุกข้อบังคับบน chain**: World gate อยู่ใน `buy()`/`_update()` ส่วนสิทธิ์แก้ record อยู่ใน EAC ของ Permissioned Resolver และ UI ทำหน้าที่แค่อธิบายเหตุผล
3. **P3 — ใช้ credential ที่ friction ต่ำที่สุดแต่ยังให้ uniqueness แบบ deterministic** และขอข้อมูลให้น้อยที่สุด (ไม่ขอ PII หรือ attribute ใดที่ไม่มีกฎรองรับ)
4. **P4 — ทำ fork test ก่อน ทำ spike ก่อน และตัดสินเรื่องที่ไม่รู้ภายใน T+2:30** โดยทุก spike มี timebox, kill criterion และ fallback ที่เขียนไว้แล้ว
5. **P5 — ไม่มี hard-coded demo data**: ทุกค่าบนจอมาจาก chain, ENS หรือ `deployments/sepolia.json` (ตรวจด้วย grep ใน AC-14)

### 0.2 Decision Drivers (top 3)
1. **D1 — ENS prize ($6k) ใหญ่ที่สุด** และต้องการให้ ENSv2 เป็นแกนของ product ใช้งานได้จริงบน Sepolia ไม่ hard-code
2. **D2 — เวลา 20 ชม. กับ AI executors ที่ทำงานขนานกัน** จึงต้องล็อก ABI กับ tag, ใช้ minimal interface ที่เขียนเอง และ freeze interface ระหว่าง lane ที่ T+2:00
3. **D3 — World ต้องการ** การ verify ฝั่ง server, การผูก signal เข้ากับ wallet, fail path ที่มีความหมาย และเหตุผลที่อธิบายได้ว่าทำไมเลือก credential นี้

### 0.3 Viable Options

| | Option A — ENSv2-native full stack | Option B — Minimal 2LD | Option C — Off-chain-first |
|---|---|---|---|
| สรุป | ทำ `UserRegistry` ของเราเองใต้ `<parent>.eth` · `InvoiceRegistrar` ออกชื่อ `inv-<id>.<parent>.eth` โดยตั้ง `expiry = dueDate` · deploy Permissioned Resolver **แยกต่อ invoice** + EAC · `InvoiceMarket` (ERC-721 + mUSDC) | ลงทะเบียนแต่ละ invoice เป็น 2LD ผ่าน `ETHRegistrar` แล้วใช้ `PublicResolverV2` ร่วมกัน | เก็บข้อมูลใน DB + MultiBaas และมี ENS record ตัวเดียว |
| ชั่วโมงงาน | ~16 ชม. (critical path 10.0 ชม. ดู §4) | ~9 ชม. = market + MockUSDC + tests 3 · flow จด 2LD ด้วย commit–reveal และจ่าย ERC-20 ต่อ invoice 1.5 · frontend 3 · World 1.5 | ~7 ชม. = DB + API 1.5 · ตั้ง MultiBaas + event feed 1.5 · ENS record ตัวเดียว 0.5 · frontend 2.5 · World 1 |
| ข้อดี | ครอบคลุม judge bullet ของ ENS ทุกข้อ: hierarchical registry, EAC, resolver ต่อ subname, subname แบบ expiring/revocable/non-transferable และเราคุม expiry เองได้ | ไม่ต้องใช้ VerifiableFactory | เร็ว และได้คะแนน MultiBaas |
| ข้อเสีย | gas ต่อ invoice สูงกว่า (deploy proxy หนึ่งตัวต่อ invoice) · ต้องพึ่ง ABI ของ beta | `ETHRegistrar` บังคับ `MIN_REGISTER_DURATION` และ commit–reveal (2 tx + รอ `MIN_COMMITMENT_AGE`) และจ่าย ERC-20 ทุก invoice `[VERIFIED@tag]` · expiry จึงไม่ตรงกับ dueDate · resolver ที่ใช้ร่วมกันมี setter scope แค่ `keccak256(key)` ทำให้ accountant แก้ `ack` ได้ทุก invoice · ไม่มี hierarchy | ENS กลายเป็นแค่ของประดับ ซึ่งขัดเกณฑ์ ENS ตรง ๆ และเสี่ยงเสีย $6k เพื่อแลก $1k |

**Decision: เลือก Option A แบบ fork-first**
- test ของ ENS ทั้งหมดรันบน `forge test --fork-url $SEPOLIA_RPC_URL --fork-block-number $FORK_BLOCK` กับ contract จริงของ tag
- local fixture เป็น optional และไม่อยู่ในตาราง

**Fallback ที่กำหนดไว้ล่วงหน้า**
- **A-f1′ (ตัดสินที่ CP1 T+2:00 ด้วย `test_fork_perInvoiceResolver_initialize_setText_grantSetter`)**
  - ใช้เมื่อ test นี้ fail หรือ gas ของ `createInvoice` ที่วัดได้ > 2,500,000
  - ทางเลือกแทน: ใช้ **resolver หนึ่งตัวต่อ issuer** ที่ deploy ด้วย `contracts/script/DeployIssuerResolver.s.sol` แล้ว registrar อ่านจาก `issuerResolver[issuer]`
  - ผลที่ต้องยอมรับ (ต้องเขียนใน `docs/ENS_INTEGRATION.md`):
    - (1) setter scope ของ tag คือ `keccak256(key)` เท่านั้น ไม่ผูกกับชื่อ ฝ่ายบัญชีลูกหนี้ที่ได้สิทธิ์ `ack` จึงแก้ `ack` ได้ทุก invoice ของ issuer นั้น รวมถึง invoice ของลูกหนี้รายอื่น
    - (2) `EACMaxAssignees` = 15 ต่อ role ต่อ resource ทำให้ issuer หนึ่งรายมีฝ่ายบัญชีลูกหนี้ได้สูงสุด 15 ราย (cap นับเฉพาะ accountant ที่**ไม่ซ้ำกัน** การ `grantSetterRoles(ack)` ให้ accountant คนเดิมซ้ำสำหรับ invoice ใหม่จึงปลอดภัยและไม่กิน cap)
    - (3) **issue ได้เฉพาะ issuer ที่เตรียมไว้ล่วงหน้า**: admin ต้องตั้ง `issuerResolver[issuer]` ผ่าน setter ที่อยู่นอก interface ที่ freeze ไว้ (`setIssuerResolver(address issuer, address resolver)`, onlyAdmin) ถ้า wallet อื่นเรียก `/issue` จะ revert ต้องเขียนใน README และตอน demo ให้ใช้ SME wallet ที่เตรียมไว้
  - **ขอบเขตของ A-f1′**: ใช้หนีได้เฉพาะปัญหาที่เกิดจาก **gas หรือ context ของ contract** (เช่น deploy proxy จากใน `registerInvoice` แล้ว gas เกิน หรือ caller context ผิด) · ถ้า CP1 fail เพราะ **encoding ของ `deployProxy`/`initialize`** (เช่น Grant tuple, salt, calldata ของ init) script ก็จะ fail แบบเดียวกัน ทางแก้คือ**แก้ encoding แล้วรัน go/no-go ซ้ำ** ไม่ใช่เปลี่ยนไป fallback
- (A-f2 ใน v1 ถูกยกเลิก เพราะตอนนี้ fork test เป็นแนวทางหลักอยู่แล้ว)

**เหตุผลที่ตัดตัวเลือกอื่น**
- B ไม่ผ่าน D1 และจาก API ที่ verify แล้ว ทำให้ `expiry = dueDate` ไม่ได้
- C ขัดเกณฑ์ "not a cosmetic add-on" ของ ENS
- MultiBaas เหลือเป็นงาน optional ที่มี timebox (C6)

---

## 1. Product story

SME ญี่ปุ่นถูกเครดิตเทอม 60–120 วัน (月末締め翌々月払い) และตั๋วสัญญาใช้เงินกระดาษ (約束手形) กำลังถูกเลิกใช้ `[UNVERIFIED→S4: หา source ของ METI ก่อนใส่ README]` Seikyu ทำงานเป็นลำดับดังนี้
1. SME ออก invoice บน chain ในธุรกรรมเดียว ได้ ERC-721 receivable และชื่อ `inv-<id>.<parent>.eth` ที่มี `expiry = dueDate`
2. **ฝ่ายบัญชีของลูกหนี้ (取引先経理, บทบาท `accountant`)** ยืนยันหรือโต้แย้ง invoice ผ่าน record `ack` (`acknowledged` / `disputed`) ซึ่งเป็นการแก้ได้เพียงอย่างเดียวที่ role นี้ทำได้
3. นักลงทุนที่ผ่าน **World ID (Passport)** ซื้อ receivable ในราคาหักส่วนลด เงินเข้า SME ทันที
4. ลูกหนี้จ่ายเต็มจำนวน นักลงทุนได้ face value, token ถูก burn และ **ชื่อ ENS ถูก unregister ทันที**
5. ถ้าเลยวันครบกำหนดแล้วยังไม่จ่าย ชื่อจะหมดอายุเอง และ UI แสดงสถานะ **Overdue**

**ประโยคหลักที่ใช้เล่า**: *"The name lives as long as the debt is current."*

---

## 2. Architecture

### 2.1 Repo layout (owner card อยู่ใน `[ ]`; ไฟล์หนึ่งมี owner ได้ card เดียว ส่วน card อื่นจะ "modifies" ได้ก็ต่อเมื่อ owner merge แล้วเท่านั้น)
```
eth-2026/
├── .gitignore  LICENSE (MIT)                                   [A0]
├── README.md                                                   [C3]
├── docs/ENS_INTEGRATION.md  docs/WORLD_ID_DEBRIEF.md           [C3]
├── docs/DEMO_SCRIPT.md  docs/SHOWCASE.md                       [C4]
├── spike/world/**         (throwaway; C2 ลบทิ้ง)               [C0]
├── spike/ens-read/**      (throwaway; B5 ลบทิ้ง)               [B1]
├── contracts/
│   ├── foundry.toml  remappings.txt  .env.example              [A0]  (A2/A3 ห้ามแตะ)
│   ├── lib/  (submodules: forge-std, openzeppelin-contracts@v5.1.0, contracts-v2@sepolia-deployment-2026-09-15)  [A0]
│   ├── src/interfaces/ens/IUserRegistry.sol                    [A0]  minimal, สร้างจาก UserRegistryImpl.json ของ tag
│   ├── src/interfaces/ens/IPermissionedResolver.sol            [A0]  minimal + EAC errors
│   ├── src/interfaces/ens/IVerifiableFactory.sol               [A0]
│   ├── src/interfaces/ens/IETHRegistrar.sol                    [A0]
│   ├── src/interfaces/ens/ITextResolver.sol                    [A0]  ใช้เข้ารหัสคำสั่งอ่าน text เท่านั้น
│   ├── src/interfaces/ens/EnsV2Types.sol                       [A0]  Grant, Status, State + role constants (vendored จาก tag)
│   ├── src/interfaces/IInvoiceRegistrar.sol                    [A0]  freeze ที่ T+2:00
│   ├── src/InvoiceRegistrar.sol                                [A2]
│   ├── src/InvoiceMarket.sol  src/MockUSDC.sol                 [A3]
│   ├── test/fork/ForkBase.sol  test/fork/GoNoGo.t.sol          [A0]
│   ├── test/InvoiceRegistrar.t.sol                             [A2]  (fork)
│   ├── test/InvoiceMarket.t.sol  test/mocks/MockInvoiceRegistrar.sol  [A3]  (unit)
│   ├── test/mocks/MockInvoiceMarket.sol                        [C1]  stub สำหรับ anvil
│   ├── test/Integration.t.sol                                  [A4]  (fork)
│   ├── test/Overdue.t.sol                                      [A6]  STRETCH
│   ├── script/selector-parity.sh                               [A0]
│   ├── script/DeployUserRegistry.s.sol  script/RegisterParent.s.sol   [A1]
│   ├── script/DeployIssuerResolver.s.sol                       [A2]  (สร้างเฉพาะเมื่อใช้ A-f1′)
│   ├── script/Deploy.s.sol  script/Seed.s.sol  script/Harden.s.sol    [A4]
│   └── deployments/sepolia.json                                [A0 สร้าง schema] (A1/A4 เขียนได้เฉพาะ key ของตัวเองผ่าน vm.writeJson)
└── web/                                                        Next.js 15 App Router
    ├── package.json next.config.ts .env.example app/layout.tsx app/providers.tsx lib/env.ts lib/wagmi.ts   [B0]
    ├── wagmi.config.ts lib/generated.ts lib/deployments.ts lib/deployments.sepolia.json scripts/sync-deployments.mjs  [A5]
    ├── lib/ens.ts lib/invoices.ts scripts/check-ens.ts lib/__fixtures__/invoices.ts (ชั่วคราว; B5 ลบ)   [B1]
    ├── app/page.tsx app/invoice/[name]/page.tsx components/InvoiceCard.tsx components/StatusBadge.tsx   [B2]
    ├── components/BuyPanel.tsx components/PayPanel.tsx components/FaucetButton.tsx                      [B2b]
    ├── app/issue/page.tsx                                                                                [B3]
    ├── app/accountant/page.tsx scripts/eac-negative.ts                                                   [B4]
    ├── app/api/world/rp-context/route.ts app/api/world/verify/route.ts components/WorldVerifyButton.tsx
    │   lib/world.ts lib/server/chain.ts scripts/fixtures/bad-proof.json scripts/fixtures/signal-mismatch.json  [C1]
    └── scripts/e2e-sepolia.ts        (พิมพ์ tx hash สำหรับ AC-16 และใช้ re-seed ได้)                   [C1b]
```

### 2.2 บทบาทและสิทธิ์ (roles matrix)

| Actor | ที่มาของ address | `UserRegistry` | resolver ของ invoice | `InvoiceMarket` |
|---|---|---|---|---|
| Deployer (owner) | `DEPLOYER_PRIVATE_KEY` | ได้**เฉพาะ admin bits** ตอน `initialize` คือ `ROLE_REGISTRAR_ADMIN\|ROLE_RENEW_ADMIN\|ROLE_UNREGISTER_ADMIN` (= 23694882055805708026345164039296315868315648) ซึ่งพอสำหรับการ grant ใน E4 (`withAdminRolesApplied`) แต่ `register`/`unregister`/`renew` เองไม่ได้ · **ไม่มี `ROLE_SET_PARENT`** · หลัง E4 ให้ `Harden.s.sol` ทำ `revokeRootRoles(<ทุก bit ที่ deployer ถือ>, deployer)` แล้ว `roles(0, deployer)` ต้องเป็น `0` (AC-20) | ไม่มีสิทธิ์ | `owner` เรียกได้ `setOperator`, `pause/unpause`, `revokeVerification` |
| Deployer (เจ้าของ parent) | – | ได้จาก `ETHRegistrar` คือ `ROLE_SET_SUBREGISTRY(+ADMIN)`, `ROLE_SET_RESOLVER(+ADMIN)`, `ROLE_CAN_TRANSFER_ADMIN` บน `<parent>` `[VERIFIED@tag]` เท่ากับว่า deployer เปลี่ยน subregistry ได้ ต้องเขียนเปิดเผยใน README | – | – |
| `InvoiceRegistrar` | contract | `grantRootRoles(ROLE_REGISTRAR\|ROLE_RENEW\|ROLE_UNREGISTER)` โดย root roles มีผลกับทุกชื่อ `[VERIFIED@tag]` | ได้แค่ `ROLE_SET_TEXT \| ROLE_SET_TEXT_ADMIN` (root) และ **ไม่ได้ `ROLE_UPGRADE`** | เรียกได้จาก market เท่านั้น (`onlyMarket`) |
| Issuer (SME) | wallet ที่ใช้ `/issue` | เป็น owner ของ subname แต่ `roleBitmap = 0` คือ `safeTransferFrom` revert `TransferDisallowed` และ `setResolver` revert `[VERIFIED@tag]` | ไม่มีสิทธิ์ | `createInvoice`, `cancel` |
| Accountant = **ฝ่ายบัญชีลูกหนี้ (取引先経理)** | กรอกใน `/issue` (ห้ามเป็น issuer) | – | `grantSetterRoles(setText("", "ack", ""), accountant)` ได้แค่ **`ack` เท่านั้น** | – |
| Investor | wallet ที่ผ่าน World | – | – | `buy` และถือ ERC-721 ได้ไม่เกิน `MAX_OPEN_POSITIONS = 3` |
| Operator (backend) | `OPERATOR_PRIVATE_KEY` | – | – | `setVerified(investor, nullifier)` เท่านั้น (owner เปลี่ยน operator หรือ pause ได้) |
| Debtor | กรอกใน `/issue` | – | – | `settle` (ใครจ่ายก็ได้ แต่ UI แสดงปุ่มจ่ายให้ debtor) |

**เรื่องความน่าเชื่อถือของ `ack`**: ใน build นี้ issuer เป็นคนกรอก address ของ debtor และ accountant เอง ดังนั้น `ack` เชื่อได้เท่ากับความถูกต้องของ address ที่ issuer ให้มา ถ้า issuer ใส่ wallet ของตัวเองในนามลูกหนี้ acknowledgement ก็เป็นแค่การรับรองตัวเอง (self-attested)
- contract กันกรณีที่ชัดที่สุดไว้ด้วย `accountant != issuer && debtor != issuer` ใน `createInvoice` ถ้าผิดจะ revert `InvalidTerms()`
- ใน production ลูกหนี้ควรผูก AP wallet กับชื่อ ENS ของตัวเอง เรื่องนี้ต้องเขียนเปิดเผยใน README และ `ENS_INTEGRATION.md`

### 2.3 Lifecycle, records และสถานะที่แสดงบนจอ

**Records** (อ่านได้ 8 ตัว เรียงตามลำดับนี้ใน `recordsOf`): `amount`, `currency`, `debtor`, `dueDate`, `status`, `ack`, `tokenId`, `issuer`

| key | ใครเขียน | ค่าที่เป็นไปได้ |
|---|---|---|
| `status` | **registrar เท่านั้น** (ผ่าน market) | `listed` → `funded` → `paid` · `cancelled` · `overdue` (stretch A6) |
| `ack` | **accountant เท่านั้น** | `""` (ยังไม่ยืนยัน) · `acknowledged` · `disputed` · ค่าอื่นให้ UI แสดงเป็น **"invalid"** และจะ block การซื้อ |
| ที่เหลือ 6 key | registrar ตอน `registerInvoice` ครั้งเดียว | ค่าคงที่ (ไม่มี code path ใดแก้ได้อีก) |

**State machine ของ market**
```
createInvoice ─► Listed ──buy()──► Funded ──settle()──► Paid     (burn + status "paid" + unregister ถ้าชื่อยัง live)
                   └─cancel()─► Cancelled                          (burn + status "cancelled" + unregister ถ้าชื่อยัง live)
buy() ต้องผ่าน: state==Listed, isVerified[msg.sender], now<dueDate, REGISTRAR.isLive(id), ack ∈ {"", "acknowledged"}
settle()/cancel(): ทำได้ทั้งก่อนและหลัง dueDate (หลัง expiry ต้องข้าม unregister เพราะ registry จะ revert LabelExpired [VERIFIED@tag])
                   และยังเขียน status ผ่าน resolver ที่เก็บไว้ได้ เพราะ storage ของ resolver ไม่ถูกแตะ [VERIFIED@tag]
```

**สถานะที่แสดงบนจอ (`InvoiceView.displayState`)**

| displayState | เงื่อนไข | ชื่อ ENS |
|---|---|---|
| `Open` | Listed และ now < dueDate | live |
| `Funded` | Funded และ now < dueDate | live |
| `Overdue` | Funded และ now ≥ dueDate | หมดอายุ (หรือ live อีกครั้งพร้อม `status=overdue` ถ้าทำ stretch A6 `markOverdue`) |
| `Expired-unsold` | Listed และ now ≥ dueDate | หมดอายุ |
| `Paid` | Paid | unregister แล้ว |
| `Cancelled` | Cancelled | unregister แล้ว (ถ้าตอน cancel ชื่อยัง live) |

### 2.4 ENSv2 on-chain flow (ลำดับ: E2 → E1+E3 → E4 → ต่อ invoice E5–E7 → การอ่าน R/L)

Address จาก tag (A0 ต้องยืนยันซ้ำกับ `lib/contracts-v2/contracts/deployments/sepolia/*.json` ตามขั้นที่ 1 ใน §6)

| ชื่อ | Address |
|---|---|
| ETHRegistry | `0x657ea849311d3d5823348dded7c2aaafb3ede09e` |
| ETHRegistrar | `0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca` |
| UserRegistryImpl | `0xa80338aaa8d23831cea25e858d1774534abb0263` |
| PermissionedResolverImpl | `0x14f09fd05d4585759e54844dc9b00147131cf243` |
| VerifiableFactory | `0x9e726eb570beb6bceb495ab8cda7df517d4e841c` |
| UniversalResolverV2 | `0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3` |
| ENS MockUSDC (`ensMockUsdc`) | `0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e` |

| Step | สิ่งที่ทำ | Call (signature ตาม tag) | ไฟล์ |
|---|---|---|---|
| E2 | deploy `UserRegistry` proxy (**ต้องทำก่อน E1** เพราะ commitment ของ E1 มี subregistry อยู่ด้วย) | `VerifiableFactory.deployProxy(address impl=UserRegistryImpl, uint256 salt, bytes data)` โดย data = `initialize(Grant[] grants)` และ grants = `[{deployer, ROLE_REGISTRAR_ADMIN\|ROLE_RENEW_ADMIN\|ROLE_UNREGISTER_ADMIN}]` (**admin bits เท่านั้น** ไม่มี plain bit และไม่มี `ROLE_SET_PARENT` เพราะไม่มีการเรียก `setParent`) · CREATE2 salt = `keccak(msg.sender, salt)` | `script/DeployUserRegistry.s.sol` |
| E1+E3 | จด parent และผูก hierarchy ใน call เดียว | invocation 1: `commit(makeCommitment(label, deployer, secret, subregistry=userRegistry, resolver=0, duration=365d, referrer=0))` · รอ ≥ `MIN_COMMITMENT_AGE()` · invocation 2: `ensMockUsdc.mint(deployer, base+premium)` → `approve(ETHRegistrar, base+premium)` → `register(label, deployer, secret, userRegistry, address(0), 365 days, ensMockUsdc, bytes32(0))` · ถ้าผิดจะ revert `CommitmentTooNew`, `CommitmentTooOld` หรือ `UnexpiredCommitmentExists` | `script/RegisterParent.s.sol` (`--sig "commit()"` แล้วตามด้วย `--sig "register()"`) |
| E4 | ให้สิทธิ์ registrar | `UserRegistry.grantRootRoles(ROLE_REGISTRAR\|ROLE_RENEW\|ROLE_UNREGISTER, invoiceRegistrar)` (= 69633) | `script/Deploy.s.sol` |
| E5 | ต่อ invoice: deploy resolver | `deployProxy(PermissionedResolverImpl, uint256(keccak256(abi.encode(id))), abi.encodeCall(initialize, (grants=[{registrar, ROLE_SET_TEXT\|ROLE_SET_TEXT_ADMIN}], calls=[])))` ไม่มี `ROLE_UPGRADE` | `src/InvoiceRegistrar.sol` |
| E6 | ต่อ invoice: records และ EAC | `setText(bytes dnsName, key, value)` 7 ครั้ง (ยกเว้น `ack`) แล้ว `grantSetterRoles(abi.encodeCall(setText, (bytes(""), "ack", "")), accountant)` · setter scope = `keccak256(key)` เท่านั้น **resolver ต่อ invoice จึงเป็นทางเดียวที่จำกัด accountant ให้อยู่ใน invoice เดียวได้** และจำกัดที่ 15 assignees ต่อ role ต่อ resource `[VERIFIED@tag]` | same |
| E7 | ต่อ invoice: register subname | `UserRegistry.register("inv-<id>", issuer, address(0), resolver, 0, uint64(dueDate))` `[VERIFIED@tag]` ลำดับพารามิเตอร์ถูกต้อง | same |
| R | **records path** (อ่านได้เสมอ แม้หลัง expiry) | `IPermissionedResolver(resolverOf[id]).resolve(dnsName, abi.encodeCall(IMulticallable.multicall, (8 × abi.encodeCall(ITextResolver.text, (node, key)))))` แล้ว decode เป็น `bytes[]` และ `string` ตามลำดับ · ใน Solidity ใช้ `recordsOf/statusOf/ackOf` ส่วน web ใช้ `web/lib/ens.ts#readRecords` | `src/InvoiceRegistrar.sol`, `web/lib/ens.ts` |
| L | **liveness path** (`RESOLVES`/`LIVE_STATE`) | `UserRegistry.getState(uint256(labelhash))` ได้ `{status, expiry, latestOwner, tokenId, resource}` โดย live คือ `status == REGISTERED (2) && now < expiry` · สำหรับ ENS client สาธารณะใช้ `UniversalResolverV2.resolve(bytes,bytes)` (ใช้ตรวจ liveness เท่านั้น) | `InvoiceRegistrar.isLive`, `web/lib/ens.ts#isLive` |

- **ห้าม** อ่าน record ผ่านการค้น resolver จาก registry หรือผ่าน helper ENS สำเร็จรูปของ viem เพราะหลัง expiry registry จะคืน address(0) `[VERIFIED@tag]` การอ่าน record ต้องผ่าน resolver ที่เก็บไว้ (path R) เท่านั้น
- หลัง `block.timestamp >= expiry` `ownerOf` จะคืนค่า 0 · `getState().status` เป็น `AVAILABLE (0)` · `unregister()` revert `LabelExpired` · `renew()` ด้วย root `ROLE_RENEW` ทำให้ชื่อกลับมาใช้ได้ (owner เดิม) `[VERIFIED@tag]`
- Enum `Status { AVAILABLE, RESERVED, REGISTERED }`
- **ลำดับ field ของ `Grant` ต้องเป็น `(address account, uint256 roleBitmap)`** ตรงกับ ABI ของ tag ทั้ง `UserRegistryImpl.initialize((address,uint256)[])` และ `PermissionedResolverImpl.initialize((address,uint256)[],bytes[])` `[VERIFIED@tag]` · struct ที่ได้จาก `cast interface` หรือเขียนเองใน `EnsV2Types.sol` ต้องคงลำดับนี้ ถ้าสลับ selector ยังตรงอยู่แต่ค่าจะถูก decode ผิด · `test_fork_perInvoiceResolver_initialize_setText_grantSetter` ต้อง assert `hasRootRoles(ROLE_SET_TEXT, registrar) == true` เพื่อจับกรณีนี้
- Aliasing (`linkToNode(bytes,bytes32)`) ทำเฉพาะเมื่อ CP6 ผ่านครบและเหลือเวลา ≥ 1 ชม. · ไม่ทำ "AI agents as namespaces"

### 2.5 Contract interfaces (freeze ที่ T+2:00 — ถ้าจะเปลี่ยนต้องแจ้งทุก lane)

```solidity
// contracts/src/interfaces/IInvoiceRegistrar.sol   [A0 เขียนตามข้อความนี้ทุกตัวอักษร]
interface IInvoiceRegistrar {
    event InvoiceNameRegistered(uint256 indexed invoiceId, string label, address resolver, uint64 expiry);
    event InvoiceStatusSet(uint256 indexed invoiceId, string status);
    event InvoiceNameClosed(uint256 indexed invoiceId, string finalStatus, bool unregistered);

    function registerInvoice(uint256 invoiceId, address issuer, address accountant, uint64 dueDate,
                             string[] calldata keys, string[] calldata values) external returns (address resolver); // onlyMarket
    function setStatus(uint256 invoiceId, string calldata status) external;           // onlyMarket
    function closeInvoice(uint256 invoiceId, string calldata finalStatus) external;   // onlyMarket: setStatus แล้วถ้า isLive ค่อย unregister
    function isLive(uint256 invoiceId) external view returns (bool);                  // getState(labelhash): REGISTERED && now < expiry
    function statusOf(uint256 invoiceId) external view returns (string memory);       // path R
    function ackOf(uint256 invoiceId) external view returns (string memory);          // path R
    function recordsOf(uint256 invoiceId) external view returns (string[8] memory);   // path R, 1 multicall
    function resolverOf(uint256 invoiceId) external view returns (address);
    function labelOf(uint256 invoiceId) external pure returns (string memory);        // "inv-<id>"
    function nameOf(uint256 invoiceId) external view returns (string memory);         // "inv-<id>.<parent>.eth"
    function dnsNameOf(uint256 invoiceId) external view returns (bytes memory);
    function nodeOf(uint256 invoiceId) external view returns (bytes32);
}
```
- `InvoiceRegistrar` constructor: `(IUserRegistry registry, IVerifiableFactory factory, address resolverImpl, string memory parentLabel, address admin)`
  - `PARENT_NODE = keccak256(abi.encodePacked(ETH_NODE, keccak256(bytes(parentLabel))))` โดย `ETH_NODE = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae`
  - `setMarket(address)` เรียกได้ครั้งเดียวโดย admin

```solidity
// contracts/src/InvoiceMarket.sol  [A3]  OZ v5: ERC721, Ownable, Pausable, SafeERC20, Strings
contract InvoiceMarket is ERC721("Seikyu Receivable", "SKR"), Ownable, Pausable {
    enum State { None, Listed, Funded, Paid, Cancelled }
    struct Invoice { address issuer; address debtor; uint128 faceValue; uint128 price; uint64 dueDate; State state; }
    bytes32 constant ACK_EMPTY = keccak256(""); bytes32 constant ACK_OK = keccak256("acknowledged");
    IERC20 public immutable STABLE; IInvoiceRegistrar public immutable REGISTRAR;
    uint256 public immutable MAX_OPEN_POSITIONS;   // 3
    uint64 public constant MIN_TENOR = 60;         // วินาที ไว้ใช้ demo invoice ที่ due +10 นาที
    address public operator; uint256 public invoiceCount;
    mapping(uint256 => Invoice) public invoices;
    mapping(address => bool) public isVerified;
    mapping(bytes32 => address) public nullifierOwner;

    function createInvoice(address debtor, address accountant, uint128 faceValue, uint128 price, uint64 dueDate)
        external whenNotPaused returns (uint256 id);
        // require price<faceValue, dueDate>=now+MIN_TENOR, debtor/accountant != 0 และ != msg.sender → ไม่ผ่านให้ revert InvalidTerms
        // _mint(address(this), id); REGISTRAR.registerInvoice(id, msg.sender, accountant, dueDate, 7 keys, 7 values [status="listed"])
    function setVerified(address investor, bytes32 nullifier) external whenNotPaused;  // onlyOperator; investor ∉ {0, address(this)}
        // ถ้า nullifierOwner[n] ∉ {0, investor} ให้ revert NullifierAlreadyUsed(boundTo)
    function revokeVerification(address investor, bytes32 nullifier) external onlyOwner;  // ช่องทาง support ถ้า nullifier ถูก squat (R15)
    function setOperator(address newOperator) external onlyOwner;
    function pause() external onlyOwner;  function unpause() external onlyOwner;
    function buy(uint256 id) external whenNotPaused;
        // state==Listed · isVerified[msg.sender] (ตรวจก่อน _update) · now<dueDate · REGISTRAR.isLive(id) ถ้าไม่ผ่าน NameNotLive
        // h=keccak256(bytes(REGISTRAR.ackOf(id))); ถ้า h!=ACK_EMPTY && h!=ACK_OK ให้ revert PurchaseBlockedByAck(ack)
        // STABLE.safeTransferFrom(buyer→issuer, price); _transfer(address(this), buyer, id); state=Funded; REGISTRAR.setStatus(id,"funded")
    function settle(uint256 id) external;   // ไม่มี whenNotPaused เพื่อให้ pause ไม่ขวางนักลงทุนที่จะได้เงินคืน
        // state==Funded; STABLE.safeTransferFrom(msg.sender→ownerOf(id), faceValue); _burn; state=Paid; REGISTRAR.closeInvoice(id,"paid")
    function cancel(uint256 id) external;   // issuer เท่านั้น, state==Listed; _burn; state=Cancelled; REGISTRAR.closeInvoice(id,"cancelled")

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        bool isMint = _ownerOf(tokenId) == address(0);
        bool isBurn = to == address(0);
        if (!isMint && !isBurn) {                                   // ยกเว้นแค่ mint และ burn ส่วนการโอนเข้า address(this) ต้อง revert
            if (!isVerified[to]) revert NotVerifiedInvestor(to);
            if (balanceOf(to) >= MAX_OPEN_POSITIONS) revert PositionCapReached(to);
        }
        return super._update(to, tokenId, auth);
    }
    event InvoiceCreated(uint256 indexed id, address indexed issuer, address indexed debtor, uint128 faceValue,
                         uint128 price, uint64 dueDate, string name, address resolver);
    event InvestorVerified(address indexed investor, bytes32 indexed nullifier);
    event InvestorVerificationRevoked(address indexed investor, bytes32 indexed nullifier);
    event InvoiceFunded(uint256 indexed id, address indexed investor, uint128 price);
    event InvoiceSettled(uint256 indexed id, address indexed payer, address indexed holder, uint128 faceValue);
    event InvoiceCancelled(uint256 indexed id);
    error NotOperator(); error NotIssuer(); error NotVerifiedInvestor(address who);
    error NullifierAlreadyUsed(address boundTo); error PositionCapReached(address who);
    error InvalidState(State actual); error InvalidTerms(); error DueDatePassed();
    error NameNotLive(); error PurchaseBlockedByAck(string ack);
}
```
- วิธีเขียนค่า record: `amount = Strings.toString(faceValue)` (6 decimals) · `currency = IERC20Metadata(STABLE).symbol()` · `debtor`/`issuer` ใช้ `Strings.toHexString` · `dueDate` เป็น unix seconds · `tokenId = Strings.toString(id)` · `status = "listed"` (ไม่มีค่าไหน hard-code)
- `MockUSDC.sol`: `ERC20("Mock USDC","mUSDC")`, `decimals()=6`, `mint(to, amt)` แบบ public โดย `amt <= 1_000_000e6`
- **มี mock USDC สองตัว (ต้องเขียนใน README)**: `ensMockUsdc` (`0x16f9…`, ของ ENS) ใช้**เฉพาะ**จ่ายค่าจด parent ใน E1 · `mockUsdc` (mUSDC ของเรา) ใช้ใน market ทั้งหมด

### 2.6 World ID — credential ที่ friction ต่ำสุดแต่ยังให้ uniqueness แบบ deterministic

**Trust event**: wallet หนึ่งพยายามซื้อ receivable เป็นครั้งแรก คือการเข้าสู่สถานะ investor ที่รับความเสี่ยงการผิดนัดชำระแทน SME

**กฎของ product ที่ credential ต้องรองรับ**
- **R1** — ผู้ซื้อเป็นมนุษย์ ไม่ใช่ bot ที่ดักซื้อใบที่ discount ดี
- **R2** — **Exposure cap ต่อคนเพื่อปกป้องนักลงทุนรายย่อย**: หนึ่งคนถือ receivable ที่ยังไม่ครบกำหนดได้ไม่เกิน 3 ใบใน pilot (`balanceOf(to) < 3` ใน `_update`)
  - อ้างแบบของ per-investor limit ในคราวด์ฟันดิงเพื่อการลงทุนของญี่ปุ่น (株式投資型クラウドファンディング กำหนดเพดานต่อผู้ลงทุนทั่วไปต่อผู้ออกต่อปี) `[UNVERIFIED→S4: ตัวเลขและ source; ถ้ายืนยันไม่ได้ README จะเรียก cap นี้ว่า "pilot risk limit" โดยไม่อ้างกฎหมาย]`
  - cap จะมีความหมายก็ต่อเมื่อหนึ่งคนมีได้ wallet เดียว จึงต้องการ uniqueness
- **R3** — ไม่ใช้ชื่อ อายุ หรือสัญชาติ เพราะ KYC/FIEA ของจริงทำนอก chain และอยู่นอก scope ของ testnet pilot

| Credential | R1 | R2 (uniqueness แบบ deterministic) | R3 | Friction | สรุป |
|---|---|---|---|---|---|
| Device | ✗ | ✗ | ✓ | ต่ำสุด | ไม่พอ |
| Selfie Check | ✓ | ✗ ให้ผลเป็น "Sybil score" แบบความน่าจะเป็น (ข้อความบนหน้ารางวัล World ของ ETHGlobal Tokyo 2026: "Selfie Check … now live with Sybil score" `[UNVERIFIED→S4: URL ของ docs.world.org]`) เปิดช่องให้ทำ 2 บัญชีเพื่อได้ cap 2 เท่า | ✓ | ต่ำ | ไม่ผ่าน R2 |
| **Passport (NFC, ICAO 9303)** | ✓ | ✓ หนึ่งเอกสารต่อหนึ่งตัวตน | ✓ | กลาง (ใช้พาสปอร์ตที่มี IC chip) | **friction ต่ำสุดที่ยังให้ uniqueness แบบ deterministic จึงเลือกตัวนี้** |
| Proof of Human (Orb) | ✓ | ✓ (biometric) | ✓ | สูง (ต้องไปที่ Orb) | ใช้เป็น fallback |
| identityCheck({attributes}) | ✓ | ✓ | ✗ | กลาง | ขัด P3 |

- **ความเสี่ยงที่ยอมรับ**: คนที่มีพาสปอร์ต 2 ประเทศจะได้ cap 2 เท่า (6 positions) ซึ่งเป็นความเสียหายที่มีขอบเขต
- **สิ่งที่พิจารณาแล้วไม่ใช้**: `require_user_presence` ในทุกการซื้อ
- Preset อ่านจาก env `NEXT_PUBLIC_WORLD_PRESET` (`passport` | `proofOfHuman` | `orbLegacy` | `selfieCheck`) และฝั่ง server ตรวจ `identifier` ให้ตรงกับ preset นี้ด้วย

**Spike C0 (T+0:00–0:30, ทำใน `spike/world/` ไม่แตะ `web/`)**
1. H1 สร้าง **staging** app ที่ `https://developer.worldcoin.org` ตั้ง action = `buy-receivable`
2. สร้าง app ทิ้งด้วย `pnpm create next-app@15 spike/world --ts --app --eslint --use-pnpm --disable-git --yes`
3. ใส่ `IDKitRequestWidget` กับ `passport({signal: <wallet>})` และทำ route `rp-context` ด้วย `signRequest` จาก `@worldcoin/idkit-core/signing`
4. ทดสอบกับ Simulator `https://simulator.worldcoin.org/id/0x18310f83` แล้ว forward ผลไป `POST https://developer.world.org/api/v4/verify/{rp_id}`
5. บันทึกลง `.omc/research/spike-world.md`:
   - `T_start` และ `T_first_success`
   - ค่าจริงของ `responses[0].identifier`
   - **กฎการ hash signal ของ v4 และ field ที่พก signal hash (U-7)**
   - ผลลัพธ์หนึ่งชุดที่สำเร็จจริงของ wallet A (ใช้ทำ fixture)

**Fallback ladder (ห้ามลดต่ำกว่า R2 ยกเว้นขั้นสุดท้ายที่ต้องเปิดเผย)**
- T+0:30 Passport ผ่านหรือไม่
- ไม่ผ่านให้ใช้ `proofOfHuman`
- T+1:00 ยังไม่ผ่านให้ใช้ `orbLegacy` + `allow_legacy_proofs: true`
- T+1:30 ยังไม่ผ่านให้ใช้ `selfieCheck()` ได้เฉพาะ demo และต้องเขียนใน debrief ว่าเป็นการลดระดับ ห้ามอ้างว่าผ่าน R2
- ถ้าสุดท้ายใช้ PoH ให้ debrief เขียนว่า **"over-assured because of tooling"** และระบุว่าเป้าใน production คือ Passport

**ลำดับการ verify ฝั่ง server (`web/app/api/world/verify/route.ts`, `export const maxDuration = 30`)**
1. zod ตรวจ body `{investor: Address, result}` ถ้าไม่ผ่านคืน `400 INVALID_BODY`
2. `result.action === NEXT_PUBLIC_WORLD_ACTION` ถ้าไม่ตรงคืน `400 INVALID_BODY`
3. `result.responses[0].identifier` ต้องตรงกับ preset ที่ตั้งไว้ (กัน client แอบเปลี่ยนเป็น credential ที่อ่อนกว่า) ถ้าไม่ตรงคืน `422 CREDENTIAL_MISMATCH`
4. **ตรวจว่า signal ของ proof ตรงกับ `investor`**
   - คำนวณ hash ของ `investor` ตามกฎของ IDKit v4 แล้วเทียบกับ signal hash ในผลลัพธ์ โดย**ทำในเครื่องก่อนเรียก World API** ไม่ตรงคืน `422 SIGNAL_MISMATCH`
   - ถ้าผลลัพธ์ไม่มี signal hash ให้ส่ง signal ไปให้ `/api/v4/verify` ตรวจ แล้ว map error นั้นเป็น `SIGNAL_MISMATCH`
   - ถ้าทั้งสองทางทำไม่ได้ ให้ escalate ที่ T+2:30 (U-7)
   - **ที่ CP-U (T+2:30)** ต้องบันทึกใน `.omc/research/spike-world.md` ว่าใช้ทางไหน (local หรือ API)
   - server ต้อง forward **signal hash ตัวเดียวกับที่ตรวจไป** โดยไม่คำนวณใหม่ ถ้ามีคนแก้ hash ใน result ให้ตรงกับ `investor` การตรวจ local จะผ่าน แต่ proof จะไม่ verify กับ hash นั้น World API จึงตอบ `VERIFICATION_FAILED`
   - ถ้ามีแค่ทาง API และ World ไม่คืน error ที่ระบุว่าเป็นเรื่อง signal ให้แก้ค่าที่คาดของ AC-10c (และคอมเมนต์ใน §6 ขั้น 7) เป็น `422 VERIFICATION_FAILED` **ใน commit เดียวกับ** โค้ดของ route
5. `POST https://developer.world.org/api/v4/verify/{WORLD_RP_ID}` (forward ผลลัพธ์ไปทั้งก้อน) ถ้าไม่ผ่านคืน `422 VERIFICATION_FAILED` ถ้าเครือข่ายหรือ 5xx คืน `502 WORLD_API_UNAVAILABLE`
6. `response.environment === WORLD_ENV` ถ้าไม่ตรงคืน `409 ENV_MISMATCH`
7. `nullifier = normalizeNullifier(...)` แล้วอ่าน `nullifierOwner` ถ้าผูกกับ wallet อื่นอยู่แล้วคืน `409 NULLIFIER_ALREADY_USED`
8. operator `writeContract setVerified` ด้วย viem account ที่ใช้ **`nonceManager`** และ **retry 1 ครั้ง** เมื่อเจอ `nonce too low` หรือ `replacement underpriced` สำเร็จคืน `200 {txHash}` ทันทีโดยไม่รอ receipt ล้มเหลวคืน `500 OPERATOR_TX_FAILED`

**Fail paths (demo อย่างน้อย 2 ทาง)**

| # | เหตุการณ์ | ตรวจจับที่ | UI (`data-state`) |
|---|---|---|---|
| F1 | ผู้ใช้กดยกเลิก widget | `onOpenChange(false)` ก่อน `onSuccess` | `cancelled`: "Verification cancelled — only verified investors can buy receivables." ปุ่ม Buy ยังปิดอยู่ และมีปุ่ม Retry |
| F2 | ไม่มี credential หรือ credential ไม่ตรง | error จาก IDKit, `422 VERIFICATION_FAILED` หรือ `422 CREDENTIAL_MISMATCH` | `credential-unavailable` / `credential-mismatch` |
| F3 | คนเดิมใช้ wallet ที่ 2 | `409 NULLIFIER_ALREADY_USED` และบน chain revert `NullifierAlreadyUsed(boundTo)` | `nullifier-used`: "This World ID is already linked to 0x12…ab." |
| F4 | เรียก `buy()` ตรงจาก wallet ที่ยังไม่ verify | revert `NotVerifiedInvestor` | `not-verified` |
| F5 | proof ของ wallet A ถูกส่งมาพร้อม `investor` = B | `422 SIGNAL_MISMATCH` | `signal-mismatch` |

### 2.7 Frontend pages และแหล่งข้อมูล

| Route | ชนิด | อ่านจาก | เขียน |
|---|---|---|---|
| `/` | Server Component, `revalidate = 15` | `invoiceCount` → id 1..n → **8 records ผ่าน multicall `resolve` ครั้งเดียวต่อ invoice ด้วย resolver ที่เก็บไว้ (path R)** + `invoices(id)` + liveness (path L) แล้วจัดกลุ่มเป็น Active (Open/Funded), Attention (Overdue/Expired-unsold), Closed (Paid/Cancelled) | `FaucetButton` (island) |
| `/issue` | client | `parentName`, `STABLE.symbol()` | `createInvoice` (debtor, debtor AP, faceValue, discount %, due presets +7d/+30d/"+10 min (demo)") แล้ว parse event `InvoiceCreated` และ redirect |
| `/invoice/[name]` | Server + islands | 8 records, `displayState`, `isVerified[account]`, `ownerOf` | `BuyPanel`, `PayPanel`, ปุ่ม cancel |
| `/accountant` | client | name → id → `resolverOf(id)` → records | `setText(dnsName, "ack", v)` ด้วย wallet ของ debtor AP · ปุ่ม "Try to edit amount" และ "Try to edit status" ใช้ `simulateContract` แล้วแสดง `EACUnauthorizedAccountRoles` |

- `InvoiceView` (freeze ที่ T+2:00, อยู่ใน `web/lib/invoices.ts`):
  `{ id: bigint; name: string; label: string; resolver: Address; records: Record<'amount'|'currency'|'debtor'|'dueDate'|'status'|'ack'|'tokenId'|'issuer', string>; live: boolean; market: { issuer; debtor; faceValue: bigint; price: bigint; dueDate: bigint; state: 'Listed'|'Funded'|'Paid'|'Cancelled'; holder: Address|null }; overdue: boolean; displayState: 'Open'|'Funded'|'Overdue'|'Expired-unsold'|'Paid'|'Cancelled'; ackView: 'none'|'acknowledged'|'disputed'|'invalid' }`
- `web/lib/ens.ts`:
  - `dnsEncode(name)`
  - `readRecords(resolver, name)` (path R)
  - `isLive(name)` (path L: `registrar.isLive(id)` และถ้า S3 ผ่าน จะตรวจด้วย UR v2 `resolve` เพิ่ม)

### 2.8 Config, env และ wallets
- `contracts/.env`:
  - `SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL_BACKUP`, `FORK_BLOCK`, `ETHERSCAN_API_KEY`
  - `DEPLOYER_PRIVATE_KEY`, `DEPLOYER_ADDRESS`, `OPERATOR_ADDRESS`
  - `PARENT_LABEL`, `PARENT_SECRET` (bytes32 จาก `openssl rand -hex 32`)
  - `SME_ADDRESS`, `INVESTOR_A`, `INVESTOR_A2`, `DEBTOR_ADDRESS`, `DEBTOR_AP_ADDRESS`
- `web/.env.local` และ Vercel:
  - `NEXT_PUBLIC_SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL`, `NEXT_PUBLIC_WC_PROJECT_ID`
  - `NEXT_PUBLIC_WORLD_APP_ID`, `NEXT_PUBLIC_WORLD_ACTION=buy-receivable`, `NEXT_PUBLIC_WORLD_PRESET=passport`
  - `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY`, `WORLD_ENV=staging`, `OPERATOR_PRIVATE_KEY`
  - `LOCAL_MARKET_ADDRESS` ใช้ได้เฉพาะตอน dev (zod ปฏิเสธถ้า `NODE_ENV=production`)
- `web/.env.e2e` (ไม่ commit): `SME_PK`, `INVESTOR_A_PK`, `DEBTOR_PK`, `DEBTOR_AP_PK`
- `contracts/deployments/sepolia.json`:
  - A0 สร้าง schema โดยใส่ `0x000…000` ทุก key ก่อน เพื่อให้ `vm.writeJson` เขียนทับได้โดยไม่ลบ key อื่น
  - keys: `chainId, forkBlock, ensTag, ensCommit, ethRegistry, ethRegistrar, universalResolver, verifiableFactory, permissionedResolverImpl, userRegistryImpl, ensMockUsdc, parentName, userRegistry, invoiceRegistrar, invoiceMarket, mockUsdc, deployBlock`
- **Funding**: H3 เติม ETH ให้**เฉพาะ deployer** ≥ **0.8** Sepolia ETH จากนั้น `Seed.s.sol` กระจายให้ SME **0.2 ETH** และอีก 5 wallets (operator, investor A, investor A2, debtor, debtor AP) ตัวละ 0.05 ETH และ mint mUSDC ให้ investor A, A2 และ debtor ตัวละ 100,000
  - **งบของ SME**: SME เซ็น `createInvoice` อย่างน้อย 6 ครั้ง (seed ×2, flow, demo `disputed`, `/issue` ตอน live, re-seed ใน C5) คิดที่ cap 2.5M gas × 10 gwei = 0.025 ETH ต่อใบ รวม 0.15 ETH จึงให้ 0.2 ETH
  - A0 บันทึก gas ที่วัดได้จริง × gas price ตอนนั้น ลง `.omc/research/spike-ensv2.md` เป็นค่า "per-invoice cost"

---

## 3. Task cards (สำหรับ AI executors ที่ทำงานขนาน)

รูปแบบ: ID · ช่วงเวลา · agent · deps · files/functions · acceptance · kill/fallback

### 3.0 Executor git protocol (มี executor ทำงานพร้อมกันราว 6–8 ตัว ช่วงหนาแน่นที่สุดคือ T+2–4: A1, A2, A3, B1, B2, C1)
1. **Bootstrap บน `main` (T+0:00–0:20)**: A0 ทำ `git init` + commit แรก (`.gitignore`, `LICENSE`, `contracts/` scaffold) แล้ว B0 ทำ `create-next-app web` + commit scaffold (ประมาณ T+0:15) หลังจากนั้นไม่มีใคร commit ตรงเข้า `main` อีก ยกเว้น integrator
2. **worktree + branch แยกต่อ lane** เก็บไว้นอก repo ที่ `/Users/ikhalas/Documents/side-projects/eth-2026-wt/<lane>`:
   - `git worktree add ../eth-2026-wt/a1 -b lane/a1 main` แบบเดียวกันสำหรับ `lane/a0`, `lane/a1`, `lane/a2`, `lane/a3`, `lane/a4`, `lane/b-alpha`, `lane/b-beta`, `lane/c`
   - C0 ทำใน `spike/world/` บน `lane/c`
3. **ทุก worktree ต้อง**:
   - รัน `git submodule update --init --recursive` (ใน `contracts/`)
   - รัน `pnpm install` ของตัวเอง (ใน `web/`)
   - `cp` ไฟล์ `contracts/.env` และ `web/.env.local` จาก root เข้ามาเอง เพราะไฟล์เหล่านี้ไม่ถูก track
4. **Commit เฉพาะ path ที่ตัวเองเป็น owner** (§2.1): `git add <owned paths>` เท่านั้น **ห้าม `git add -A` หรือ `git add .`**
   - dependency ใหม่ใน `web/package.json` ต้องขอผ่าน Bα (เจ้าของ `package.json`)
   - ถ้า `pnpm-lock.yaml` ชนกัน integrator รัน `pnpm install` บน `main` แล้ว commit lockfile เอง
5. **Merge เข้า `main` ที่ CP1 (T+2:00), CP2 (T+3:30), CP4 (T+7:00), CP5 (T+10:00)** และหลัง CP5 ให้ merge ทุกครั้งที่ card เสร็จ จนถึง freeze T+15
   - integrator คือ team lead รัน `git merge --no-ff lane/<x>` ตามด้วย `forge build` และ `pnpm -C web build` บน `main`
   - หลัง merge ทุก lane ต้อง `git rebase main` หรือ `git merge main`
6. **คำว่า "modifies หลัง owner merge"** หมายถึงงานของ owner **merge เข้า `main` แล้ว** และ lane ที่จะแก้ต้องดึง `main` ล่าสุดมาก่อน
7. `deployments/sepolia.json`: A1 เขียน key ของตัวเองแล้ว merge ที่ CP2 จากนั้น A4 แตก branch จาก `main` หลัง CP2 จึงไม่ชนกัน

### Lane A — Contracts
- **A0 · T+0:00–2:00 · `executor` (opus) · deps: H3 (สำหรับ RPC/fork) · Toolchain, pins, interfaces และ go/no-go**
  0. `curl -L https://foundry.paradigm.xyz | bash && ~/.foundry/bin/foundryup` แล้ว `export PATH="$HOME/.foundry/bin:$PATH"`
  1. `git init` ที่ root · เขียน `.gitignore` และ `LICENSE` · `forge init contracts --no-git` แล้วลบ `Counter*`
  2. ใน `contracts/`: `forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 ensdomains/contracts-v2@sepolia-deployment-2026-09-15` (ถ้า clone แบบ recursive นานเกิน 5 นาที ให้ใช้ `--shallow`)
     - บันทึก `git -C lib/contracts-v2 rev-parse --short=8 HEAD` ซึ่งต้องได้ `f2f0a05e`
  3. เป็นเจ้าของ `foundry.toml`, `remappings.txt` และ `contracts/.env.example` แต่ผู้เดียว (`.env.example` มีทุก key ใน §2.8 แต่ไม่มีค่าลับ) มีแค่ `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/` และ `forge-std/` · **ห้าม compile source ของ contracts-v2** และห้ามอ่าน source ของ branch อื่น
  4. สร้าง `src/interfaces/ens/*.sol` จาก ABI ของ tag: `jq .abi lib/contracts-v2/contracts/deployments/sepolia/UserRegistryImpl.json > /tmp/ur.json && cast interface /tmp/ur.json -n IUserRegistry` แล้วตัดให้เหลือเฉพาะฟังก์ชันที่ใช้
     - `EnsV2Types.sol` คัด constant ของ role มาตรง ๆ จาก `RegistryRolesLib` และ `PermissionedResolverLib` **ของ tag** โดยใส่ header ระบุ tag และ commit
  5. สร้าง `IInvoiceRegistrar.sol` ตาม §2.5 ทุกตัวอักษร และสร้าง `deployments/sepolia.json` (schema §2.8) โดยใส่ address คงที่จาก tag JSON
  6. เขียน `script/selector-parity.sh` (§6 ขั้น 1) แล้วรันให้ได้ `PARITY OK (26 selectors)` · อ่านค่าจาก ETHRegistrar (§6 ขั้น 2) แล้วเลือก `PARENT_LABEL` ภายใน T+1:00
  7. `test/fork/ForkBase.sol` (deploy UserRegistry proxy ของตัวเองบน fork ผ่าน factory จริง) และ `test/fork/GoNoGo.t.sol` ประกอบด้วย:
     - `test_fork_perInvoiceResolver_initialize_setText_grantSetter`: deploy resolver ผ่าน factory → `setText` 7 ครั้ง → `grantSetterRoles(ack)` → prank accountant: `ack` ผ่าน แต่ `amount` revert `EACUnauthorizedAccountRoles` → `resolve` แบบ multicall decode ได้ 8 ค่า → `register` → log gas รวม แล้วเขียน `gas × cast gas-price` ลง `.omc/research/spike-ensv2.md` เป็น "per-invoice cost" (ใช้ในงบของ SME §2.8 และตัวกระตุ้น R12)
     - `test_fork_userRegistry_registerExpireRevive`: register (expiry now+100) → warp → `AVAILABLE` → `unregister` revert `LabelExpired` → `renew` ทำให้ชื่อกลับมา
  - Acceptance: AC-1, AC-21, `GoNoGoForkTest` ผ่าน 2/2 และ gas < 2,500,000 (**CP1 T+2:00 ได้ผล GO/NO-GO**)
  - Kill: ถ้าไม่ผ่านหรือ gas เกิน ให้ใช้ A-f1′ ทันที (A2 เขียน `DeployIssuerResolver.s.sol`)
- **A1 · T+2:00–3:30 (hard deadline T+4:00) · `executor` (opus #2) · deps: A0 · E2 → E1+E3**
  - `script/DeployUserRegistry.s.sol` เขียน `.userRegistry` ด้วย `vm.writeJson(vm.toString(addr), path, ".userRegistry")`
  - `script/RegisterParent.s.sol` มีสองฟังก์ชันคือ `commit()` และ `register()` โดย `register()` เขียน `.parentName`
  - Acceptance: AC-6
  - Fallback: (1) ถ้า label แรกไม่ `isAvailable` ให้ใช้ label ถัดไป (`seikyu` → `seikyu-rwa` → `invoicerwa`) (2) ขอชื่อ test จาก ENS mentor ถ้าถึง T+4:00 ยังไม่ได้ให้ escalate
  - **หลัง A1 เสร็จ (T+3:30–5:00) opus #2 ช่วยรักษา slack ของ A4**: ร่าง `script/Deploy.s.sol`, `script/Seed.s.sol` และ `script/Harden.s.sol` บน branch `lane/a4` (A4 ยังเป็น owner) ให้ `forge build` ผ่านด้วย interface ที่ freeze แล้ว เพื่อให้ A4 เริ่มที่ T+5:00 จาก script ที่ compile ได้แล้ว
- **A2 · T+2:00–5:00 · `executor` (opus) · deps: A0 · `InvoiceRegistrar` + 14 fork tests**
  - `src/InvoiceRegistrar.sol` ตาม §2.4 (E5–E7, R, L) และ §2.5 · `closeInvoice` ข้าม `unregister` เมื่อ `!isLive(id)`
  - `test/InvoiceRegistrar.t.sol` (fork):
    - `test_registerInvoice_expiryEqualsDueDate`
    - `test_registerInvoice_setsRecords`
    - `test_registerInvoice_onlyMarket_reverts`
    - `test_accountantCanSetAck`
    - `test_accountantCannotSetAmount_reverts` (ใช้ `EACUnauthorizedAccountRoles.selector`)
    - `test_accountantCannotSetStatus_reverts`
    - `test_nameExpiredAtDueDate`
    - `test_nameLiveOneSecondBeforeDueDate`
    - `test_statusOf_afterExpiry`
    - `test_closeInvoice_unregistersLiveName`
    - `test_closeInvoice_afterExpiry_skipsUnregister`
    - `test_issuerCannotSetResolver_reverts`
    - `test_issuerCannotTransferName_reverts` (`TransferDisallowed`)
    - `test_resolver_noUpgradeRoleGranted`
  - Acceptance: `--match-contract InvoiceRegistrarTest` ต้องผ่าน 14/14
- **A3 · T+1:00–4:30 · `executor` (sonnet) · deps: A0 step 5 (interface เสร็จประมาณ T+0:45) · `InvoiceMarket` + `MockUSDC` + 22 unit tests**
  - Files: `src/InvoiceMarket.sol`, `src/MockUSDC.sol`, `test/mocks/MockInvoiceRegistrar.sol` (เก็บ status, ack และ live flag ไว้ใน mapping), `test/InvoiceMarket.t.sol`
  - Tests:
    - `test_createInvoice_mintsToEscrow_andRegistersName`
    - `test_createInvoice_priceNotBelowFace_reverts`
    - `test_createInvoice_dueDateTooSoon_reverts`
    - `test_createInvoice_accountantIsIssuer_reverts`
    - `test_setVerified_onlyOperator_reverts`
    - `test_setVerified_nullifierBoundToOtherWallet_reverts`
    - `test_buy_unverified_reverts`
    - `test_buy_happyPath_paysIssuer_transfersToken_setsFunded`
    - `test_buy_afterDueDate_reverts`
    - `test_buy_nameNotLive_reverts`
    - `test_buy_ackDisputed_reverts`
    - `test_buy_ackUnknownValue_reverts`
    - `test_buy_ackAcknowledged_succeeds`
    - `test_buy_positionCap_reverts`
    - `test_transferToUnverified_reverts`
    - `test_transferToMarket_reverts`
    - `test_settle_paysHolderFaceValue_burns_closesName`
    - `test_settle_notFunded_reverts`
    - `test_cancel_onlyIssuer_closesName`
    - `test_setOperator_onlyOwner`
    - `test_pause_blocksBuyButNotSettle`
    - `test_revokeVerification_onlyOwner_clearsBinding`
  - Acceptance: `--match-contract InvoiceMarketTest` ต้องผ่าน 22/22
- **A4 · T+5:00–6:30 · `executor` (opus) · deps: A1, A2, A3 (merge แล้ว) และ script ร่างของ opus #2 บน `lane/a4` · Integration, deploy, seed และ harden**
  - `test/Integration.t.sol` (fork, ใช้ของจริงทั้งหมด):
    - `test_e2e_issueVerifyBuySettle_unregistersName`
    - `test_settle_afterExpiry_writesPaidViaStoredResolver`
    - `test_cancel_afterDueDate_succeeds`
    - `test_e2e_buy_blockedWhenAccountantDisputes`
  - `script/Deploy.s.sol`:
    - deploy ตามลำดับ `MockUSDC` → `InvoiceRegistrar` → `InvoiceMarket(STABLE, REGISTRAR, 3, OPERATOR_ADDRESS)`
    - ทำ E4 แล้วเรียก `setMarket`
    - เขียน `.invoiceRegistrar`, `.invoiceMarket`, `.mockUsdc`, `.deployBlock` ด้วย `vm.writeJson(..., ".key")`
  - `script/Seed.s.sol` กระจาย ETH และ mUSDC ตาม §2.8
  - `script/Harden.s.sol` (รันหลัง E4 ครั้งสุดท้าย ที่ CP7) อ่าน `b = roles(0, deployer)` แล้วเรียก `revokeRootRoles(b, deployer)` (ทุก bit ที่ deployer ถือ) จากนั้น assert `roles(0, deployer) == 0` · admin bits ทำให้ deployer revoke ได้ทั้ง admin และ plain bit (`withAdminRolesApplied`) จึงไม่มีทางถอยแบบ "เปิดเผยแทน" · ก่อน CP7 ถ้าต้อง redeploy registrar ให้ deploy `UserRegistry` ใหม่ แล้ว parent owner เรียก `ETHRegistry.setSubregistry`
  - Acceptance:
    - `Integration` ผ่าน 4/4
    - AC-2
    - `jq -e` ตาม §6 ขั้น 5 exit 0
    - `forge test --gas-report` ได้ตัวเลข `createInvoice` ไปใส่ README
- **A5 · T+6:30–7:00 · `executor` (sonnet) · deps: A4 · ABI export**
  - `web/wagmi.config.ts` (`@wagmi/cli` + foundry plugin) สร้าง `web/lib/generated.ts`
  - `web/scripts/sync-deployments.mjs` คัดลอกไฟล์ไปเป็น `web/lib/deployments.sepolia.json` และสร้าง `web/lib/deployments.ts`
  - Acceptance: `pnpm -C web wagmi generate && pnpm -C web build` exit 0
- **A6 · T+10:00–12:00 · STRETCH · `executor` (sonnet)**
  - modifies (หลัง A2/A3 merge แล้ว): เพิ่ม `reviveOverdue(id,newExpiry)` ใน registrar (`renew` ด้วย root `ROLE_RENEW` แล้วตั้ง `status="overdue"`) และเพิ่ม `markOverdue(id)` ใน market (ใครเรียกก็ได้ ต้องเป็น Funded, now ≥ dueDate และ `!isLive`)
  - `test/Overdue.t.sol` มี `test_markOverdue_revivesNameWithOverdueStatus`

### Lane B — Frontend (ใช้ 2 executors: Bα และ Bβ)
- **B0 (Bα) · T+0:00–1:30 · `executor` (sonnet) · Scaffold**
  - `pnpm create next-app@15 web --ts --app --tailwind --eslint --no-src-dir --import-alias "@/*" --use-pnpm --disable-git --yes` **เป็นคำสั่งแรกของ B0** แล้ว commit scaffold ภายในประมาณ T+0:15 (ต้องรอ `git init` ของ A0 step 1 ก่อน) · milestone นี้ปลดล็อก C1
  - `pnpm -C web add wagmi viem@2 @tanstack/react-query @rainbow-me/rainbowkit @worldcoin/idkit @worldcoin/idkit-core zod`
  - `pnpm -C web add -D tsx @wagmi/cli`
  - Files: `app/layout.tsx`, `app/providers.tsx`, `lib/wagmi.ts` (`sepolia` + `fallback([http(NEXT_PUBLIC_SEPOLIA_RPC_URL), http()])`), `lib/env.ts`, `.env.example`
  - Acceptance: `pnpm -C web build` exit 0
  - Fallback: ถ้า peer deps ชนกับ React 19 ให้ใช้ wagmi `injected()` connector ตัวเดียว
- **B1 (Bα) · T+1:30–4:00 · `executor` (sonnet) · deps: A0 step 0 (anvil) + `SEPOLIA_RPC_URL` · Data layer + S3**
  - **S3 spike (T+1:30–2:15, timebox 45 นาที, ทำใน `spike/ens-read/`)**
    - เปิด `anvil --fork-url $SEPOLIA_RPC_URL` แล้ว deploy resolver ผ่าน factory ด้วย viem
    - พิสูจน์ว่า (a) `resolve(dnsName, multicall(8 × encoded text call))` decode ได้ด้วย viem และ (b) UR v2 `resolve(bytes,bytes)` เรียกได้จาก viem
    - **Kill**: ถ้า (a) ไม่ผ่านภายใน 2:15 ให้ web อ่าน `registrar.recordsOf(id)` แทน ซึ่งยังเป็น path R ผ่าน resolver ที่เก็บไว้ · ถ้า (b) ไม่ผ่าน ให้ `isLive` ใช้แค่ `registrar.isLive(id)`
  - `lib/ens.ts` (`dnsEncode`, `readRecords`, `isLive`) · `lib/invoices.ts` (`listInvoices`, `getInvoice` คืน `InvoiceView`) · `scripts/check-ens.ts` (พิมพ์ `records[key]=value` 8 บรรทัด, `RESOLVES: true|false`, `LIVE_STATE: AVAILABLE|RESERVED|REGISTERED`)
  - `lib/__fixtures__/invoices.ts` ใช้ชั่วคราวเท่านั้น
  - Acceptance: `pnpm -C web exec tsc --noEmit` ผ่าน และบันทึกผล S3 ลง `.omc/research/spike-ens-read.md` ภายใน T+2:15
- **B2 (Bβ) · T+1:30–5:00 · `executor`/`designer` (sonnet)**
  - `app/page.tsx`, `app/invoice/[name]/page.tsx`, `components/InvoiceCard.tsx` (มี `data-invoice-card`), `components/StatusBadge.tsx` (แสดง `displayState` และ `ackView` โดยค่า `invalid` ให้เป็นสีแดง)
  - แสดง `data-record="<key>"` ครบ 8 ตัว
  - Acceptance (ใช้ fixtures):
    - `curl -s localhost:3000/ | grep -o 'data-invoice-card' | wc -l` ≥ 2
    - `curl -s localhost:3000/invoice/inv-1.seikyu.eth | grep -o 'data-record=' | wc -l` = 8
- **B2b (Bβ) · T+5:00–7:00 · `executor` (sonnet)**
  - `components/BuyPanel.tsx`: ถ้ายังไม่ verified ให้แสดง `WorldVerifyButton` ถ้า verified แล้วทำ approve + buy · decode error `NotVerifiedInvestor`, `PositionCapReached`, `NameNotLive`, `PurchaseBlockedByAck`, `DueDatePassed` ให้เป็น `data-state`
  - `components/PayPanel.tsx` (debtor ทำ approve + settle) และ `components/FaucetButton.tsx`
  - Acceptance: `pnpm -C web build` exit 0 และ `grep -c "WorldVerifyButton" components/BuyPanel.tsx` ≥ 1
- **B3 (Bα) · T+4:00–6:30 · `executor` (sonnet)**
  - `app/issue/page.tsx`
  - Acceptance (ทำใน C-E2E): ส่งฟอร์มบน Sepolia แล้วได้ `/invoice/inv-<n>.<parent>` ที่แสดง 8 records โดย 7 ตัวไม่ว่าง และ `ack` ว่างได้
- **B4 (Bβ) · T+7:00–9:00 · `executor` (sonnet)**
  - `app/accountant/page.tsx` และ `scripts/eac-negative.ts`
  - Acceptance: AC-9
- **B5 (Bα) · T+7:00–9:00 · `executor` (sonnet) · deps: A5, H5**
  - ต่อทุกหน้าเข้ากับ Sepolia · ลบ `lib/__fixtures__/` และ `spike/ens-read/` · push ขึ้น GitHub เพื่อให้ Vercel build
  - Acceptance:
    - `curl -s -o /dev/null -w '%{http_code}' $DEMO_URL` = `200`
    - `test ! -d web/lib/__fixtures__ -a ! -d spike/ens-read && echo CLEAN_B5` แสดง `CLEAN_B5`
    - AC-15
- **B6 (Bβ) · T+10:00–13:00 · `designer` (sonnet)**
  - **modifies (หลัง merge แล้ว)**: `components/BuyPanel.tsx`, `components/StatusBadge.tsx`, `components/InvoiceCard.tsx` · `components/WorldVerifyButton.tsx` ยังเป็นของ C1 โดย B6 แตะได้เฉพาะ class/สไตล์
  - ทำ state ของ `not-verified`, `ack-blocked`, `name-not-live`, `position-cap`, `overdue`, `expired-unsold` และทำให้ใช้ได้บน mobile
  - Acceptance: `grep -rhoE 'data-state="(cancelled|credential-unavailable|credential-mismatch|signal-mismatch|nullifier-used|not-verified|ack-blocked|name-not-live|position-cap|overdue|expired-unsold)"' web/components web/app | sort -u | wc -l` = `11`

### Lane C — Integrations / Docs
- **C0 · T+0:00–0:30 · `executor` (sonnet) + H1** ทำตาม §2.6 ใน `spike/world/`
- **C1 · T+0:30–4:00 · `executor` (sonnet) · deps: A0 step 0 (foundry สำหรับ anvil) และ **commit scaffold ของ B0 (ประมาณ T+0:15)** เพราะ `create-next-app web` ปฏิเสธโฟลเดอร์ที่ไม่ว่าง C1 จึงห้ามสร้างไฟล์ใน `web/` ก่อน commit นั้น · รัน `pnpm -C web dev` ได้หลัง B0 เสร็จ (T+1:30)**
  - `app/api/world/rp-context/route.ts`, `app/api/world/verify/route.ts` (8 ขั้นใน §2.6)
  - `components/WorldVerifyButton.tsx` (มี `data-state`: `cancelled`, `credential-unavailable`, `credential-mismatch`, `signal-mismatch`, `nullifier-used`)
  - `lib/world.ts`: `normalizeNullifier` (`toHex(BigInt(x),{size:32})`), `buildPreset(env)`, `expectedIdentifier(env)`, `hashSignalV4(address)`
  - `lib/server/chain.ts`: publicClient และ operator walletClient ที่ใช้ `nonceManager` · อ่าน address ของ market จาก `LOCAL_MARKET_ADDRESS`
  - `contracts/test/mocks/MockInvoiceMarket.sol` เป็น subset ของ ABI ของ market: `setVerified`, `isVerified`, `nullifierOwner`, `NullifierAlreadyUsed`, `InvestorVerified` · deploy ลง anvil ด้วย `forge create`
  - Fixtures:
    - `web/scripts/fixtures/bad-proof.json`: ผลลัพธ์จริงของ wallet A ที่ทำให้ `proof` เสีย และ `investor` = A
    - `web/scripts/fixtures/signal-mismatch.json`: ผลลัพธ์จริงของ wallet A แต่ `investor` = B
  - Acceptance: AC-10 ครบ 3 curl บน `pnpm -C web dev` ที่ต่อกับ anvil
- **C1b · T+4:00–7:00 · `executor` (sonnet) · deps: A0 (ABI ใน §2.5) · `web/scripts/e2e-sepolia.ts`**
  - `--seed` สร้าง invoice due +7d และ due +10 นาที แล้วพิมพ์ `EXPIRY_DEMO=inv-<n>.<parent>`
  - `--flow` ทำ create → buy (INVESTOR_A ซึ่งต้อง verify ผ่าน UI มาก่อน) → settle แล้วพิมพ์ `CREATE_TX`, `VERIFY_TX` (จาก log `InvestorVerified`), `NULLIFIER_A`, `BUY_TX`, `SETTLE_TX`, `STATE=3`, `LIVE_STATE=AVAILABLE`, `records[status]=paid`
  - Acceptance: `pnpm -C web exec tsc --noEmit` ผ่าน และรันจริงใน C-E2E
- **C2 · T+7:00–8:30 · `executor` (sonnet) · deps: A5**
  - modifies `lib/server/chain.ts` ให้อ่าน address จาก `lib/deployments.ts` · ทดสอบ F1, F3, F5 บน Sepolia · **ลบ `spike/world/`**
  - Acceptance: `test ! -d spike/world && echo CLEAN_C2`
- **C-E2E · T+9:00–10:00 · คน + `executor` · critical path**
  - verify ผ่าน simulator บน live URL แล้วรัน `e2e-sepolia.ts --seed` และ `e2e-sepolia.ts --flow`
  - Acceptance: AC-11, AC-12, AC-16
- **C3 · T+10:00–14:00 · `writer` + `explore`**
  - `README.md`, `docs/ENS_INTEGRATION.md`, `docs/WORLD_ID_DEBRIEF.md` (template ใน §9)
  - ปิด S4 (sources) ภายใน T+12:00
- **C4 · T+14:00–16:00 · `writer`**
  - `docs/DEMO_SCRIPT.md` และ `docs/SHOWCASE.md` แล้วซ้อม 2 รอบ
- **C5 · T+16:00–18:00 · คน + `executor`**
  - `e2e-sepolia.ts --seed` (re-seed) แล้วอัด video 3 นาที
- **C6 · T+12:00–13:30 · OPTIONAL · executor แยกต่างหาก**
  - MultiBaas: ทำหน้า `/activity` จาก event query · timebox 90 นาที ถ้าไม่เสร็จให้ revert แล้วเขียนตรง ๆ ใน README ข้อ 2 และ 5

### Verification lane
- **V1 (T+10:00) และ V2 (T+15:00) · `verifier`** รัน §6 ตามลำดับแล้วรายงาน pass/fail ต่อ AC ห้ามคนเขียนงาน approve งานของตัวเอง

### งานที่ต้องใช้คน
- **H1 (T+0)** World Developer Portal: สร้าง staging app และ action
- **H2 (T+0)** สร้าง Reown/WalletConnect projectId
- **H3 (T+0)** เติม ETH ≥ 0.8 Sepolia ให้ deployer เท่านั้น (Seed ส่งต่อให้ SME 0.2 และ wallet อื่นตัวละ 0.05) สร้าง 6 wallets ใน MetaMask แล้วใส่ address ลง `contracts/.env`
- **H4 (T+1)** สร้าง GitHub repo **public** แล้ว push (ต้องให้คนยืนยันก่อน)
- **H5 (T+7)** Vercel dashboard: import repo, root `web`, ใส่ env (เครื่องนี้ไม่มี vercel CLI)
- **H6 (≤T+14)** ข้อมูลทีมและ social
- **H7 (T+16)** พากย์เสียง video
- **H8 (≤T+19)** submit บน ETHGlobal

---

## 4. ตารางรายชั่วโมง (baseline ใหม่: A0 = 2 ชม.)

| T+ | JST | Lane A | Lane Bα | Lane Bβ | Lane C | Checkpoint |
|---|---|---|---|---|---|---|
| 0:00–1:00 | 02:30–03:30 | A0 (setup, pins, interfaces, parity, อ่านค่า registrar) | B0 | – | C0 (≤0:30) → C1 | **CP0 0:30** เลือก credential |
| 1:00–2:00 | 03:30–04:30 | A0 (fork go/no-go) ‖ A3 เริ่ม | B0 เสร็จ 1:30 → B1/S3 | B2 เริ่ม 1:30 | C1 | **CP1 2:00** E5 GO/NO-GO + gas + freeze interfaces |
| 2:00–3:00 | 04:30–05:30 | A1 ‖ A2 ‖ A3 | B1 (S3 ปิด 2:15) | B2 | C1 (U-7 ปิด ≤2:30) | **CP-U 2:30** ตัดสินเรื่องที่ไม่รู้ทุกข้อ (ด้านล่าง) |
| 3:00–4:00 | 05:30–06:30 | A1 เสร็จ 3:30 ‖ A2 ‖ A3 | B1 เสร็จ 4:00 | B2 | C1 เสร็จ 4:00 | **CP2 3:30** (แข็ง 4:00) parent + UserRegistry live |
| 4:00–5:00 | 06:30–07:30 | A2 ‖ A3 เสร็จ 4:30 | B3 | B2 เสร็จ 5:00 | C1b | – |
| 5:00–6:30 | 07:30–09:00 | A4 | B3 เสร็จ 6:30 | B2b | C1b | – |
| 6:30–7:00 | 09:00–09:30 | A5 | buffer | B2b เสร็จ 7:00 | C1b เสร็จ 7:00 | **CP4 7:00** contracts บน Sepolia + ABIs |
| 7:00–9:00 | 09:30–11:30 | ช่วยแก้ bug | B5 | B4 | C2 (7:00–8:30) | – |
| 9:00–10:00 | 11:30–12:30 | ช่วยแก้ bug | ช่วย | ช่วย | **C-E2E** | **CP5 10:00** E2E บน live URL · V1 |
| 10:00–12:00 | 12:30–14:30 | A6 stretch | แก้ bug | B6 | C3 | **CP6 12:00 CUT LINE** |
| 12:00–14:00 | 14:30–16:30 | แก้ bug | polish | B6 เสร็จ 13:00 | C3 ‖ C6 (optional) | – |
| 14:00–16:00 | 16:30–18:30 | `Harden.s.sol` ที่ 15:00 | freeze 15:00 | freeze | C4 | **CP7 15:00** feature freeze · V2 |
| 16:00–18:00 | 18:30–20:30 | – | – | – | C5 (re-seed + อัด video) | **CP8 18:00** |
| 18:00–20:00 | 20:30–22:30 | buffer | buffer | buffer | H8 ≤ 19:00 | **CP9** |

**Critical path**: A0 2.0 → A2 3.0 → A4 1.5 → A5 0.5 → B5 2.0 → C-E2E 1.0 = **10.0 ชม.** จบที่ CP5 (T+10:00) **เหลือ slack 2.0 ชม.** ก่อน CP6 (T+12:00) ซึ่งมากกว่าเกณฑ์ขั้นต่ำ 1.5 ชม.
- เส้นทางที่เกือบเป็น critical: A1 (2:00–3:30) ต้องเสร็จก่อน A4 เริ่มที่ 5:00 จึงมี slack 1.5 ชม. (และมี deadline แข็งที่ 4:00)

**CP-U (T+2:30) — เรื่องที่ไม่รู้และมีความเสี่ยงสูงทุกข้อต้องได้คำตอบภายในเวลานี้**

| เรื่อง | ปิดที่ |
|---|---|
| World credential (U-8) | 0:30, ladder ถึง 1:30 |
| ชื่อ parent ว่างหรือไม่และจ่ายด้วย ensMockUsdc ได้หรือไม่ (§6 ขั้น 2) | 1:00 |
| E5 resolver ต่อ invoice และ gas (CP1) | 2:00 |
| S3 การอ่านผ่าน viem (U-6) | 2:15 |
| การผูก signal (U-7) | 2:30 |

การจดชื่อ parent จริง (2 tx) เป็นความเสี่ยงด้าน execution ไม่ใช่เรื่องที่ไม่รู้ และมี deadline 4:00

**Cut line (CP6, T+12:00)** — ถ้า CP5 ยังไม่ผ่าน ให้ตัดตามลำดับนี้
1. C6 MultiBaas
2. aliasing
3. A6 `markOverdue`
4. UI ของ `cancel` (คง contract และ test ไว้)
5. Etherscan verify (source ยังเปิดบน GitHub)
6. mobile polish

(v1 เคยมีข้อ "ตัดการจำกัด transfer" ข้อนั้น**ถูกลบแล้ว** เพราะจะทำให้ M4/AC-5 หายไปแบบเงียบ ๆ)

**ห้ามตัด**
- M1 subname ที่ `expiry = dueDate`
- M2 resolver ต่อ invoice + 8 records
- M3 EAC แก้ได้แค่ `ack` พร้อม negative ที่ revert ทั้ง `amount` และ `status`
- M4 World verify ฝั่ง server + ตรวจ signal + fail path ≥ 2 + `_update` gate
- M5 buy/settle + unregister ตอน settle
- M6 live URL + public repo
- M7 README + `ENS_INTEGRATION.md` + `WORLD_ID_DEBRIEF.md` + video

---

## 5. Acceptance Criteria (22 ข้อ มี command จริงพร้อมผลที่คาด 21 ข้อ และตรวจด้วยมือแค่ AC-19)

ตัวแปร (`$ROOT`, `$DEP`, `$MARKET`, …) ตั้งไว้ใน §6 ขั้นเตรียม · ทุก `forge test` ใช้ `$FT` = `forge test --fork-url $SEPOLIA_RPC_URL --fork-block-number $FORK_BLOCK`

- **AC-1 build** — `cd $ROOT/contracts && forge build` → exit 0
- **AC-2 test ทั้งหมด** — `$FT 2>&1 | tail -n 3` → มี `42 tests passed, 0 failed` (fork go/no-go 2 + registrar 14 + market 22 + integration 4; ถ้าทำ stretch A6 จะเป็น 43)
- **AC-3 EAC negative** — `$FT --match-test "test_accountantCanSetAck|test_accountantCannotSetAmount_reverts|test_accountantCannotSetStatus_reverts"` → `3 tests passed, 0 failed`
- **AC-4 expiry และ path R หลัง expiry** — `$FT --match-test "test_registerInvoice_expiryEqualsDueDate|test_nameExpiredAtDueDate|test_nameLiveOneSecondBeforeDueDate|test_statusOf_afterExpiry|test_settle_afterExpiry_writesPaidViaStoredResolver|test_cancel_afterDueDate_succeeds"` → `6 tests passed, 0 failed`
- **AC-5 World gate บน chain** — `$FT --match-test "test_buy_unverified_reverts|test_setVerified_nullifierBoundToOtherWallet_reverts|test_buy_positionCap_reverts|test_transferToUnverified_reverts|test_transferToMarket_reverts"` → `5 tests passed, 0 failed`
- **AC-6 hierarchy บน Sepolia** — `test "$(cast call 0x657ea849311d3d5823348dded7c2aaafb3ede09e "getSubregistry(string)(address)" "$PARENT_LABEL" --rpc-url $SEPOLIA_RPC_URL | tr A-F a-f)" = "$(jq -r .userRegistry $DEP | tr A-F a-f)" && echo HIERARCHY_OK` → `HIERARCHY_OK`
- **AC-7 records live (path R + path L)** — `pnpm -C $ROOT/web exec tsx scripts/check-ens.ts inv-1.$PARENT` → มี `records[...]` 8 บรรทัด (7 ตัวไม่ว่าง, `ack` ว่างได้) และ `RESOLVES: true` กับ `LIVE_STATE: REGISTERED`
- **AC-8 expiry live (path L = false, path R ยังอ่านได้)**
  - `pnpm -C $ROOT/web exec tsx scripts/check-ens.ts $EXPIRY_DEMO` (รันหลัง due +10 นาที) → `RESOLVES: false`, `LIVE_STATE: AVAILABLE`, `records[status]=listed`
  - `cast call $USER_REGISTRY "getState(uint256)((uint8,uint64,address,uint256,uint256))" $(cast keccak "${EXPIRY_DEMO%%.*}") --rpc-url $SEPOLIA_RPC_URL` → field แรกเป็น `0`
- **AC-9 EAC live** — `pnpm -C $ROOT/web exec tsx scripts/eac-negative.ts inv-1.$PARENT` → `ack: OK (tx 0x…)`, `amount: REVERTED (EACUnauthorizedAccountRoles)`, `status: REVERTED (EACUnauthorizedAccountRoles)`
- **AC-10 World verify ฝั่ง server (3 curl)** — คำสั่งตาม §6 ขั้น 7 → ได้ `400 INVALID_BODY`, `422 VERIFICATION_FAILED` และ `422 SIGNAL_MISMATCH` ตามลำดับ (ค่าที่คาดของ AC-10c ขึ้นกับทางที่บันทึกไว้ที่ CP-U ตาม §2.6 ขั้น 4 ถ้าเป็นทาง API ที่ไม่มี error เฉพาะเรื่อง signal ค่าที่คาดจะเป็น `422 VERIFICATION_FAILED` และต้องแก้ใน commit เดียวกับ route)
- **AC-11 World happy path**
  - `cast call $MARKET "isVerified(address)(bool)" $INVESTOR_A --rpc-url $SEPOLIA_RPC_URL` → `true`
  - `cast logs --from-block $(jq -r .deployBlock $DEP) --address $MARKET "InvestorVerified(address,bytes32)" --rpc-url $SEPOLIA_RPC_URL | grep -c transactionHash` → ≥ 1
- **AC-12 F3 บน chain** — `cast send $MARKET "setVerified(address,bytes32)" $INVESTOR_A2 $NULLIFIER_A --private-key $OPERATOR_PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL 2>&1 | grep -cE "NullifierAlreadyUsed|$(cast sig "NullifierAlreadyUsed(address)" | cut -c3-)"` → ≥ 1 (cast อาจ decode เป็นชื่อ error หรือแสดงเป็น selector ก็ได้; revert ตั้งแต่ขั้น estimateGas จึงไม่เสีย gas)
- **AC-13 frontend** — `pnpm -C $ROOT/web build && pnpm -C $ROOT/web lint` → exit 0
- **AC-14 ไม่มี hard-code, placeholder หรือ spike ค้าง**
  - `grep -rnE '0x[0-9a-fA-F]{40}' $ROOT/web/app $ROOT/web/components | wc -l` → `0`
  - `grep -rn '__fixtures__' $ROOT/web/app $ROOT/web/lib $ROOT/web/components | wc -l` → `0`
  - `grep -rnE 'TODO|FIXME|\.skip\(|\.only\(|vm\.skip' $ROOT/contracts/src $ROOT/contracts/test $ROOT/web/app $ROOT/web/lib $ROOT/web/components | wc -l` → `0`
  - `test ! -d $ROOT/spike -a ! -d $ROOT/web/lib/__fixtures__ && echo CLEAN` → `CLEAN`
- **AC-15 SSR บน live URL** — `curl -s $DEMO_URL | grep -oE 'inv-[0-9]+\.' | sort -u | wc -l` → ≥ 1
- **AC-16 E2E บน Sepolia** — `pnpm -C $ROOT/web exec tsx scripts/e2e-sepolia.ts --flow` → พิมพ์ `CREATE_TX`, `VERIFY_TX`, `BUY_TX`, `SETTLE_TX` (เป็น hash ทั้งหมด), `STATE=3`, `LIVE_STATE=AVAILABLE`, `records[status]=paid` แล้วคัด tx hash ไปใส่ `docs/ENS_INTEGRATION.md`
- **AC-17 docs**
  - `cd $ROOT && test -f README.md -a -f docs/ENS_INTEGRATION.md -a -f docs/WORLD_ID_DEBRIEF.md -a -f docs/DEMO_SCRIPT.md -a -f docs/SHOWCASE.md && echo DOCS_OK` → `DOCS_OK`
  - `for h in "Time to first success" "Friction" "Missing capability" "greatest impact"; do grep -q "^### .*$h" $ROOT/docs/WORLD_ID_DEBRIEF.md && echo ok; done | wc -l` → `4`
  - `grep -rniE 'exactly as long as the de[b]t' $ROOT/README.md $ROOT/docs | wc -l` → `0`
- **AC-18 repo public + license** — `gh repo view $GH_REPO --json visibility -q .visibility && test -f $ROOT/LICENSE && echo LICENSE_OK` → `PUBLIC` ตามด้วย `LICENSE_OK`
- **AC-19 (ตรวจด้วยมือ)** — video ≤ 3:00 ต้องแสดง happy path, F1, F3 (หรือ F5), การ revert ของ EAC, `disputed` ที่ block การซื้อ, ชื่อที่หายหลัง settle และ Expired-unsold · checklist อยู่ใน `docs/DEMO_SCRIPT.md`
- **AC-20 deployer ไม่เหลือ role บน `UserRegistry`** — `cast call $USER_REGISTRY "roles(uint256,address)(uint256)" 0 $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL` → `0` (ไม่มีทางถอยแบบ "เปิดเผยแทน")
- **AC-21 selector parity กับ tag** — `bash $ROOT/contracts/script/selector-parity.sh` → บรรทัดสุดท้ายเป็น `PARITY OK (26 selectors)`
- **AC-22 ENS เป็นประตูของการซื้อ** — `$FT --match-test "test_buy_nameNotLive_reverts|test_buy_ackDisputed_reverts|test_buy_ackUnknownValue_reverts|test_e2e_buy_blockedWhenAccountantDisputes"` → `4 tests passed, 0 failed`

---

## 6. Verification runbook (รันตามลำดับนี้ ทุก command ของ AC อยู่ในนี้ครบ)

```bash
# ── ขั้นเตรียม ─────────────────────────────────────────────────────────────
export ROOT=/Users/ikhalas/Documents/side-projects/eth-2026
export PATH="$HOME/.foundry/bin:$PATH"
set -a; source $ROOT/contracts/.env; set +a
set -a; source $ROOT/web/.env.local; set +a        # OPERATOR_PRIVATE_KEY อยู่ที่นี่ที่เดียว (AC-12 ต้องใช้)
export GH_REPO=<owner>/<repo> DEMO_URL=https://<vercel-url>   # เติมค่าจริงหลัง H4/H5 (AC-15, AC-18)
export DEP=$ROOT/contracts/deployments/sepolia.json
export FT="forge test --fork-url $SEPOLIA_RPC_URL --fork-block-number $FORK_BLOCK"

# ── ขั้น 0 (A0, T+0:00) toolchain ──────────────────────────────────────────
curl -L https://foundry.paradigm.xyz | bash && ~/.foundry/bin/foundryup
forge --version && cast --version && anvil --version

# ── ขั้น 1 (A0, T+0:45) pin + address + parity ─────────────────────────────
gh api repos/ensdomains/contracts-v2/commits/sepolia-deployment-2026-09-15 --jq .sha | cut -c1-8   # f2f0a05e
git -C $ROOT/contracts/lib/contracts-v2 rev-parse --short=8 HEAD                                   # f2f0a05e
for c in ETHRegistry ETHRegistrar UserRegistryImpl PermissionedResolverImpl VerifiableFactory UniversalResolverV2 MockUSDC; do
  printf "%-26s %s\n" $c "$(jq -r .address $ROOT/contracts/lib/contracts-v2/contracts/deployments/sepolia/$c.json)"; done
# ต้องตรงกับตาราง §2.4 (ไม่สนตัวพิมพ์เล็กใหญ่) ถ้าไม่ตรงให้ถือ tag JSON เป็นหลักแล้วแก้แผนกับ sepolia.json
bash $ROOT/contracts/script/selector-parity.sh        # [AC-21] → PARITY OK (26 selectors)

# ── ขั้น 2 (A0, T+1:00) อ่านค่าจาก registrar เพื่อเลือก PARENT_LABEL ─────────
R=0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca
cast call $R "isAvailable(string)(bool)" "$PARENT_LABEL" --rpc-url $SEPOLIA_RPC_URL                 # true
cast call $R "MIN_COMMITMENT_AGE()(uint64)" --rpc-url $SEPOLIA_RPC_URL                              # จดไว้เป็น N วินาที
cast call $R "MIN_REGISTER_DURATION()(uint64)" --rpc-url $SEPOLIA_RPC_URL                           # ≤ 31536000
cast call $R "getRegisterPrice(string,uint64,address)(uint256,uint256)" "$PARENT_LABEL" 31536000 \
  0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e --rpc-url $SEPOLIA_RPC_URL                             # ต้องไม่ revert

# ── ขั้น 3 (A0, CP1 T+2:00) build + go/no-go ───────────────────────────────
cd $ROOT/contracts && forge build                                                                   # [AC-1]
$FT --match-contract GoNoGoForkTest -vv --gas-report                                                # 2 passed; gas < 2,500,000 → GO

# ── ขั้น 4 (A4 T+6:30, V1, V2) test ทั้งชุด ─────────────────────────────────
$FT 2>&1 | tail -n 3                                                                                # [AC-2] 42 tests passed, 0 failed
$FT --match-test "test_accountantCanSetAck|test_accountantCannotSetAmount_reverts|test_accountantCannotSetStatus_reverts"   # [AC-3] 3 passed
$FT --match-test "test_registerInvoice_expiryEqualsDueDate|test_nameExpiredAtDueDate|test_nameLiveOneSecondBeforeDueDate|test_statusOf_afterExpiry|test_settle_afterExpiry_writesPaidViaStoredResolver|test_cancel_afterDueDate_succeeds"   # [AC-4] 6 passed
$FT --match-test "test_buy_unverified_reverts|test_setVerified_nullifierBoundToOtherWallet_reverts|test_buy_positionCap_reverts|test_transferToUnverified_reverts|test_transferToMarket_reverts"   # [AC-5] 5 passed
$FT --match-test "test_buy_nameNotLive_reverts|test_buy_ackDisputed_reverts|test_buy_ackUnknownValue_reverts|test_e2e_buy_blockedWhenAccountantDisputes"   # [AC-22] 4 passed

# ── ขั้น 5 (A1 T+2:00–3:30 → A4 T+5:00–6:30) deploy บน Sepolia ──────────────
cd $ROOT/contracts
forge script script/DeployUserRegistry.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast                 # E2 → .userRegistry
forge script script/RegisterParent.s.sol --sig "commit()" --rpc-url $SEPOLIA_RPC_URL --broadcast    # E1 (1/2)
# รอให้ครบ N วินาทีตามที่อ่านได้ในขั้น 2 แล้วค่อยรันบรรทัดต่อไป
forge script script/RegisterParent.s.sol --sig "register()" --rpc-url $SEPOLIA_RPC_URL --broadcast  # E1+E3 (2/2) → .parentName
export PARENT=$(jq -r .parentName $DEP) USER_REGISTRY=$(jq -r .userRegistry $DEP)
test "$(cast call 0x657ea849311d3d5823348dded7c2aaafb3ede09e "getSubregistry(string)(address)" "$PARENT_LABEL" --rpc-url $SEPOLIA_RPC_URL | tr A-F a-f)" = "$(jq -r .userRegistry $DEP | tr A-F a-f)" && echo HIERARCHY_OK   # [AC-6]
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
forge script script/Seed.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
export MARKET=$(jq -r .invoiceMarket $DEP) REGISTRAR=$(jq -r .invoiceRegistrar $DEP)
jq -e '[.userRegistry,.invoiceRegistrar,.invoiceMarket,.mockUsdc] | all(. != "0x0000000000000000000000000000000000000000")' $DEP   # true

# ── ขั้น 6 (A5, B5, T+6:30–9:00) web ────────────────────────────────────────
cd $ROOT/web && node scripts/sync-deployments.mjs && pnpm wagmi generate
pnpm -C $ROOT/web build && pnpm -C $ROOT/web lint                                                   # [AC-13]
pnpm -C $ROOT/web exec tsx scripts/e2e-sepolia.ts --seed                                            # → EXPIRY_DEMO=inv-<n>.<parent>
export EXPIRY_DEMO=<ค่าที่พิมพ์ออกมา>
pnpm -C $ROOT/web exec tsx scripts/check-ens.ts inv-1.$PARENT                                       # [AC-7]
pnpm -C $ROOT/web exec tsx scripts/eac-negative.ts inv-1.$PARENT                                    # [AC-9]

# ── ขั้น 7 (C1 บน anvil ตั้งแต่ T+2:30 / C2 บน Sepolia) World ฝั่ง server ───────
# เปิด `pnpm -C $ROOT/web dev` ไว้ในอีก terminal (agent ใช้ run_in_background) แล้วรอให้ port 3000 ตอบก่อน
curl -s -w ' %{http_code}\n' -X POST localhost:3000/api/world/verify -H 'content-type: application/json' \
  -d '{"investor":"0x0000000000000000000000000000000000000001","result":{}}'                        # [AC-10a] INVALID_BODY 400
curl -s -w ' %{http_code}\n' -X POST localhost:3000/api/world/verify -H 'content-type: application/json' \
  -d @$ROOT/web/scripts/fixtures/bad-proof.json                                                     # [AC-10b] VERIFICATION_FAILED 422
curl -s -w ' %{http_code}\n' -X POST localhost:3000/api/world/verify -H 'content-type: application/json' \
  -d @$ROOT/web/scripts/fixtures/signal-mismatch.json                                               # [AC-10c] SIGNAL_MISMATCH 422 (ถ้าที่ CP-U บันทึกว่าใช้ทาง API ที่ไม่มี error เฉพาะ ให้คาด VERIFICATION_FAILED 422)

# ── ขั้น 8 (C-E2E T+9:00–10:00) verify ผ่าน simulator บน live URL ก่อน จากนั้น ──
cast call $MARKET "isVerified(address)(bool)" $INVESTOR_A --rpc-url $SEPOLIA_RPC_URL                # [AC-11a] true
cast logs --from-block $(jq -r .deployBlock $DEP) --address $MARKET "InvestorVerified(address,bytes32)" --rpc-url $SEPOLIA_RPC_URL | grep -c transactionHash   # [AC-11b] ≥1
pnpm -C $ROOT/web exec tsx scripts/e2e-sepolia.ts --flow                                            # [AC-16] → NULLIFIER_A=0x…
export NULLIFIER_A=<ค่าที่พิมพ์ออกมา>
cast send $MARKET "setVerified(address,bytes32)" $INVESTOR_A2 $NULLIFIER_A --private-key $OPERATOR_PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL 2>&1 | grep -cE "NullifierAlreadyUsed|$(cast sig "NullifierAlreadyUsed(address)" | cut -c3-)"   # [AC-12] ≥1
curl -s $DEMO_URL | grep -oE 'inv-[0-9]+\.' | sort -u | wc -l                                       # [AC-15] ≥1

# ── ขั้น 9 (หลังจาก EXPIRY_DEMO เลย due ไปแล้ว +10 นาที) ─────────────────────
pnpm -C $ROOT/web exec tsx scripts/check-ens.ts $EXPIRY_DEMO                                        # [AC-8a] RESOLVES: false / LIVE_STATE: AVAILABLE / records[status]=listed
cast call $USER_REGISTRY "getState(uint256)((uint8,uint64,address,uint256,uint256))" $(cast keccak "${EXPIRY_DEMO%%.*}") --rpc-url $SEPOLIA_RPC_URL   # [AC-8b] (0, …)

# ── ขั้น 10 (CP7 T+15:00) harden ────────────────────────────────────────────
cd $ROOT/contracts && forge script script/Harden.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
cast call $USER_REGISTRY "roles(uint256,address)(uint256)" 0 $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL   # [AC-20] 0

# ── ขั้น 11 (V2 T+15:00 และก่อน submit) hygiene, docs, repo ──────────────────
grep -rnE '0x[0-9a-fA-F]{40}' $ROOT/web/app $ROOT/web/components | wc -l                             # [AC-14a] 0
grep -rn '__fixtures__' $ROOT/web/app $ROOT/web/lib $ROOT/web/components | wc -l                     # [AC-14b] 0
grep -rnE 'TODO|FIXME|\.skip\(|\.only\(|vm\.skip' $ROOT/contracts/src $ROOT/contracts/test $ROOT/web/app $ROOT/web/lib $ROOT/web/components | wc -l   # [AC-14c] 0
test ! -d $ROOT/spike -a ! -d $ROOT/web/lib/__fixtures__ && echo CLEAN                              # [AC-14d] CLEAN
cd $ROOT && test -f README.md -a -f docs/ENS_INTEGRATION.md -a -f docs/WORLD_ID_DEBRIEF.md -a -f docs/DEMO_SCRIPT.md -a -f docs/SHOWCASE.md && echo DOCS_OK   # [AC-17a]
for h in "Time to first success" "Friction" "Missing capability" "greatest impact"; do grep -q "^### .*$h" $ROOT/docs/WORLD_ID_DEBRIEF.md && echo ok; done | wc -l   # [AC-17b] 4
grep -rniE 'exactly as long as the de[b]t' $ROOT/README.md $ROOT/docs | wc -l                       # [AC-17c] 0
gh repo view $GH_REPO --json visibility -q .visibility && test -f $ROOT/LICENSE && echo LICENSE_OK  # [AC-18] PUBLIC / LICENSE_OK
```

**`contracts/script/selector-parity.sh` (A0 เขียน; ตรวจ impl ที่ไม่ใช่ proxy เท่านั้น — UR v2 อาจเป็น proxy จึงไม่รวม)**
```bash
#!/usr/bin/env bash
set -euo pipefail
: "${SEPOLIA_RPC_URL:?}"; fail=0; n=0
check() { local addr=$1; shift; local code; code=$(cast code "$addr" --rpc-url "$SEPOLIA_RPC_URL")
  for s in "$@"; do local sel; sel=$(cast sig "$s"); n=$((n+1))
    if [[ "$code" == *"${sel#0x}"* ]]; then echo "OK   $sel $s"; else echo "MISS $sel $s @ $addr"; fail=1; fi; done; }
check 0xa80338aaa8d23831cea25e858d1774534abb0263 "initialize((address,uint256)[])" "register(string,address,address,address,uint256,uint64)" \
  "renew(uint256,uint64)" "unregister(uint256)" "grantRootRoles(uint256,address)" "revokeRootRoles(uint256,address)" \
  "hasRootRoles(uint256,address)" "getState(uint256)" "setResolver(uint256,address)" "safeTransferFrom(address,address,uint256,uint256,bytes)"
check 0x14f09fd05d4585759e54844dc9b00147131cf243 "initialize((address,uint256)[],bytes[])" "setText(bytes,string,string)" \
  "grantSetterRoles(bytes,address)" "resolve(bytes,bytes)" "multicall(bytes[])" "hasRootRoles(uint256,address)"
check 0x9e726eb570beb6bceb495ab8cda7df517d4e841c "deployProxy(address,uint256,bytes)"
check 0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca "commit(bytes32)" "register(string,address,bytes32,address,address,uint64,address,bytes32)" \
  "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)" "getRegisterPrice(string,uint64,address)" \
  "isAvailable(string)" "MIN_COMMITMENT_AGE()" "MIN_REGISTER_DURATION()"
check 0x657ea849311d3d5823348dded7c2aaafb3ede09e "getSubregistry(string)" "getState(uint256)"
if [[ $fail -eq 0 ]]; then echo "PARITY OK ($n selectors)"; else echo "PARITY FAIL"; exit 1; fi
```

---

## 7. Risks & Mitigations

| # | Risk | Mitigation / ตัวกระตุ้น |
|---|---|---|
| R1 | ABI หรือ address ไม่ตรงกับที่ deploy จริง บน Sepolia มี ENSv2 หลายชุด (ไฟล์ของ branch อื่นใน scratchpad มี address ต่างกันอย่างน้อย 3 ชุด และ source ของ branch อื่นก็มี signature ต่างกัน เช่น `setText(bytes32,…)` กับ `initialize(address,uint256,bytes[])`) | pin `@sepolia-deployment-2026-09-15` (f2f0a05e) · ใช้ minimal interface ที่สร้างจาก ABI ของ tag · ตรวจ parity (AC-21) · ห้ามอ่าน source ของ branch อื่น · address มาจาก tag JSON เท่านั้น |
| R2 | ได้ parent name ไม่ทัน | อ่านค่า registrar ที่ T+1:00 · มี 3 label สำรอง · ถ้าถึง T+4:00 ยังไม่ได้ให้ escalate |
| R3 | ทำ resolver ต่อ invoice ไม่ได้ | ตัดสินที่ CP1 T+2:00 แล้วใช้ A-f1′ (ผลที่ต้องยอมรับอยู่ใน §0.3) |
| R4 | Sepolia RPC ไม่เสถียร | ตัวกระตุ้น: **timeout > 10 วินาทีติดกัน 3 ครั้ง หรือได้ HTTP 429** ให้สลับ forge ไปใช้ `SEPOLIA_RPC_URL_BACKUP` (publicnode) ทันที · viem ใช้ `fallback([...], {rank: true})` · fork test ใช้ block ที่ pin ไว้เพื่อให้ cache ได้ |
| R5 | ใช้ Passport ใน simulator ไม่ได้ | ใช้ fallback ladder ใน §2.6 |
| R6 | Vercel function timeout | คืน `txHash` ทันทีโดยไม่รอ receipt และตั้ง `maxDuration = 30` |
| R7 | รูปแบบ nullifier ไม่ตรงกัน | ใช้ `normalizeNullifier` ที่เดียว และทดสอบบน anvil ก่อน (C1) |
| R8 | viem อ่าน `resolve` หรือ UR v2 ไม่ได้ | S3 ตัดสินที่ T+2:15 → ใช้ `registrar.recordsOf` (ยังเป็น path R) หรือใช้ `registrar.isLive` แทน |
| R9 | ความหมายของ `ack` | `status` เขียนได้เฉพาะ registrar ส่วน `ack` เฉพาะ accountant · market เทียบ hash ตรงตัว ค่าที่ไม่รู้จักจะ block การซื้อ · issuer ต้องไม่ใช่ accountant หรือ debtor · กรณี self-attestation ต้องเขียนเปิดเผยใน README (สอดคล้องกับ P1) |
| R10 | operator key รั่ว | `setOperator` (owner) หมุน key ได้ทันที · `pause()` block ทั้ง `createInvoice`, `setVerified` และ `buy` แต่ไม่ block `settle` · operator ทำได้แค่ `setVerified` · เป็น testnet key ที่ถือแค่ 0.05 ETH |
| R11 | จังหวะเวลาตอน demo expiry | `e2e-sepolia.ts --seed` ก่อนอัด 10 นาที · มี fork test เป็นหลักฐานสำรอง |
| R12 | gas ของ `createInvoice` สูงเกิน หรือ ETH ของ SME หมด | **เกณฑ์ตัวเลข: > 2,500,000 gas ที่ CP1 ให้ใช้ A-f1′** · ถ้า Sepolia gas price > 50 gwei ให้ H3 เติม deployer เพิ่ม · **ตัวกระตุ้น: ยอด ETH ของ SME < 3 × per-invoice cost** (ค่าจาก spike-ensv2.md) ให้เติมทันทีด้วย `cast send $SME_ADDRESS --value 0.1ether --private-key $DEPLOYER_PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL` |
| R13 | peer deps ชนกัน | ใช้ `injected()` connector ตัวเดียว |
| R14 | เวลาไม่พอ | cut line CP6, feature freeze T+15, buffer 2 ชม., slack 2.0 ชม. บน critical path |
| R15 | **Nullifier squatting**: ผู้โจมตีผูก nullifier ของเหยื่อเข้ากับ wallet ตัวเอง ทำให้เหยื่อได้ 409 ตลอดไป | ตรวจ signal (§2.6 ขั้น 4, AC-10c) · `rp_context` มี nonce และ `expires_at` · owner เรียก `revokeVerification(investor, nullifier)` เพื่อ support ได้ · เฝ้าดู event `InvestorVerified` |
| R16 | deployer ยังถือสิทธิ์บน `UserRegistry` จนเล่นงานชื่อได้ (ถ้ามี plain bit จะ `unregister` ชื่อ invoice ที่ live อยู่ ทำให้ `buy()` revert `NameNotLive` หรือ register/revive `inv-N` ด้วย resolver ปลอม) | E2 ให้**แค่ admin bits** และไม่ให้ `ROLE_SET_PARENT` · `Harden.s.sol` revoke ทุก bit ที่ deployer ถือหลัง E4 · AC-20 ต้องได้ `roles(0, deployer) == 0` · ที่ยังต้องเขียนเปิดเผยใน README คือเจ้าของ parent (ใน ETHRegistry) ยัง `setSubregistry` ได้เสมอ |
| R17 | fork test ช้าหรือโดน RPC rate limit | pin `FORK_BLOCK` ที่ T+1:00 (foundry cache) · A3 เป็น unit test ไม่ต้องใช้ fork state |
| R18 | ความลับ, การไล่เบี้ย, fraud | เปิดเผยใน README และ ENS_INTEGRATION (§9): amount กับ debtor เป็นข้อมูลสาธารณะ · เป็นแบบ non-recourse · issuer ระบุ debtor ใดก็ได้ และขาย invoice เดียวซ้ำได้นอก platform · มาตรการคือ `ack` จากฝั่งลูกหนี้ |

---

## 8. Differentiation

**vs Invoice Financer (HackMoney 2026)**
- เขาทำ *การกู้* โดยใช้ invoice เป็นหลักประกัน มี ERC-4626 vault แยกทุก invoice และ admin อนุมัติ KYB
- เราทำ *การขายขาด receivable* ด้วย ERC-721 ตัวเดียว เงินไหลตรงถึงผู้ถือ
- gate นักลงทุนด้วย World ID Passport ที่ผูก nullifier บน chain (หนึ่งคนหนึ่ง wallet, cap 3) และตรวจ signal
- ลูกหนี้ยืนยัน invoice ผ่าน ENS record `ack` และทุก invoice มีชื่อ ENSv2 ที่มีชีวิตเท่ากับช่วงที่หนี้ยังไม่ครบกำหนด (current)

**vs PayeeLock (ETHOnline 2026)**
- เขาใช้ Permissioned Resolver + EAC กันการแก้ payout address ดังนั้น EAC แบบแยกสิทธิ์ไม่ใช่ของใหม่ เราจึงให้ EAC เป็นแค่ส่วนประกอบ
- จุดขายหลักของเรามี 3 ข้อ
  - (1) **อายุของชื่อผูกกับสถานะของหนี้**: ชื่อหมดอายุวันครบกำหนด และถูก unregister ทันทีที่หนี้ถูกจ่าย
  - (2) **ENS เป็นประตูกั้นการซื้อจริง**: `buy()` ต้องการให้ชื่อ live และ `ack` ของฝ่ายบัญชีลูกหนี้ไม่เป็น `disputed`
  - (3) resolver ต่อ invoice เป็นทาง**เดียว**ที่จำกัดฝ่ายบัญชีลูกหนี้ให้อยู่ใน invoice เดียวได้ เพราะ setter scope ของ API ที่ deploy อยู่เป็นแบบ key-only
- เราเป็นตลาดการเงิน ไม่ใช่เครื่องมือด้านความปลอดภัยของการจ่ายเงิน

**vs Kura (Tokyo 2026 งานเดียวกัน, ชิงรางวัลชุดเดียวกัน)**
- Kura แบ่งการ์ด MTG เป็นเศษส่วนผ่าน Uniswap CCA การ์ดไม่มีวันครบกำหนด แต่ invoice มี ดังนั้น expiry และการ unregister ของ ENS จึงมีความหมายทางเศรษฐกิจกับเราเท่านั้น (เราไม่อ้างว่า Kura ใช้ ENS ลึกแค่ไหน)
- ฝั่ง World เราอธิบายเหตุผลผ่าน exposure cap ต่อคนที่วัดได้
- ฝั่ง Curvegrid เราตรงกับ idea list "Invoice Financing" และ "Programmable Asset Controls" (allowlist ใน `_update`, cap, การอนุมัติจากลูกหนี้)

**vs Centrifuge**
- Centrifuge รวม asset เป็น pool และ tranche ผ่าน issuer หรือ SPV สำหรับสถาบัน
- เราเป็นประตูหน้าระดับ invoice ใบเดียวที่ค้นหาและตรวจสอบได้ด้วยชื่อ (`inv-7.seikyu.eth`) สำหรับนักลงทุนรายย่อยที่ยืนยันความเป็นมนุษย์แล้ว ไม่แข่งกัน และอาจส่ง invoice เข้า pool แบบนั้นได้ในอนาคต

---

## 9. Deliverables checklist และ templates
- [ ] Public GitHub repo + `LICENSE` (MIT) และ README บอกให้ `git clone --recursive`
- [ ] Live URL บน Vercel
- [ ] `README.md` เรียงหัวข้อดังนี้
  1. **One-sentence summary**: "Seikyu lets Japanese SMEs sell unpaid invoices to World ID–verified investors, with each invoice published as an ENSv2 name that lives only while the debt is current."
  2. **How we used MultiBaas** หรือ "Not used — why"
  3. **Team** + social handles
  4. **Setup & testing**: foundryup, `forge test --fork-url … --fork-block-number …`, pnpm และ `.env.example` ทั้งสองไฟล์
  5. **Experience with MultiBaas** หรือ N/A
  - ต่อด้วย: architecture (mermaid) · ตาราง address (จาก `deployments/sepolia.json`, แยก `ensMockUsdc` กับ `mockUsdc`) · gas ของ `createInvoice`
  - **Disclosures** (หัวข้อบังคับ):
    - ความลับ: amount และ debtor เป็นข้อมูลสาธารณะบน ENS
    - การไล่เบี้ย: เป็นแบบ non-recourse นักลงทุนรับความเสี่ยงการผิดนัด
    - fraud: issuer ระบุ debtor ใดก็ได้ และขาย invoice เดียวซ้ำได้นอก platform · มาตรการคือ `ack` จากฝั่งลูกหนี้ ซึ่งเทียบได้กับการที่ลูกหนี้ยอมรับการโอนสิทธิเรียกร้อง (債権譲渡の承諾) `[UNVERIFIED→S4: มาตราของประมวลกฎหมายแพ่ง]` และข้อจำกัดเรื่อง self-attestation
    - สิทธิ์ที่ deployer ยังถืออยู่: บน `UserRegistry` ไม่มีเลย (AC-20) แต่ในฐานะเจ้าของ parent บน ETHRegistry ยังเปลี่ยน subregistry ได้
    - มี mock USDC สองตัว
- [ ] `docs/ENS_INTEGRATION.md`: ตารางคอลัมน์ `ENSv2 feature | ใช้ทำอะไร | file:line | Sepolia tx | judge bullet` โดยมีแถว:
  - hierarchy (E2, E1+E3)
  - expiring (E7)
  - revocable (`closeInvoice` → `unregister`)
  - non-transferable (`TransferDisallowed`)
  - resolver ต่อ subname (E5)
  - EAC แก้ได้แค่ `ack` (E6)
  - ประตูกั้นการซื้อ (`InvoiceMarket.buy`: `isLive` + `ackOf`)
  - path R กับ path L
  - (ถ้าทำ) `markOverdue`/`renew`
  - **ประเด็นขาย: "ทำไม API ที่ deploy อยู่จึงบังคับให้ต้องมี resolver ต่อ invoice"** (setter scope = `keccak256(key)`, 15 assignees)
  - file:line หาได้จาก `grep -n "function registerInvoice\|grantSetterRoles\|\.register(\|\.unregister(\|function isLive\|function ackOf" contracts/src/*.sol`
- [ ] `docs/WORLD_ID_DEBRIEF.md` มีหัวข้อ:
  - `## Product event requiring trust`
  - `## Credential choice — least-friction credential with deterministic uniqueness` (ตารางใน §2.6 + ความเสี่ยงที่ยอมรับ + ถ้าใช้ PoH ให้เขียน "over-assured because of tooling")
  - `## Verification architecture` (8 ขั้น)
  - `## Alternative paths (F1–F5)`
  - `## Debrief` ประกอบด้วย `### Time to first success` (นาทีจาก spike log), `### Friction`, `### Missing capability / docs`, `### The one improvement with greatest impact`
- [ ] `docs/DEMO_SCRIPT.md` · `docs/SHOWCASE.md` · video ≤ 3:00

---

## 10. Demo script (3:00)
| เวลา | ฉาก | สิ่งที่พิสูจน์ |
|---|---|---|
| 0:00–0:20 | ปัญหา: SME ญี่ปุ่นรอเงิน 60–120 วัน | บริบท |
| 0:20–0:45 | `/issue` → tx เดียว → `/invoice/inv-N.<parent>` แสดง 8 records จาก resolver ที่เก็บไว้, countdown ถึง expiry = dueDate และลิงก์ Etherscan | M1, M2 |
| 0:45–1:05 | `/accountant` (wallet ของฝ่ายบัญชีลูกหนี้): ตั้ง `ack=acknowledged` สำเร็จ · กด "edit amount" และ "edit status" ได้ **`EACUnauthorizedAccountRoles`** ทั้งคู่ | M3 |
| 1:05–1:35 | Investor กด Buy → widget → **กดยกเลิก (F1)** → Retry → Passport ใน simulator → "Verified on server" + event `InvestorVerified` → Buy → `status=funded` | M4 + fail path 1 |
| 1:35–1:50 | wallet ที่ 2 ของคนเดิมได้ **409 "already linked to 0x…" (F3)** | fail path 2 |
| 1:50–2:10 | invoice อีกใบ: ฝ่ายบัญชีตั้ง `disputed` → ปุ่ม Buy ขึ้น `ack-blocked` และ contract revert `PurchaseBlockedByAck` | ENS เป็นประตูกั้นการซื้อ |
| 2:10–2:35 | Debtor จ่าย → investor ได้ face value → burn → `status=paid` → **ชื่อถูก unregister ทันที**: `check-ens.ts` ได้ `RESOLVES: false` แต่ `records[status]=paid` ยังอ่านได้ | M5 + path R/L |
| 2:35–3:00 | invoice ที่ seed ไว้และเลย due +10 นาทีแล้ว: `/` แสดง **Expired-unsold** และชื่อไม่ resolve แล้ว · ปิดด้วยประโยค *"The name lives as long as the debt is current."* | expiry เป็น primitive ของ product |

---

## 11. Showcase text (ร่าง, ภาษาอังกฤษสำหรับ ETHGlobal)
> **Seikyu (請求)** — Invoice factoring for Japanese SMEs, where every invoice is an ENSv2 name that lives only while the debt is current.
> An SME issues an invoice in one transaction: an ERC-721 receivable is minted and `inv-<id>.<parent>.eth` is registered in our own ENSv2 UserRegistry with `expiry = dueDate`, backed by a dedicated Permissioned Resolver holding amount, currency, debtor, due date, issuer, status and `ack`. Enhanced Access Control lets the debtor's accounts-payable team edit only `ack` — and because the deployed resolver scopes setter roles by record key, a per-invoice resolver is the only way to confine them to one invoice. The market contract reads ENS before every sale: the name must be live and `ack` must not be `disputed`. Investors buy at a discount only after a World ID Passport proof, bound to their wallet via the signal, is verified server-side and recorded on-chain (one nullifier → one wallet, max 3 open positions per person). When the debtor pays, the investor receives face value, the token burns and the name is unregistered; if the due date passes unpaid, the name expires and the invoice shows as Overdue.
> **How it's made**: Foundry fork tests against the pinned `sepolia-deployment-2026-09-15` ENSv2 contracts (UserRegistry via VerifiableFactory, PermissionedResolver, EAC setter roles, ETHRegistrar commit–reveal), OpenZeppelin v5, Next.js 15 + wagmi/viem + RainbowKit, IDKit 4 with `/api/v4/verify`, deployed on Sepolia and Vercel.

---

## 12. ทะเบียนเรื่องที่ยังไม่ยืนยัน

| ID | เรื่อง | สถานะ / ปิดที่ | ถ้าผลไม่ดี |
|---|---|---|---|
| U-1 | ETHRegistrar: signature, วิธีจ่าย, commit age | **CLOSED** · `commit(bytes32)`; `register(string,address,bytes32,address,address,uint64,address,bytes32)` เป็นแบบ non-payable จ่ายด้วย ERC-20; `getRegisterPrice`, `isAvailable`, `MIN_COMMITMENT_AGE()`, `MIN_REGISTER_DURATION()`; errors `CommitmentTooNew/TooOld`, `UnexpiredCommitmentExists` (ค่าจริงอ่านใน §6 ขั้น 2) | – |
| U-2 | UserRegistryImpl, `deployProxy`, `initialize` | **CLOSED** · impl `0xa80338…0263`; `initialize(Grant[])`; `deployProxy(address,uint256,bytes)` โดย salt = `keccak(msg.sender, salt)` | – |
| U-3 | arg แรกของ `setText` และ EAC errors | **CLOSED** · `setText(bytes name,string,string)`; ไม่มี getter ตรงใน ABI ต้องอ่านผ่าน `resolve(bytes,bytes)`; errors `EACUnauthorizedAccountRoles`, `EACMaxAssignees`, … ; setter scope = `keccak256(key)`; สูงสุด 15 assignees | – |
| U-4 | การไม่ให้สิทธิ์ transfer | **CLOSED** · `roleBitmap=0` ทำให้ `safeTransferFrom` revert `TransferDisallowed` และ `setResolver` revert | – |
| U-5 | root roles กับ `unregister`/`renew` และพฤติกรรมหลัง expiry | **CLOSED** · root roles มีผลกับทุกชื่อ; หลัง expiry `unregister` revert `LabelExpired`, `renew` ด้วย root `ROLE_RENEW` ทำให้ชื่อกลับมา, storage ของ resolver ไม่ถูกแตะ | – |
| U-6 | viem กับ `resolve` multicall และ UR v2 | OPEN → S3 ปิดที่ T+2:15 | ใช้ `registrar.recordsOf` / `registrar.isLive` |
| U-7 | กฎ signal hash ของ IDKit v4 และ `/api/v4/verify` ตรวจ signal หรือไม่ | OPEN → C0/C1 ปิดที่ CP-U T+2:30 โดยบันทึกทางที่ใช้ (local/API) ลง `spike-world.md` | ใช้ทาง API ซึ่ง forward hash ตัวเดียวกับที่ตรวจโดยไม่คำนวณใหม่ แล้วแก้ค่าที่คาดของ AC-10c ใน commit เดียวกัน ถ้าไม่ได้ทั้งสองทางให้ escalate (R15) |
| U-8 | preset `passport()` ใน simulator | OPEN → C0 ปิดที่ T+0:30 | fallback ladder |
| U-9 | sources: METI 約束手形 2026 · per-investor cap ของคราวด์ฟันดิง · มาตราของประมวลกฎหมายแพ่งเรื่องการยอมรับการโอนสิทธิเรียกร้อง · URL docs ของ World Selfie Check | OPEN → S4 (C3) ปิดที่ T+12:00 | ตัดประโยคนั้นออก หรือใช้ถ้อยคำสำรองที่เขียนไว้ใน §2.6 |
| U-10 | `initialize(grants, calls)` รัน `calls` ด้วยสิทธิ์ของ grant หรือไม่ | OPEN → A0 go/no-go ที่ T+2:00 (แผนหลักไม่ใช้ `calls` แต่เรียก `setText` หลัง initialize) | ไม่มีผลต่อแผนหลัก |
| U-11 | deployer revoke role ของตัวเองได้หรือไม่ | **CLOSED** (Architect ยืนยันใน source ของ tag) · admin bits ให้สิทธิ์ revoke ทั้ง admin และ plain bit ผ่าน `withAdminRolesApplied` | – |

---

## 13. ADR — **Status: Accepted v2.1** (Architect ผ่าน N1–N4, Critic APPROVE รอบ 2)
- **Decision**
  - Option A แบบ fork-first พร้อม fallback A-f1′ (resolver ต่อ issuer ใช้ได้เฉพาะปัญหา gas หรือ context ของ contract)
  - ENS เป็นบันทึกสาธารณะและประตูกั้นการซื้อ (liveness + `ack`) ส่วนเงินอยู่ใน market
  - แยก `status` (registrar) ออกจาก `ack` (ฝ่ายบัญชีลูกหนี้)
  - settle/cancel แล้ว unregister ชื่อ
  - deployer ได้แค่ admin bits แล้ว Harden revoke ทั้งหมด
  - World ใช้ Passport → ตรวจ signal ฝั่ง server → operator เรียก `setVerified`
- **Drivers**: D1–D3
- **Alternatives ที่ตัดทิ้ง (เหตุผลบรรทัดเดียว)**
  - **B (2LD + PublicResolverV2)**: `MIN_REGISTER_DURATION` ของ ETHRegistrar ทำให้ expiry ≠ dueDate
  - **C (off-chain + MultiBaas)**: ENS กลายเป็นแค่ของประดับ ซึ่งขัดเกณฑ์ ENS
  - **EIP-712 attestation**: เสี่ยงต้อง debug domain separator ที่ไม่ตรงกันระหว่าง Solidity กับ viem
  - **local fixture-first**: ABI เลื่อนไปจาก deploy จริงบน Sepolia (มีหลายชุดและหลาย branch)
  - **resolver ต่อ issuer (เป็นแนวทางหลัก)**: setter scope แบบ key-only ทำให้สิทธิ์ `ack` รั่วข้ามลูกหนี้ (จึงเก็บไว้เป็น fallback เท่านั้น)
- **Why chosen**: API ที่ deploy อยู่ (setter scope แบบ key-only) บังคับให้ต้องมี resolver ต่อ invoice ถ้าต้องการจำกัดฝ่ายบัญชีให้อยู่ใน invoice เดียว · fork-first ตัดความเสี่ยงที่ ABI จะไม่ตรง
- **Consequences**
  - gas ต่อ invoice สูงขึ้น (มีเกณฑ์ 2.5M และงบ SME 0.2 ETH)
  - ต้องพึ่ง operator key (มี `setOperator`/`pause` รองรับ)
  - **`ack` เชื่อได้เท่ากับ AP address ที่ issuer กรอกเท่านั้น** (เป็นการรับรองตัวเอง ต้องเปิดเผยใน README)
  - **ข้อมูล invoice (amount, debtor) เป็นข้อมูลสาธารณะบน ENS** (R18)
  - **Harden ย้อนกลับไม่ได้**: หลัง CP7 ถ้าจะ redeploy registrar ต้อง deploy `UserRegistry` ใหม่แล้วให้ parent owner เรียก `setSubregistry`
  - deployer ไม่เหลือ role บน `UserRegistry` (AC-20) แต่ยังเป็นเจ้าของ parent (ต้องเปิดเผย)
- **Follow-ups**
  - hierarchy ต่อ SME
  - stablecoin เงินเยน
  - ผูก AP wallet ของลูกหนี้ด้วยชื่อ ENS ของลูกหนี้เอง
  - KYC ของจริงผ่านผู้จัดจำหน่ายที่มีใบอนุญาต
  - Selfie Check แบบ tiered สำหรับ ticket เล็ก
  - aliasing

---

## 14. Changelog v1→v2

**MUST-FIX**

| # | สิ่งที่แก้ | § ที่แก้ |
|---|---|---|
| 1 | pin `forge install ensdomains/contracts-v2@sepolia-deployment-2026-09-15` + commit f2f0a05e · step 0 foundryup · A0 เป็นเจ้าของ `foundry.toml`/`remappings.txt`/OZ v5 แต่ผู้เดียว · minimal interface `src/interfaces/ens/*.sol` สร้างจาก ABI ของ tag + role constants ที่คัดมาตรง ๆ · `selector-parity.sh` (AC-21) · ปิด U-1 ถึง U-5 | header, §2.1, §2.4, §3 A0, §5 AC-21, §6 ขั้น 0–1, §7 R1, §12 |
| 2 | การอ่าน record ทุกครั้งผ่าน `resolve(dnsName, encoded text call)` (multicall) กับ `resolverOf[id]` ที่เก็บไว้ · แยก path R (records) กับ path L (`RESOLVES`/`LIVE_STATE`) · ลบการค้น resolver จาก registry และ helper ENS ของ viem ออกจากการอ่าน record · AC-7/AC-8 ระบุ path | §2.4 (R, L), §2.5 (`statusOf/ackOf/recordsOf/isLive`), §2.7, §3 B1/B4, §5 AC-7/8 |
| 3 | fork-first (`--fork-url … --fork-block-number`) · go/no-go `test_fork_perInvoiceResolver_initialize_setText_grantSetter` ที่ CP1 T+2:00 · A-f1′ (resolver ต่อ issuer) พร้อมผลเรื่อง key-only scope และ `EACMaxAssignees`=15 · A0 = 2 ชม. · CP-U T+2:30 · critical path 10.0 ชม. slack 2.0 ชม. | §0.3, §3 A0/A2, §4 |
| 4 | แยก `status` (registrar เท่านั้น) กับ `ack` (accountant เท่านั้น) · market เทียบ hash และ block ค่าที่ไม่รู้จัก · UI แสดง "invalid" · accountant = ฝ่ายบัญชีลูกหนี้ พร้อมเปิดเผยเรื่อง self-attestation · issuer ≠ accountant/debtor · tests `test_accountantCannotSetStatus_reverts`, `test_buy_ackDisputed_reverts` (+ unknown/acknowledged) | §1, §2.2, §2.3, §2.4 E6, §2.5, §3 A2/A3, §7 R9 |
| 5 | เพิ่ม `test_cancel_afterDueDate_succeeds`, `test_settle_afterExpiry_writesPaidViaStoredResolver`, `test_statusOf_afterExpiry`, `test_closeInvoice_afterExpiry_skipsUnregister` · AC-2 = 42 tests | §3 A2/A4, §5 AC-2/AC-4 |
| 6 | `_update` ยกเว้นแค่ mint และ burn ส่วนการโอนเข้า `address(this)` ต้อง revert (`test_transferToMarket_reverts`) · `buy()` ตรวจ `isVerified[msg.sender]` ตรง ๆ · ลบข้อ 4 ของ cut line | §2.5, §3 A3, §4 cut line, §5 AC-5 |
| 7 | settle/cancel → `closeInvoice` → unregister ถ้าชื่อยัง live · `markOverdue` (stretch A6) มาแทน `extendDueDate` · ใช้ displayState Paid/Overdue/Expired-unsold · `InvoiceView.overdue` · ประโยคหลักใหม่ "lives as long as the debt is current" · AC-17c grep | §1, §2.3, §2.5, §2.7, §3 A6, §8, §9, §10, §11, §5 AC-17 |
| 8 | P1 เขียนใหม่ (บันทึกสาธารณะ + ประตู `ack` และ liveness ส่วนเงินอยู่ใน market) · `buy()` ต้องมี `REGISTRAR.isLive(id)` (getState REGISTERED && now < expiry) · P1 และ R9 ไม่ขัดกันแล้ว · AC-22 | §0.1, §2.5, §7 R9, §5 AC-22 |
| 9 | ขั้นตรวจ signal (`422 SIGNAL_MISMATCH`) + fixture `signal-mismatch.json` + curl ตัวที่ 3 · R15 nullifier squatting · `nonceManager` + retry 1 ครั้ง · `setOperator`/`pause`/`revokeVerification` · AC-20 (revoke `_ADMIN`) · R12 เกณฑ์ 2.5M gas · R4 เกณฑ์ timeout 3 ครั้ง/429 | §2.5, §2.6, §3 C1, §5 AC-10/AC-20, §6 ขั้น 7/10, §7 R4/R10/R12/R15/R16 |
| 10 | C0 ทำใน `spike/world/` แล้ว C2 ลบ · C1 ใช้ `MockInvoiceMarket` บน anvil · `vm.writeJson(value, path, ".key")` + schema ที่มีครบทุก key ก่อน · `--disable-git` · `-D tsx @wagmi/cli` · มี owner ให้ BuyPanel/PayPanel/FaucetButton (B2b), fixtures (C1), `e2e-sepolia.ts` (C1b) · S3 45 นาทีพร้อม kill · acceptance ของ B2/B5/B6 · ทุกไฟล์ใน §2.1 มี owner card เดียว | §2.1, §2.8, §3 ทุก lane, §4 |
| 11 | 21/22 AC มี command จริงพร้อมผลที่คาด (ตรวจด้วยมือแค่ AC-19) · AC-12 ใช้ `cast send setVerified` ที่ต้อง revert `NullifierAlreadyUsed` · §6 เรียงตามลำดับการรันจริงและมี command ของทุก AC · `RegisterParent` แยกเป็น 2 invocation · AC-6 ใช้ `getSubregistry(string)(address)` (ยืนยันจาก ABI ของ ETHRegistry ใน scratchpad) · AC-9 คาดหวัง `EACUnauthorizedAccountRoles` · regex ใช้ `"a|b"` · มี `vm\.skip` ใน grep | §5, §6 |

**SHOULD-FIX**

| สิ่งที่แก้ | § ที่แก้ |
|---|---|
| ใช้ถ้อยคำ "least-friction credential with deterministic uniqueness" · กรณี PoH เขียนว่า "over-assured because of tooling" · อ้างอิง cap 3 กับ per-investor limit (S4) และตัดข้อความเรื่อง "กระจายทุน" · อ้างอิง Sybil score ของ Selfie Check · `NEXT_PUBLIC_WORLD_PRESET` + ตรวจ `CREDENTIAL_MISMATCH` | §2.6, §9 |
| E2 ก่อน E1 · รวม E1+E3 เป็น `register(..., subregistry=userRegistry, ...)` · mint ensMockUsdc ก่อน · อธิบายว่ามี mock USDC สองตัว | §2.4, §2.5, §9 |
| `/` อ่าน 8 records ด้วย multicall `resolve` ครั้งเดียว · acceptance ของ B3 เป็น 8 records | §2.7, §3 B3 |
| Disclosures (ความลับ, การไล่เบี้ย, fraud/double-factoring, `ack` จากฝั่งลูกหนี้) + ประเด็นขาย "ทำไมต้องมี resolver ต่อ invoice" | §9, §7 R18, §8 |
| ไม่ให้ `ROLE_UPGRADE` กับ resolver (`test_resolver_noUpgradeRoleGranted`) · revoke `_ADMIN` ของ deployer ด้วย `Harden.s.sol` หรือเปิดเผย | §2.2, §2.4 E5, §3 A2/A4, §5 AC-20 |
| เติม ETH ให้ deployer คนเดียวแล้วให้ `Seed.s.sol` กระจาย · H3 ลดเหลือ ≥ 0.6 ETH | §2.8, §3 H3 |
| คงจุดแข็งที่ยืนยันแล้วทั้งหมด (Option A + resolver ต่อ invoice, fallback ladder, ตาราง fail path, cut line + M1–M7, ทะเบียน UNVERIFIED, grep ใน AC-14, V1/V2, txHash-without-receipt, `eac-negative.ts`, §8) | ทั้งแผน |

**v2.1 (Architect re-review N1–N4, ก่อนส่ง Critic · ยังเป็น Planner draft v2)**

| # | สิ่งที่แก้ | § ที่แก้ |
|---|---|---|
| N1 (MUST) | E2 ให้ deployer **แค่ admin bits** (`ROLE_REGISTRAR_ADMIN\|ROLE_RENEW_ADMIN\|ROLE_UNREGISTER_ADMIN`) · ตัด `ROLE_SET_PARENT` ออก · `Harden.s.sol` revoke ทุก bit ที่ deployer ถือ (`roles(0, deployer)`) หลัง E4 · AC-20 เป็น `roles(uint256,address)(uint256) 0 $DEPLOYER_ADDRESS` ต้องได้ `0` และลบทางถอยแบบ "เปิดเผยแทน" · ปิด U-11 · แถว should-fix เรื่อง "revoke `_ADMIN` … หรือเปิดเผย" ด้านบนถูกแทนที่ด้วยข้อนี้ | §2.2, §2.4 E2, §3 A4, §5 AC-20, §6 ขั้น 10, §7 R16, §9, §12 U-11, §13 |
| N2 | A-f1′ ใช้หนีได้เฉพาะปัญหาเรื่อง gas หรือ context ของ contract (ถ้าเป็นเรื่อง encoding ให้แก้ encoding ไม่ใช่เปลี่ยน fallback) · ใช้ได้เฉพาะ issuer ที่เตรียมไว้ผ่าน `setIssuerResolver` (onlyAdmin, นอก interface ที่ freeze) · การ grant `ack` ซ้ำให้ accountant คนเดิมไม่กิน cap 15 | §0.3 |
| N3 | AC-12 grep ทั้ง `NullifierAlreadyUsed` และ selector (`grep -cE`) | §5 AC-12, §6 ขั้น 8 |
| N4 | C1 เริ่มหลัง commit scaffold ของ B0 (ประมาณ T+0:15) เพราะ `create-next-app web` ปฏิเสธโฟลเดอร์ที่ไม่ว่าง · B0 รัน create-next-app เป็นคำสั่งแรก | §3 B0, §3 C1 |
| + | ยืนยันลำดับ field ของ `Grant` = `(address account, uint256 roleBitmap)` จาก ABI ของ tag และเพิ่ม assert `hasRootRoles(ROLE_SET_TEXT, registrar)` ใน go/no-go | §2.4 |
| + | แหล่งข้อมูลจริงมีแค่ `deployments/sepolia/*.json` ของ tag (Architect ยืนยัน) ไฟล์ `dep_*`/`new_*`/`br_*`/`off_*` ใน scratchpad เป็นของ branch หรือ deploy อื่นทั้งหมด | §7 R1 (ความหมายเดิม) |

**v2.2 (Critic APPROVE รอบ 2 — merge 8 improvements · Plan v2.2 final)**

| # | สิ่งที่แก้ | § ที่แก้ |
|---|---|---|
| 1 | ขั้นเตรียมของ §6 เพิ่ม `source $ROOT/web/.env.local` (มี `OPERATOR_PRIVATE_KEY` ให้ AC-12) และ `export GH_REPO=… DEMO_URL=…` (AC-15/18) | §6 ขั้นเตรียม |
| 2 | §3.0 Executor git protocol: worktree + branch ต่อ lane (`lane/a0…a4`, `lane/b-alpha`, `lane/b-beta`, `lane/c`), commit เฉพาะ path ที่เป็น owner (ห้าม `-A`), merge ที่ CP1/CP2/CP4/CP5, "modifies หลัง merge" = merge เข้า `main` แล้ว, `pnpm install` และ submodule init แยกต่อ worktree | §3.0 |
| 3 | งบ ETH: SME ได้ 0.2 ETH (≥ 6 × `createInvoice` × 0.025) · H3 deployer ≥ 0.8 ETH · A0 บันทึก per-invoice cost · R12 ตัวกระตุ้น "ยอด ETH ของ SME < 3 × per-invoice cost" | §2.8, §3 A0/H3, §7 R12 |
| 4 | B6 เพิ่ม "modifies" ของ BuyPanel, StatusBadge, InvoiceCard (WorldVerifyButton ยังเป็นของ C1 แตะได้แค่สไตล์) · B1 deps เพิ่ม anvil + `SEPOLIA_RPC_URL` · A0 step 3 เพิ่ม `contracts/.env.example` | §3 A0/B1/B6 |
| 5 | opus #2 ร่าง Deploy/Seed/Harden บน `lane/a4` หลัง A1 (T+3:30–5:00) เพื่อรักษา slack ของ A4 (A4 ยังเป็น owner) | §3 A1/A4 |
| 6 | U-7/AC-10c: บันทึกทางที่ใช้ที่ CP-U · forward hash ตัวเดียวกับที่ตรวจ (hash ที่ถูกแก้จะได้ `VERIFICATION_FAILED`) · ถ้าเป็นทาง API ล้วนให้แก้ค่าที่คาดของ AC-10c ใน commit เดียวกับ route | §2.6 ขั้น 4, §5 AC-10, §6 ขั้น 7, §12 U-7 |
| 7 | ADR สถานะ "Accepted v2.1" · เพิ่ม Consequences (`ack` เป็นการรับรองตัวเอง, ข้อมูลสาธารณะ, Harden ย้อนกลับไม่ได้) · เหตุผลบรรทัดเดียวของทุก alternative | §13 |
| 8 | แจกแจงชั่วโมงงานของ B (~9 ชม.) และ C (~7 ชม.) | §0.3 |
| – | Header เป็น `Status: APPROVED — Critic APPROVE round 2 (v2.1); user pre-approved execution via /ralph on 2026-09-26 02:45 JST` และ "Plan v2.2 (final)" | header |
