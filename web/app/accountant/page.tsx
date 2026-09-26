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
        Debtor&apos;s accountant — confirm or dispute an invoice
      </h1>
      <p className="mt-2 text-sm opacity-70">
        You&apos;re acting for the company that owes this invoice. Confirming or disputing
        writes the debtor&apos;s response onto the invoice&apos;s ENS name; the supplier and
        investors see it immediately, and a disputed invoice can&apos;t be bought.
      </p>
      <AckEditor initialName={initialName} />
    </div>
  );
}
