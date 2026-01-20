export type AdminEnv = {
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
};

export function getAdminEnv(): AdminEnv | null {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !SESSION_SECRET) return null;
  return { ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SESSION_SECRET };
}

export function requireAdminEnv(): AdminEnv {
  const env = getAdminEnv();
  if (!env) {
    throw new Error(
      "Missing required admin env vars. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and SESSION_SECRET."
    );
  }
  return env;
}
