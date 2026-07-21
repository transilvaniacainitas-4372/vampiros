import { Users } from "lucide-react";
import { useOnlineUsers } from "@/lib/presence";

export function OnlineUsers() {
  const users = useOnlineUsers();

  return (
    <section className="border-b border-bone/15 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-blood" />
          <h3 className="font-display uppercase tracking-widest text-xs text-bone">Online</h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {users.length} pessoa{users.length === 1 ? "" : "s"}
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-xs text-bone/55">Ninguém online agora.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex min-w-0 items-center gap-2 rounded-sm border border-bone/10 bg-background/35 px-2 py-1"
              title={`Visto ${formatSeenTime(user.last_seen)}`}
            >
              <span className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
              <span className="max-w-32 truncate text-xs text-bone/85">{user.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatSeenTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
