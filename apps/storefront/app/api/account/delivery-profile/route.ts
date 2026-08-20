import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createCustomerAuth } from "@/lib/customer-auth";
import { deleteDeliveryProfile, saveDeliveryProfile } from "@/lib/customer-profile";

async function customer(request: NextRequest) {
  if (process.env.STOREFRONT_CUSTOMER_AUTH_ENABLED !== "true") return null;
  const session = await createCustomerAuth().api.getSession({ headers: request.headers });
  return session?.user?.emailVerified ? session.user : null;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const user = await customer(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await saveDeliveryProfile(user.id, await request.json());
    return NextResponse.json({ status: "saved" });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid delivery details" }, { status: 400 });
    }
    console.error("[customer delivery profile] save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Delivery details could not be saved" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await customer(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteDeliveryProfile(user.id);
    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("[customer delivery profile] deletion failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Delivery details could not be deleted" }, { status: 500 });
  }
}
