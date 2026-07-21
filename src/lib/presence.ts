import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalCharacters, getLocalSession, getLocalUsers } from "./local-data";
import { isLocalMode } from "./local-mode";

const PRESENCE_KEY = "vampiros.local.presence";
const PRESENCE_EVENT = "vampiros:presence";
const ONLINE_WINDOW_MS = 45_000;

export type OnlineUser = {
  user_id: string;
  display_name: string;
  last_seen: string;
  player_name?: string;
  character_name?: string;
  portrait_url?: string | null;
};

export type KnownUser = OnlineUser & {
  online: boolean;
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

  const nextUser: OnlineUser = {
    user_id: user.id,
    display_name: user.display_name || user.email,
    last_seen: new Date().toISOString(),
  };

  const otherUsers = readLocalPresence().filter((item) => item.user_id !== user.id);
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

function toKnownUsers(users: OnlineUser[]) {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  return users.map((user) => ({
    ...user,
    online: new Date(user.last_seen).getTime() >= cutoff,
  }));
}

function useLocalKnownUsers() {
  useEffect(() => {
    refreshLocalPresence();
    const interval = window.setInterval(refreshLocalPresence, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const users = useSyncExternalStore(subscribeLocal, readLocalPresence, () => fallbackPresence);
  const knownUsers = getLocalUsers().map((user) => {
    const presence = users.find((item) => item.user_id === user.id);
    const character = getLocalCharacters().find((item) => item.owner_id === user.id);
    const playerName = user.display_name || user.email;
    return {
      user_id: user.id,
      display_name: character?.name || playerName,
      player_name: playerName,
      character_name: character?.name,
      portrait_url: character?.portrait_url ?? null,
      last_seen: presence?.last_seen ?? "1970-01-01T00:00:00.000Z",
    };
  });
  return toKnownUsers(knownUsers);
}

function useRemoteKnownUsers() {
  const [users, setUsers] = useState<KnownUser[]>([]);

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
      const [
        { data: profiles, error: profilesError },
        { data: presence, error: presenceError },
        { data: characters, error: charactersError },
      ] = await Promise.all([
        supabase.from("profiles").select("id, display_name"),
        supabase
        .from("user_presence")
        .select("user_id, display_name, last_seen")
          .order("last_seen", { ascending: false }),
        supabase
          .from("characters")
          .select("owner_id, name, portrait_url")
          .not("owner_id", "is", null)
          .order("updated_at", { ascending: false }),
      ]);

      if (profilesError || presenceError || charactersError) return;

      const presenceByUser = new Map((presence ?? []).map((item) => [item.user_id, item]));
      const characterByOwner = new Map(
        (characters ?? [])
          .filter((character) => character.owner_id)
          .map((character) => [character.owner_id!, character]),
      );
      const knownUsersById = new Map((profiles ?? []).map((profile) => {
        const userPresence = presenceByUser.get(profile.id);
        const character = characterByOwner.get(profile.id);
        const playerName = profile.display_name || userPresence?.display_name || "Jogador";
        return [profile.id, {
          user_id: profile.id,
          display_name: character?.name || playerName,
          player_name: playerName,
          character_name: character?.name,
          portrait_url: character?.portrait_url ?? null,
          last_seen: userPresence?.last_seen ?? "1970-01-01T00:00:00.000Z",
        }];
      }));

      for (const item of presence ?? []) {
        if (!knownUsersById.has(item.user_id)) {
          const character = characterByOwner.get(item.user_id);
          const playerName = item.display_name || "Jogador";
          knownUsersById.set(item.user_id, {
            user_id: item.user_id,
            display_name: character?.name || playerName,
            player_name: playerName,
            character_name: character?.name,
            portrait_url: character?.portrait_url ?? null,
            last_seen: item.last_seen,
          });
        }
      }

      if (!cancelled) setUsers(toKnownUsers([...knownUsersById.values()]));
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

export function useKnownUsers() {
  return isLocalMode ? useLocalKnownUsers() : useRemoteKnownUsers();
}

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(() => (isLocalMode ? getLocalSession()?.id ?? null : null));

  useEffect(() => {
    if (isLocalMode) {
      setUserId(getLocalSession()?.id ?? null);
      return;
    }

    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return userId;
}
