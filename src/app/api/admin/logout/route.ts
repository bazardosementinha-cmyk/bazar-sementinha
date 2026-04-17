import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function handle(req: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // ✅ Nunca redirecionar para localhost em produção.
  // Usa a própria URL da request (/api/admin/logout) como base e troca o pathname.
  const url = new URL(req.url);
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
