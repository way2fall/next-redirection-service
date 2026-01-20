import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminEnv, requireAdminEnv } from "./env";

const COOKIE_NAME = "nrs_admin";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  u: string;
  iat: number;
  exp: number;
};

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function b64urlToBuf(str: string) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replaceAll("-", "+").replaceAll("_", "/") + pad;
  return Buffer.from(base64, "base64");
}

function sign(payloadB64: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

function encode(payload: SessionPayload, secret: string) {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sigB64 = sign(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

function decode(value: string, secret: string): SessionPayload | null {
  const [payloadB64, sigB64] = value.split(".");
  if (!payloadB64 || !sigB64) return null;

  const expected = sign(payloadB64, secret);
  const a = b64urlToBuf(sigB64);
  const b = b64urlToBuf(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const raw = Buffer.from(b64urlToBuf(payloadB64)).toString("utf8");
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.u || typeof parsed.iat !== "number" || typeof parsed.exp !== "number") return null;
    if (parsed.exp * 1000 <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie(username: string) {
  const { SESSION_SECRET, ADMIN_USERNAME } = requireAdminEnv();
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(process.env.SESSION_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  const exp = now + (Number.isFinite(ttl) ? ttl : DEFAULT_TTL_SECONDS);

  const value = encode({ u: username, iat: now, exp }, SESSION_SECRET);

  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: exp - now
    },
    expectedUser: ADMIN_USERNAME
  };
}

export function clearAdminSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    }
  };
}

export async function isAdminAuthed() {
  const env = getAdminEnv();
  if (!env) return false;
  const { SESSION_SECRET, ADMIN_USERNAME } = env;
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const session = decode(value, SESSION_SECRET);
  if (!session) return false;
  return session.u === ADMIN_USERNAME;
}

export async function requireAdmin() {
  if (!(await isAdminAuthed())) redirect("/admin/login");
}
