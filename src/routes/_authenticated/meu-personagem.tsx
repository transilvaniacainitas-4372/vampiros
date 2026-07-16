import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CharacterSheetEditor } from "@/components/CharacterSheetEditor";
import { sheetSchema, emptySheet, type Sheet } from "@/lib/character-schema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveDraft, submitForApproval } from "@/lib/characters.functions";
import { rollDice, useDiceTable } from "@/lib/dice-table";
import { Check, Dice5 } from "lucide-react";

type CharRow = {
  id: string; name: string; clan: string | null; status: string;
  portrait_url: string | null; review_note: string | null;
  sheet_draft: unknown; sheet_approved: unknown;
};

export const Route = createFileRoute("/_authenticated/meu-personagem")({
  head: () => ({ meta: [{ title: "Minha Ficha — Transylvania Chronicles" }] }),
  component: MyCharacter,
});

function MyCharacter() {
  const diceTable = useDiceTable();
  const [chars, setChars] = useState<CharRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playerDiceCount, setPlayerDiceCount] = useState(5);
  const [playerSides, setPlayerSides] = useState(10);
  const navigate = useNavigate();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("characters")
      .select("id, name, clan, status, portrait_url, review_note, sheet_draft, sheet_approved")
      .eq("owner_id", user.id).order("name");
    setChars((data ?? []) as CharRow[]);
    if (data && data.length && !selectedId) setSelectedId(data[0].id);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const c = chars.find((x) => x.id === selectedId);
    if (!c) { setSheet(null); return; }
    const src = c.sheet_draft ?? c.sheet_approved;
    const parsed = sheetSchema.safeParse(src);
    setSheet(parsed.success ? parsed.data : emptySheet({ name: c.name }));
  }, [selectedId, chars]);

  const current = chars.find((c) => c.id === selectedId) ?? null;
  const characterDiceRequests = current
    ? diceTable.requests.filter((request) => request.active && request.targets.some((target) => target.characterId === current.id))
    : [];

  const onSave = async () => {
    if (!current || !sheet) return;
    setSaving(true);
    try {
      await saveDraft({ data: { id: current.id, sheet } });
      toast.success("Rascunho salvo.");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const onSubmit = async () => {
    if (!current) return;
    try {
      await saveDraft({ data: { id: current.id, sheet: sheet! } });
      await submitForApproval({ data: { id: current.id } });
      toast.success("Ficha enviada ao mestre.");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };
  const onUpload = async (file: File) => {
    if (!current) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const path = `${user.id}/${current.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("portraits").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("portraits").getPublicUrl(path);
      const url = publicUrl || null;
      await saveDraft({ data: { id: current.id, sheet: sheet!, portraitUrl: url } });
      toast.success("Retrato enviado.");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };
  const onRollDice = (requestId: string) => {
    if (!current) return;
    try {
      const result = rollDice(requestId, current.id, { diceCount: playerDiceCount, sides: playerSides });
      toast.success(`Dados rolados: total ${result.total}.`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="gothic-vault-bg min-h-screen">
      <header className="gothic-nav border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <Link to="/" className="font-display uppercase tracking-[0.3em] text-blood text-sm">Transylvania Chronicles</Link>
          <nav className="flex flex-wrap items-center gap-3">
            <Link to="/meu-personagem" className="font-display uppercase tracking-widest text-xs text-blood">Minha ficha</Link>
            <Link to="/mesa" className="font-display uppercase tracking-widest text-xs hover:text-blood">Mesa</Link>
            <Button variant="outline" size="sm" onClick={async ()=>{ await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sair</Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="gothic-hero-title font-display uppercase tracking-widest text-2xl text-bone">Minha Ficha</h1>
        <hr className="gothic-divider mb-6 mt-2" />

        {chars.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum personagem foi atribuído a você. Fale com o mestre da crônica.</p>
        ) : (
          <>
            {chars.length > 1 && (
              <div className="mb-6 flex gap-2 flex-wrap">
                {chars.map((c) => (
                  <button key={c.id} onClick={()=>setSelectedId(c.id)}
                    className={`px-3 py-1.5 text-xs font-display uppercase tracking-widest border rounded-sm ${selectedId===c.id ? "border-blood text-blood" : "border-border text-muted-foreground"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {current && sheet && (
              <>
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  <StatusBadge status={current.status} />
                  <div>
                    <label className="text-xs text-muted-foreground cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) onUpload(f);}} />
                      <span className="underline hover:text-blood">{uploading ? "enviando..." : "Trocar retrato"}</span>
                    </label>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" onClick={onSave} disabled={saving}>{saving ? "..." : "Salvar rascunho"}</Button>
                    <Button onClick={onSubmit} disabled={saving} className="font-display uppercase tracking-widest">Enviar ao Mestre</Button>
                  </div>
                </div>
                {current.review_note && current.status === "rejected" && (
                  <div className="gothic-panel mb-6 border border-destructive/60 bg-destructive/10 p-4 rounded-sm">
                    <div className="text-xs uppercase tracking-widest text-destructive mb-1">Rejeitada pelo Mestre</div>
                    <p className="text-sm">{current.review_note}</p>
                  </div>
                )}
                {characterDiceRequests.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {characterDiceRequests.map((request) => {
                      const result = request.results.find((item) => item.targetCharacterId === current.id);
                      return (
                        <div key={request.id} className="dice-callout-effect overflow-hidden border border-blood/45 bg-card/50 rounded-sm">
                          <div className="border-b border-border/60 bg-blood/10 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="dice-glow grid size-16 place-items-center border border-blood/50 bg-background/60 rounded-sm text-center">
                                  <Dice5 className="size-6 text-blood" />
                                  <span className="text-[10px] text-bone leading-none">Manual</span>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-widest text-blood mb-1">O mestre chamou voce para rolar</div>
                                  <h2 className="font-display uppercase tracking-widest text-bone">{request.title}</h2>
                                  {request.note && <p className="text-sm text-muted-foreground mt-2">{request.note}</p>}
                                </div>
                              </div>
                              {!result && (
                                <Button onClick={() => onRollDice(request.id)} className="dice-button-effect font-display uppercase tracking-widest">
                                  <Dice5 className="size-4 mr-2" />
                                  Rolar dados
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            {result ? (
                              <div className="w-full p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-widest">
                                    <Check className="size-4" />
                                    Rolagem registrada
                                  </div>
                                  <div className="font-display uppercase tracking-widest text-blood">
                                    {result.diceCount ?? result.rolls.length}d{result.sides ?? "?"} Total {result.total}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {result.rolls.map((roll, index) => (
                                    <span
                                      key={`${roll}-${index}`}
                                      className="dice-face-effect grid size-10 place-items-center border border-border bg-background rounded-sm text-sm text-bone"
                                      style={{ animationDelay: `${index * 45}ms` }}
                                    >
                                      {roll}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full p-4">
                                <div className="flex flex-wrap items-end gap-3">
                                  <NumberControl label="Dados" value={playerDiceCount} min={1} max={50} onChange={setPlayerDiceCount} />
                                  <NumberControl label="Lados" value={playerSides} min={2} max={100} onChange={setPlayerSides} />
                                  <div className="pb-2 text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="dice-pending-effect grid size-7 place-items-center border border-blood/35 rounded-sm">?</span>
                                    Escolha a formula e role.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <CharacterSheetEditor value={sheet} onChange={setSheet} />
              </>
            )}
          </>
        )}
      </main>
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
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, parseInt(event.target.value || String(min), 10))))}
        className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-center text-foreground outline-none focus:border-blood"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprovada", cls: "border-emerald-500/50 text-emerald-400" },
    pending: { label: "Aguardando mestre", cls: "border-amber-500/50 text-amber-400" },
    draft: { label: "Rascunho", cls: "border-border text-muted-foreground" },
    rejected: { label: "Rejeitada", cls: "border-destructive text-destructive" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`px-2 py-1 text-[10px] uppercase tracking-widest border rounded-sm ${s.cls}`}>{s.label}</span>;
}
