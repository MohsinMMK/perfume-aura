import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changedApprovedRecordRequiresReset,
  reviewedPublicationContentChanged,
  type ReviewedPublicationContent,
} from "./catalog-approval-policy";

const reviewedContent: ReviewedPublicationContent = {
  baseNotes: ["amber"],
  heartNotes: ["cedar"],
  topNotes: ["pepper"],
  contentFields: {
    ingredients: "Fragrance composition",
    intensity: "strong",
    longevityGuidance: "Up to eight hours",
    longDescription: "A composed woody scent prepared for the launch catalog.",
    occasion: "evening",
    publicName: "Launch One",
    publicSlug: "launch-one",
    scentFamily: "woody",
    seoDescription: "Discover Launch One by Perfume Aura.",
    seoTitle: "Launch One perfume",
    shortDescription: "A composed woody scent.",
    usageInstructions: "External use only",
  },
};

describe("catalog approval reset policy", () => {
  it("detects changes to reviewed customer-facing content", () => {
    assert.equal(reviewedPublicationContentChanged(reviewedContent, reviewedContent), false);
    assert.equal(reviewedPublicationContentChanged(reviewedContent, {
      ...reviewedContent,
      contentFields: { ...reviewedContent.contentFields, publicName: "Launch One Revised" },
    }), true);
    assert.equal(reviewedPublicationContentChanged(reviewedContent, {
      ...reviewedContent,
      topNotes: ["citrus"],
    }), true);
  });

  it("requires a two-step reset only for an already approved changed record", () => {
    const approvedAt = new Date("2026-08-20T00:00:00.000Z");
    assert.equal(changedApprovedRecordRequiresReset({ changed: true, existingApprovedAt: approvedAt, requestedApproved: true }), true);
    assert.equal(changedApprovedRecordRequiresReset({ changed: false, existingApprovedAt: approvedAt, requestedApproved: true }), false);
    assert.equal(changedApprovedRecordRequiresReset({ changed: true, existingApprovedAt: null, requestedApproved: true }), false);
    assert.equal(changedApprovedRecordRequiresReset({ changed: true, existingApprovedAt: approvedAt, requestedApproved: false }), false);
  });
});
