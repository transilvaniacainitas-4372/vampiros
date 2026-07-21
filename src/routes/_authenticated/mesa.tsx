import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Dice5, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessagesMenu } from "@/components/MessagesMenu";
import { TableChat } from "@/components/TableChat";
import { supabase } from "@/integrations/supabase/client";
import { closeDiceRequest, rollDice, useDiceTable, type DiceResult } from "@/lib/dice-table";
import { getLocalCharacters, getLocalSession } from "@/lib/local-data";
import { isLocalMode } from "@/lib/local-mode";

type CharacterRow = {
  id: string;
  name: string;
};

export const Route = createFileRoute("/_authenticated/mesa")({
  head: () => ({ meta: [{ title: "Mesa de Dados - Transylvania Chronicles" }] }),
  component: DiceTablePage,
});

function DiceTablePage() {
  const diceTable = useDiceTable();
  const [myCharacters, setMyCharacters] = useState<CharacterRow[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [diceCount, setDiceCount] = useState(5);
  const [sides, setSides] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLocalMode) {
      const user = getLocalSession();
      if (!user) return;
      setIsMaster(user.role === "storyteller");
      setMyCharacters(getLocalCharacters().filter((character) => character.owner_id === user.id));
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: storyteller } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "storyteller" });
      setIsMaster(!!storyteller);
      const { data: characters } = await supabase.from("characters").select("id, name").eq("owner_id", data.user.id);
      setMyCharacters((characters ?? []) as CharacterRow[]);
    });
  }, []);

  const myCharacterIds = useMemo(() => new Set(myCharacters.map((character) => character.id)), [myCharacters]);
  const activeRequests = diceTable.requests.filter((request) => request.active);
  const pendingForMe = activeRequests.reduce(
    (total, request) =>
      total +
      request.targets.filter(
        (target) =>
          myCharacterIds.has(target.characterId) &&
          !request.results.some((result) => result.targetCharacterId === target.characterId),
      ).length,
    0,
  );

  const onRoll = (requestId: string, characterId: string) => {
    try {
      const result = rollDice(requestId, characterId, { diceCount, sides });
      toast.success(`Rolagem registrada: total ${result.total}.`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const onCloseTable = (requestId: string) => {
    closeDiceRequest(requestId);
    toast.success("Mesa fechada e enviada ao histórico.");
  };

  return (
    <div className="gothic-vault-bg min-h-screen">
      <header className="gothic-nav border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <Link to="/" className="font-display uppercase tracking-[0.3em] text-blood text-sm">Transylvania Chronicles</Link>
          <nav className="flex flex-wrap items-center gap-3">
            <Link to="/meu-personagem" className="font-display uppercase tracking-widest text-xs hover:text-blood">Minha ficha</Link>
            <Link to="/mesa" className="font-display uppercase tracking-widest text-xs text-blood">Mesa</Link>
            <MessagesMenu />
            <Button variant="outline" size="sm" onClick={async ()=>{ await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sair</Button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-blood">Mesa compartilhada</p>
            <h1 className="gothic-hero-title font-display uppercase tracking-widest text-3xl text-bone">Mesa de Dados</h1>
          </div>
          {pendingForMe > 0 && (
            <div className="dice-callout-effect border border-blood/50 bg-blood/10 px-4 py-3 rounded-sm text-sm text-bone">
              {pendingForMe} rolagem{pendingForMe === 1 ? "" : "s"} aguardando você
            </div>
          )}
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="velvet-table dice-panel-effect rounded-sm border border-blood/45 p-4 md:p-8">
            <div className="velvet-table-inner gothic-panel rounded-sm border border-bone/10 min-h-[520px] p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="dice-glow grid size-14 place-items-center border border-blood/50 bg-background/45 rounded-sm">
                    <Dice5 className="size-7 text-blood" />
                  </div>
                  <div>
                    <h2 className="font-display uppercase tracking-widest text-bone">Centro da mesa</h2>
                    <p className="text-sm text-bone/70">Todos acompanham as chamadas, rolagens e resultados em cima da mesa.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <NumberControl label="Dados" value={diceCount} min={1} max={50} onChange={setDiceCount} />
                  <NumberControl label="Lados" value={sides} min={2} max={100} onChange={setSides} />
                </div>
              </div>

              {activeRequests.length === 0 ? (
                <div className="grid min-h-[340px] place-items-center border border-dashed border-bone/20 bg-background/20 rounded-sm text-center p-8">
                  <div>
                    <Dice5 className="size-12 mx-auto text-bone/45 mb-4" />
                    <p className="font-display uppercase tracking-widest text-bone">Nenhuma mesa habilitada</p>
                    <p className="text-sm text-bone/65 mt-2">Quando o mestre abrir uma chamada, ela aparece aqui para todos.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  {activeRequests.map((request) => {
                    const completed = request.targets.filter((target) =>
                      request.results.some((result) => result.targetCharacterId === target.characterId),
                    ).length;
                    return (
                      <article key={request.id} className="table-call-card gothic-panel rounded-sm border border-bone/15 bg-background/35 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-blood">Chamada ativa</div>
                            <h3 className="font-display uppercase tracking-widest text-xl text-bone mt-1">{request.title}</h3>
                            {request.note && <p className="text-sm text-bone/70 mt-2">{request.note}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="border border-bone/15 bg-background/35 px-3 py-2 rounded-sm text-sm text-bone">
                              {completed}/{request.targets.length} rolaram
                            </div>
                            {isMaster && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="dice-button-effect font-display uppercase tracking-widest"
                                onClick={() => onCloseTable(request.id)}
                              >
                                <X className="size-4 mr-2" />
                                Fechar mesa
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {request.targets.map((target) => {
                            const result = request.results.find((item) => item.targetCharacterId === target.characterId);
                            const canRoll = myCharacterIds.has(target.characterId) && !result;
                            return (
                              <div key={target.characterId} className={`rounded-sm border p-3 ${result ? "border-emerald-400/35 bg-emerald-500/10" : "border-bone/15 bg-background/30"}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                  <div className="font-display uppercase tracking-widest text-sm text-bone">{target.characterName}</div>
                                  {result ? (
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-300">
                                      <Check className="size-4" />
                                      Rolado
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-200">
                                      <Clock className="dice-pending-effect size-4" />
                                      Aguardando
                                    </span>
                                  )}
                                </div>

                                {result ? (
                                  <ResultView result={result} />
                                ) : canRoll ? (
                                  <Button className="dice-button-effect font-display uppercase tracking-widest w-full" onClick={() => onRoll(request.id, target.characterId)}>
                                    <Dice5 className="size-4 mr-2" />
                                    Rolar {diceCount}d{sides}
                                  </Button>
                                ) : (
                                  <p className="text-sm text-bone/55">Aguardando este jogador rolar.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {request.results.filter((result) => !result.targetCharacterId).length > 0 && (
                          <div className="mt-4 border-t border-bone/15 pt-4 space-y-2">
                            {request.results.filter((result) => !result.targetCharacterId).map((result) => (
                              <div key={result.id} className="rounded-sm border border-blood/35 bg-blood/10 p-3">
                                <div className="font-display uppercase tracking-widest text-sm text-bone mb-2">Mestre</div>
                                <ResultView result={result} />
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <TableChat />
        </div>
      </main>
    </div>
  );
}

function ResultView({ result }: { result: DiceResult }) {
  const formula = result.diceCount && result.sides ? `${result.diceCount}d${result.sides}` : `${result.rolls.length}d?`;
  return (
    <div>
      <div className="font-display uppercase tracking-widest text-blood mb-2">{formula} Total {result.total}</div>
      <div className="flex flex-wrap gap-2">
        {result.rolls.map((roll, index) => (
          <span
            key={`${roll}-${index}`}
            className="dice-face-effect grid size-9 place-items-center border border-bone/20 bg-background/55 rounded-sm text-sm text-bone"
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {roll}
          </span>
        ))}
      </div>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block w-24">
      <span className="block text-[10px] uppercase tracking-widest text-bone/65 mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, parseInt(event.target.value || String(min), 10))))}
        className="w-full bg-background/55 border border-bone/20 rounded-sm px-3 py-2 text-sm text-center text-bone outline-none focus:border-blood"
      />
    </label>
  );
}
