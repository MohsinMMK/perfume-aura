import { CustomerForm } from "@/components/customers/customer-form";
import { requireOwnerSession } from "@/lib/session";

export default async function NewCustomerPage() {
  await requireOwnerSession({ redirectToLogin: true });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <CustomerForm mode="create" />
    </div>
  );
}
