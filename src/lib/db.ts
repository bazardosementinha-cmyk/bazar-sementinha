import { supabasePublic } from "@/lib/supabase/public";
import { supabaseService } from "@/lib/supabase/service";
import type { ItemStatus } from "@/lib/utils";

export type Item = {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  size: string | null;
  price: number;
  price_from: number | null;
  status: ItemStatus;
  source: string | null;
  source_url: string | null;
  created_at: string;
};

export type Photo = { id: number; item_id: string; storage_path: string; position: number };

export async function getPublicItems(params?: { category?: string; status?: ItemStatus | "all" }) {
  const supabase = supabasePublic();
  let q = supabase
    .from("items")
    .select("id,short_id,title,category,condition,size,price,price_from,status,created_at")
    .order("created_at", { ascending: false });

  // public should see only available/reserved (and sold if you quiser manter histórico)
  q = q.in("status", ["available", "reserved", "sold"]);

  if (params?.category && params.category !== "all") q = q.eq("category", params.category);
  if (params?.status && params.status !== "all") q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw error;
  return data as any[];
}

export async function getItemByShortId(shortId: string) {
  const supabase = supabasePublic();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("short_id", shortId)
    .maybeSingle();
  if (error) throw error;
  return data as Item | null;
}

export async function getItemPhotos(itemId: string) {
  const supabase = supabasePublic();
  const { data, error } = await supabase
    .from("item_photos")
    .select("id,item_id,storage_path,position")
    .eq("item_id", itemId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Photo[];
}

export async function signedUrlsForPaths(paths: string[], expiresInSeconds = 60 * 60) {
  const s = supabaseService();
  const { data, error } = await s.storage.from("items").createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  // data: [{ path, signedUrl }]
  return data.reduce<Record<string, string>>((acc, row) => {
    acc[row.path] = row.signedUrl;
    return acc;
  }, {});
}

export async function signedUrlForPath(path: string, expiresInSeconds = 60 * 60) {
  const s = supabaseService();
  const { data, error } = await s.storage.from("items").createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
