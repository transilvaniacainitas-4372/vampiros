import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isLocalMode } from "./local-mode";
import { getLocalSession } from "./local-data";

const CHAT_KEY = "vampiros.local.table-chat";
const CHAT_EVENT = "vampiros:table-chat";

export type ChatMessage = {
  id: string;
  user_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

const fallbackMessages: ChatMessage[] = [];
let cachedRaw = "";
let cachedMessages = fallbackMessages;

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocalMessages() {
  if (typeof window === "undefined") return fallbackMessages;
  const raw = window.localStorage.getItem(CHAT_KEY) ?? "";
  if (raw === cachedRaw) return cachedMessages;

  cachedRaw = raw;
  if (!raw) {
    cachedMessages = fallbackMessages;
    return cachedMessages;
  }

  try {
    cachedMessages = JSON.parse(raw) as ChatMessage[];
  } catch {
    cachedMessages = fallbackMessages;
  }

  return cachedMessages;
}

function writeLocalMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(-200);
  const raw = JSON.stringify(trimmed);
  cachedRaw = raw;
  cachedMessages = trimmed;
  window.localStorage.setItem(CHAT_KEY, raw);
  window.dispatchEvent(new Event(CHAT_EVENT));
}

function subscribeLocal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHAT_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHAT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHAT_EVENT, callback);
  };
}

function useLocalChatMessages() {
  return useSyncExternalStore(subscribeLocal, readLocalMessages, () => fallbackMessages);
}

function useRemoteChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, user_id, sender_name, body, created_at")
        .order("created_at", { ascending: true })
        .limit(200);

      if (!cancelled && !error) setMessages((data ?? []) as ChatMessage[]);
    };

    void load();
    const interval = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return messages;
}

export function useChatMessages() {
  return isLocalMode ? useLocalChatMessages() : useRemoteChatMessages();
}

export async function sendChatMessage(body: string) {
  const cleanBody = body.trim();
  if (!cleanBody) return;
  if (cleanBody.length > 1000) throw new Error("Mensagem muito longa.");

  if (isLocalMode) {
    const user = getLocalSession();
    if (!user) throw new Error("Entre para enviar mensagens.");
    const message: ChatMessage = {
      id: id("chat"),
      user_id: user.id,
      sender_name: user.display_name || user.email,
      body: cleanBody,
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

  const { error } = await supabase.from("chat_messages").insert({
    user_id: userData.user.id,
    sender_name: senderName,
    body: cleanBody,
  });

  if (error) throw new Error(error.message);
}
