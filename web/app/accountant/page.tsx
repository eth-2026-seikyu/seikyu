import { AckEditor } from "@/components/AckEditor";

export default async function AccountantPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawName = Array.isArray(params.name) ? params.name[0] : params.name;
  const initialName = rawName ? decodeURIComponent(rawName) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Accountant (取引先経理) — acknowledge or dispute an invoice
      </h1>
      <p className="mt-2 text-sm opacity-70">
        This wallet holds an ENSv2 Enhanced Access Control setter role scoped
        to the <code className="font-mono">ack</code> text record of this
        invoice&apos;s resolver only. Any other record reverts with{" "}
        <code className="font-mono">EACUnauthorizedAccountRoles</code>. When{" "}
        <code className="font-mono">ack</code> is{" "}
        <code className="font-mono">disputed</code>, the market contract
        refuses <code className="font-mono">buy()</code>.
      </p>
      <AckEditor initialName={initialName} />
    </div>
  );
}
