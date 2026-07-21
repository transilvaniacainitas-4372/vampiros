import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sheetSchema, emptySheet, type Sheet } from "./character-schema";
import { z } from "zod";
import { isLocalMode } from "./local-mode";
import {
  localApproveDraft,
  localAssignPlayer,
  localCreateCharacter,
  localDeleteCharacter,
  localDeletePlayer,
  localListPlayers,
  localRejectDraft,
  localSaveDraft,
  localSubmitForApproval,
  localUpdatePlayer,
} from "./local-data";

async function assertStoryteller(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "storyteller" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas o mestre pode fazer isto.");
}

const createCharacterRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; clan?: string; concept?: string; ownerId?: string | null }) =>
    z.object({
      name: z.string().min(1).max(80),
      clan: z.string().max(60).optional().default(""),
      concept: z.string().max(120).optional().default(""),
      ownerId: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const sheet = emptySheet({ name: data.name, clan: data.clan, concept: data.concept });
    const { data: row, error } = await context.supabase
      .from("characters")
      .insert({
        owner_id: data.ownerId ?? null,
        name: data.name,
        clan: data.clan || null,
        concept: data.concept || null,
        sheet_approved: sheet,
        sheet_draft: sheet,
        status: "approved",
      })
      .select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

const saveDraftRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; sheet: unknown; portraitUrl?: string | null }) =>
    z.object({ id: z.string().uuid(), sheet: sheetSchema, portraitUrl: z.string().max(500).nullable().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const updates: any = { sheet_draft: data.sheet as Sheet, status: "draft" };
    if (data.portraitUrl !== undefined) updates.portrait_url = data.portraitUrl;
    const { error } = await context.supabase.from("characters").update(updates).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const submitForApprovalRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("characters").update({ status: "pending" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const approveDraftRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { data: row, error: readErr } = await context.supabase
      .from("characters").select("sheet_draft").eq("id", data.id).single();
    if (readErr) throw new Error(readErr.message);
    const { error } = await context.supabase
      .from("characters")
      .update({ sheet_approved: row.sheet_draft, status: "approved", review_note: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const rejectDraftRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; note: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("characters")
      .update({ status: "rejected", review_note: data.note })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const assignPlayerRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; ownerId: string | null }) =>
    z.object({ id: z.string().uuid(), ownerId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("characters").update({ owner_id: data.ownerId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteCharacterRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { error } = await context.supabase.from("characters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const listPlayersRemote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles").select("id, display_name").order("display_name");
    if (error) throw new Error(error.message);
    const profiles = data ?? [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(authError.message);
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    const userIds = new Set([
      ...profiles.map((profile) => profile.id),
      ...(authUsers.users ?? []).map((user) => user.id),
    ]);

    return Promise.all(
      [...userIds].map(async (userId) => {
        const profile = profilesById.get(userId);
        const authUser = (authUsers.users ?? []).find((user) => user.id === userId);
        const { data: isStoryteller } = await context.supabase.rpc("has_role", {
          _user_id: userId,
          _role: "storyteller",
        });

        return {
          id: userId,
          display_name:
            profile?.display_name ??
            (authUser?.user_metadata?.display_name as string | undefined) ??
            authUser?.email?.split("@")[0] ??
            "Jogador",
          email: authUser?.email ?? "",
          role: isStoryteller ? "storyteller" : "player",
          status: "active",
        };
      }),
    );
  });

const updatePlayerRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; displayName: string; email: string }) =>
    z.object({
      id: z.string().uuid(),
      displayName: z.string().trim().min(1).max(80),
      email: z.string().trim().email().max(254),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", data.id);
    if (profileError) throw new Error(profileError.message);

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (authError) throw new Error(authError.message);
    return { ok: true };
  });

const deletePlayerRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStoryteller(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("O mestre nao pode apagar a propria conta em uso.");

    const { error: characterError } = await context.supabase
      .from("characters")
      .update({ owner_id: null })
      .eq("owner_id", data.id);
    if (characterError) throw new Error(characterError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCharacter = isLocalMode
  ? async ({ data }: { data: { name: string; clan?: string; concept?: string; ownerId?: string | null } }) =>
      localCreateCharacter(data)
  : createCharacterRemote;

export const saveDraft = isLocalMode
  ? async ({ data }: { data: { id: string; sheet: Sheet; portraitUrl?: string | null } }) => localSaveDraft(data)
  : saveDraftRemote;

export const submitForApproval = isLocalMode
  ? async ({ data }: { data: { id: string } }) => localSubmitForApproval(data)
  : submitForApprovalRemote;

export const approveDraft = isLocalMode
  ? async ({ data }: { data: { id: string } }) => localApproveDraft(data)
  : approveDraftRemote;

export const rejectDraft = isLocalMode
  ? async ({ data }: { data: { id: string; note: string } }) => localRejectDraft(data)
  : rejectDraftRemote;

export const assignPlayer = isLocalMode
  ? async ({ data }: { data: { id: string; ownerId: string | null } }) => localAssignPlayer(data)
  : assignPlayerRemote;

export const deleteCharacter = isLocalMode
  ? async ({ data }: { data: { id: string } }) => localDeleteCharacter(data)
  : deleteCharacterRemote;

export const listPlayers = isLocalMode ? async () => localListPlayers() : listPlayersRemote;

export const updatePlayer = isLocalMode
  ? async ({ data }: { data: { id: string; displayName: string; email: string } }) => localUpdatePlayer(data)
  : updatePlayerRemote;

export const deletePlayer = isLocalMode
  ? async ({ data }: { data: { id: string } }) => localDeletePlayer(data)
  : deletePlayerRemote;
