import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { whatsappContactUrl } from "@/lib/whatsapp-contact";

export function WhatsAppContactAction() {
  return (
    <a
      href={whatsappContactUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Perfume Aura on WhatsApp"
      className="aura-whatsapp-action"
    >
      <span className="aura-whatsapp-label" aria-hidden="true">
        Chat on WhatsApp
      </span>
      <span className="aura-whatsapp-icon" aria-hidden="true">
        <HugeiconsIcon icon={WhatsappIcon} strokeWidth={1.8} />
      </span>
    </a>
  );
}
