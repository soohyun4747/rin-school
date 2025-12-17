import { serverRestQuery } from "./server";

type FilterValue = string | number | undefined;

function buildQuery(params: {
  select?: string;
  filters?: Record<string, FilterValue>;
  order?: { column: string; ascending?: boolean };
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("select", params.select ?? "*");

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, rawValue]) => {
      if (rawValue === undefined) return;
      const value = rawValue.toString();
      // If the caller already provides an operator (gte., lte., etc) keep it.
      const hasOperator = value.includes(".");
      searchParams.set(key, hasOperator ? value : `eq.${value}`);
    });
  }

  if (params.order) {
    const direction = params.order.ascending === false ? "desc" : "asc";
    searchParams.set("order", `${params.order.column}.${direction}`);
  }

  return searchParams.toString();
}

export async function restSelect<T>(
  table: string,
  params: {
    select?: string;
    filters?: Record<string, FilterValue>;
    order?: { column: string; ascending?: boolean };
  } = {},
): Promise<T[]> {
  const query = buildQuery(params);
  return serverRestQuery<T[]>(`/rest/v1/${table}?${query}`);
}

export async function restInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T | T[],
) {
  return serverRestQuery(`/rest/v1/${table}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

export async function restUpsert<T extends Record<string, unknown>>(
  table: string,
  rows: T | T[],
) {
  return serverRestQuery(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
}

export async function restDelete(
  table: string,
  filters: Record<string, FilterValue>,
) {
  const query = buildQuery({ filters });
  return serverRestQuery(`/rest/v1/${table}?${query}`, { method: "DELETE" });
}
