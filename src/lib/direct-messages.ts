import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSession } from "./local-data";
import { isLocalMode } from "./local-mode";

const DM_KEY = "vampiros.local.direct-messages";
const DM_EVENT = "vampiros:direct-messages";

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const fallbackMessages: DirectMessage[] = [];
let cachedRaw = "";
let cachedMessages = fallbackMessages;

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocalMessages() {
  if (typeof window === "undefined") return fallbackMessages;
  const raw = window.localStorage.getItem(DM_KEY) ?? "";
  if (raw === cachedRaw) return cachedMessages;

  cachedRaw = raw;
  if (!raw) {
    cachedMessages = fallbackMessages;
    return cachedMessages;
  }

  try {
    cachedMessages = JSON.parse(raw) as DirectMessage[];
  } catch {
    cachedMessages = fallbackMessages;
  }

  return cachedMessages;
}

function writeLocalMessages(messages: DirectMessage[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(messages.slice(-500));
  cachedRaw = raw;
  cachedMessages = JSON.parse(raw) as DirectMessage[];
  window.localStorage.setItem(DM_KEY, raw);
  window.dispatchEvent(new Event(DM_EVENT));
}

function subscribeLocal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === DM_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DM_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DM_EVENT, callback);
  };
}

function useLocalDirectMessages() {
  const session = getLocalSession();
  const messages = useSyncExternalStore(subscribeLocal, readLocalMessages, () => fallbackMessages);
  return useMemo(() => {
    if (!session) return fallbackMessages;
    return messages
      .filter((message) => message.sender_id === session.id || message.recipient_id === session.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, session]);
}

function useRemoteDirectMessages() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("private_messages")
        .select("id, sender_id, recipient_id, sender_name, body, read_at, created_at")
        .order("created_at", { ascending: true })
        .limit(500);

      if (!cancelled && !error) setMessages((data ?? []) as DirectMessage[]);
    };

    void load();
    const interval = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return messages;
}

export function useDirectMessages() {
  return isLocalMode ? useLocalDirectMessages() : useRemoteDirectMessages();
}

export function unreadCountFor(messages: DirectMessage[], myUserId: string | null, otherUserId: string) {
  if (!myUserId) return 0;
  return messages.filter(
    (message) =>
      message.sender_id === otherUserId &&
      message.recipient_id === myUserId &&
      !message.read_at,
  ).length;
}

export function conversationWith(messages: DirectMessage[], myUserId: string | null, otherUserId: string) {
  if (!myUserId) return fallbackMessages;
  return messages.filter(
    (message) =>
      (message.sender_id === myUserId && message.recipient_id === otherUserId) ||
      (message.sender_id === otherUserId && message.recipient_id === myUserId),
  );
}

export async function sendDirectMessage(recipientId: string, body: string) {
  const cleanBody = body.trim();
  if (!cleanBody) return;
  if (cleanBody.length > 1000) throw new Error("Mensagem muito longa.");

  if (isLocalMode) {
    const user = getLocalSession();
    if (!user) throw new Error("Entre para enviar mensagens.");
    const message: DirectMessage = {
      id: id("dm"),
      sender_id: user.id,
      recipient_id: recipientId,
      sender_name: user.display_name || user.email,
      body: cleanBody,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    writeLocalMessages([...readLocalMessages(), message]);
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Entre para enviar mensagens.");

  const senderName =
    (userData.user.user_metadata?.display_name as string | undefined) ||
    userData.user.email ||
    "Jogador";

  const { error } = await supabase.from("private_messages").insert({
    sender_id: userData.user.id,
    recipient_id: recipientId,
    sender_name: senderName,
    body: cleanBody,
  });

  if (error) throw new Error(error.message);
}

export async function markConversationRead(otherUserId: string) {
  if (isLocalMode) {
    const user = getLocalSession();
    if (!user) return;
    const now = new Date().toISOString();
    writeLocalMessages(
      readLocalMessages().map((message) =>
        message.sender_id === otherUserId && message.recipient_id === user.id && !message.read_at
          ? { ...message, read_at: now }
          : message,
      ),
    );
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await supabase
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("recipient_id", userData.user.id)
    .is("read_at", null);
}
