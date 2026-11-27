// Signed-in state. The token is kept in the device keychain (SecureStore); on web, in localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api, apiBase, ApiError } from "./api";

const KEY = "nutrigoal_token";
type Role = "member" | "clinician" | "manager" | "org_manager";
type Session = {
  token: string | null;
  role: Role | null;
  name: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Google / Apple / SSO in a secure in-app browser. Resolves with a website link when the person must finish setup there first. */
  signInWithProvider: (provider: string) => Promise<{ continueUrl?: string } | void>;
  signOut: () => Promise<void>;
  call: <T>(path: string, body?: unknown) => Promise<T>;
};

const store = {
  get: async () => (Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  del: async () => (Platform.OS === "web" ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await store.get();
      if (t) {
        try {
          const me = await api<{ role: Role; name: string }>("me", { token: t });
          setToken(t);
          setRole(me.role);
          setName(me.name);
        } catch {
          await store.del();
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: { name: string; role: Role } }>("login", { body: { email, password } });
    await store.set(r.token);
    setToken(r.token);
    setRole(r.user.role);
    setName(r.user.name);
  }, []);

  const signInWithProvider = useCallback(async (provider: string) => {
    if (Platform.OS === "web") {
      globalThis.open?.(`${apiBase()}/login`, "_blank");
      return;
    }
    const returnUrl = Linking.createURL("auth");
    const start = `${apiBase()}/auth/oauth/${provider}/start?mobile_return=${encodeURIComponent(returnUrl)}`;
    const result = await WebBrowser.openAuthSessionAsync(start, returnUrl);
    if (result.type !== "success") return; // closed or cancelled
    const q = Linking.parse(result.url).queryParams ?? {};
    if (typeof q.error === "string") throw new ApiError(q.error, 400);
    const res = await fetch(`${apiBase()}/api/mobile/oauth/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: q.code }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string; user?: { name: string; role: Role }; error?: string; continueUrl?: string };
    if (data.continueUrl) return { continueUrl: data.continueUrl };
    if (!res.ok || !data.token || !data.user) throw new ApiError(data.error ?? "Sign-in failed.", res.status);
    await store.set(data.token);
    setToken(data.token);
    setRole(data.user.role);
    setName(data.user.name);
  }, []);

  const signOut = useCallback(async () => {
    if (token) await api("logout", { token, method: "POST", body: {} }).catch(() => {});
    await store.del();
    setToken(null);
    setRole(null);
    setName(null);
  }, [token]);

  const call = useCallback(
    async <T,>(path: string, body?: unknown) => {
      try {
        return await api<T>(path, { token, body });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await store.del();
          setToken(null);
        }
        throw e;
      }
    },
    [token],
  );

  const value = useMemo(() => ({ token, role, name, ready, signIn, signInWithProvider, signOut, call }), [token, role, name, ready, signIn, signInWithProvider, signOut, call]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}
