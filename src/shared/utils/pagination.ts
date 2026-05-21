const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function getPagination(searchParams: URLSearchParams) {
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const rawCursor = searchParams.get("cursor");

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return {
    take: limit + 1,
    limit,
    cursor: rawCursor?.trim() || null,
  };
}

export function paginateResults<T extends { id: string }>(
  items: T[],
  limit: number,
) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  return {
    items: data,
    pageInfo: {
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
      limit,
    },
  };
}

export function paginationHeaders(pageInfo: {
  hasMore: boolean;
  nextCursor: string | null;
  limit: number;
}) {
  return {
    "X-Page-Limit": String(pageInfo.limit),
    "X-Has-More": String(pageInfo.hasMore),
    ...(pageInfo.nextCursor ? { "X-Next-Cursor": pageInfo.nextCursor } : {}),
  };
}
