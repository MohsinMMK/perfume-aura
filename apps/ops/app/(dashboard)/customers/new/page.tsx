import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <CustomerForm mode="create" />
    </div>
  );
}
