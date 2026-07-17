"use client";

import { useEffect, useState, useCallback } from "react";
import type { EventCost } from "../types";
import { sumCosts } from "@/lib/finance";

const CATEGORIAS = [
  { v: "espaco", label: "Espaço/Locação" },
  { v: "staff", label: "Staff" },
  { v: "alimentacao", label: "Alimentação" },
  { v: "transmissao", label: "Transmissão" },
  { v: "deslocamento", label: "Deslocamento" },
  { v: "outros", label: "Outros" },
];

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function EventCostsEditor({ eventId }: { eventId: string }) {
  const [costs, setCosts] = useState<EventCost[]>([]);
  const [categoria, setCategoria] = useState("espaco");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const inputStyle: React.CSSProperties = { background: "#0d0d0d", border: "1px solid #333", color: "white", borderRadius: 8, padding: "8px 10px", fontSize: 13, outline: "none" };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/events/costs?event_id=${eventId}`);
      const d = await r.json();
      setCosts(Array.isArray(d) ? d : []);
    } catch { setCosts([]); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    const v = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (!v) return;
    setSaving(true);
    try {
      await fetch("/api/events/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, categoria, descricao, valor: v }),
      });
      setDescricao(""); setValor("");
      await load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    await fetch("/api/events/costs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div style={{ borderRadius: 12, border: "1px solid #252525", background: "#111", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4b5563" }}>Custos do evento</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#eab308", fontVariantNumeric: "tabular-nums" }}>{fmt(sumCosts(costs))}</span>
      </div>

      {costs.length === 0 && (
        <p style={{ fontSize: 12, color: "#4b5563", marginBottom: 12 }}>Nenhum custo lançado ainda.</p>
      )}

      {costs.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #1f1f1f", fontSize: 13, color: "#9ca3af" }}>
          <span>
            {CATEGORIAS.find((k) => k.v === c.categoria)?.label ?? c.categoria}
            {c.descricao ? <span style={{ color: "#6b7280" }}> · {c.descricao}</span> : null}
          </span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "white", fontVariantNumeric: "tabular-nums" }}>{fmt(c.valor)}</span>
            <button type="button" onClick={() => remove(c.id)} aria-label="Remover custo"
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
          </span>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={inputStyle}>
          {CATEGORIAS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
        </select>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional)" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="Valor R$"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} style={{ ...inputStyle, width: 110 }} />
        <button type="button" onClick={add} disabled={saving}
          style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
