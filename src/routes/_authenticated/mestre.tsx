import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessagesMenu } from "@/components/MessagesMenu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, Dice5, Minus, Play, Plus, ScrollText, UserRound, X } from "lucide-react";
import {
  createCharacter, approveDraft, rejectDraft, assignPlayer, deleteCharacter, listPlayers, updatePlayer, deletePlayer,
} from "@/lib/characters.functions";
import { CharacterSheetView } from "@/components/CharacterSheetView";
import { sheetSchema } from "@/lib/character-schema";
import { DEFAULT_GAME_SETTINGS, saveGameSettings, useGameSettings, type GameSettings } from "@/lib/game-settings";
import { clearOldDiceRequests, closeDiceRequest, createDiceRequest, rollDice, useDiceTable } from "@/lib/dice-table";

type Row = {
  id: string; name: string; clan: string | null; concept: string | null; status: string;
  owner_id: string | null; review_note: string | null;
  sheet_draft: unknown; sheet_approved: unknown; portrait_url: string | null;
};
type Player = { id: string; email?: string | null; display_name: string | null; role?: "player" | "storyteller"; status?: string };

export const Route = createFileRoute("/_authenticated/mestre")({
  head: () => ({ meta: [{ title: "Painel do Mestre — Transylvania Chronicles" }] }),
  component: MasterPanel,
});

function MasterPanel() {
  const settings = useGameSettings();
  const diceTable = useDiceTable();
  const [isMaster, setIsMaster] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [chars, setChars] = useState<Row[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [editingPlayerEmail, setEditingPlayerEmail] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [section, setSection] = useState<"characters" | "players" | "settings" | "dice">("characters");
  const [preview, setPreview] = useState<Row | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newClan, setNewClan] = useState("");
  const [newConcept, setNewConcept] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data: st } = await supabase.rpc("has_role", { _user_id: user.id, _role: "storyteller" });
    setIsMaster(!!st);
    if (!st) return;
    const { data: cs } = await supabase.from("characters")
      .select("id, name, clan, concept, status, owner_id, review_note, sheet_draft, sheet_approved, portrait_url")
      .order("updated_at", { ascending: false });
    setChars((cs ?? []) as Row[]);
    try { setPlayers(await listPlayers()); } catch {}
  };
  useEffect(() => { load(); }, []);

  if (isMaster === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Verificando...</div>;
  if (!isMaster) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-blood text-2xl uppercase tracking-widest">Acesso negado</h1>
        <p className="text-muted-foreground text-sm mt-2">Apenas o mestre da crônica pode acessar este salão.</p>
        <Link to="/" className="text-sm text-muted-foreground hover:text-blood mt-4 inline-block">← Voltar</Link>
      </div>
    </div>
  );

  const filtered = tab === "pending" ? chars.filter((c) => c.status === "pending") : chars;

  const onCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCharacter({ data: { name: newName, clan: newClan, concept: newConcept } });
      toast.success("Personagem criado.");
      setNewName(""); setNewClan(""); setNewConcept("");
      await load();
    } catch (e: any) { toast.error(e.message); }
  };
  const onApprove = async (id: string) => {
    try { await approveDraft({ data: { id } }); toast.success("Aprovado."); setPreview(null); await load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onReject = async (id: string) => {
    try { await rejectDraft({ data: { id, note: reviewNote } }); toast.success("Rejeitado."); setReviewNote(""); setPreview(null); await load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onAssign = async (id: string, ownerId: string | null) => {
    try { await assignPlayer({ data: { id, ownerId } }); toast.success("Jogador atribuído."); await load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Deletar este personagem?")) return;
    try { await deleteCharacter({ data: { id } }); toast.success("Deletado."); await load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const startEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.display_name ?? "");
    setEditingPlayerEmail(player.email ?? "");
  };
  const cancelEditPlayer = () => {
    setEditingPlayerId(null);
    setEditingPlayerName("");
    setEditingPlayerEmail("");
  };
  const onSavePlayer = async () => {
    if (!editingPlayerId) return;
    try {
      await updatePlayer({ data: { id: editingPlayerId, displayName: editingPlayerName, email: editingPlayerEmail } });
      toast.success("Jogador atualizado.");
      cancelEditPlayer();
      await load();
    } catch (e: any) { toast.error(e.message); }
  };
  const onDeletePlayer = async (player: Player) => {
    if (player.id === currentUserId) {
      toast.error("O mestre nao pode apagar a propria conta em uso.");
      return;
    }
    if (!confirm(`Excluir o jogador ${player.display_name ?? player.email ?? player.id.slice(0, 8)}? Os personagens ficarao sem jogador associado.`)) return;
    try {
      await deletePlayer({ data: { id: player.id } });
      toast.success("Jogador excluido.");
      if (editingPlayerId === player.id) cancelEditPlayer();
      await load();
    } catch (e: any) { toast.error(e.message); }
  };

  const previewSheet = preview ? sheetSchema.safeParse(preview.sheet_draft) : null;

  return (
    <div className="gothic-vault-bg min-h-screen">
      <header className="gothic-nav border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-4 justify-between items-center">
          <Link to="/" className="gothic-brand font-display uppercase tracking-[0.3em] text-blood text-sm">Transylvania Chronicles</Link>
          <nav className="flex flex-wrap items-center gap-3">
            <Link to="/mesa" className="gothic-menu-link font-display uppercase tracking-widest text-xs">Mesa</Link>
            <Link to="/mestre" className="gothic-menu-link gothic-menu-link-active font-display uppercase tracking-widest text-xs">Mestre</Link>
            <MessagesMenu />
            <Button variant="outline" size="sm" className="gothic-menu-button" onClick={async ()=>{ await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sair</Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-blood">Administração</p>
            <h1 className="gothic-hero-title font-display uppercase tracking-widest text-2xl text-bone">Painel do Mestre</h1>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <AdminTab active={section === "characters"} onClick={() => setSection("characters")}>Personagens</AdminTab>
            <AdminTab active={section === "players"} onClick={() => setSection("players")}>Jogadores</AdminTab>
            <AdminTab active={section === "settings"} onClick={() => setSection("settings")}>Cadastros</AdminTab>
            <AdminTab active={section === "dice"} onClick={() => setSection("dice")}>
              Mesa {diceTable.requests.filter((request) => request.active).length > 0 ? `(${diceTable.requests.filter((request) => request.active).length})` : ""}
            </AdminTab>
          </div>
        </div>
        <hr className="gothic-divider mb-8 mt-2" />

        {section === "characters" && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6">
            <section className="gothic-panel border border-border/60 bg-card/40 p-6 rounded-sm h-fit">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cadastro</p>
              <h2 className="font-display uppercase tracking-widest text-sm text-blood mb-5">Novo personagem</h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nome</span>
                  <Input value={newName} onChange={(e)=>setNewName(e.target.value)} maxLength={80} />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Clã</span>
                  <select
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground"
                    value={newClan}
                    onChange={(e)=>setNewClan(e.target.value)}
                  >
                    <option value="">Selecione o clã</option>
                    {settings.clans.map((clan) => (
                      <option key={clan} value={clan}>{clan}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Conceito</span>
                  <Input value={newConcept} onChange={(e)=>setNewConcept(e.target.value)} maxLength={120} />
                </label>
                <Button onClick={onCreate} className="w-full font-display uppercase tracking-widest">Cadastrar</Button>
              </div>
            </section>

            <section className="gothic-panel border border-border/60 bg-card/40 rounded-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Personagens</p>
                  <h2 className="font-display uppercase tracking-widest text-sm text-bone">Ficha cadastral</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setTab("pending")}
                    className={`px-3 py-1.5 text-xs font-display uppercase tracking-widest border rounded-sm ${tab==="pending" ? "border-blood text-blood" : "border-border text-muted-foreground"}`}>
                    Pendentes ({chars.filter(c=>c.status==="pending").length})
                  </button>
                  <button onClick={()=>setTab("all")}
                    className={`px-3 py-1.5 text-xs font-display uppercase tracking-widest border rounded-sm ${tab==="all" ? "border-blood text-blood" : "border-border text-muted-foreground"}`}>
                    Todos ({chars.length})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-background/35 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="px-4 py-3 text-left font-normal">Nome</th>
                      <th className="px-4 py-3 text-left font-normal">Clã</th>
                      <th className="px-4 py-3 text-left font-normal">Status</th>
                      <th className="px-4 py-3 text-left font-normal">Jogador</th>
                      <th className="px-4 py-3 text-right font-normal">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum registro encontrado.</td>
                      </tr>
                    )}
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-display uppercase tracking-widest text-bone">{c.name}</div>
                          {c.concept && <div className="text-xs text-muted-foreground italic mt-1">{c.concept}</div>}
                        </td>
                        <td className="px-4 py-3 text-blood">{c.clan || "Indefinido"}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3">
                          <select className="w-full bg-input border border-border rounded-sm px-2 py-1 text-xs"
                            value={c.owner_id ?? ""}
                            onChange={(e)=>onAssign(c.id, e.target.value || null)}>
                            <option value="">Sem jogador</option>
                            {players.map((p)=><option key={p.id} value={p.id}>{playerLabel(p)}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={()=>{ setPreview(c); setReviewNote(c.review_note ?? ""); }}>Revisar</Button>
                            <Button variant="outline" size="sm" onClick={()=>onDelete(c.id)}>Excluir</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {section === "players" && (
          <section className="gothic-panel border border-border/60 bg-card/40 rounded-sm overflow-hidden">
            <div className="border-b border-border/60 p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Jogadores</p>
              <h2 className="font-display uppercase tracking-widest text-sm text-bone">Associação de contas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-background/35 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="px-4 py-3 text-left font-normal">Jogador</th>
                    <th className="px-4 py-3 text-left font-normal">Status</th>
                    <th className="px-4 py-3 text-left font-normal">Personagem associado</th>
                    <th className="px-4 py-3 text-left font-normal">Atribuir personagem</th>
                    <th className="px-4 py-3 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum jogador cadastrado.</td>
                    </tr>
                  )}
                  {players.map((player) => {
                    const assigned = chars.find((character) => character.owner_id === player.id);
                    const isEditing = editingPlayerId === player.id;
                    return (
                      <tr key={player.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editingPlayerName}
                                onChange={(event) => setEditingPlayerName(event.target.value)}
                                maxLength={80}
                                placeholder="Nome do jogador"
                              />
                              <Input
                                type="email"
                                value={editingPlayerEmail}
                                onChange={(event) => setEditingPlayerEmail(event.target.value)}
                                maxLength={254}
                                placeholder="email@dominio.com"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="font-display uppercase tracking-widest text-bone">{player.display_name ?? "Sem nome"}</div>
                              <div className="text-xs text-muted-foreground mt-1">{player.email || player.id.slice(0, 8)}</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-[10px] uppercase tracking-widest border rounded-sm ${
                            player.role === "storyteller"
                              ? "border-blood/50 text-blood"
                              : "border-border text-muted-foreground"
                          }`}>
                            {player.role === "storyteller" ? "Mestre" : player.status === "pending" ? "Aguardando" : "Jogador"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-blood">{assigned?.name ?? "Sem personagem"}</td>
                        <td className="px-4 py-3">
                          <select className="w-full bg-input border border-border rounded-sm px-2 py-1 text-xs"
                            value={assigned?.id ?? ""}
                            onChange={(event) => {
                              const nextCharacterId = event.target.value;
                              if (assigned) void onAssign(assigned.id, null);
                              if (nextCharacterId) void onAssign(nextCharacterId, player.id);
                            }}>
                            <option value="">Sem personagem</option>
                            {chars.map((character)=><option key={character.id} value={character.id}>{character.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button variant="outline" size="sm" onClick={cancelEditPlayer}>Cancelar</Button>
                                <Button size="sm" onClick={onSavePlayer}>Salvar</Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => startEditPlayer(player)}>Editar</Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={player.id === currentUserId}
                                  onClick={() => onDeletePlayer(player)}
                                >
                                  Excluir
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "settings" && <SettingsPanel settings={settings} />}

        {section === "dice" && <DiceTablePanel chars={chars} diceTable={diceTable} onClose={() => setSection("characters")} />}
      </main>

      {preview && (
        <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto" onClick={()=>setPreview(null)}>
          <div className="max-w-5xl mx-auto my-10 p-6 border border-border bg-card rounded-sm" onClick={(e)=>e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-display uppercase tracking-widest text-xl text-bone">Revisar rascunho: {preview.name}</h2>
              <button onClick={()=>setPreview(null)} className="text-muted-foreground hover:text-blood">×</button>
            </div>
            <hr className="blood-rule mb-6" />
            {previewSheet?.success ? <CharacterSheetView sheet={previewSheet.data} /> : <p className="text-muted-foreground text-sm">Sem rascunho válido.</p>}
            <div className="sticky bottom-0 bg-card border-t border-border pt-4 mt-6">
              <Textarea placeholder="Nota (obrigatória para rejeitar)" value={reviewNote} onChange={(e)=>setReviewNote(e.target.value)} maxLength={1000} className="mb-3" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={()=>onReject(preview.id)} disabled={!reviewNote.trim()}>Rejeitar</Button>
                <Button onClick={()=>onApprove(preview.id)} className="font-display uppercase tracking-widest">Aprovar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-2 text-xs font-display uppercase tracking-widest rounded-sm transition-colors ${
        active
          ? "border-blood bg-blood/10 text-blood"
          : "border-border/70 bg-card/30 text-muted-foreground hover:border-blood/50 hover:text-bone"
      }`}
    >
      {children}
    </button>
  );
}

function playerLabel(player: Player) {
  const name = player.display_name ?? player.id.slice(0, 8);
  const role = player.role === "storyteller" ? "Mestre" : "Jogador";
  const status = player.status === "pending" ? " pendente" : "";
  return `${name} (${role}${status})`;
}

function DiceTablePanel({
  chars,
  diceTable,
  onClose,
}: {
  chars: Row[];
  diceTable: ReturnType<typeof useDiceTable>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("Teste de dados");
  const [note, setNote] = useState("");
  const [masterDiceCount, setMasterDiceCount] = useState(5);
  const [masterSides, setMasterSides] = useState(10);
  const [targetIds, setTargetIds] = useState<string[]>([]);

  const playerChars = chars.filter((character) => character.owner_id);
  const activeRequests = diceTable.requests.filter((request) => request.active);
  const historyRequests = diceTable.requests.filter((request) => !request.active);
  const calledCount = targetIds.length;

  const toggleTarget = (id: string) => {
    setTargetIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const selectAll = () => setTargetIds(playerChars.map((character) => character.id));

  const onCreate = () => {
    if (targetIds.length === 0) {
      toast.error("Escolha pelo menos um personagem para chamar.");
      return;
    }
    const hadActiveTable = activeRequests.length > 0;
    createDiceRequest({ title, note, targetCharacterIds: targetIds });
    toast.success(hadActiveTable ? "Mesa anterior fechada e nova mesa habilitada." : "Mesa de dados habilitada.");
    setTargetIds([]);
  };

  const onMasterRoll = (requestId: string) => {
    try {
      rollDice(requestId, null, { diceCount: masterDiceCount, sides: masterSides });
      toast.success("Rolagem do mestre registrada.");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <section className="gothic-panel dice-panel-effect mb-10 overflow-hidden border border-blood/35 bg-card/50 rounded-sm">
      <div className="border-b border-border/60 bg-background/35 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid size-11 place-items-center border border-blood/50 bg-blood/10 text-blood rounded-sm">
              <Dice5 className="size-5" />
            </div>
            <div>
              <h2 className="font-display uppercase tracking-widest text-sm text-blood">Mesa de dados</h2>
              <p className="text-xs text-muted-foreground mt-1">Chame os personagens e acompanhe as rolagens manuais de cada jogador.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearOldDiceRequests}>
              <ScrollText className="size-4 mr-2" />
              Limpar fechadas
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="size-4 mr-2" />
              Fechar menu
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[330px_1fr] gap-0">
        <div className="border-b lg:border-b-0 lg:border-r border-border/60 p-6 bg-background/20">
          <div className="mb-5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Chamada</span>
            <div className="dice-glow mt-2 border border-blood/40 bg-background/50 p-4 rounded-sm">
              <div className="font-display text-2xl text-bone uppercase tracking-widest">Rolagem manual</div>
              <p className="text-xs text-muted-foreground mt-2">O mestre chama a mesa. Cada jogador escolhe a quantidade de dados e lados quando for rolar.</p>
            </div>
          </div>

          <label className="block mt-5">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cena ou teste</span>
            <Input placeholder="Nome da rolagem" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="block mt-3">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Recado</span>
            <Textarea
              placeholder="Mensagem para os jogadores"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>

          <Button onClick={onCreate} className="dice-button-effect font-display uppercase tracking-widest w-full mt-4">
            <Play className="size-4 mr-2" />
            {activeRequests.length > 0 ? "Fechar atual e abrir nova" : "Habilitar mesa"}
          </Button>
          {activeRequests.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Ao abrir outra mesa, a mesa ativa será fechada e enviada ao histórico.</p>
          )}

          <div className="mt-6 border border-border/60 bg-background/25 p-4 rounded-sm">
            <div className="font-display uppercase tracking-widest text-sm text-bone mb-3">Rolagem do mestre</div>
            <DiceStepper label="Dados" value={masterDiceCount} min={1} max={50} onChange={setMasterDiceCount} />
            <DiceStepper label="Lados" value={masterSides} min={2} max={100} onChange={setMasterSides} />
            <p className="text-xs text-muted-foreground">Essa fórmula será usada quando clicar em Mestre em uma mesa ativa.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Convocados</span>
              <div className="text-sm text-bone">{calledCount} selecionado{calledCount === 1 ? "" : "s"}</div>
            </div>
            <button type="button" className="text-xs text-blood hover:underline" onClick={selectAll}>Selecionar todos</button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
            {playerChars.length === 0 && <p className="text-sm text-muted-foreground">Associe jogadores aos personagens para chama-los na mesa.</p>}
            {playerChars.map((character) => {
              const selected = targetIds.includes(character.id);
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => toggleTarget(character.id)}
                  className={`dice-button-effect text-left min-h-20 border p-3 rounded-sm transition ${selected ? "dice-selected-effect border-blood bg-blood/10" : "border-border/60 bg-background/25 hover:border-blood/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-bone">
                        <UserRound className="size-4 text-blood" />
                        <span className="truncate text-sm">{character.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">{character.clan || "Cla indefinido"}</div>
                    </div>
                    <span className={`grid size-6 place-items-center border rounded-sm ${selected ? "border-blood text-blood" : "border-border text-muted-foreground"}`}>
                      {selected && <Check className="size-4" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {activeRequests.length === 0 && (
              <div className="border border-dashed border-border/70 p-6 rounded-sm text-center">
                <Dice5 className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma mesa ativa agora.</p>
              </div>
            )}
            {activeRequests.map((request) => {
              const completed = request.targets.filter((target) =>
                request.results.some((result) => result.targetCharacterId === target.characterId),
              ).length;
              return (
                <div key={request.id} className="dice-panel-effect border border-border/70 bg-background/30 rounded-sm overflow-hidden">
                  <div className="p-4 border-b border-border/60 bg-card/40">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <DiceBadge diceCount={request.diceCount} sides={request.sides} />
                          <div>
                            <div className="font-display uppercase tracking-widest text-bone">{request.title}</div>
                            <div className="text-xs text-muted-foreground">{completed}/{request.targets.length} jogadores rolaram</div>
                          </div>
                        </div>
                        {request.note && <p className="text-sm text-muted-foreground mt-3">{request.note}</p>}
                      </div>
                      <div className="flex gap-2 h-fit">
                        <Button className="dice-button-effect" variant="outline" size="sm" onClick={() => onMasterRoll(request.id)}>
                          <Dice5 className="size-4 mr-2" />
                          Mestre
                        </Button>
                        <Button className="dice-button-effect" variant="outline" size="sm" onClick={() => closeDiceRequest(request.id)}>
                          <X className="size-4 mr-2" />
                          Fechar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 p-4">
                    {request.targets.map((target) => {
                      const result = request.results.find((item) => item.targetCharacterId === target.characterId);
                      return <RollStatusCard key={target.characterId} name={target.characterName} result={result} />;
                    })}
                  </div>

                  {request.results.filter((result) => !result.targetCharacterId).length > 0 && (
                    <div className="border-t border-border/60 p-4 space-y-2">
                      {request.results.filter((result) => !result.targetCharacterId).map((result) => (
                        <div key={result.id} className="border border-blood/40 bg-blood/5 p-3 rounded-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-display uppercase tracking-widest text-sm text-bone">Rolagem do mestre</span>
                            <ResultDiceStrip rolls={result.rolls} total={result.total} diceCount={result.diceCount} sides={result.sides} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Histórico</span>
                <div className="text-sm text-bone">{historyRequests.length} mesa{historyRequests.length === 1 ? "" : "s"} encerrada{historyRequests.length === 1 ? "" : "s"}</div>
              </div>
            </div>
            {historyRequests.length === 0 ? (
              <div className="border border-dashed border-border/70 p-5 rounded-sm text-center">
                <p className="text-sm text-muted-foreground">Nenhuma mesa encerrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((request) => (
                  <DiceHistoryCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiceStepper({
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
    <div className="mb-3">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <div className="grid grid-cols-[40px_1fr_40px] border border-border rounded-sm overflow-hidden bg-input">
        <button type="button" className="grid place-items-center hover:bg-blood/10" onClick={() => onChange(Math.max(min, value - 1))}>
          <Minus className="size-4" />
        </button>
        <input
          className="bg-transparent text-center py-2 text-sm border-x border-border outline-none"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Math.min(max, Math.max(min, parseInt(event.target.value || String(min), 10))))}
        />
        <button type="button" className="grid place-items-center hover:bg-blood/10" onClick={() => onChange(Math.min(max, value + 1))}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function DiceBadge({ diceCount, sides }: { diceCount: number; sides: number }) {
  const label = diceCount > 0 && sides > 0 ? `${diceCount}d${sides}` : "Manual";
  return (
    <div className="grid size-14 place-items-center border border-blood/50 bg-blood/10 rounded-sm text-center shrink-0">
      <Dice5 className="size-5 text-blood" />
      <span className="text-[10px] text-bone leading-none">{label}</span>
    </div>
  );
}

function RollStatusCard({
  name,
  result,
}: {
  name: string;
  result?: { rolls: number[]; total: number; diceCount?: number; sides?: number } | null;
}) {
  return (
    <div className={`border p-3 rounded-sm ${result ? "border-emerald-500/35 bg-emerald-500/5" : "border-amber-500/35 bg-amber-500/5"}`}>
      <div className="flex justify-between gap-3 mb-3">
        <span className="text-sm text-bone">{name}</span>
        <span className={`text-[10px] uppercase tracking-widest ${result ? "text-emerald-400" : "text-amber-400"}`}>
          {result ? "Rolado" : "Aguardando"}
        </span>
      </div>
      {result ? (
        <ResultDiceStrip rolls={result.rolls} total={result.total} diceCount={result.diceCount} sides={result.sides} />
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="dice-pending-effect grid size-7 place-items-center border border-amber-500/35 rounded-sm">?</span>
          Esperando jogador
        </div>
      )}
    </div>
  );
}

function DiceHistoryCard({ request }: { request: ReturnType<typeof useDiceTable>["requests"][number] }) {
  const playerResults = request.results.filter((result) => result.targetCharacterId);
  const masterResults = request.results.filter((result) => !result.targetCharacterId);
  const targetById = new Map(request.targets.map((target) => [target.characterId, target.characterName]));

  return (
    <article className="border border-border/60 bg-background/25 rounded-sm overflow-hidden">
      <div className="border-b border-border/60 bg-card/25 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display uppercase tracking-widest text-sm text-bone">{request.title}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Aberta em {formatDateTime(request.createdAt)}
              {request.closedAt ? ` · Fechada em ${formatDateTime(request.closedAt)}` : ""}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{request.results.length} rolagem{request.results.length === 1 ? "" : "s"}</span>
        </div>
        {request.note && <p className="text-xs text-muted-foreground mt-2">{request.note}</p>}
      </div>
      <div className="p-3 space-y-2">
        {request.results.length === 0 && <p className="text-sm text-muted-foreground">Mesa encerrada sem rolagens.</p>}
        {playerResults.map((result) => (
          <HistoryResultRow
            key={result.id}
            label={targetById.get(result.targetCharacterId ?? "") ?? "Personagem"}
            result={result}
          />
        ))}
        {masterResults.map((result) => (
          <HistoryResultRow key={result.id} label="Mestre" result={result} />
        ))}
      </div>
    </article>
  );
}

function HistoryResultRow({
  label,
  result,
}: {
  label: string;
  result: {
    rollerName: string;
    diceCount: number;
    sides: number;
    rolls: number[];
    total: number;
    rolledAt: string;
  };
}) {
  return (
    <div className="border border-border/40 bg-card/15 p-3 rounded-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-bone">{label}</div>
          <div className="text-xs text-muted-foreground">
            {result.rollerName} · {formatDateTime(result.rolledAt)}
          </div>
        </div>
        <span className="font-display uppercase tracking-widest text-blood text-sm">
          {result.diceCount}d{result.sides} Total {result.total}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {result.rolls.map((roll, index) => (
          <span key={`${result.rolledAt}-${index}`} className="grid size-6 place-items-center border border-border bg-background rounded-sm text-[10px] text-bone">
            {roll}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ResultDiceStrip({ rolls, total, diceCount, sides }: { rolls: number[]; total: number; diceCount?: number; sides?: number }) {
  const formula = diceCount && sides ? `${diceCount}d${sides}` : `${rolls.length}d?`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display uppercase tracking-widest text-blood text-sm">{formula} Total {total}</span>
      <div className="flex flex-wrap gap-1">
        {rolls.slice(0, 12).map((roll, index) => (
          <span
            key={`${roll}-${index}`}
            className="dice-face-effect grid size-7 place-items-center border border-border bg-background rounded-sm text-xs text-bone"
            style={{ animationDelay: `${index * 35}ms` }}
          >
            {roll}
          </span>
        ))}
        {rolls.length > 12 && <span className="text-xs text-muted-foreground self-center">+{rolls.length - 12}</span>}
      </div>
    </div>
  );
}

function SettingsPanel({ settings }: { settings: GameSettings }) {
  const update = (patch: Partial<GameSettings>) => saveGameSettings({ ...settings, ...patch });
  const updateSkills = (key: keyof GameSettings["skills"], value: string[]) =>
    saveGameSettings({ ...settings, skills: { ...settings.skills, [key]: value } });
  const restoreAll = () => {
    if (!confirm("Restaurar todos os cadastros padrões da crônica?")) return;
    saveGameSettings(DEFAULT_GAME_SETTINGS);
  };

  return (
    <section className="gothic-panel mb-10 border border-border/60 bg-card/40 p-6 rounded-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cadastros auxiliares</p>
          <h2 className="font-display uppercase tracking-widest text-sm text-blood">Configurações da Crônica</h2>
        </div>
        <Button variant="outline" size="sm" onClick={restoreAll}>Restaurar todos os padrões</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListConfig label="Clãs" value={settings.clans} defaultValue={DEFAULT_GAME_SETTINGS.clans} onChange={(v) => update({ clans: v })} />
        <ListConfig label="Naturezas" value={settings.natures} defaultValue={DEFAULT_GAME_SETTINGS.natures} onChange={(v) => update({ natures: v })} />
        <ListConfig label="Comportamentos" value={settings.demeanors} defaultValue={DEFAULT_GAME_SETTINGS.demeanors} onChange={(v) => update({ demeanors: v })} />
        <ListConfig label="Refúgios" value={settings.havens} defaultValue={DEFAULT_GAME_SETTINGS.havens} onChange={(v) => update({ havens: v })} />
        <ListConfig label="Crônicas" value={settings.chronicles} defaultValue={DEFAULT_GAME_SETTINGS.chronicles} onChange={(v) => update({ chronicles: v })} />
        <ListConfig label="Conceitos" value={settings.concepts} defaultValue={DEFAULT_GAME_SETTINGS.concepts} onChange={(v) => update({ concepts: v })} />
        <ListConfig label="Talentos" value={settings.skills.talentos} defaultValue={DEFAULT_GAME_SETTINGS.skills.talentos} onChange={(v) => updateSkills("talentos", v)} />
        <ListConfig label="Perícias" value={settings.skills.pericias} defaultValue={DEFAULT_GAME_SETTINGS.skills.pericias} onChange={(v) => updateSkills("pericias", v)} />
        <ListConfig label="Conhecimentos" value={settings.skills.conhecimentos} defaultValue={DEFAULT_GAME_SETTINGS.skills.conhecimentos} onChange={(v) => updateSkills("conhecimentos", v)} />
        <ListConfig label="Estados" value={settings.states} defaultValue={DEFAULT_GAME_SETTINGS.states} onChange={(v) => update({ states: v })} />
        <label className="block">
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nível máximo de atributos e habilidades</span>
          <Input
            type="number"
            min={1}
            max={10}
            value={settings.skillMax}
            onChange={(e) => update({ skillMax: parseInt(e.target.value || "5", 10) || 5 })}
          />
        </label>
      </div>
    </section>
  );
}

function ListConfig({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string[];
  defaultValue: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addItems = (raw: string) => {
    const items = raw
      .split(/[;\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    onChange(Array.from(new Set([...value, ...items])));
    setDraft("");
  };

  const removeItem = (item: string) => {
    onChange(value.filter((current) => current !== item));
  };

  return (
    <div className="block rounded-sm border border-border/60 bg-background/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="text-xs text-bone/70">{value.length} {value.length === 1 ? "item" : "itens"}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="text-xs text-muted-foreground hover:text-blood" onClick={() => onChange([])}>
            Limpar
          </button>
          <button type="button" className="text-xs text-muted-foreground hover:text-blood" onClick={() => onChange(defaultValue)}>
            Padrão
          </button>
        </div>
      </div>

      <div className="min-h-24 rounded-sm border border-border bg-input/50 p-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {value.length === 0 && (
            <span className="px-2 py-1 text-xs text-muted-foreground">Nenhum item cadastrado.</span>
          )}
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex max-w-full items-center gap-2 rounded-sm border border-blood/40 bg-blood/10 px-2 py-1 text-xs text-bone"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-blood"
                aria-label={`Remover ${item}`}
                title={`Remover ${item}`}
                onClick={() => removeItem(item)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <input
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            if (/[;\n,]/.test(next)) {
              addItems(next);
              return;
            }
            setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItems(draft);
            }
            if (event.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => addItems(draft)}
          placeholder="Digite e use ; para cadastrar"
          className="w-full bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprovada", cls: "border-emerald-500/50 text-emerald-400" },
    pending: { label: "Pendente", cls: "border-amber-500/50 text-amber-400" },
    draft: { label: "Rascunho", cls: "border-border text-muted-foreground" },
    rejected: { label: "Rejeitada", cls: "border-destructive text-destructive" },
  };
  const s = map[status] ?? map.draft;
  return <span className={`px-2 py-1 text-[10px] uppercase tracking-widest border rounded-sm ${s.cls}`}>{s.label}</span>;
}


