import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { getDashboardStats } from "@/lib/stock";
import { getOpenArTotalCents } from "@/lib/invoices";
import { getCashCollectedThisMonthCents } from "@/lib/payments";
import { listMaterialAlerts } from "@/lib/production";
import { safeDbQuery } from "@/lib/db-safe";
import { formatInr, formatQty } from "@/lib/money";
import { DbUnavailableState } from "@/components/db-empty-state";
import { PageHeader } from "@/components/page-header";
import { hasOpsCapability } from "@/lib/ops-access";
import { requireCapability } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireCapability("dashboard.view", {
    redirectToLogin: true,
  });
  const canViewCost = hasOpsCapability(session.user.role, "stock.view-cost");
  const canViewFinance = hasOpsCapability(session.user.role, "finance.view");
  const canRecordPayments = hasOpsCapability(
    session.user.role,
    "payments.record",
  );
  const canManageCommercialCatalog = hasOpsCapability(
    session.user.role,
    "catalog.manage-commercials",
  );
  const canCreateCustomers = hasOpsCapability(
    session.user.role,
    "customers.create",
  );
  const canDraftInvoices = hasOpsCapability(session.user.role, "invoices.draft");
  const canReceiveStock = hasOpsCapability(session.user.role, "stock.receive");
  const canCompleteSale = hasOpsCapability(session.user.role, "sales.complete");
  const canViewStock = hasOpsCapability(session.user.role, "stock.view");

  const [result, arResult, cashResult, alertsResult] = await Promise.all([
    safeDbQuery(() => getDashboardStats()),
    canViewFinance
      ? safeDbQuery(() => getOpenArTotalCents())
      : Promise.resolve({ data: null, error: null }),
    canRecordPayments
      ? safeDbQuery(() => getCashCollectedThisMonthCents())
      : Promise.resolve({ data: null, error: null }),
    canViewStock
      ? safeDbQuery(() => listMaterialAlerts())
      : Promise.resolve({ data: null, error: null }),
  ]);

  const stats = result.data;
  const error = result.error ?? arResult.error ?? cashResult.error;
  const openAr = arResult.data ?? 0;
  const cashMtd = cashResult.data ?? 0;
  const lowMaterials = alertsResult.data
    ? [
        ...alertsResult.data.oil.map((row) => `${row.productName} oil`),
        ...alertsResult.data.supplies.map((row) => row.name),
      ]
    : [];

  const metrics = [
    {
      label: "Products",
      value: stats ? formatQty(stats.productCount) : "—",
      hint: "Active catalog products",
      href: "/products",
      badge: error ? "Offline" : "Live",
      warn: false,
    },
    {
      label: "On hand",
      value: stats ? formatQty(stats.totalUnits) : "—",
      hint: "Total units across active SKUs",
      href: "/stock",
      badge: error ? "Offline" : "Live",
      warn: false,
    },
    {
      label: "Low stock",
      value: stats ? formatQty(stats.lowStockCount) : "—",
      hint: "At or below reorder level",
      href: "/stock/low",
      badge:
        stats && stats.lowStockCount > 0
          ? "Attention"
          : error
            ? "Offline"
            : "OK",
      warn: Boolean(stats && stats.lowStockCount > 0),
    },
    ...(canViewCost
      ? [
          {
            label: "Inventory cost",
            value:
              stats?.inventoryCostCents === null
                ? "—"
                : formatInr(stats?.inventoryCostCents ?? 0),
            hint: "Sum of qty × cost (INR)",
            href: "/products",
            badge: error ? "Offline" : "Live",
            warn: false,
          },
        ]
      : []),
    ...(canViewFinance
      ? [
          {
            label: "Open AR",
            value: formatInr(openAr),
            hint: "Issued unpaid invoices",
            href: "/invoices/ar",
            badge: openAr > 0 ? "AR" : error ? "Offline" : "Clear",
            warn: openAr > 0,
          },
        ]
      : []),
    ...(canRecordPayments
      ? [
          {
            label: "Cash MTD",
            value: formatInr(cashMtd),
            hint: "Payments received this month",
            href: "/payments",
            badge: error ? "Offline" : "Live",
            warn: false,
          },
        ]
      : []),
  ] as const;

  const quickActions = [
    ...(canCompleteSale
      ? [{ label: "Record local sale", hint: "Customer, invoice, payment and stock in one go", href: "/sales/new", isPrimary: true }]
      : []),
    ...(canManageCommercialCatalog
      ? [{ label: "New product", hint: "Add a perfume and its first size", href: "/products/new", isPrimary: false }]
      : []),
    ...(canReceiveStock
      ? [
          { label: "Receive oil", hint: "Book 1 kg / 1 L oil bottles in", href: "/stock/oil", isPrimary: false },
          { label: "Receive supplies", hint: "Bottles, boxes and base mixture", href: "/stock/supplies", isPrimary: false },
        ]
      : []),
    ...(canCreateCustomers
      ? [{ label: "New customer", hint: "Save contact and billing details", href: "/customers/new", isPrimary: false }]
      : []),
    ...(canDraftInvoices
      ? [{ label: "New invoice", hint: "Draft a bill before issuing it", href: "/invoices/new", isPrimary: false }]
      : []),
    ...(canRecordPayments
      ? [{ label: "Payments", hint: "Record money received", href: "/payments", isPrimary: false }]
      : []),
    ...(canViewFinance
      ? [{ label: "Operations report", hint: "Sales, stock and cash totals", href: "/reports", isPrimary: false }]
      : []),
    { label: "Low stock", hint: "What to buy and what to restock", href: "/stock/low", isPrimary: false },
  ];

  return (
    <VStack gap={6} className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Inventory and sales overview for Perfume Aura ops."
      />

      {error ? <DbUnavailableState message={error} /> : null}

      {lowMaterials.length > 0 ? (
        <Banner
          status="warning"
          title={`Buy soon: ${lowMaterials.length} material${lowMaterials.length === 1 ? " is" : "s are"} at the reorder level`}
          description={`${lowMaterials.slice(0, 4).join(", ")}${lowMaterials.length > 4 ? ` and ${lowMaterials.length - 4} more` : ""}.`}
        >
          <Button label="See what to buy" href="/stock/low" variant="secondary" size="sm" />
        </Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((m) => (
          <ClickableCard
            key={m.label}
            label={`${m.label}: ${m.value}`}
            href={m.href}
            height="100%"
          >
            <VStack gap={3}>
                <HStack justify="between" align="start" gap={2}>
                  <VStack gap={1}>
                    <Heading level={3} accessibilityLevel={2} color="secondary">
                      {m.label}
                    </Heading>
                    <Text as="p" size="2xl" weight="semibold" hasTabularNumbers>
                      {m.value}
                    </Text>
                  </VStack>
                  <Token
                    size="sm"
                    label={m.badge}
                    color={m.warn ? "red" : m.badge === "Offline" ? "gray" : "green"}
                  />
                </HStack>
                <Text as="p" type="supporting">{m.hint}</Text>
            </VStack>
          </ClickableCard>
        ))}
      </div>

      <Card>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2}>Quick actions</Heading>
            <Text as="p" color="secondary">
              Common inventory and sales tasks.
            </Text>
          </VStack>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <ClickableCard
                key={action.href}
                label={action.label}
                href={action.href}
                variant={action.isPrimary ? "blue" : "default"}
                height="100%"
              >
                <VStack gap={1}>
                  <Text as="p" weight="semibold">{action.label}</Text>
                  <Text as="p" type="supporting">{action.hint}</Text>
                </VStack>
              </ClickableCard>
            ))}
          </div>
        </VStack>
      </Card>

      {stats && stats.productCount === 0 ? (
        <Card variant="muted">
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Set up operations in order</Heading>
              <Text as="p" color="secondary">
                The system is ready, but sales stay blocked until the catalog and opening stock are entered.
              </Text>
            </VStack>
            <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Add products", "Create each perfume and bottle size."],
                ["Receive stock", "Enter finished bottles on hand."],
                ["Receive oil", "Add each 1 kg oil purchase lot."],
                ["Record sales", "Customer, invoice, payment, stock, and oil update together."],
              ].map(([title, description], index) => (
                <li key={title}>
                  <Card height="100%">
                    <VStack gap={2} align="start">
                      <Token size="sm" label={`Step ${index + 1}`} color="default" />
                      <Text as="p" weight="medium">{title}</Text>
                      <Text as="p" type="supporting">{description}</Text>
                    </VStack>
                  </Card>
                </li>
              ))}
            </ol>
          </VStack>
        </Card>
      ) : null}
    </VStack>
  );
}
