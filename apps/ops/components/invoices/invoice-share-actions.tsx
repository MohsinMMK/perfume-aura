import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";

export function InvoiceShareActions({
  invoiceId,
  whatsappUrl,
}: {
  invoiceId: string;
  whatsappUrl: string | null;
}) {
  return (
    <HStack gap={2} wrap="wrap">
      <Button
        label="Print / save PDF"
        href={`/invoices/${invoiceId}/print`}
        target="_blank"
        variant="secondary"
      />
      {whatsappUrl ? (
        <Button
          label="Open in WhatsApp"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          variant="secondary"
        />
      ) : (
        <Button
          label="WhatsApp unavailable"
          variant="secondary"
          isDisabled
          tooltip="Add a valid customer phone number to enable WhatsApp"
        />
      )}
    </HStack>
  );
}
