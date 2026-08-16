CREATE TABLE office_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  office_name varchar(160) NOT NULL, country_code char(2) NOT NULL, tier varchar(16) NOT NULL,
  period varchar(7) NOT NULL, calibration_status varchar(24) NOT NULL,
  input_data jsonb NOT NULL, calculated_data jsonb NOT NULL, ide numeric(5,2) NOT NULL,
  classification varchar(24) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE etr_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, tier varchar(16) NOT NULL, period varchar(7) NOT NULL,
  source_currency char(3) NOT NULL, input_data jsonb NOT NULL, calculated_data jsonb NOT NULL,
  effective_tax_rate numeric(9,4) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tax_demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, tier varchar(16) NOT NULL, complexity varchar(16) NOT NULL,
  status varchar(24) NOT NULL, received_at timestamptz NOT NULL, completed_at timestamptz,
  indicator_data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tax_contingencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, tier varchar(16) NOT NULL, risk_category varchar(48) NOT NULL,
  status varchar(16) NOT NULL, exposure_amount_eur numeric(20,4) NOT NULL, opened_at date NOT NULL,
  closed_at date, inherited_before_baseline boolean NOT NULL, outside_risk_appetite boolean NOT NULL,
  risk_justification varchar(1000), aging_days integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_office_scorecards_tenant_period ON office_scorecards(tenant_id, period);
CREATE INDEX idx_etr_measurements_tenant_period ON etr_measurements(tenant_id, period);
CREATE INDEX idx_tax_demands_tenant_status ON tax_demands(tenant_id, status);
CREATE INDEX idx_tax_contingencies_tenant_status ON tax_contingencies(tenant_id, status);

DO $migration$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['office_scorecards','etr_measurements','tax_demands','tax_contingencies'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      'tenant_isolation_' || table_name, table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO app_runtime', table_name);
  END LOOP;
END $migration$;
