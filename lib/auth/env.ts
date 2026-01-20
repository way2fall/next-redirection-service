function mustGet(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getAdminEnv() {
  return {
    ADMIN_USERNAME: mustGet("ADMIN_USERNAME"),
    ADMIN_PASSWORD_HASH: mustGet("ADMIN_PASSWORD_HASH"),
    SESSION_SECRET: mustGet("SESSION_SECRET")
  };
}

