import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/meta";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const datePreset = searchParams.get("date_preset") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const since = searchParams.get("since") ?? undefined;
  const city = searchParams.get("city") ?? undefined;

  // A régua de campanha é o conjunto de eventos ativos. Arquivado não conta.
  const { data: events, error } = await supabase
    .from("events")
    .select("city, utm_nomenclatura, utm_aliases")
    .eq("is_archived", false);

  if (error) {
    console.error("[Meta] Erro ao ler eventos para a régua:", error.message);
    return NextResponse.json({ error: "Erro ao ler eventos." }, { status: 500 });
  }

  // Régua vazia não é resultado, é falha. Sem nenhum evento, `campaignBelongsToCircuit`
  // reprova toda campanha e a rota responderia 200 com `totalSpend: 0` — o Dashboard leria
  // isso como "Meta carregada, investimento zero" e mostraria R$ 0,00 como número medido,
  // sem nenhum aviso. Respondendo erro, ele cai no caminho de falha, que é o que é.
  if (!events || events.length === 0) {
    console.error("[Meta] Nenhum evento ativo para montar a régua de campanha.");
    return NextResponse.json({ error: "Nenhum evento ativo para montar a régua." }, { status: 500 });
  }

  const result = await fetchMetaCampaigns({ datePreset, from, to, since, city, events });

  if (result.error === "not_configured") {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ campaigns: result.campaigns, totalSpend: result.totalSpend });
}
