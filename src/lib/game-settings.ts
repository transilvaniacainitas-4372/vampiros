import { useSyncExternalStore } from "react";
import { ATTRIBUTES, SKILLS, V5_CLANS } from "./character-schema";

const SETTINGS_KEY = "vampiros.local.game-settings";

export type GameSettings = {
  clans: string[];
  natures: string[];
  demeanors: string[];
  havens: string[];
  chronicles: string[];
  concepts: string[];
  skillMax: number;
  skills: {
    fisicas: string[];
    sociais: string[];
    mentais: string[];
  };
  states: string[];
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  clans: [...V5_CLANS],
  natures: ["Arquiteto", "Autocrata", "Bon vivant", "Competidor", "Conformista", "Diretor", "Rebelde", "Solitário"],
  demeanors: ["Afável", "Frio", "Sedutor", "Reservado", "Ameaçador", "Excêntrico", "Formal", "Irônico"],
  havens: ["Apartamento", "Mansão", "Boate", "Igreja abandonada", "Esgotos", "Refúgio compartilhado"],
  chronicles: ["Crônica local"],
  concepts: ["Ancilla político", "Neonato rebelde", "Predador social", "Investigador ocultista", "Executor da Camarilla"],
  skillMax: 5,
  skills: {
    fisicas: [...SKILLS.fisicas],
    sociais: [...SKILLS.sociais],
    mentais: [...SKILLS.mentais],
  },
  states: ["Humanidade", "Máculas", "Fome", "Vitalidade", "Força de Vontade", "Ressonância", "Experiência"],
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSettings: GameSettings = DEFAULT_GAME_SETTINGS;

export function getGameSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_GAME_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (raw === cachedRaw) return cachedSettings;

  cachedRaw = raw;
  if (!raw) {
    cachedSettings = DEFAULT_GAME_SETTINGS;
    return cachedSettings;
  }

  try {
    cachedSettings = mergeSettings(JSON.parse(raw) as Partial<GameSettings>);
  } catch {
    cachedSettings = DEFAULT_GAME_SETTINGS;
  }

  return cachedSettings;
}

export function saveGameSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  const normalized = mergeSettings(settings);
  const raw = JSON.stringify(normalized);
  cachedRaw = raw;
  cachedSettings = normalized;
  window.localStorage.setItem(SETTINGS_KEY, raw);
  listeners.forEach((listener) => listener());
}

export function useGameSettings() {
  return useSyncExternalStore(subscribe, getGameSettings, () => DEFAULT_GAME_SETTINGS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function mergeSettings(settings: Partial<GameSettings>): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...settings,
    clans: nonEmpty(settings.clans, DEFAULT_GAME_SETTINGS.clans),
    natures: nonEmpty(settings.natures, DEFAULT_GAME_SETTINGS.natures),
    demeanors: nonEmpty(settings.demeanors, DEFAULT_GAME_SETTINGS.demeanors),
    havens: nonEmpty(settings.havens, DEFAULT_GAME_SETTINGS.havens),
    chronicles: nonEmpty(settings.chronicles, DEFAULT_GAME_SETTINGS.chronicles),
    concepts: nonEmpty(settings.concepts, DEFAULT_GAME_SETTINGS.concepts),
    skillMax: clampNumber(settings.skillMax, 1, 10, DEFAULT_GAME_SETTINGS.skillMax),
    skills: {
      fisicas: nonEmpty(settings.skills?.fisicas, DEFAULT_GAME_SETTINGS.skills.fisicas),
      sociais: nonEmpty(settings.skills?.sociais, DEFAULT_GAME_SETTINGS.skills.sociais),
      mentais: nonEmpty(settings.skills?.mentais, DEFAULT_GAME_SETTINGS.skills.mentais),
    },
    states: nonEmpty(settings.states, DEFAULT_GAME_SETTINGS.states),
  };
}

function nonEmpty(value: string[] | undefined, fallback: string[]) {
  const clean = (value ?? []).map((item) => item.trim()).filter(Boolean);
  return clean.length ? clean : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
