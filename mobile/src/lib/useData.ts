import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "./session";

/** Fetch a mobile API resource; refetches when the screen regains focus. */
export function useData<T>(path: string | null) {
  const { call, token } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!path || !token) return;
    setLoading(true);
    try {
      setData(await call<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [path, token, call]);

  // Runs on first focus (mount) and whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return { data, error, loading, reload: load };
}
