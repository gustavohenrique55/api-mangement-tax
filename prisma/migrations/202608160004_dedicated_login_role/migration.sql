-- Dedicated non-superuser login role for the application.
-- The app connects as app_login and uses SET LOCAL ROLE to switch to
-- app_runtime / app_audit_writer (least privilege; RLS stays enforced).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_login') THEN
    CREATE ROLE app_login LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
  END IF;
END $$;

GRANT app_runtime TO app_login;
GRANT app_audit_writer TO app_login;

DO $$ BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_login', current_database());
END $$;

COMMENT ON ROLE app_login IS 'Login role da aplicação (não-superuser, NOINHERIT). Sem privilégios diretos: usa SET ROLE para app_runtime/app_audit_writer. Defina a senha via secret: ALTER ROLE app_login PASSWORD ''...'';';
