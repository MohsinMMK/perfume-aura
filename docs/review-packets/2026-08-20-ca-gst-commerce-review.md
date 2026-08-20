# Chartered Accountant GST commerce review packet — 20 August 2026

Status: **approval pending; GST-inclusive pricing and checkout remain closed**.

## Requested written opinion

Please review the final product workbook, entity records, invoice template,
payment/refund flow and accounting treatment. Record a dated decision and
evidence reference for every row.

| Tax/accounting question | Decision / conditions | Dated evidence reference |
|---|---|---|
| Legal entity name, GSTIN and place-of-supply treatment | Pending | Pending |
| Applicable GST rate for each product/size | Pending | Pending |
| HSN/SAC classification | Pending | Pending |
| GST-inclusive retail prices and ₹99/₹999 shipping treatment | Pending | Pending |
| Paise rounding at item, order and invoice level | Pending | Pending |
| Invoice numbering, mandatory fields and record retention | Pending | Pending |
| Cashfree fees, settlements and reconciliation | Pending | Pending |
| Full/partial refunds, tax adjustment and credit notes | Pending | Pending |

## Technical contract for confirmation

- All money is persisted in integer INR paise.
- Customer prices are treated as GST-inclusive only after approval.
- The importer requires an approval reference for every active variant price.
- Refund completion follows server-verified Cashfree state; the browser cannot
  mark an order or refund successful.
- Historical order, payment, address, invoice and refund snapshots remain
  immutable when account/profile data changes.

## CA sign-off

Reviewer name, membership number and firm: ____________________

Decision date and time zone: ____________________

Approved evidence reference: ____________________

Conditions or required corrections: ____________________

The signed opinion and sensitive entity/tax documents remain in the
owner-controlled accounting store; only the evidence reference is entered in
operations.
