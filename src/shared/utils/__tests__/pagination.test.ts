import { describe, expect, it } from "vitest";
import { getPagination, paginateResults, paginationHeaders } from "../pagination";

describe("pagination helpers", () => {
  it("bounds requested limits and trims cursors", () => {
    const params = new URLSearchParams({ limit: "1000", cursor: " item_1 " });

    expect(getPagination(params)).toEqual({
      take: 101,
      limit: 100,
      cursor: "item_1",
    });
  });

  it("returns page headers and next cursor without changing response array shape", () => {
    const page = paginateResults(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      2,
    );

    expect(page.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(page.pageInfo).toEqual({
      hasMore: true,
      nextCursor: "b",
      limit: 2,
    });
    expect(paginationHeaders(page.pageInfo)).toEqual({
      "X-Page-Limit": "2",
      "X-Has-More": "true",
      "X-Next-Cursor": "b",
    });
  });
});
