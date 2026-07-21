import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnlineUsers } from "@/components/OnlineUsers";
import { totalUnreadCount, useDirectMessages } from "@/lib/direct-messages";
import { useCurrentUserId } from "@/lib/presence";

export function MessagesMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const messages = useDirectMessages();
  const currentUserId = useCurrentUserId();
  const unread = totalUnreadCount(messages, currentUserId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir mensagens"
      >
        <Mail className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-blood px-1 text-[9px] text-bone">
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-sm border border-bone/15 bg-background shadow-2xl shadow-black/50">
          <OnlineUsers />
        </div>
      )}
    </div>
  );
}
