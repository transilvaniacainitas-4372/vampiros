import { emptySheet, type Sheet } from "./character-schema";

const USERS_KEY = "vampiros.local.users";
const SESSION_KEY = "vampiros.local.session";
const CHARACTERS_KEY = "vampiros.local.characters";
const PORTRAITS_KEY = "vampiros.local.portraits";

export type LocalUser = {
  id: string;
  email: string;
  display_name: string;
  role: "player" | "storyteller";
  status?: "pending" | "approved";
};

export type LocalCharacter = {
  id: string;
  owner_id: string | null;
  name: string;
  clan: string | null;
  concept: string | null;
  portrait_url: string | null;
  sheet_approved: Sheet | null;
  sheet_draft: Sheet | null;
  status: "draft" | "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getLocalUsers() {
  return read<LocalUser[]>(USERS_KEY, []);
}

function setLocalUsers(users: LocalUser[]) {
  write(USERS_KEY, users);
}

export function getLocalCharacters() {
  return read<LocalCharacter[]>(CHARACTERS_KEY, []);
}

function setLocalCharacters(characters: LocalCharacter[]) {
  write(CHARACTERS_KEY, characters);
}

export function getLocalSession() {
  const userId = read<string | null>(SESSION_KEY, null);
  return getLocalUsers().find((user) => user.id === userId) ?? null;
}

function setLocalSession(userId: string | null) {
  write(SESSION_KEY, userId);
}

export function localSignIn(email: string, displayName?: string) {
  const users = getLocalUsers();
  let user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const isFirstUser = users.length === 0;
    user = {
      id: id("user"),
      email,
      display_name: displayName || email.split("@")[0] || "Jogador Local",
      role: isFirstUser ? "storyteller" : "player",
      status: isFirstUser ? "approved" : "pending",
    };
    users.push(user);
    setLocalUsers(users);
  } else if (!user.status) {
    const hasAssignedCharacter = getLocalCharacters().some((character) => character.owner_id === user.id);
    user.status = user.role === "storyteller" || hasAssignedCharacter ? "approved" : "pending";
    setLocalUsers(users);
  }

  setLocalSession(user.id);
  return user;
}

export function localSignOut() {
  setLocalSession(null);
}

export function localHasRole(userId: string, role: "player" | "storyteller") {
  return getLocalUsers().some((user) => user.id === userId && user.role === role);
}

export async function localSaveDraft(input: { id: string; sheet: Sheet; portraitUrl?: string | null }) {
  const user = getLocalSession();
  if (!user) throw new Error("Entre no modo local para salvar.");

  const characters = getLocalCharacters();
  const character = characters.find((item) => item.id === input.id);
  if (!character) throw new Error("Personagem local nao encontrado.");
  if (character.owner_id !== user.id && user.role !== "storyteller") throw new Error("Acesso negado.");

  character.sheet_draft = input.sheet;
  character.name = input.sheet.identity.name || character.name;
  character.clan = input.sheet.identity.clan || character.clan;
  character.concept = input.sheet.identity.concept || character.concept;
  character.status = "draft";
  character.updated_at = new Date().toISOString();
  if (input.portraitUrl !== undefined) character.portrait_url = input.portraitUrl;
  setLocalCharacters(characters);
  return { ok: true };
}

export async function localSubmitForApproval(input: { id: string }) {
  return updateLocalCharacter(input.id, { status: "pending" });
}

export async function localApproveDraft(input: { id: string }) {
  const characters = getLocalCharacters();
  const character = characters.find((item) => item.id === input.id);
  if (!character) throw new Error("Personagem local nao encontrado.");
  character.sheet_approved = character.sheet_draft;
  character.status = "approved";
  character.review_note = null;
  character.updated_at = new Date().toISOString();
  setLocalCharacters(characters);
  return { ok: true };
}

export async function localRejectDraft(input: { id: string; note: string }) {
  return updateLocalCharacter(input.id, { status: "rejected", review_note: input.note });
}

export async function localAssignPlayer(input: { id: string; ownerId: string | null }) {
  if (input.ownerId) {
    const users = getLocalUsers();
    const user = users.find((item) => item.id === input.ownerId);
    if (user) {
      user.status = "approved";
      setLocalUsers(users);
    }
  }
  return updateLocalCharacter(input.id, { owner_id: input.ownerId });
}

export async function localDeleteCharacter(input: { id: string }) {
  setLocalCharacters(getLocalCharacters().filter((character) => character.id !== input.id));
  return { ok: true };
}

export async function localCreateCharacter(input: {
  name: string;
  clan?: string;
  concept?: string;
  ownerId?: string | null;
}) {
  const now = new Date().toISOString();
  const sheet = emptySheet({ name: input.name, clan: input.clan || "", concept: input.concept || "" });
  const character: LocalCharacter = {
    id: id("character"),
    owner_id: input.ownerId ?? null,
    name: input.name,
    clan: input.clan || null,
    concept: input.concept || null,
    portrait_url: null,
    sheet_approved: sheet,
    sheet_draft: sheet,
    status: "approved",
    review_note: null,
    created_at: now,
    updated_at: now,
  };
  setLocalCharacters([character, ...getLocalCharacters()]);
  if (input.ownerId) {
    const users = getLocalUsers();
    const user = users.find((item) => item.id === input.ownerId);
    if (user) {
      user.status = "approved";
      setLocalUsers(users);
    }
  }
  return { id: character.id };
}

export async function localListPlayers() {
  return getLocalUsers()
    .filter((user) => user.role !== "storyteller")
    .map((user) => ({ id: user.id, display_name: user.display_name, status: user.status ?? "pending" }));
}

function updateLocalCharacter(idValue: string, updates: Partial<LocalCharacter>) {
  const characters = getLocalCharacters();
  const character = characters.find((item) => item.id === idValue);
  if (!character) throw new Error("Personagem local nao encontrado.");
  Object.assign(character, updates, { updated_at: new Date().toISOString() });
  setLocalCharacters(characters);
  return { ok: true };
}

export function readLocalPortrait(path: string) {
  return read<Record<string, string>>(PORTRAITS_KEY, {})[path] ?? "";
}

export async function writeLocalPortrait(path: string, file: File) {
  const portraits = read<Record<string, string>>(PORTRAITS_KEY, {});
  portraits[path] = await compressImageToDataUrl(file);

  try {
    write(PORTRAITS_KEY, portraits);
  } catch (error) {
    window.localStorage.removeItem(PORTRAITS_KEY);
    write(PORTRAITS_KEY, { [path]: portraits[path] });
  }
}

async function compressImageToDataUrl(file: File) {
  const image = await loadImage(file);
  let maxSide = 960;
  let quality = 0.72;
  let dataUrl = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Nao foi possivel processar a imagem.");
    context.drawImage(image, 0, 0, width, height);

    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length < 700_000) break;
    maxSide = Math.round(maxSide * 0.75);
    quality = Math.max(0.45, quality - 0.1);
  }

  return dataUrl;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nao foi possivel ler a imagem."));
    };
    image.src = url;
  });
}
