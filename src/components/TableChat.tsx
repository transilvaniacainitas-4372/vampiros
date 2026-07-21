import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OnlineUsers } from "@/components/OnlineUsers";
import { sendChatMessage, useChatMessages } from "@/lib/table-chat";

export function TableChat() {
  const messages = useChatMessages();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendChatMessage(draft);
      setDraft("");
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="gothic-panel flex h-full min-h-[640px] flex-col overflow-hidden rounded-sm border border-bone/15 bg-background/35">
      <div className="shrink-0 border-b border-bone/15 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center border border-blood/45 bg-blood/10 rounded-sm text-blood">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <h2 className="font-display uppercase tracking-widest text-sm text-bone">Chat da mesa</h2>
            <p className="text-xs text-bone/60">Conversas entre jogadores e Mestre.</p>
          </div>
        </div>
      </div>

      <OnlineUsers />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <p className="text-sm text-bone/55">Nenhuma mensagem enviada ainda.</p>
          </div>
        )}
        {messages.map((message) => (
          <article key={message.id} className="border border-bone/10 bg-card/25 p-3 rounded-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-display uppercase tracking-widest text-xs text-blood">{message.sender_name}</span>
              <time className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {formatChatTime(message.created_at)}
              </time>
            </div>
            <p className="text-sm leading-relaxed text-bone/85 whitespace-pre-wrap break-words">{message.body}</p>
          </article>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-bone/15 p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            placeholder="Escreva uma mensagem..."
            className="min-w-0 rounded-sm border border-bone/15 bg-background/55 px-3 py-2 text-sm text-bone outline-none placeholder:text-muted-foreground focus:border-blood"
          />
          <Button type="submit" disabled={sending || !draft.trim()} className="font-display uppercase tracking-widest">
            <Send className="size-4 mr-2" />
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
