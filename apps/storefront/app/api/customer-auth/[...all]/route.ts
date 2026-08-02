import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { createCustomerAuth, type CustomerAuth } from "@/lib/customer-auth";

let customerAuth: CustomerAuth | undefined;

function handlers() {
  customerAuth ??= createCustomerAuth();
  return toNextJsHandler(customerAuth);
}

async function unavailableSafeHandler(
  request: Request,
  method: "GET" | "POST",
): Promise<Response> {
  try {
    const nextHandlers = handlers();
    return method === "GET"
      ? nextHandlers.GET(request)
      : nextHandlers.POST(request);
  } catch (error: unknown) {
    console.error("Customer authentication is unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Customer authentication is not configured." },
      { status: 503 },
    );
  }
}

export function GET(request: Request): Promise<Response> {
  return unavailableSafeHandler(request, "GET");
}

export function POST(request: Request): Promise<Response> {
  return unavailableSafeHandler(request, "POST");
}
