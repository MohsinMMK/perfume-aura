export type ReviewedPublicationContent = Readonly<{
  baseNotes: readonly string[] | null;
  contentFields: Readonly<{
    ingredients: string | null;
    intensity: string | null;
    longevityGuidance: string | null;
    longDescription: string | null;
    occasion: string | null;
    publicName: string | null;
    publicSlug: string | null;
    scentFamily: string | null;
    seoDescription: string | null;
    seoTitle: string | null;
    shortDescription: string | null;
    usageInstructions: string | null;
  }>;
  heartNotes: readonly string[] | null;
  topNotes: readonly string[] | null;
}>;

export function reviewedPublicationContentChanged(
  current: ReviewedPublicationContent,
  next: ReviewedPublicationContent,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(next);
}

export function changedApprovedRecordRequiresReset(input: Readonly<{
  changed: boolean;
  existingApprovedAt: Date | null | undefined;
  requestedApproved: boolean;
}>): boolean {
  return input.changed && Boolean(input.existingApprovedAt) && input.requestedApproved;
}
