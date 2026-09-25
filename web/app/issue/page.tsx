import { IssueForm } from "@/components/IssueForm";

export default function IssuePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Issue an invoice</h1>
      <p className="mt-2 text-sm opacity-70">
        Submitting this form mints an ERC-721 receivable to escrow, registers
        an ENSv2 subname whose expiry equals the due date, and writes a
        per-invoice Permissioned Resolver holding 7 records.
      </p>
      <IssueForm />
    </div>
  );
}
