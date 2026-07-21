import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessagesMenu } from "@/components/MessagesMenu";
import { useDiceTable } from "@/lib/dice-table";

type Character = {
  id: string;
  name: string;
  clan: string | null;
  concept: string | null;
  portrait_url: string | null;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Transylvania Chronicles — Vampiro: A Máscara" },
      {
        name: "description",
        content: "Personagens da crônica de Vampiro: A Máscara V5. Explore os cainitas da Transilvânia.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const diceTable = useDiceTable();
  const [chars, setChars] = useState<Character[]>([]);
  const [session, setSession] = useState<{ id: string; email: string } | null>(null);
  const [isStoryteller, setIsStoryteller] = useState(false);
  const [hasAssignedCharacter, setHasAssignedCharacter] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("characters")
      .select("id, name, clan, concept, portrait_url")
      .eq("status", "approved")
      .order("name")
      .then(({ data }) => setChars(data ?? []));

    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setSession({ id: data.user.id, email: data.user.email ?? "" });
        const { data: st } = await supabase.rpc("has_role", {
          _user_id: data.user.id,
          _role: "storyteller",
        });
        setIsStoryteller(!!st);
        const { data: mine } = await supabase.from("characters").select("id").eq("owner_id", data.user.id);
        setHasAssignedCharacter(!!mine?.length);
      }
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    const hasActiveTable = diceTable.requests.some((request) => request.active);
    if (authChecked && session && hasActiveTable && (hasAssignedCharacter || isStoryteller)) {
      navigate({ to: "/mesa" });
    }
  }, [authChecked, session, hasAssignedCharacter, isStoryteller, diceTable.requests, navigate]);

  return (
    <div className="gothic-vault-bg min-h-screen">
      <header className="gothic-nav border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="font-display uppercase tracking-[0.3em] text-blood text-lg">
            Transylvania Chronicles
          </Link>
          <nav className="flex gap-3 items-center text-sm">
            {session ? (
              <>
                {hasAssignedCharacter && (
                  <Link to="/meu-personagem" className="font-display uppercase tracking-widest text-xs hover:text-blood">
                    Minha ficha
                  </Link>
                )}
                {(hasAssignedCharacter || isStoryteller) && (
                  <Link to="/mesa" className="font-display uppercase tracking-widest text-xs hover:text-blood">
                    Mesa
                  </Link>
                )}
                {isStoryteller && (
                  <Link to="/mestre" className="font-display uppercase tracking-widest text-xs hover:text-blood">
                    Mestre
                  </Link>
                )}
                <MessagesMenu />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  Sair
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Entrar
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="gothic-hero-title font-display text-3xl md:text-5xl uppercase tracking-[0.12em] text-bone">
            <span className="text-blood">Cainitas</span> da Transilvânia
          </h1>
          <hr className="gothic-divider mt-6 max-w-md mx-auto" />
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto italic">
            "Nós somos os monstros nos cantos escuros. Somos os predadores no topo de sua cadeia alimentar. E somos
            condenados."
          </p>
        </div>

        {session && !hasAssignedCharacter && !isStoryteller && (
          <div className="mb-8 border border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm text-amber-200 rounded-sm">
            Sua conta foi criada e está aguardando o mestre associar você a um personagem.
          </div>
        )}

        {chars.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>Nenhum personagem foi apresentado à crônica ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {chars.map((character) => {
              const isFlipped = flippedId === character.id;

              return (
                <button
                  key={character.id}
                  type="button"
                  aria-label={`${character.name}: ${isFlipped ? "abrir ficha completa" : "ver resumo"}`}
                  onClick={() => {
                    if (isFlipped) {
                      navigate({ to: "/personagem/$id", params: { id: character.id } });
                      return;
                    }
                    setFlippedId(character.id);
                  }}
                  className="group block w-full border-0 bg-transparent p-0 text-left align-top [perspective:1200px] focus-visible:outline-none"
                >
                  <div
                    className="relative block aspect-[3/4] w-full transition-transform duration-700 [transform-origin:center] [transform-style:preserve-3d] will-change-transform"
                    style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                  >
                    <div className="gothic-arch-card absolute inset-0 h-full w-full overflow-hidden border border-border/60 bg-card/60 transition-colors [backface-visibility:hidden] group-hover:border-blood">
                      <div className="h-full bg-secondary/30 overflow-hidden relative">
                        {character.portrait_url ? (
                          <img
                            src={character.portrait_url}
                            alt={character.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl text-blood/30 font-display">
                            †
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <h3 className="font-display uppercase tracking-widest text-lg text-bone">
                            {character.name}
                          </h3>
                          <p className="text-xs text-blood mt-1">{character.clan ?? "Clã desconhecido"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="gothic-arch-card absolute inset-0 h-full w-full overflow-hidden border border-blood/70 bg-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {character.portrait_url && (
                        <>
                          <img
                            src={character.portrait_url}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-card/70 via-card/55 to-background/82" />
                        </>
                      )}
                      <div className="relative z-10 flex h-full flex-col justify-between p-5">
                        <div>
                        <p className="text-[10px] uppercase tracking-widest text-blood">Resumo</p>
                        <h3 className="mt-3 font-display uppercase tracking-widest text-xl text-bone">
                          {character.name}
                        </h3>
                        <p className="text-xs text-blood mt-1">{character.clan ?? "Clã desconhecido"}</p>
                        <hr className="gothic-divider my-5" />
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          {character.concept || "Nenhum resumo foi registrado para este personagem."}
                        </p>
                      </div>
                        <div className="border-t border-border/60 pt-4">
                        <p className="font-display text-xs uppercase tracking-widest text-bone">{character.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 mt-24 py-8 text-center text-xs text-muted-foreground">
        <p>Uma crônica de Vampiro: A Máscara — 5ª Edição</p>
      </footer>
    </div>
  );
}
