import { Link } from "@tanstack/react-router";

type GothicNotFoundProps = {
  message?: string;
};

export function GothicNotFound({
  message = "A trilha se apagou entre névoa, sangue e silêncio.",
}: GothicNotFoundProps) {
  return (
    <main className="not-found-scene gothic-vault-bg min-h-screen px-6 py-10">
      <section className="gothic-panel not-found-card mx-auto flex min-h-[min(720px,calc(100vh-5rem))] max-w-5xl flex-col items-center justify-center overflow-hidden rounded-sm border border-bone/15 px-6 py-12 text-center">
        <div className="not-found-mist" aria-hidden="true" />
        <div className="relative z-10 max-w-2xl">
          <p className="font-display text-[10px] uppercase tracking-[0.35em] text-blood">Transylvania Chronicles</p>
          <div className="not-found-code-wrap mt-4">
            <h1 className="not-found-code font-display text-8xl uppercase leading-none text-blood md:text-[10rem]">
              404
            </h1>
            <span className="blood-drip blood-drip-a" aria-hidden="true" />
            <span className="blood-drip blood-drip-b" aria-hidden="true" />
            <span className="blood-drip blood-drip-c" aria-hidden="true" />
          </div>
          <hr className="gothic-divider mx-auto mt-5 max-w-sm" />
          <h2 className="gothic-hero-title mt-8 font-display text-2xl uppercase tracking-[0.18em] text-bone md:text-4xl">
            Página perdida na noite
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base italic leading-relaxed text-muted-foreground md:text-lg">
            {message}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="gothic-menu-link gothic-menu-link-active font-display uppercase tracking-widest text-xs"
            >
              Voltar ao domínio
            </Link>
            <Link to="/auth" className="gothic-menu-link font-display uppercase tracking-widest text-xs">
              Entrar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
