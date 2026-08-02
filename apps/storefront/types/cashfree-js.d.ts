declare module "@cashfreepayments/cashfree-js" {
  type CashfreeCheckoutResult = Readonly<{
    error?: Readonly<{ message?: string }>;
    redirect?: boolean;
  }>;

  type CashfreeClient = Readonly<{
    checkout(options: Readonly<{
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_top" | "_modal";
    }>): Promise<CashfreeCheckoutResult>;
  }>;

  export function load(options: Readonly<{
    mode: "sandbox" | "production";
  }>): Promise<CashfreeClient | null>;
}
