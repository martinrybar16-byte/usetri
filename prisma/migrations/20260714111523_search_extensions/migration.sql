-- Search & geo extensions (Supabase keeps extensions in the "extensions" schema;
-- the schema is created here too so the migration also applies to plain Postgres)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA extensions;

-- Trigram indexes for typo-tolerant product/brand search
CREATE INDEX IF NOT EXISTS "Product_normalizedName_trgm_idx"
  ON "Product" USING GIN ("normalizedName" extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Brand_name_trgm_idx"
  ON "Brand" USING GIN ("name" extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "WatchedTerm_normalizedTerm_trgm_idx"
  ON "WatchedTerm" USING GIN ("normalizedTerm" extensions.gin_trgm_ops);

-- Geo index for nearby-store queries (earthdistance)
CREATE INDEX IF NOT EXISTS "Store_earth_idx"
  ON "Store" USING GIST (extensions.ll_to_earth("lat", "lng"));
