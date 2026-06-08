import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rawIds = searchParams.get("event_ids");
  const eventIds = rawIds ? rawIds.split(",").filter(Boolean) : null;

  let query = supabase
    .from("sales")
    .select("id, event_id, ticket_type, faturamento_bruto, faturamento_liquido, sale_date, status, refunded_at")
    .order("sale_date", { ascending: false });

  if (from) query = query.gte("sale_date", from);
  if (to)   query = query.lte("sale_date", to);
  if (eventIds?.length) query = query.in("event_id", eventIds);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
