import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  canonicalPage,
  normalizePageSize,
  pageOffset,
  paginatedResult,
  paginationHref,
  parsePage,
} from "./pagination";

test("parsePage accepts positive integers and falls back to page one", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage(4), 4);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-1"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage("2.5"), 1);
});

test("paginationHref preserves filters and omits the canonical first page", () => {
  assert.equal(
    paginationHref("/products", 3, { q: "oud", status: "archived" }),
    "/products?q=oud&status=archived&page=3",
  );
  assert.equal(
    paginationHref("/products", 1, { q: "oud", status: undefined }),
    "/products?q=oud",
  );
  assert.equal(
    paginationHref(
      "/invoices/invoice-id",
      3,
      { tab: "activity", paymentsPage: "999" },
      "paymentsPage",
    ),
    "/invoices/invoice-id?tab=activity&paymentsPage=3",
  );
  assert.equal(
    paginationHref(
      "/invoices/invoice-id",
      1,
      { tab: "activity", paymentsPage: "2" },
      "paymentsPage",
    ),
    "/invoices/invoice-id?tab=activity",
  );
});

test("canonicalPage recovers an out-of-range request without redirecting empty lists", () => {
  assert.equal(canonicalPage(999, 3, 51), 3);
  assert.equal(canonicalPage(3, 3, 51), null);
  assert.equal(canonicalPage(999, 1, 0), null);
});

test("page size is bounded and produces a stable offset", () => {
  assert.equal(normalizePageSize(undefined), DEFAULT_PAGE_SIZE);
  assert.equal(normalizePageSize(0), DEFAULT_PAGE_SIZE);
  assert.equal(normalizePageSize(MAX_PAGE_SIZE + 1), MAX_PAGE_SIZE);
  assert.equal(pageOffset(3, 25), 50);
});

test("paginatedResult reports total pages without hiding out-of-range requests", () => {
  assert.deepEqual(paginatedResult(["row"], 51, 3, 25), {
    items: ["row"],
    page: 3,
    pageSize: 25,
    total: 51,
    totalPages: 3,
  });
  assert.equal(paginatedResult([], 0, 1, 25).totalPages, 1);
});
