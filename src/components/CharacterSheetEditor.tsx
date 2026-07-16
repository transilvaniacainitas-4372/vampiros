import { useState } from "react";
import { DotRating } from "./DotRating";
import { ATTRIBUTES, V5_PREDATOR_TYPES, type Sheet } from "@/lib/character-schema";
import { useGameSettings } from "@/lib/game-settings";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CharacterSheetEditor({
  value,
  onChange,
}: {
  value: Sheet;
  onChange: (next: Sheet) => void;
}) {
  const settings = useGameSettings();
  const set = <K extends keyof Sheet>(k: K, v: Sheet[K]) => onChange({ ...value, [k]: v });
  const setIdentity = (patch: Partial<Sheet["identity"]>) =>
    set("identity", { ...value.identity, ...patch });
  const setState = (patch: Partial<Sheet["state"]>) => set("state", { ...value.state, ...patch });
  const setText = (patch: Partial<Sheet["text"]>) => set("text", { ...value.text, ...patch });
  const setAttr = (n: string, v: number) => set("attributes", { ...value.attributes, [n]: v });
  const setSkill = (n: string, v: number) => set("skills", { ...value.skills, [n]: v });
  const setSpec = (n: string, s: string) => set("skillSpecs", { ...value.skillSpecs, [n]: s });

  return (
    <div className="space-y-8">
      <Section title="Identidade">
        <Grid>
          <Text label="Nome" value={value.identity.name} onChange={(v) => setIdentity({ name: v })} />
          <Text
            label="Nome verdadeiro"
            value={value.identity.trueName}
            onChange={(v) => setIdentity({ trueName: v })}
          />
          <Select
            label="Conceito"
            value={value.identity.concept}
            options={settings.concepts}
            onChange={(v) => setIdentity({ concept: v })}
          />
          <Select
            label="Crônica"
            value={value.identity.chronicle}
            options={settings.chronicles}
            onChange={(v) => setIdentity({ chronicle: v })}
          />
          <Select
            label="Clã"
            value={value.identity.clan}
            options={settings.clans}
            onChange={(v) => setIdentity({ clan: v })}
          />
          <Select
            label="Natureza"
            value={value.identity.nature}
            options={settings.natures}
            onChange={(v) => setIdentity({ nature: v })}
          />
          <Select
            label="Comportamento"
            value={value.identity.demeanor}
            options={settings.demeanors}
            onChange={(v) => setIdentity({ demeanor: v })}
          />
          <Select
            label="Predador"
            value={value.identity.predator}
            options={[...V5_PREDATOR_TYPES]}
            onChange={(v) => setIdentity({ predator: v })}
          />
          <Number
            label="Geração"
            value={value.identity.generation}
            min={4}
            max={16}
            onChange={(v) => setIdentity({ generation: v })}
          />
          <Text label="Senhor (Sire)" value={value.identity.sire} onChange={(v) => setIdentity({ sire: v })} />
          <Text
            label="Ambição"
            value={value.identity.ambition}
            onChange={(v) => setIdentity({ ambition: v })}
            full
          />
          <Text label="Desejo" value={value.identity.desire} onChange={(v) => setIdentity({ desire: v })} full />
        </Grid>
      </Section>

      <Section title="Atributos">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["fisicos", "sociais", "mentais"] as const).map((cat) => (
            <div key={cat}>
              <SubTitle>{cat === "fisicos" ? "Físicos" : cat === "sociais" ? "Sociais" : "Mentais"}</SubTitle>
              {ATTRIBUTES[cat].map((n) => (
                <RatingRow key={n} name={n} value={value.attributes[n] ?? 0} onChange={(v) => setAttr(n, v)} />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Habilidades">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["fisicas", "sociais", "mentais"] as const).map((cat) => (
            <div key={cat}>
              <SubTitle>{cat === "fisicas" ? "Físicas" : cat === "sociais" ? "Sociais" : "Mentais"}</SubTitle>
              {settings.skills[cat].map((n) => (
                <SkillRow
                  key={n}
                  name={n}
                  value={value.skills[n] ?? 0}
                  onValue={(v) => setSkill(n, v)}
                  spec={value.skillSpecs[n] ?? ""}
                  onSpec={(s) => setSpec(n, s)}
                  max={settings.skillMax}
                />
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Estado">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <RatingLine label="Humanidade" max={10} value={value.state.humanity} onChange={(v) => setState({ humanity: v })} />
          <RatingLine label="Máculas" max={10} value={value.state.stains} onChange={(v) => setState({ stains: v })} />
          <RatingLine label="Fome" max={5} value={value.state.hunger} onChange={(v) => setState({ hunger: v })} />
          <Number label="Vitalidade máx" value={value.state.healthMax} min={1} max={15} onChange={(v) => setState({ healthMax: v })} />
          <Number label="Vit. superficial" value={value.state.healthSuperficial} min={0} max={15} onChange={(v) => setState({ healthSuperficial: v })} />
          <Number label="Vit. agravada" value={value.state.healthAggravated} min={0} max={15} onChange={(v) => setState({ healthAggravated: v })} />
          <Number label="F. Vontade máx" value={value.state.willpowerMax} min={1} max={15} onChange={(v) => setState({ willpowerMax: v })} />
          <Number label="FV superficial" value={value.state.willpowerSuperficial} min={0} max={15} onChange={(v) => setState({ willpowerSuperficial: v })} />
          <Number label="FV agravada" value={value.state.willpowerAggravated} min={0} max={15} onChange={(v) => setState({ willpowerAggravated: v })} />
          <Text label="Ressonância" value={value.state.resonance} onChange={(v) => setState({ resonance: v })} />
          <Number label="XP total" value={value.state.experienceTotal} min={0} max={9999} onChange={(v) => setState({ experienceTotal: v })} />
          <Number label="XP gasto" value={value.state.experienceSpent} min={0} max={9999} onChange={(v) => setState({ experienceSpent: v })} />
        </div>
      </Section>

      <ItemsSection title="Disciplinas" items={value.disciplines} onChange={(v) => set("disciplines", v)} />
      <ItemsSection title="Antecedentes & Vantagens" items={value.advantages} onChange={(v) => set("advantages", v)} />
      <ItemsSection title="Defeitos" items={value.flaws} onChange={(v) => set("flaws", v)} />

      <StringListSection title="Convicções" items={value.convictions} onChange={(v) => set("convictions", v)} />
      <StringListSection title="Laços (Touchstones)" items={value.touchstones} onChange={(v) => set("touchstones", v)} />

      <Section title="História">
        <div className="space-y-4">
          <LongText label="Biografia" value={value.text.biography} onChange={(v) => setText({ biography: v })} />
          <LongText label="Aparência" value={value.text.appearance} onChange={(v) => setText({ appearance: v })} />
          <Select label="Refúgio" value={value.text.haven} options={settings.havens} onChange={(v) => setText({ haven: v })} />
          <LongText label="Notas" value={value.text.notes} onChange={(v) => setText({ notes: v })} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-display uppercase tracking-[0.25em] text-blood text-sm">{title}</h3>
        <hr className="blood-rule mt-1" />
      </div>
      {children}
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-display uppercase tracking-widest text-xs text-blood mb-2">{children}</h4>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function LabelRow({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function Text({ label, value, onChange, full }: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <LabelRow label={label} full={full}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={200} />
    </LabelRow>
  );
}

function Number({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <LabelRow label={label}>
      <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value || "0", 10) || 0)} />
    </LabelRow>
  );
}

function LongText({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <LabelRow label={label} full>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={5000} />
    </LabelRow>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <LabelRow label={label}>
      <select className="w-full bg-input border border-border rounded-sm px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </LabelRow>
  );
}

function RatingRow({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/30">
      <span className="text-sm">{name}</span>
      <DotRating value={value} onChange={onChange} size="sm" />
    </div>
  );
}

function SkillRow({
  name,
  value,
  onValue,
  spec,
  onSpec,
  max,
}: {
  name: string;
  value: number;
  onValue: (v: number) => void;
  spec: string;
  onSpec: (s: string) => void;
  max: number;
}) {
  return (
    <div className="py-1 border-b border-border/30">
      <div className="flex justify-between items-center">
        <span className="text-sm">{name}</span>
        <DotRating value={value} max={max} onChange={onValue} size="sm" />
      </div>
      {value > 0 && (
        <Input
          placeholder="Especialização"
          value={spec}
          onChange={(e) => onSpec(e.target.value)}
          className="mt-1 h-7 text-xs"
          maxLength={80}
        />
      )}
    </div>
  );
}

function RatingLine({ label, max, value, onChange }: { label: string; max?: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <DotRating value={value} max={max} onChange={onChange} />
    </div>
  );
}

function ItemsSection({
  title,
  items,
  onChange,
}: {
  title: string;
  items: Array<{ name: string; value: number; note: string }>;
  onChange: (v: Array<{ name: string; value: number; note: string }>) => void;
}) {
  const [n, setN] = useState("");
  return (
    <Section title={title}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-start border border-border/40 p-2 rounded-sm">
            <div className="flex-1 space-y-1">
              <Input
                value={it.name}
                onChange={(e) => {
                  const c = [...items];
                  c[i] = { ...c[i], name: e.target.value };
                  onChange(c);
                }}
                maxLength={80}
              />
              <Input
                placeholder="Notas"
                value={it.note}
                onChange={(e) => {
                  const c = [...items];
                  c[i] = { ...c[i], note: e.target.value };
                  onChange(c);
                }}
                maxLength={200}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col items-end gap-1">
              <DotRating
                value={it.value}
                onChange={(v) => {
                  const c = [...items];
                  c[i] = { ...c[i], value: v };
                  onChange(c);
                }}
                size="sm"
              />
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-xs text-blood/70 hover:text-blood">
                remover
              </button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder={`Adicionar ${title.toLowerCase()}...`} value={n} onChange={(e) => setN(e.target.value)} maxLength={80} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (n.trim()) {
                onChange([...items, { name: n.trim(), value: 1, note: "" }]);
                setN("");
              }
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </Section>
  );
}

function StringListSection({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [n, setN] = useState("");
  return (
    <Section title={title}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={it}
              onChange={(e) => {
                const c = [...items];
                c[i] = e.target.value;
                onChange(c);
              }}
              maxLength={200}
            />
            <Button type="button" variant="outline" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="Adicionar..." value={n} onChange={(e) => setN(e.target.value)} maxLength={200} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (n.trim()) {
                onChange([...items, n.trim()]);
                setN("");
              }
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </Section>
  );
}
