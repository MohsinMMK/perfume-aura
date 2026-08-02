import { NextResponse } from "next/server";
import { isCustomerAuthEnabled } from "@/lib/customer-auth-policy";

type CustomerAuthHandlers = Readonly<{
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
}>;

let customerAuthHandlers: Promise<CustomerAuthHandlers> | undefined;

function handlers(): Promise<CustomerAuthHandlers> {
  customerAuthHandlers ??= Promise.all([
    import("better-auth/next-js"),
    import("@/lib/customer-auth"),
  ]).then(([{ toNextJsHandler }, { createCustomerAuth }]) =>
    toNextJsHandler(createCustomerAuth()),
  );
  return customerAuthHandlers;
}

async function unavailableSafeHandler(
  request: Request,
  method: "GET" | "POST",
): Promise<Response> {
  if (!isCustomerAuthEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const nextHandlers = await handlers();
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
