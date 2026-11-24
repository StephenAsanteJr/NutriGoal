// Signed-in state. The token is kept in the device keychain (SecureStore); on web, in localStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, ApiError } from "./api";

const KEY = "nutrigoal_token";
type Role = "member" | "clinician" | "manager";
type Session = {
  token: string | null;
  role: Role | null;
  name: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  const value = useMemo(() => ({ token, role, name, ready, signIn, signOut, call }), [token, role, name, ready, signIn, signOut, call]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}
