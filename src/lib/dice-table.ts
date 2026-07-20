import { useSyncExternalStore } from "react";
import { getLocalCharacters, getLocalSession } from "./local-data";

const DICE_TABLE_KEY = "vampiros.local.dice-table";

export type DiceTarget = {
  characterId: string;
  characterName: string;
  ownerId: string | null;
};

export type DiceResult = {
  id: string;
  targetCharacterId: string | null;
  rollerId: string;
  rollerName: string;
  diceCount: number;
  sides: number;
  rolls: number[];
  total: number;
  rolledAt: string;
};

export type DiceRequest = {
  id: string;
  title: string;
  note: string;
  diceCount: number;
  sides: number;
  active: boolean;
  createdAt: string;
  closedAt?: string | null;
  targets: DiceTarget[];
  results: DiceResult[];
};

type DiceTable = {
  requests: DiceRequest[];
};

const fallbackTable: DiceTable = { requests: [] };
let cachedRaw = "";
let cachedTable = fallbackTable;

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readTable(): DiceTable {
  if (typeof window === "undefined") return fallbackTable;
  const raw = window.localStorage.getItem(DICE_TABLE_KEY) ?? "";
  if (raw === cachedRaw) return cachedTable;

  cachedRaw = raw;
  if (!raw) {
    cachedTable = fallbackTable;
    return cachedTable;
  }

  try {
    cachedTable = normalizeTable(JSON.parse(raw) as DiceTable);
  } catch {
    cachedTable = fallbackTable;
  }

  return cachedTable;
}

function writeTable(table: DiceTable) {
  if (typeof window === "undefined") return;
  const normalized = normalizeTable(table);
  const raw = JSON.stringify(normalized);
  cachedRaw = raw;
  cachedTable = normalized;
  window.localStorage.setItem(DICE_TABLE_KEY, raw);
  window.dispatchEvent(new Event("vampiros:dice-table"));
}

function normalizeTable(table: DiceTable): DiceTable {
  let activeSeen = false;
  const now = new Date().toISOString();
  return {
    requests: table.requests.map((request) => {
      if (!request.active) return request;
      if (!activeSeen) {
        activeSeen = true;
        return request;
      }
      return { ...request, active: false, closedAt: request.closedAt ?? now };
    }),
  };
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === DICE_TABLE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("vampiros:dice-table", callback);
  const interval = window.setInterval(callback, 1500);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("vampiros:dice-table", callback);
    window.clearInterval(interval);
  };
}

export function useDiceTable() {
  return useSyncExternalStore(subscribe, readTable, () => fallbackTable);
}

export function createDiceRequest(input: {
  title: string;
  note: string;
  targetCharacterIds: string[];
}) {
  const now = new Date().toISOString();
  const characters = getLocalCharacters();
  const targets = input.targetCharacterIds
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean)
    .map((character) => ({
      characterId: character!.id,
      characterName: character!.name,
      ownerId: character!.owner_id,
    }));

  const request: DiceRequest = {
    id: id("dice"),
    title: input.title.trim() || "Rolagem solicitada",
    note: input.note.trim(),
    diceCount: 0,
    sides: 0,
    active: true,
    createdAt: now,
    closedAt: null,
    targets,
    results: [],
  };

  writeTable({
    requests: [
      request,
      ...readTable().requests.map((existing) =>
        existing.active ? { ...existing, active: false, closedAt: existing.closedAt ?? now } : existing,
      ),
    ],
  });
  return request;
}

export function closeDiceRequest(requestId: string) {
  const table = readTable();
  const now = new Date().toISOString();
  writeTable({
    requests: table.requests.map((request) =>
      request.id === requestId ? { ...request, active: false, closedAt: request.closedAt ?? now } : request,
    ),
  });
}

export function rollDice(requestId: string, targetCharacterId: string | null, formula?: { diceCount: number; sides: number }) {
  const user = getLocalSession();
  if (!user) throw new Error("Entre para rolar os dados.");

  const table = readTable();
  const request = table.requests.find((item) => item.id === requestId);
  if (!request || !request.active) throw new Error("Esta mesa de dados nao esta ativa.");

  if (targetCharacterId) {
    const target = request.targets.find((item) => item.characterId === targetCharacterId);
    if (!target) throw new Error("Este personagem nao foi chamado para esta rolagem.");
    if (target.ownerId !== user.id && user.role !== "storyteller") throw new Error("Voce nao pode rolar por este personagem.");
  }

  const diceCount = clamp((formula?.diceCount ?? request.diceCount) || 1, 1, 50);
  const sides = clamp((formula?.sides ?? request.sides) || 10, 2, 100);
  const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1);
  const result: DiceResult = {
    id: id("result"),
    targetCharacterId,
    rollerId: user.id,
    rollerName: user.display_name || user.email,
    diceCount,
    sides,
    rolls,
    total: rolls.reduce((sum, value) => sum + value, 0),
    rolledAt: new Date().toISOString(),
  };

  const nextRequests = table.requests.map((item) =>
    item.id === requestId
      ? {
          ...item,
          results: [result, ...item.results],
        }
      : item,
  );
  writeTable({ requests: nextRequests });
  return result;
}

export function clearOldDiceRequests() {
  const active = readTable().requests.filter((request) => request.active);
  writeTable({ requests: active });
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
