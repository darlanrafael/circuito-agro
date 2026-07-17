import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const eventId = new URL(req.url).searchParams.get("event_id");
  let q = supabase.from("event_costs").select("*").order("created_at", { ascending: true });
  if (eventId) q = q.eq("event_id", eventId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { event_id, categoria, descricao, valor } = await req.json();
  const { data, error } = await supabase
    .from("event_costs")
    .insert([{ event_id, categoria, descricao: descricao ?? null, valor: Number(valor) || 0 }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const { error } = await supabase.from("event_costs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
