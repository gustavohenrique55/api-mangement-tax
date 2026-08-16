CREATE TABLE management_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  resource_type varchar(80) NOT NULL,
  country_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_management_records_tenant_resource
  ON management_records(tenant_id, resource_type);
ALTER TABLE management_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_management_records ON management_records
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON management_records TO app_runtime;
