import Link from "next/link";
import { CreateProductForm } from "@/components/products/create-product-form";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/products"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Products
          </Link>
          <span className="mx-1.5">/</span>
          New
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Create product
        </h1>
      </div>
      <CreateProductForm />
    </div>
  );
}
