CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_writer') THEN
    CREATE ROLE app_audit_writer NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar(160) NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE jurisdictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  country_code char(2) NOT NULL,
  name varchar(120) NOT NULL,
  management_block varchar(24) NOT NULL CHECK (management_block IN ('CENTRAL_AMERICA', 'CARIBBEAN_ISLANDS', 'SOUTH_AMERICA')),
  jurisdiction_type varchar(32) NOT NULL CHECK (jurisdiction_type IN ('SOVEREIGN_STATE', 'NON_SOVEREIGN_TERRITORY', 'CONSTITUENT_COUNTRY', 'OVERSEAS_TERRITORY', 'OVERSEAS_REGION')),
  sovereign_authority_code char(2),
  applicable_law_model varchar(64) NOT NULL CHECK (applicable_law_model IN ('SOVEREIGN_DOMESTIC_LAW', 'TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK')),
  legal_validation_status varchar(40) NOT NULL DEFAULT 'REQUIRED_LOCAL_COUNSEL' CHECK (legal_validation_status = 'REQUIRED_LOCAL_COUNSEL'),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, country_code),
  CHECK (
    (jurisdiction_type = 'SOVEREIGN_STATE' AND sovereign_authority_code IS NULL AND applicable_law_model = 'SOVEREIGN_DOMESTIC_LAW')
    OR
    (jurisdiction_type <> 'SOVEREIGN_STATE' AND sovereign_authority_code IS NOT NULL AND applicable_law_model = 'TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK')
  )
);
CREATE INDEX jurisdictions_tenant_status_idx ON jurisdictions (tenant_id, status);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  occurred_at timestamptz(6) NOT NULL DEFAULT now(),
  actor_subject varchar(200) NOT NULL,
  action varchar(100) NOT NULL,
  resource_type varchar(100) NOT NULL,
  resource_id varchar(200) NOT NULL,
  correlation_id varchar(128) NOT NULL,
  metadata jsonb NOT NULL,
  previous_mac char(64),
  mac char(64) NOT NULL
);
CREATE INDEX audit_events_tenant_occurred_idx ON audit_events (tenant_id, occurred_at);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tenants ON tenants
  USING (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_jurisdictions ON jurisdictions
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_runtime, app_audit_writer;
GRANT SELECT, INSERT, UPDATE ON tenants, jurisdictions TO app_runtime;
GRANT SELECT ON audit_events TO app_runtime;
GRANT SELECT, INSERT ON audit_events TO app_audit_writer;
COMMENT ON TABLE audit_events IS 'Append-only application audit log; integrity is protected by an HMAC chain.';
