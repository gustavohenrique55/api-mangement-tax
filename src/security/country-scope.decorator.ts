import { SetMetadata } from "@nestjs/common";

export const COUNTRY_SCOPE_FIELDS_KEY = "countryScopeFields";

// Marks which request-body fields hold ISO country codes the actor must be scoped to.
export const CountryScope = (...fields: string[]) =>
  SetMetadata(COUNTRY_SCOPE_FIELDS_KEY, fields);
