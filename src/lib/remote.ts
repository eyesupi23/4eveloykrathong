import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BaseId, FlowerId, KrathongConfig } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when the env vars aren't set: the site then runs offline with demo krathongs. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const isOnline = supabase !== null;

interface Row {
  id: string;
  base: BaseId;
  flower: FlowerId;
  image: string | null;
  wish: string;
  name: string;
  created_at: string;
}

export interface RemoteKrathong {
  id: string;
  createdAt: string;
  config: KrathongConfig;
}

const toRemote = (r: Row): RemoteKrathong => ({
  id: r.id,
  createdAt: r.created_at,
  config: { base: r.base, flower: r.flower, image: r.image, wish: r.wish, name: r.name },
});

/** Save a newly floated krathong; returns its id. */
export async function insertKrathong(cfg: KrathongConfig): Promise<string> {
  if (!supabase) throw new Error("offline");
  const { data, error } = await supabase
    .from("krathongs")
    .insert({ base: cfg.base, flower: cfg.flower, image: cfg.image, wish: cfg.wish, name: cfg.name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Total krathongs ever floated (for the counter). */
export async function countKrathongs(): Promise<number | null> {
  if (!supabase) return null;
  const { count, error } = await supabase.from("krathongs").select("id", { count: "exact", head: true });
  return error ? null : (count ?? 0);
}

/** A random handful, skipping the ones already on screen. */
export async function fetchRandom(n: number, exclude: string[]): Promise<RemoteKrathong[]> {
  if (!supabase || n <= 0) return [];
  const { data, error } = await supabase.rpc("random_krathongs", { n, exclude });
  return error || !data ? [] : (data as Row[]).map(toRemote);
}

/** created_at of the newest krathong (server clock), or null if there are none yet. */
export async function latestCreatedAt(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("krathongs")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.created_at ?? null;
}

/** Krathongs floated after the given time, oldest first. */
export async function fetchSince(since: string): Promise<RemoteKrathong[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("krathongs")
    .select("*")
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20);
  return error || !data ? [] : (data as Row[]).map(toRemote);
}

/** Admin: delete everything. The server checks the code. */
export async function adminClearAll(code: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("admin_clear_krathongs", { code });
  if (error) throw error;
}
