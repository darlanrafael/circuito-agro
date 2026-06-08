import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const META_API_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    return NextResponse.json(
      { error: "not_configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const datePreset = searchParams.get("date_preset");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const city = searchParams.get("city");

  function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  }

  let insightsField: string;
  if (from && to) {
    insightsField = `insights.time_range({"since":"${from}","until":"${to}"}){spend,impressions,clicks,cpc,cpm,reach}`;
  } else {
    const preset = datePreset || "last_30d";
    insightsField = `insights.date_preset(${preset}){spend,impressions,clicks,cpc,cpm,reach}`;
  }

  const apiUrl = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${AD_ACCOUNT_ID}/campaigns`
  );
  apiUrl.searchParams.set("fields", `id,name,status,${insightsField}`);
  apiUrl.searchParams.set("limit", "100");
  apiUrl.searchParams.set("access_token", ACCESS_TOKEN);

  try {
    const res = await fetch(apiUrl.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    type RawInsights = { spend?: string; impressions?: string; clicks?: string; cpc?: string; cpm?: string; reach?: string };
    type RawCampaign = { id: string; name: string; status: string; insights?: { data?: RawInsights[] } };

    const normalizedCity = city ? removeAccents(city) : null;

    const campaigns = (data.data as RawCampaign[] ?? [])
      .filter((c) => {
        const name = removeAccents(c.name);
        if (!name.includes("REGIONAL")) return false;
        if (normalizedCity && !name.includes(normalizedCity)) return false;
        return true;
      })
      .map((c) => {
        const ins = c.insights?.data?.[0];
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          spend: parseFloat(ins?.spend ?? "0"),
          impressions: parseInt(ins?.impressions ?? "0", 10),
          clicks: parseInt(ins?.clicks ?? "0", 10),
          cpc: parseFloat(ins?.cpc ?? "0"),
          cpm: parseFloat(ins?.cpm ?? "0"),
          reach: parseInt(ins?.reach ?? "0", 10),
        };
      });

    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

    return NextResponse.json({ campaigns, totalSpend });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com a Meta API" }, { status: 500 });
  }
}
