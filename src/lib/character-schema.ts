import { z } from "zod";

const rating = z.number().int().min(0).max(10);
const rating10 = z.number().int().min(0).max(10);
const rating20 = z.number().int().min(0).max(20);
const rating40 = z.number().int().min(0).max(40);

export const V5_CLANS = [
  "Brujah", "Gangrel", "Malkavian", "Nosferatu", "Toreador", "Tremere", "Ventrue",
  "Banu Haqim", "Hecata", "Lasombra", "The Ministry", "Ravnos", "Salubri", "Tzimisce",
  "Caitiff", "Thin-Blood",
] as const;

export const V5_PREDATOR_TYPES = [
  "Alleycat", "Bagger", "Blood Leech", "Cleaver", "Consensualist", "Farmer", "Osiris",
  "Sandman", "Scene Queen", "Siren", "Extortionist", "Graverobber", "Pursuer", "Roadside Killer", "Trapdoor",
] as const;

export const ATTRIBUTES = {
  fisicos: ["Força", "Destreza", "Vigor"],
  sociais: ["Carisma", "Manipulação", "Aparência"],
  mentais: ["Percepção", "Inteligência", "Raciocínio"],
} as const;

export const SKILLS = {
  talentos: ["Prontidão", "Esportes", "Briga", "Esquiva", "Empatia", "Expressão", "Intimidação", "Crime", "Liderança", "Lábia"],
  pericias: ["Empatia c/ Animais", "Arqueirismo", "Artesanato", "Etiqueta", "Herborismo", "Armas Brancas", "Música", "Cavalgar", "Furtividade", "Sobrevivência"],
  conhecimentos: ["Instrução", "Sabedoria Popular", "Investigação", "Direito", "Lingüística", "Medicina", "Ocultismo", "Política", "Ciência", "Senescalia"],
} as const;

const ratedItem = z.object({
  name: z.string().max(80),
  value: rating,
  note: z.string().max(200).default(""),
});
export type RatedItem = z.infer<typeof ratedItem>;

export const sheetSchema = z.object({
  identity: z.object({
    name: z.string().max(80).default(""),
    trueName: z.string().max(80).default(""),
    concept: z.string().max(120).default(""),
    chronicle: z.string().max(120).default(""),
    nature: z.string().max(80).default(""),
    demeanor: z.string().max(80).default(""),
    ambition: z.string().max(200).default(""),
    desire: z.string().max(200).default(""),
    predator: z.string().max(60).default(""),
    clan: z.string().max(60).default(""),
    generation: z.number().int().min(4).max(16).default(13),
    sire: z.string().max(80).default(""),
  }),
  attributes: z.record(z.string(), rating).default({}),
  skills: z.record(z.string(), rating).default({}),
  skillSpecs: z.record(z.string(), z.string().max(80)).default({}),
  disciplines: z.array(ratedItem).max(20).default([]),
  advantages: z.array(ratedItem).max(30).default([]),
  flaws: z.array(ratedItem).max(30).default([]),
  state: z.object({
    humanity: rating10.default(7),
    stains: rating10.default(0),
    hunger: z.number().int().min(0).max(5).default(1),
    bloodPoints: rating40.default(0),
    virtueConscience: rating10.default(0),
    virtueSelfControl: rating10.default(0),
    virtueCourage: rating10.default(0),
    healthMax: z.number().int().min(1).max(15).default(5),
    healthSuperficial: z.number().int().min(0).max(15).default(0),
    healthAggravated: z.number().int().min(0).max(15).default(0),
    willpowerMax: z.number().int().min(1).max(20).default(20),
    willpowerSuperficial: rating20.default(0),
    willpowerAggravated: rating20.default(0),
    resonance: z.string().max(80).default(""),
    experienceTotal: z.number().int().min(0).max(9999).default(0),
    experienceSpent: z.number().int().min(0).max(9999).default(0),
  }),
  convictions: z.array(z.string().max(200)).max(10).default([]),
  touchstones: z.array(z.string().max(200)).max(10).default([]),
  text: z.object({
    biography: z.string().max(5000).default(""),
    appearance: z.string().max(2000).default(""),
    haven: z.string().max(1000).default(""),
    notes: z.string().max(5000).default(""),
  }),
});

export type Sheet = z.infer<typeof sheetSchema>;

export function emptySheet(overrides?: Partial<Sheet["identity"]>): Sheet {
  return sheetSchema.parse({
    identity: { ...overrides },
    attributes: {},
    skills: {},
    skillSpecs: {},
    disciplines: [],
    advantages: [],
    flaws: [],
    state: {},
    convictions: [],
    touchstones: [],
    text: {},
  });
}
