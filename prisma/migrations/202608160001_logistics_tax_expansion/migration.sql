-- Itens 1 a 10 do domínio tributário-logístico. Valores jurídicos permanecem preliminares
-- até validação por profissional habilitado na jurisdição correspondente.
CREATE TABLE operational_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, operation_types jsonb NOT NULL, transport_modes jsonb NOT NULL,
  operating_model varchar(24) NOT NULL, operational_presence varchar(24) NOT NULL,
  notes varchar(1000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, display_name varchar(160) NOT NULL, tax_identifier_masked varchar(64) NOT NULL,
  entity_type varchar(40) NOT NULL, functional_currency char(3) NOT NULL, status varchar(20) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  legal_entity_id uuid NOT NULL, country_code char(2) NOT NULL, display_name varchar(160) NOT NULL,
  establishment_type varchar(32) NOT NULL, city varchar(160) NOT NULL, control_model varchar(24) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE logistics_lanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  origin_country_code char(2) NOT NULL, destination_country_code char(2) NOT NULL,
  transport_mode varchar(24) NOT NULL, billing_entity_id uuid, incoterm varchar(16), currency char(3) NOT NULL,
  status varchar(20) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customs_regimes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, code varchar(40) NOT NULL, name varchar(160) NOT NULL,
  regime_type varchar(40) NOT NULL, legal_validation_status varchar(40) NOT NULL,
  source_reference varchar(500), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, tax_type varchar(40) NOT NULL, operation_type varchar(48) NOT NULL,
  rate_percent numeric(12,6), applicability_summary varchar(500) NOT NULL,
  legal_validation_status varchar(40) NOT NULL, source_reference varchar(500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, document_type varchar(40) NOT NULL, external_reference varchar(160) NOT NULL,
  issue_date date NOT NULL, legal_entity_id uuid, information_class varchar(24) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tax_recovery_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  country_code char(2) NOT NULL, legal_entity_id uuid, credit_category varchar(24) NOT NULL,
  tax_type varchar(40) NOT NULL, tax_period varchar(40) NOT NULL, identified_amount numeric(20,4) NOT NULL,
  currency char(3) NOT NULL, statutory_deadline date NOT NULL, recovery_channel varchar(40) NOT NULL,
  status varchar(32) NOT NULL, legal_validation_status varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE permanent_establishment_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  host_country_code char(2) NOT NULL, legal_entity_id uuid, risk_factors jsonb NOT NULL,
  risk_level varchar(16) NOT NULL, legal_validation_status varchar(40) NOT NULL,
  preliminary_rationale varchar(1000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  system_type varchar(32) NOT NULL, display_name varchar(120) NOT NULL, direction varchar(24) NOT NULL,
  status varchar(20) NOT NULL, secret_reference varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

DO $migration$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'operational_profiles','legal_entities','establishments','logistics_lanes','customs_regimes',
    'tax_rules','tax_documents','tax_recovery_opportunities','permanent_establishment_assessments','integration_connections'
  ] LOOP
    EXECUTE format('CREATE INDEX %I ON %I (tenant_id)', 'idx_' || table_name || '_tenant', table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      'tenant_isolation_' || table_name, table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO app_runtime', table_name);
  END LOOP;
END $migration$;
