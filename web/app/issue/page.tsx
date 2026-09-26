import { IssueForm } from "@/components/IssueForm";

export default function IssuePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">List an invoice for sale</h1>
      <p className="mt-2 text-sm opacity-70">
        Fill in who owes you and how much. Seikyu creates the invoice&apos;s ENS name and puts
        it up for sale at your discount. Investors are paid the full amount by the debtor on
        the due date.
      </p>
      <IssueForm />
    </div>
  );
}
