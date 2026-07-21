import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CharacterSheetView } from "@/components/CharacterSheetView";
import { sheetSchema, type Sheet } from "@/lib/character-schema";

type Row = {
  id: string; name: string; clan: string | null; concept: string | null;
  portrait_url: string | null; sheet_approved: unknown;
};

export const Route = createFileRoute("/personagem/$id")({
  component: CharacterPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-blood text-3xl">Personagem não encontrado</h1>
        <Link to="/" className="text-sm text-muted-foreground hover:text-blood mt-4 inline-block">← Voltar</Link>
      </div>
    </div>
  ),
});

function CharacterPage() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("characters")
      .select("id, name, clan, concept, portrait_url, sheet_approved")
      .eq("id", id).eq("status", "approved").maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRow(data as Row);
          const parsed = sheetSchema.safeParse(data.sheet_approved);
          if (parsed.success) setSheet(parsed.data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Invocando...</div>;
  if (!row || !sheet) throw notFound();

  return (
    <div className="gothic-vault-bg min-h-screen">
      <header className="gothic-nav border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link to="/" className="gothic-menu-link font-display text-xs uppercase tracking-widest">← Voltar ao domínio</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-[240px_1fr] gap-8 mb-10">
          <div>
            {row.portrait_url ? (
              <img src={row.portrait_url} alt={row.name} className="w-full aspect-[3/4] object-cover rounded-sm border border-border" />
            ) : (
              <div className="w-full aspect-[3/4] bg-secondary/30 flex items-center justify-center text-8xl text-blood/30 font-display rounded-sm border border-border">†</div>
            )}
          </div>
          <div>
            <h1 className="font-display uppercase tracking-[0.15em] text-4xl text-bone">{row.name}</h1>
            <p className="text-blood mt-2 font-display uppercase tracking-widest text-sm">{row.clan}</p>
            {row.concept && <p className="italic text-muted-foreground mt-4">{row.concept}</p>}
            <hr className="blood-rule mt-6" />
          </div>
        </div>
        <CharacterSheetView sheet={sheet} />
      </main>
    </div>
  );
}
