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
          <Field label="Conceito" value={sheet.identity.concept} />
          <Field label="Clã" value={sheet.identity.clan} />
          <Field label="Predador" value={sheet.identity.predator} />
          <Field label="Natureza" value={sheet.identity.nature} />
          <Field label="Comportamento" value={sheet.identity.demeanor} />
          <Field label="Geração" value={String(sheet.identity.generation)} />
          <Field label="Senhor" value={sheet.identity.sire} />
          <Field label="Crônica" value={sheet.identity.chronicle} />
          <Field label="Nome verdadeiro" value={sheet.identity.trueName} />
        </div>
      </section>

      <section>
        <SectionTitle>Atributos</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["fisicos","sociais","mentais"] as const).map((cat) => (
            <div key={cat}>
              <h4 className="font-display uppercase tracking-widest text-xs text-blood mb-2">
                {cat === "fisicos" ? "Físicos" : cat === "sociais" ? "Sociais" : "Mentais"}
              </h4>
              {ATTRIBUTES[cat].map((n) => (
                <RatingRow key={n} name={n} value={sheet.attributes[n] ?? 0} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Habilidades</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["fisicas","sociais","mentais"] as const).map((cat) => (
            <div key={cat}>
              <h4 className="font-display uppercase tracking-widest text-xs text-blood mb-2">
                {cat === "fisicas" ? "Físicas" : cat === "sociais" ? "Sociais" : "Mentais"}
              </h4>
              {settings.skills[cat].map((n) => (
                <RatingRow key={n} name={n} value={sheet.skills[n] ?? 0} spec={sheet.skillSpecs[n]} max={settings.skillMax} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Estado</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><Label>Humanidade</Label><DotRating value={sheet.state.humanity} max={10} /></div>
          <div><Label>Máculas</Label><DotRating value={sheet.state.stains} max={10} /></div>
          <div><Label>Fome</Label><DotRating value={sheet.state.hunger} max={5} /></div>
          <div><Label>Ressonância</Label><div>{sheet.state.resonance || "—"}</div></div>
          <div><Label>Vitalidade</Label><div className="text-xs">{sheet.state.healthMax} máx · {sheet.state.healthSuperficial}s / {sheet.state.healthAggravated}a</div></div>
          <div><Label>Força de Vontade</Label><div className="text-xs">{sheet.state.willpowerMax} máx · {sheet.state.willpowerSuperficial}s / {sheet.state.willpowerAggravated}a</div></div>
          <div><Label>XP total</Label><div>{sheet.state.experienceTotal}</div></div>
          <div><Label>XP gasto</Label><div>{sheet.state.experienceSpent}</div></div>
        </div>
      </section>

      {sheet.disciplines.length > 0 && (
        <section>
          <SectionTitle>Disciplinas</SectionTitle>
          <ItemList items={sheet.disciplines} />
        </section>
      )}
      {sheet.advantages.length > 0 && (
        <section>
          <SectionTitle>Antecedentes & Vantagens</SectionTitle>
          <ItemList items={sheet.advantages} />
        </section>
      )}
      {sheet.flaws.length > 0 && (
        <section>
          <SectionTitle>Defeitos</SectionTitle>
          <ItemList items={sheet.flaws} />
        </section>
      )}

      {sheet.convictions.length > 0 && (
        <section>
          <SectionTitle>Convicções</SectionTitle>
          <ul className="text-sm space-y-1 list-disc list-inside">{sheet.convictions.map((c,i)=><li key={i}>{c}</li>)}</ul>
        </section>
      )}
      {sheet.touchstones.length > 0 && (
        <section>
          <SectionTitle>Laços</SectionTitle>
          <ul className="text-sm space-y-1 list-disc list-inside">{sheet.touchstones.map((c,i)=><li key={i}>{c}</li>)}</ul>
        </section>
      )}

      {(sheet.text.biography || sheet.text.appearance || sheet.text.haven || sheet.text.notes) && (
        <section className="space-y-4">
          <SectionTitle>História</SectionTitle>
          {sheet.text.biography && <TextBlock label="Biografia" value={sheet.text.biography} />}
          {sheet.text.appearance && <TextBlock label="Aparência" value={sheet.text.appearance} />}
          {sheet.text.haven && <TextBlock label="Refúgio" value={sheet.text.haven} />}
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
    <div className="flex justify-between items-center py-1 border-b border-border/30">
      <span className="text-sm">{name}{spec && <em className="text-blood/80 not-italic text-xs"> ({spec})</em>}</span>
      <DotRating value={value} max={max} size="sm" />
    </div>
  );
}
function ItemList({ items }: { items: Array<{ name: string; value: number; note?: string }> }) {
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
