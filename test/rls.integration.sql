\set ON_ERROR_STOP on
BEGIN;

INSERT INTO tenants (id, display_name) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Synthetic Tenant A'),
  ('00000000-0000-4000-8000-000000000002', 'Synthetic Tenant B');
INSERT INTO jurisdictions (tenant_id, country_code, name, management_block, jurisdiction_type, applicable_law_model) VALUES
  ('00000000-0000-4000-8000-000000000001', 'BR', 'Brasil', 'SOUTH_AMERICA', 'SOVEREIGN_STATE', 'SOVEREIGN_DOMESTIC_LAW'),
  ('00000000-0000-4000-8000-000000000002', 'MX', 'México', 'CENTRAL_AMERICA', 'SOVEREIGN_STATE', 'SOVEREIGN_DOMESTIC_LAW');
INSERT INTO jurisdictions (
  tenant_id, country_code, name, management_block, jurisdiction_type,
  sovereign_authority_code, applicable_law_model
) VALUES (
  '00000000-0000-4000-8000-000000000002', 'PR', 'Porto Rico', 'CARIBBEAN_ISLANDS',
  'NON_SOVEREIGN_TERRITORY', 'US', 'TERRITORY_SPECIFIC_WITH_SOVEREIGN_FRAMEWORK'
);

SET LOCAL ROLE app_runtime;
SELECT set_config('app.tenant_id', '00000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  visible_count integer;
  visible_code char(2);
BEGIN
  SELECT count(*), min(country_code) INTO visible_count, visible_code FROM jurisdictions;
  IF visible_count <> 1 OR visible_code <> 'BR' THEN
    RAISE EXCEPTION 'RLS isolation failed: count=%, code=%', visible_count, visible_code;
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
\echo 'RLS integration passed: app_runtime saw only its active tenant.'
