import { CustomerForm } from "@/components/customers/customer-form";
import { requireCapability } from "@/lib/session";

export default async function NewCustomerPage() {
  await requireCapability("customers.create", { redirectToLogin: true });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <CustomerForm mode="create" />
    </div>
  );
}
