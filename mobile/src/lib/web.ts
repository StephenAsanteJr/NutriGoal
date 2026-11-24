import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

/** Open a page of the NutriGoal website, already signed in (one-time handoff link from the API). */
export async function openWeb(call: <T>(path: string, body?: unknown) => Promise<T>, next: string) {
  const { url } = await call<{ url: string }>("handoff", { next });
  if (Platform.OS === "web") globalThis.open?.(url, "_blank");
  else await WebBrowser.openBrowserAsync(url);
}
