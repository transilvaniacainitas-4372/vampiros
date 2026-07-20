import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ATTRIBUTES, SKILLS, V5_CLANS } from "./character-schema";
import { isLocalMode } from "./local-mode";

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
    talentos: string[];
    pericias: string[];
    conhecimentos: string[];
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
  skillMax: 8,
  skills: {
    talentos: [...SKILLS.talentos],
    pericias: [...SKILLS.pericias],
    conhecimentos: [...SKILLS.conhecimentos],
  },
  states: ["Humanidade", "Máculas", "Fome", "Vitalidade", "Força de Vontade", "Ressonância", "Experiência"],
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSettings: GameSettings = DEFAULT_GAME_SETTINGS;
let remoteLoaded = false;
let remoteLoading = false;

export function getGameSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_GAME_SETTINGS;
  if (!isLocalMode) return cachedSettings;
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
  if (isLocalMode) {
    window.localStorage.setItem(SETTINGS_KEY, raw);
  } else {
    void supabase
      .from("game_settings")
      .upsert({ id: "default", settings: normalized }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) {
          console.error("[GameSettings] Failed to save settings:", error.message);
        }
      });
  }
  listeners.forEach((listener) => listener());
}

export function useGameSettings() {
  useEffect(() => {
    if (!isLocalMode) void loadRemoteGameSettings();
  }, []);
  return useSyncExternalStore(subscribe, getGameSettings, () => DEFAULT_GAME_SETTINGS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadRemoteGameSettings() {
  if (typeof window === "undefined" || remoteLoaded || remoteLoading) return;
  remoteLoading = true;

  const { data, error } = await supabase
    .from("game_settings")
    .select("settings")
    .eq("id", "default")
    .maybeSingle();

  remoteLoading = false;
  remoteLoaded = true;

  if (error) {
    console.error("[GameSettings] Failed to load settings:", error.message);
    return;
  }

  cachedSettings = mergeSettings((data?.settings ?? {}) as Partial<GameSettings>);
  cachedRaw = JSON.stringify(cachedSettings);
  listeners.forEach((listener) => listener());
}

function mergeSettings(settings: Partial<GameSettings>): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...settings,
    clans: cleanList(settings.clans, DEFAULT_GAME_SETTINGS.clans),
    natures: cleanList(settings.natures, DEFAULT_GAME_SETTINGS.natures),
    demeanors: cleanList(settings.demeanors, DEFAULT_GAME_SETTINGS.demeanors),
    havens: cleanList(settings.havens, DEFAULT_GAME_SETTINGS.havens),
    chronicles: cleanList(settings.chronicles, DEFAULT_GAME_SETTINGS.chronicles),
    concepts: cleanList(settings.concepts, DEFAULT_GAME_SETTINGS.concepts),
    skillMax: clampNumber(settings.skillMax, 1, 10, DEFAULT_GAME_SETTINGS.skillMax),
    skills: normalizeSkills(settings.skills),
    states: cleanList(settings.states, DEFAULT_GAME_SETTINGS.states),
  };
}

function normalizeSkills(skills: Partial<GameSettings["skills"]> & {
  fisicas?: string[];
  sociais?: string[];
  mentais?: string[];
} | undefined): GameSettings["skills"] {
  return {
    talentos: cleanList(skills?.talentos ?? skills?.fisicas, DEFAULT_GAME_SETTINGS.skills.talentos),
    pericias: cleanList(skills?.pericias ?? skills?.sociais, DEFAULT_GAME_SETTINGS.skills.pericias),
    conhecimentos: cleanList(skills?.conhecimentos ?? skills?.mentais, DEFAULT_GAME_SETTINGS.skills.conhecimentos),
  };
}

function cleanList(value: string[] | undefined, fallback: string[]) {
  if (value === undefined) return fallback;
  const clean = (value ?? []).map((item) => repairTextEncoding(item).trim()).filter(Boolean);
  return Array.from(new Set(clean));
}

function repairTextEncoding(value: string) {
  if (!/[ÃÂ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /[ÃÂ]/.test(decoded) ? value : decoded;
  } catch {
    return value;
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}
