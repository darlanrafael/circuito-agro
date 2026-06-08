import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const datePreset = searchParams.get("date_preset") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const city = searchParams.get("city") ?? undefined;

  const result = await fetchMetaCampaigns({ datePreset, from, to, city });

  if (result.error === "not_configured") {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ campaigns: result.campaigns, totalSpend: result.totalSpend });
}
