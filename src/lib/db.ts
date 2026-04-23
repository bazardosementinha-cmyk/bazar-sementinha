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

export type ItemSummary = Pick<
  Item,
  | "id"
  | "short_id"
  | "title"
  | "category"
  | "condition"
  | "size"
  | "price"
  | "price_from"
  | "status"
  | "created_at"
>;

export type Photo = {
  id: number;
  item_id: string;
  storage_path: string;
  position: number;
};

type OrderItemRow = {
  order_id: string;
  item_id: string;
};

type OrderRow = {
  id: string;
  status: string;
  expires_at: string | null;
  pickup_deadline_at: string | null;
};

function getOrderDeadline(order: Pick<OrderRow, "pickup_deadline_at" | "expires_at">): string | null {
  return order.pickup_deadline_at || order.expires_at || null;
}

function isActiveReservedOrder(order: OrderRow, nowMs: number): boolean {
  if (order.status !== "reserved") return false;

  const deadline = getOrderDeadline(order);
  if (!deadline) return true;

  const deadlineMs = new Date(deadline).getTime();
  if (Number.isNaN(deadlineMs)) return true;

  return deadlineMs > nowMs;
}

async function getLockedItemIds(itemIds: string[]): Promise<Set<string>> {
  if (!itemIds.length) return new Set<string>();

  const s = supabaseService();

  const { data: orderItems, error: oiErr } = await s
    .from("order_items")
    .select("order_id,item_id")
    .in("item_id", itemIds);

  if (oiErr || !orderItems?.length) return new Set<string>();

  const refs = orderItems as OrderItemRow[];
  const orderIds = Array.from(new Set(refs.map((r) => r.order_id))).filter(Boolean);
  if (!orderIds.length) return new Set<string>();

  const { data: orders, error: oErr } = await s
    .from("orders")
    .select("id,status,expires_at,pickup_deadline_at")
    .in("id", orderIds);

  if (oErr || !orders?.length) return new Set<string>();

  const nowMs = Date.now();
  const activeOrderIds = new Set(
    (orders as OrderRow[])
      .filter((order) => isActiveReservedOrder(order, nowMs))
      .map((order) => order.id)
  );

  if (!activeOrderIds.size) return new Set<string>();

  return new Set(
    refs
      .filter((ref) => activeOrderIds.has(ref.order_id))
      .map((ref) => ref.item_id)
  );
}

export async function getPublicItems(params?: { category?: string; status?: ItemStatus | "all" }) {
  const supabase = supabasePublic();

  let q = supabase
    .from("items")
    .select("id,short_id,title,category,condition,size,price,price_from,status,created_at")
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "all") {
    q = q.eq("status", params.status);
  } else {
    q = q.eq("status", "available");
  }

  if (params?.category && params.category !== "all") {
    q = q.eq("category", params.category);
  }

  const { data, error } = await q;
  if (error) throw error;

  const items = (data ?? []) as ItemSummary[];
  if (!items.length) return [];

  const lockedIds = await getLockedItemIds(items.map((item) => item.id));
  return items.filter((item) => !lockedIds.has(item.id));
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

export async function signedUrlsForPaths(paths: string[]) {
  if (!paths.length) return {};

  const s = supabaseService();
  const { data, error } = await s.storage.from("items").createSignedUrls(paths, 60 * 30);

  if (error || !data) return {};

  return data.reduce<Record<string, string>>((acc, row) => {
    if (!row?.path) return acc;
    if (!row?.signedUrl) return acc;
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