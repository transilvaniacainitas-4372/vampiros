import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, Minus, Send, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  conversationWith,
  markConversationRead,
  sendDirectMessage,
  unreadCountFor,
  useDirectMessages,
} from "@/lib/direct-messages";
import { useCurrentUserId, useKnownUsers, type KnownUser } from "@/lib/presence";

export function OnlineUsers() {
  const users = useKnownUsers();
  const currentUserId = useCurrentUserId();
  const messages = useDirectMessages();
  const [selectedUser, setSelectedUser] = useState<KnownUser | null>(null);
  const [minimized, setMinimized] = useState(false);

  const contacts = users.filter((user) => user.user_id !== currentUserId);
  const onlineCount = users.filter((user) => user.online).length;

  const openConversation = (user: KnownUser) => {
    setSelectedUser(user);
    setMinimized(false);
    void markConversationRead(user.user_id);
  };

  const chatWindow =
    selectedUser && typeof document !== "undefined"
      ? createPortal(
          <div className="private-chat-dock overflow-hidden rounded-t-sm border border-bone/20 bg-background shadow-2xl shadow-black/60">
            <DirectMessageThread
              user={selectedUser}
              currentUserId={currentUserId}
              minimized={minimized}
              onMinimize={() => setMinimized((value) => !value)}
              onClose={() => setSelectedUser(null)}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <section className="shrink-0 border-b border-bone/15">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-blood" />
            <h3 className="font-display uppercase tracking-widest text-xs text-bone">Mensagens</h3>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {onlineCount} online
          </span>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-bone/55">Nenhum usuário encontrado ainda.</p>
        ) : (
          <div className="grid max-h-[6.5rem] gap-2 overflow-y-auto pr-1">
            {contacts.map((user) => {
              const unread = unreadCountFor(messages, currentUserId, user.user_id);
              return (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => openConversation(user)}
                  className="flex min-w-0 items-center gap-2 rounded-sm border border-bone/10 bg-background/35 px-2 py-2 text-left hover:border-blood/45"
                  title={`${user.online ? "Online" : "Offline"} - visto ${formatSeenTime(user.last_seen)}`}
                >
                  <UserAvatar user={user} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-bone/90">{user.display_name}</span>
                    {user.character_name && user.player_name && user.player_name !== user.character_name && (
                      <span className="block truncate text-[10px] text-muted-foreground">{user.player_name}</span>
                    )}
                  </span>
                  <span className="relative grid size-7 shrink-0 place-items-center rounded-sm border border-bone/10 bg-background/45 text-blood">
                    <Mail className="size-4" />
                    {unread > 0 && (
                      <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-blood px-1 text-[9px] text-bone">
                        {unread}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {chatWindow}
    </section>
  );
}

function DirectMessageThread({
  user,
  currentUserId,
  minimized,
  onMinimize,
  onClose,
}: {
  user: KnownUser;
  currentUserId: string | null;
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const messages = useDirectMessages();
  const thread = conversationWith(messages, currentUserId, user.user_id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void markConversationRead(user.user_id);
  }, [messages.length, user.user_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendDirectMessage(user.user_id, draft);
      setDraft("");
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-background/95">
      <div
        role="button"
        tabIndex={0}
        onClick={() => minimized && onMinimize()}
        onKeyDown={(event) => {
          if (minimized && (event.key === "Enter" || event.key === " ")) onMinimize();
        }}
        className="flex w-full items-center justify-between gap-3 border-b border-bone/10 bg-card/70 p-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <div className="font-display uppercase tracking-widest text-xs text-blood">Particular</div>
            <div className="truncate text-sm text-bone">{user.display_name}</div>
            {user.character_name && user.player_name && user.player_name !== user.character_name && (
              <div className="truncate text-[10px] text-muted-foreground">{user.player_name}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <Button type="button" variant="ghost" size="icon" onClick={onMinimize} aria-label={minimized ? "Restaurar conversa" : "Minimizar conversa"}>
            <Minus className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar conversa">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="max-h-72 overflow-y-auto p-3 space-y-2">
            {thread.length === 0 && <p className="text-xs text-bone/55">Nenhuma mensagem nessa conversa.</p>}
            {thread.map((message) => {
              const mine = message.sender_id === currentUserId;
              return (
                <article
                  key={message.id}
                  className={`rounded-sm border p-2 text-sm ${
                    mine ? "ml-8 border-blood/30 bg-blood/10 text-bone" : "mr-8 border-bone/10 bg-card/25 text-bone/85"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <time className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatMessageTime(message.created_at)}
                  </time>
                </article>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-bone/10 p-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1000}
                placeholder="Mensagem particular..."
                className="min-w-0 rounded-sm border border-bone/15 bg-background/55 px-3 py-2 text-sm text-bone outline-none placeholder:text-muted-foreground focus:border-blood"
              />
              <Button type="submit" disabled={sending || !draft.trim()} size="icon" aria-label="Enviar mensagem particular">
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function UserAvatar({ user }: { user: KnownUser }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-bone/15 bg-card/60">
      {user.portrait_url ? (
        <img src={user.portrait_url} alt="" className="h-full w-full object-cover grayscale" />
      ) : (
        <span className="font-display text-xs uppercase text-bone/70">{initials(user.display_name)}</span>
      )}
      <span
        className={`absolute bottom-0 right-0 size-2.5 rounded-full border border-background ${
          user.online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" : "bg-muted-foreground"
        }`}
      />
    </span>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function formatSeenTime(value: string) {
  if (value.startsWith("1970")) return "offline";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
