declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      actor?: {
        subject: string;
        tenantId: string;
        roles: string[];
        countryScopes: string[];
      };
    }
  }
}

export {};
