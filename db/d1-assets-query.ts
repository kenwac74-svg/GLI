import type {
  PublicAssetsQuery,
  QueryPublicListingRows,
} from "./assets-repository.ts";

type D1Result<T> = {
  results?: T[];
};

type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  all<T>(): Promise<D1Result<T>>;
};

export type D1DatabaseLike = {
  prepare(sql: string): D1StatementLike;
};

export function createD1PublicListingQuery(
  database: D1DatabaseLike,
): QueryPublicListingRows {
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("A D1 database binding is required");
  }

  return async (query: PublicAssetsQuery) => {
    const clauses = ["l.status = ?"];
    const values: unknown[] = [query.status];

    addTextFilter(clauses, values, "l.country", query.country);
    addTextFilter(clauses, values, "l.city", query.city);
    addTextFilter(
      clauses,
      values,
      "l.transaction_type",
      query.transactionType,
    );
    addTextFilter(clauses, values, "l.property_type", query.propertyType);
    addNumberFilter(
      clauses,
      values,
      "l.price_minor",
      ">=",
      query.minPriceMinor,
    );
    addNumberFilter(
      clauses,
      values,
      "l.price_minor",
      "<=",
      query.maxPriceMinor,
    );
    addNumberFilter(
      clauses,
      values,
      "l.bedrooms",
      ">=",
      query.minBedrooms,
    );
    values.push(query.limit);

    const statement = database.prepare(`
      SELECT
        l.public_id AS publicId,
        l.country,
        l.city,
        l.district,
        l.transaction_type AS transactionType,
        l.property_type AS propertyType,
        l.title,
        l.summary,
        l.price_minor AS priceMinor,
        l.currency,
        l.area_sqm_x100 AS areaSqmX100,
        l.bedrooms,
        l.bathrooms,
        l.image_url AS imageUrl,
        l.status,
        l.is_gli_direct AS isGliDirect,
        l.updated_at AS updatedAt,
        COALESCE(ts.score, 0) AS trustScore,
        COALESCE(ts.status, 'PRELIMINARY') AS trustStatus,
        json_extract(lv.normalized_payload_json, '$.strengths') AS strengthsJson,
        json_extract(lv.normalized_payload_json, '$.checks') AS checksJson
      FROM listings l
      LEFT JOIN trust_score_runs ts
        ON ts.id = (
          SELECT inner_ts.id
          FROM trust_score_runs inner_ts
          WHERE inner_ts.listing_id = l.id
          ORDER BY inner_ts.calculated_at DESC, inner_ts.id DESC
          LIMIT 1
        )
      LEFT JOIN listing_versions lv
        ON lv.id = (
          SELECT inner_lv.id
          FROM listing_versions inner_lv
          WHERE inner_lv.listing_id = l.id
          ORDER BY inner_lv.observed_at DESC, inner_lv.id DESC
          LIMIT 1
        )
      WHERE ${clauses.join(" AND ")}
      ORDER BY
        l.updated_at DESC,
        COALESCE(ts.score, 0) DESC,
        l.price_minor ASC,
        l.public_id ASC
      LIMIT ?
    `);

    const result = await statement.bind(...values).all<Record<string, unknown>>();
    return result.results ?? [];
  };
}

export async function getD1PublicListingQuery(): Promise<QueryPublicListingRows> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable");
  }
  return createD1PublicListingQuery(env.DB);
}

function addTextFilter(
  clauses: string[],
  values: unknown[],
  column: string,
  value: string | undefined,
) {
  if (value === undefined) return;
  clauses.push(`${column} = ?`);
  values.push(value);
}

function addNumberFilter(
  clauses: string[],
  values: unknown[],
  column: string,
  operator: ">=" | "<=",
  value: number | undefined,
) {
  if (value === undefined) return;
  clauses.push(`${column} ${operator} ?`);
  values.push(value);
}
