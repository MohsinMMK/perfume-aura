export type PublicPostalAddress = Readonly<{
  streetAddress: string;
  addressLocality: "Hyderabad";
  addressRegion: "Telangana";
  postalCode: string;
  addressCountry: "IN";
}>;

export type PublicOpeningHours = Readonly<{
  days: readonly (
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday"
  )[];
  opens: string;
  closes: string;
}>;

/**
 * Complete, owner-verified public identity required before a Store entity or
 * location page may be published. No partial identity is exported.
 */
export type PublicBusinessIdentity = Readonly<{
  name: "Perfume Aura";
  canonicalUrl: "https://perfumeaura.com";
  locationUrl: "https://perfumeaura.com/stores/kondapur-hyderabad";
  telephone: string;
  address: PublicPostalAddress;
  geo: Readonly<{ latitude: number; longitude: number }>;
  openingHours: readonly PublicOpeningHours[];
  images: readonly string[];
  sameAs: readonly string[];
}>;

export function createStoreStructuredData(identity: PublicBusinessIdentity) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${identity.locationUrl}#store`,
    name: identity.name,
    url: identity.locationUrl,
    telephone: identity.telephone,
    address: { "@type": "PostalAddress", ...identity.address },
    geo: { "@type": "GeoCoordinates", ...identity.geo },
    openingHoursSpecification: identity.openingHours.map((hours) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: hours.days,
      opens: hours.opens,
      closes: hours.closes,
    })),
    image: identity.images,
    sameAs: identity.sameAs,
    parentOrganization: { "@id": `${identity.canonicalUrl}/#organization` },
  } as const;
}
