import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const client = new Client({
  connectionString:
    process.env.MIGRATION_DATABASE_URL ??
    "postgresql://postgres:local_postgres_only@localhost:55432/api_management_tax?schema=public",
});

async function main(): Promise<void> {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  await client.connect();
  try {
    await client.query(
      "INSERT INTO tenants (id, display_name) VALUES ($1, $2), ($3, $4)",
      [tenantA, "Synthetic Tenant A", tenantB, "Synthetic Tenant B"],
    );
    await client.query(
      "INSERT INTO jurisdictions (tenant_id, country_code, name, management_block, jurisdiction_type, applicable_law_model) VALUES ($1, 'BR', 'Brasil', 'SOUTH_AMERICA', 'SOVEREIGN_STATE', 'SOVEREIGN_DOMESTIC_LAW'), ($2, 'MX', 'México', 'CENTRAL_AMERICA', 'SOVEREIGN_STATE', 'SOVEREIGN_DOMESTIC_LAW')",
      [tenantA, tenantB],
    );
    await client.query(
      "INSERT INTO jurisdictions (tenant_id, country_code, name, management_block, jurisdiction_type, sovereign_authority_code, applicable_law_model) VALUES ($1, 'PR', 'Porto Rico', 'CARIBBEAN_ISLANDS', 'NON_SOVEREIGN_TERRITORY', 'US', 'TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK')",
      [tenantB],
    );
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE app_runtime");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [
      tenantA,
    ]);
    const visible = await client.query<{
      tenant_id: string;
      country_code: string;
    }>(
      "SELECT tenant_id, country_code FROM jurisdictions ORDER BY country_code",
    );
    if (
      visible.rows.length !== 1 ||
      visible.rows[0]?.tenant_id !== tenantA ||
      visible.rows[0]?.country_code !== "BR"
    ) {
      throw new Error(`RLS isolation failed: ${JSON.stringify(visible.rows)}`);
    }
    await client.query("ROLLBACK");
    console.log(
      "RLS integration passed: app_runtime saw only its active tenant.",
    );
  } finally {
    await client
      .query("DELETE FROM jurisdictions WHERE tenant_id = ANY($1::uuid[])", [
        [tenantA, tenantB],
      ])
      .catch(() => undefined);
    await client
      .query("DELETE FROM tenants WHERE id = ANY($1::uuid[])", [
        [tenantA, tenantB],
      ])
      .catch(() => undefined);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
