import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSession } from "./local-data";
import { isLocalMode } from "./local-mode";

const PRESENCE_KEY = "vampiros.local.presence";
const PRESENCE_EVENT = "vampiros:presence";
const ONLINE_WINDOW_MS = 45_000;

export type OnlineUser = {
  user_id: string;
  display_name: string;
  last_seen: string;
};

const fallbackPresence: OnlineUser[] = [];
let cachedRaw = "";
let cachedPresence = fallbackPresence;

function readLocalPresence() {
  if (typeof window === "undefined") return fallbackPresence;
  const raw = window.localStorage.getItem(PRESENCE_KEY) ?? "";
  if (raw === cachedRaw) return cachedPresence;

  cachedRaw = raw;
  if (!raw) {
    cachedPresence = fallbackPresence;
    return cachedPresence;
  }

  try {
    cachedPresence = JSON.parse(raw) as OnlineUser[];
  } catch {
    cachedPresence = fallbackPresence;
  }

  return cachedPresence;
}

function writeLocalPresence(users: OnlineUser[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(users);
  cachedRaw = raw;
  cachedPresence = users;
  window.localStorage.setItem(PRESENCE_KEY, raw);
  window.dispatchEvent(new Event(PRESENCE_EVENT));
}

function refreshLocalPresence() {
  const user = getLocalSession();
  if (!user) return;

  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const nextUser: OnlineUser = {
    user_id: user.id,
    display_name: user.display_name || user.email,
    last_seen: new Date().toISOString(),
  };

  const otherUsers = readLocalPresence().filter(
    (item) => item.user_id !== user.id && new Date(item.last_seen).getTime() >= cutoff,
  );
  writeLocalPresence([nextUser, ...otherUsers]);
}

function subscribeLocal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === PRESENCE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PRESENCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRESENCE_EVENT, callback);
  };
}

function useLocalOnlineUsers() {
  useEffect(() => {
    refreshLocalPresence();
    const interval = window.setInterval(refreshLocalPresence, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const users = useSyncExternalStore(subscribeLocal, readLocalPresence, () => fallbackPresence);
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  return users.filter((user) => new Date(user.last_seen).getTime() >= cutoff);
}

function useRemoteOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const displayName =
        (userData.user.user_metadata?.display_name as string | undefined) ||
        userData.user.email ||
        "Jogador";

      await supabase.from("user_presence").upsert({
        user_id: userData.user.id,
        display_name: displayName,
        last_seen: new Date().toISOString(),
      });
    };

    const load = async () => {
      const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from("user_presence")
        .select("user_id, display_name, last_seen")
        .gte("last_seen", since)
        .order("last_seen", { ascending: false });

      if (!cancelled && !error) setUsers((data ?? []) as OnlineUser[]);
    };

    const tick = async () => {
      await refresh();
      await load();
    };

    void tick();
    const interval = window.setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return users;
}

export function useOnlineUsers() {
  return isLocalMode ? useLocalOnlineUsers() : useRemoteOnlineUsers();
}
