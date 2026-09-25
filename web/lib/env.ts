import { z } from "zod";

/**
 * Environment variable validation.
 *
 * `publicEnv` is safe to import from client components — it only reads
 * `NEXT_PUBLIC_*` variables, which Next.js inlines at build time.
 *
 * `serverEnv()` reads server-only secrets and must never be imported into a
 * client bundle. It is lazy (evaluated on first call, not at module load) so
 * that missing optional values never fail `next build`.
 */

export const worldPresetSchema = z.enum([
  "passport",
  "proofOfHuman",
  "orbLegacy",
  "selfieCheck",
]);
export type WorldPreset = z.infer<typeof worldPresetSchema>;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SEPOLIA_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_WORLD_APP_ID: z.string().startsWith("app_").optional(),
  NEXT_PUBLIC_WORLD_ACTION: z.string().default("buy-receivable"),
  NEXT_PUBLIC_WORLD_PRESET: worldPresetSchema.default("passport"),
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parsePublicEnv(): PublicEnv {
  const raw = {
    NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
    NEXT_PUBLIC_WORLD_APP_ID: process.env.NEXT_PUBLIC_WORLD_APP_ID,
    NEXT_PUBLIC_WORLD_ACTION: process.env.NEXT_PUBLIC_WORLD_ACTION,
    NEXT_PUBLIC_WORLD_PRESET: process.env.NEXT_PUBLIC_WORLD_PRESET,
  };

  const parsed = publicEnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Optional/misconfigured public env must never break the build or the
    // client bundle — fall back to schema defaults and warn instead.
    console.warn(
      "[env] invalid NEXT_PUBLIC_* values, falling back to defaults:",
      parsed.error.flatten().fieldErrors,
    );
    return publicEnvSchema.parse({});
  }

  return parsed.data;
}

/** Safe to use in client components. */
export const publicEnv: PublicEnv = parsePublicEnv();

const serverEnvSchema = z.object({
  SEPOLIA_RPC_URL: z.string().url().optional(),
  WORLD_RP_ID: z.string().optional(),
  WORLD_RP_SIGNING_KEY: z.string().optional(),
  WORLD_ENV: z.enum(["staging", "production"]).default("staging"),
  OPERATOR_PRIVATE_KEY: z.string().optional(),
  LOCAL_MARKET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "LOCAL_MARKET_ADDRESS must be a 0x-address")
    .optional(),
});
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

/**
 * Lazily parses server-only env vars. Only call this from server code
 * (route handlers, server components, server actions) — calling it on the
 * client throws.
 */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must only be called on the server");
  }

  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.parse({
    SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
    WORLD_RP_ID: process.env.WORLD_RP_ID,
    WORLD_RP_SIGNING_KEY: process.env.WORLD_RP_SIGNING_KEY,
    WORLD_ENV: process.env.WORLD_ENV,
    OPERATOR_PRIVATE_KEY: process.env.OPERATOR_PRIVATE_KEY,
    LOCAL_MARKET_ADDRESS: process.env.LOCAL_MARKET_ADDRESS,
  });

  if (parsed.LOCAL_MARKET_ADDRESS && process.env.NODE_ENV === "production") {
    throw new Error(
      "LOCAL_MARKET_ADDRESS must not be set in production — it is a local/dev-only override for the deployed market address.",
    );
  }

  cachedServerEnv = parsed;
  return parsed;
}
