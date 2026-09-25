// Temporary fixture data for `InvoiceView`, used when `NEXT_PUBLIC_USE_FIXTURES=1`
// or when no chain addresses are configured (see `listInvoices`/`getInvoice` in
// `@/lib/invoices`). Deleted once the real Sepolia deployment is wired up (B5).
import type { Address } from "viem";
import { ackViewOf, displayStateOf, type InvoiceView } from "@/lib/invoices";

const PARENT = "seikyu.eth";

const DAY = 86_400n;
const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));

// Plausible Sepolia-looking addresses. Fixtures only — never used for on-chain
// reads, so checksum validity doesn't matter.
const ISSUER_A: Address = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const ISSUER_B: Address = "0x5FbDB2315678afecb367f032d93F642f64180aa";
const DEBTOR_A: Address = "0x28C6c06298d514Db089934071355E5743bf21d6";
const DEBTOR_B: Address = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e";
const HOLDER_FUNDER: Address = "0x8ba1f109551bD432803012645Ac136ddd64DBA7";
const RESOLVER_1: Address = "0x14F09fD05d4585759e54844DC9B00147131CF24";
const RESOLVER_2: Address = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
const RESOLVER_3: Address = "0x4e59b44847b379578588920cA78FbF26c0B4956";
const RESOLVER_4: Address = "0x99A5b56d5DDE7D0c8f7a7a2Bcf5c1E1e4b0c4F81";

function buildInvoice(args: {
  id: bigint;
  resolver: Address;
  issuer: Address;
  debtor: Address;
  faceValue: bigint;
  price: bigint;
  dueDate: bigint;
  state: InvoiceView["market"]["state"];
  holder: Address | null;
  ack: string;
  live: boolean;
}): InvoiceView {
  const { id, resolver, issuer, debtor, faceValue, price, dueDate, state, holder, ack, live } =
    args;
  const label = `inv-${id}`;
  const name = `${label}.${PARENT}`;
  const now = nowSeconds();
  const displayState = displayStateOf(state, dueDate, now);
  const overdue = state === "Funded" && now >= dueDate;

  return {
    id,
    name,
    label,
    resolver,
    records: {
      amount: faceValue.toString(),
      currency: "USDC",
      debtor,
      dueDate: dueDate.toString(),
      status: state,
      ack,
      tokenId: id.toString(),
      issuer,
    },
    live,
    market: { issuer, debtor, faceValue, price, dueDate, state, holder },
    overdue,
    displayState,
    ackView: ackViewOf(ack),
  };
}

const now = nowSeconds();

/** Open: freshly listed, no acknowledgement yet, due in 7 days. */
const inv1 = buildInvoice({
  id: 1n,
  resolver: RESOLVER_1,
  issuer: ISSUER_A,
  debtor: DEBTOR_A,
  faceValue: 5_000_000_000n, // 5000 USDC (6 decimals)
  price: 4_750_000_000n,
  dueDate: now + 7n * DAY,
  state: "Listed",
  holder: null,
  ack: "",
  live: true,
});

/** Funded: an investor bought it, debtor acknowledged, not yet due. */
const inv2 = buildInvoice({
  id: 2n,
  resolver: RESOLVER_2,
  issuer: ISSUER_B,
  debtor: DEBTOR_B,
  faceValue: 10_000_000_000n,
  price: 9_500_000_000n,
  dueDate: now + 14n * DAY,
  state: "Funded",
  holder: HOLDER_FUNDER,
  ack: "acknowledged",
  live: true,
});

/** Open but disputed: debtor contests the invoice, blocking purchase. */
const inv3 = buildInvoice({
  id: 3n,
  resolver: RESOLVER_3,
  issuer: ISSUER_A,
  debtor: DEBTOR_B,
  faceValue: 2_500_000_000n,
  price: 2_300_000_000n,
  dueDate: now + 3n * DAY,
  state: "Listed",
  holder: null,
  ack: "disputed",
  live: true,
});

/** Expired-unsold: never funded, due date already passed, ENS registration lapsed. */
const inv4 = buildInvoice({
  id: 4n,
  resolver: RESOLVER_4,
  issuer: ISSUER_B,
  debtor: DEBTOR_A,
  faceValue: 7_500_000_000n,
  price: 7_000_000_000n,
  dueDate: now - 2n * DAY,
  state: "Listed",
  holder: null,
  ack: "",
  live: false,
});

export const FIXTURE_INVOICES: InvoiceView[] = [inv1, inv2, inv3, inv4];
