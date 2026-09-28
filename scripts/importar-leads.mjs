// Importa as duas planilhas de leads do EFAGRO Experience para a tabela `leads`.
// Simulação por padrão. Só escreve com --commit.
//
// node scripts/importar-leads.mjs "<csv antigo>" "<csv novo>" [--commit]
//
// Este script roda fora do Next (Node avulso), então não pode importar `lib/leads.ts`
// (que usa TypeScript e é pensado para rodar dentro do app). Por isso as regras de
// limpeza abaixo (isTestLead, normalizeEmail, normalizeLote, leadIdFrom, utmsFromUrl)
// são uma cópia em JavaScript puro das mesmas funções de `lib/leads.ts`.
// `lib/leads.ts` é a FONTE DA VERDADE dessas regras: se mudar lá, mude aqui também.

import fs from "node:fs";
import { createHash } from "node:crypto";

const EVENT_ID = "saopaulo";
const COMMIT = process.argv.includes("--commit");
const [csvAntigo, csvNovo] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!csvAntigo || !csvNovo) {
  console.error("Uso: node scripts/importar-leads.mjs <csv-antigo> <csv-novo> [--commit]");
  process.exit(1);
}

// ── Ambiente (nunca imprimir valor) ─────────────────────────────────────────
const env = Object.fromEntries(
  fs.readFileSync("/Users/rafael/circuito-agro/.env.local", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Mesmas regras de lib/leads.ts ───────────────────────────────────────────
const PADRAO_TESTE = /teste|testte|exemplo/i;
const LOTES = ["basic", "standard", "vip", "gold"];

const isTestLead = (nome, email) => PADRAO_TESTE.test(String(nome ?? "")) || PADRAO_TESTE.test(String(email ?? ""));
const normalizeEmail = (v) => String(v ?? "").trim().toLowerCase();
const normalizeLote = (v) => {
  const x = String(v ?? "").trim().toLowerCase();
  return LOTES.includes(x) ? x : "nao_informado";
};
const leadIdFrom = (id, email, data) => {
  const limpo = String(id ?? "").trim();
  if (limpo) return limpo;
  return createHash("sha1").update(`${normalizeEmail(email)}|${data}`).digest("hex").slice(0, 24);
};
const UTMS_VAZIAS = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
function utmsFromUrl(url) {
  if (!url) return { ...UTMS_VAZIAS };
  let sp;
  try { sp = new URL(url).searchParams; } catch { return { ...UTMS_VAZIAS }; }
  return {
    utm_source: sp.get("utm_source"), utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"), utm_term: sp.get("utm_term"),
    utm_content: sp.get("utm_content"),
  };
}

// ── CSV com aspas ───────────────────────────────────────────────────────────
function parseCSV(texto) {
  const linhas = [];
  let campo = "", linha = [], dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') dentroDeAspas = false;
      else campo += c;
    } else if (c === '"') dentroDeAspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas.filter((l) => l.some((v) => v !== ""));
  return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h.trim(), l[i] ?? ""])));
}

// ── Datas de Brasília para UTC ──────────────────────────────────────────────
// Lista antiga: "15-7-2026" ou "16-07-2026" (só data, sem hora)
// Lista nova:   "28/09/2026 11:00:28"
function dataParaUTC(valor) {
  const v = String(valor ?? "").trim();
  let m = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const [, d, mes, a] = m;
    return new Date(`${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00-03:00`).toISOString();
  }
  m = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const [, d, mes, a, h, mi, ss] = m;
    return new Date(`${a}-${mes}-${d}T${h}:${mi}:${ss}-03:00`).toISOString();
  }
  return null;
}

// ── Monta os registros ──────────────────────────────────────────────────────
function daListaAntiga(linhas) {
  const out = [], descartados = [];
  for (const r of linhas) {
    const nome = r["Qual o seu nome?"], email = r["Qual seu melhor e-mail?"];
    if (isTestLead(nome, email)) { descartados.push(r); continue; }
    const e = normalizeEmail(email);
    const data = dataParaUTC(r["data_preenchimento"]);
    if (!e || !data) { descartados.push(r); continue; }
    out.push({
      id: leadIdFrom(null, e, data), event_id: EVENT_ID,
      nome: (nome ?? "").trim() || null, email: e,
      whatsapp: (r["Qual o seu DDD + WhatsApp?"] ?? "").trim() || null,
      lote: normalizeLote(r["Ingresso"]), origem: "planilha_antiga",
      utm_source: r["utm_source"] || null, utm_medium: r["utm_medium"] || null,
      utm_campaign: r["utm_campaign"] || null, utm_term: r["utm_term"] || null,
      utm_content: r["utm_content"] || null,
      lead_date: data, payload: r,
    });
  }
  return { out, descartados };
}

function daListaNova(linhas) {
  const out = [], descartados = [];
  for (const r of linhas) {
    const nome = r["Nome"], email = r["E-mail"];
    if (isTestLead(nome, email)) { descartados.push(r); continue; }
    const e = normalizeEmail(email);
    const data = dataParaUTC(r["Data/Hora"]);
    if (!e || !data) { descartados.push(r); continue; }
    out.push({
      id: leadIdFrom(r["ID"], e, data), event_id: EVENT_ID,
      nome: (nome ?? "").trim() || null, email: e,
      whatsapp: (r["WhatsApp"] ?? "").trim() || null,
      lote: normalizeLote(r["Ingresso escolhido"]), origem: "lp_nova",
      ...utmsFromUrl(r["Página"]),
      lead_date: data, payload: r,
    });
  }
  return { out, descartados };
}

// ── Execução ────────────────────────────────────────────────────────────────
const a = daListaAntiga(parseCSV(fs.readFileSync(csvAntigo, "utf8")));
const b = daListaNova(parseCSV(fs.readFileSync(csvNovo, "utf8")));

console.log(`lista antiga: ${a.out.length + a.descartados.length} linhas | ${a.descartados.length} descartadas | ${a.out.length} válidas`);
console.log(`lista nova:   ${b.out.length + b.descartados.length} linhas | ${b.descartados.length} descartadas | ${b.out.length} válidas`);

const todos = [...a.out, ...b.out];
const porId = new Map(todos.map((l) => [l.id, l]));
const registros = [...porId.values()];
const emails = new Set(registros.map((l) => l.email));

console.log(`\nregistros a gravar: ${registros.length} | e-mails distintos: ${emails.size}`);
const porLote = {};
for (const l of registros) porLote[l.lote] = (porLote[l.lote] ?? 0) + 1;
console.log("por lote:", porLote);

if (!COMMIT) { console.log("\n>>> SIMULAÇÃO. Nada foi escrito. Rode com --commit para aplicar."); process.exit(0); }

for (let i = 0; i < registros.length; i += 500) {
  const bloco = registros.slice(i, i + 500);
  const res = await fetch(`${SB_URL}/rest/v1/leads?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(bloco),
  });
  if (!res.ok) { console.error("FALHOU no bloco", i, res.status, (await res.text()).slice(0, 600)); process.exit(1); }
  console.log(`  gravado ${Math.min(i + 500, registros.length)}/${registros.length}`);
}

const conf = await fetch(`${SB_URL}/rest/v1/leads?event_id=eq.${EVENT_ID}&select=email,lote`, {
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
});
const gravados = await conf.json();
console.log(`\nCONFERÊNCIA no banco: ${gravados.length} linhas | ${new Set(gravados.map((l) => l.email)).size} e-mails distintos`);
