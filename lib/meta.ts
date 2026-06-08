import { removeAccents } from "@/lib/utils";

const META_API_VERSION = "v21.0";

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  reach: number;
};

type FetchOpts = {
  datePreset?: string;
  from?: string;
  to?: string;
  city?: string;
};

export async function fetchMetaCampaigns(opts: FetchOpts): Promise<{
  campaigns: MetaCampaign[];
  totalSpend: number;
  error?: string;
}> {
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    return { campaigns: [], totalSpend: 0, error: "not_configured" };
  }

  let insightsField: string;
  if (opts.from && opts.to) {
    insightsField = `insights.time_range({"since":"${opts.from}","until":"${opts.to}"}){spend,impressions,clicks,cpc,cpm,reach}`;
  } else {
    const preset = opts.datePreset || "last_30d";
    insightsField = `insights.date_preset(${preset}){spend,impressions,clicks,cpc,cpm,reach}`;
  }

  const apiUrl = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${AD_ACCOUNT_ID}/campaigns`
  );
  apiUrl.searchParams.set("fields", `id,name,status,${insightsField}`);
  apiUrl.searchParams.set("limit", "100");
  apiUrl.searchParams.set("access_token", ACCESS_TOKEN);

  // Log URL sem o token para debug
  const urlForLog = new URL(apiUrl.toString());
  urlForLog.searchParams.delete("access_token");
  console.log("[Meta] fetchMetaCampaigns opts:", JSON.stringify(opts));
  console.log("[Meta] API URL:", urlForLog.toString());

  try {
    const res = await fetch(apiUrl.toString(), { cache: "no-store" });
    const data = await res.json();

    if (data.error) {
      console.error("[Meta] API error:", JSON.stringify(data.error));
      return { campaigns: [], totalSpend: 0, error: data.error.message };
    }

    const normalizedCity = opts.city ? removeAccents(opts.city) : null;

    type RawInsights = {
      spend?: string; impressions?: string; clicks?: string;
      cpc?: string; cpm?: string; reach?: string;
    };
    type RawCampaign = {
      id: string; name: string; status: string;
      insights?: { data?: RawInsights[] };
    };

    const rawCampaigns = data.data as RawCampaign[] ?? [];
    console.log("[Meta] Raw campaigns total:", rawCampaigns.length);
    if (rawCampaigns.length > 0) {
      console.log("[Meta] Sample raw campaign:", JSON.stringify({
        name: rawCampaigns[0].name,
        status: rawCampaigns[0].status,
        insights: rawCampaigns[0].insights,
      }));
    }

    const campaigns: MetaCampaign[] = rawCampaigns
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
    console.log("[Meta] After filter (REGIONAL + city):", campaigns.length, "campaigns, totalSpend:", totalSpend);
    console.log("[Meta] Campaign names:", campaigns.map((c) => c.name));
    return { campaigns, totalSpend };
  } catch (err) {
    console.error("[Meta] Fetch exception:", err);
    return { campaigns: [], totalSpend: 0, error: "Falha ao conectar com a Meta API" };
  }
}
