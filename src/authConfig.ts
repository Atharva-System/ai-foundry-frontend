import { LogLevel } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_TENANT_ID as string;
const spaClientId = import.meta.env.VITE_SPA_CLIENT_ID as string;

export const apiScope = import.meta.env.VITE_API_SCOPE as string;

export const msalConfig = {
  auth: {
    clientId: spaClientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: "http://localhost:5173/",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (_level: LogLevel, message: string) => console.log(message),
      piiLoggingEnabled: false,
      logLevel: LogLevel.Info,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

export const tokenRequest = {
  scopes: [apiScope],
};
