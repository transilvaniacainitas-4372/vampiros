import { DotRating } from "./DotRating";
import { ATTRIBUTES, type Sheet } from "@/lib/character-schema";
import { useGameSettings } from "@/lib/game-settings";

export function CharacterSheetView({ sheet }: { sheet: Sheet }) {
  const settings = useGameSettings();
  return (
    <div className="space-y-8 font-body">
      <section>
        <SectionTitle>Identidade</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Nome" value={sheet.identity.name} />
          <Field label="Natureza" value={sheet.identity.nature} />
          <Field label="Geração" value={String(sheet.identity.generation)} />
          <Field label="Jogador" value={sheet.identity.trueName} />
          <Field label="Comportamento" value={sheet.identity.demeanor} />
          <Field label="Refúgio" value={sheet.text.haven} />
          <Field label="Crônica" value={sheet.identity.chronicle} />
          <Field label="Clã" value={sheet.identity.clan} />
          <Field label="Conceito" value={sheet.identity.concept} />
        </div>
      </section>

      <section>
        <SectionTitle>Atributos</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["fisicos", "sociais", "mentais"] as const).map((cat) => (
            <div key={cat}>
              <SubTitle>{cat === "fisicos" ? "Físicos" : cat === "sociais" ? "Sociais" : "Mentais"}</SubTitle>
              {ATTRIBUTES[cat].map((n) => (
                <RatingRow key={n} name={n} value={sheet.attributes[n] ?? 0} max={settings.skillMax} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Habilidades</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["talentos", "pericias", "conhecimentos"] as const).map((cat) => (
            <div key={cat}>
              <SubTitle>{cat === "talentos" ? "Talentos" : cat === "pericias" ? "Perícias" : "Conhecimentos"}</SubTitle>
              {settings.skills[cat].map((n) => (
                <RatingRow key={n} name={n} value={sheet.skills[n] ?? 0} spec={sheet.skillSpecs[n]} max={settings.skillMax} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Vantagens</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <SubTitle>Disciplinas</SubTitle>
            <ItemList items={sheet.disciplines} empty="Sem disciplinas" />
          </div>
          <div>
            <SubTitle>Antecedentes</SubTitle>
            <ItemList items={sheet.advantages} empty="Sem antecedentes" />
          </div>
          <div className="space-y-6">
            <div>
              <SubTitle>Virtudes</SubTitle>
              <RatingRow name="Consciência/Convicção" value={sheet.state.humanity} max={settings.skillMax} />
              <RatingRow name="Autocontrole/Instinto" value={sheet.state.stains} max={settings.skillMax} />
              <RatingRow name="Coragem" value={sheet.state.hunger} max={settings.skillMax} />
            </div>
            <div>
              <SubTitle>Qualidades/Defeitos</SubTitle>
              <ItemList items={sheet.flaws} empty="Sem qualidades ou defeitos" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Estado</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><Label>Força de Vontade</Label><div className="text-xs">{sheet.state.willpowerMax} máx · {sheet.state.willpowerSuperficial}s / {sheet.state.willpowerAggravated}a</div></div>
          <div><Label>Pontos de Sangue</Label><DotRating value={sheet.state.stains} max={10} /></div>
          <div><Label>Caminho</Label><DotRating value={sheet.state.humanity} max={10} /></div>
          <div><Label>Vitalidade</Label><div className="text-xs">{sheet.state.healthMax} máx · {sheet.state.healthSuperficial}s / {sheet.state.healthAggravated}a</div></div>
          <div><Label>Fraqueza</Label><div>{sheet.state.resonance || "—"}</div></div>
          <div><Label>Experiência</Label><div>{sheet.state.experienceTotal} total · {sheet.state.experienceSpent} gasto</div></div>
        </div>
      </section>

      {sheet.convictions.length > 0 && (
        <section>
          <SectionTitle>Convicções</SectionTitle>
          <ul className="text-sm space-y-1 list-disc list-inside">{sheet.convictions.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}
      {sheet.touchstones.length > 0 && (
        <section>
          <SectionTitle>Laços</SectionTitle>
          <ul className="text-sm space-y-1 list-disc list-inside">{sheet.touchstones.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}

      {(sheet.text.biography || sheet.text.appearance || sheet.text.notes) && (
        <section className="space-y-4">
          <SectionTitle>História</SectionTitle>
          {sheet.text.biography && <TextBlock label="Biografia" value={sheet.text.biography} />}
          {sheet.text.appearance && <TextBlock label="Aparência" value={sheet.text.appearance} />}
          {sheet.text.notes && <TextBlock label="Notas" value={sheet.text.notes} />}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="font-display uppercase tracking-[0.25em] text-blood text-sm">{children}</h3>
      <hr className="blood-rule mt-1" />
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-display uppercase tracking-widest text-xs text-blood mb-2">{children}</h4>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-1">
      <span className="text-muted-foreground text-xs uppercase tracking-widest">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

function RatingRow({ name, value, spec, max }: { name: string; value: number; spec?: string; max?: number }) {
  return (
    <div className="flex justify-between items-center gap-3 py-1 border-b border-border/30">
      <span className="text-sm">{name}{spec && <em className="text-blood/80 not-italic text-xs"> ({spec})</em>}</span>
      <DotRating value={value} max={max} size="sm" />
    </div>
  );
}

function ItemList({ items, empty }: { items: Array<{ name: string; value: number; note?: string }>; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex justify-between items-start gap-4 border-b border-border/30 pb-1">
          <div className="flex-1">
            <div className="text-sm">{it.name}</div>
            {it.note && <div className="text-xs text-muted-foreground">{it.note}</div>}
          </div>
          <DotRating value={it.value} size="sm" />
        </div>
      ))}
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-blood mb-1">{label}</div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}
