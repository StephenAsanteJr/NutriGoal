// Talks to the NutriGoal web app's mobile API (/api/mobile/*).
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * API base URL:
 *  1. EXPO_PUBLIC_API_URL (e.g. EXPO_PUBLIC_API_URL=http://localhost:3000 to test against your local web app)
 *  2. app.json "extra.apiUrl": the live site, so Expo Go works on any network
 *  3. in development on a phone: the same computer that serves the Expo bundle, port 3000
 *  4. web / simulator: http://localhost:3000
 */
export function apiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (fromConfig) return fromConfig.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (Platform.OS !== "web" && host) return `http://${host}:3000`;
  return "http://localhost:3000";
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { token?: string | null; method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/mobile/${path}`, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(`Can't reach NutriGoal at ${apiBase()}. Is the web app running?`, 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new ApiError(data.error ?? data.message ?? "Something went wrong.", res.status);
  return data as T;
}
