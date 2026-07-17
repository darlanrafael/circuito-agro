"use client";

import { useState, useRef, useEffect } from "react";
import type { AppEvent, EventStatus, BandeiraTipo } from "../types";
import { StateFlagSVG } from "./StateFlagSVG";
import { UtmTagsInput } from "./UtmTagsInput";
import { EventCostsEditor } from "./EventCostsEditor";

function UrlPreviewInForm({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);

  if (!url.trim()) {
    return (
      <div style={{ width: 54, height: 36, borderRadius: 4, background: "#1f1f1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "#4b5563" }}>...</span>
      </div>
    );
  }
  if (failed) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 54, height: 36, borderRadius: 4, background: "#2d0f0f", border: "1px solid #7f1d1d", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg className="h-4 w-4" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 500 }}>URL inválida</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: 54, height: 36, borderRadius: 4, objectFit: "cover" }}
    />
  );
}

type FormData = Omit<AppEvent, "id">;
type Props = {
  initialData?: Partial<AppEvent>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  isEdit?: boolean;
};

const STATES = ["MT", "GO", "PR", "MG", "MS", "BA", "SP", "SC", "RS", "RJ", "ES", "PE", "CE", "PA", "AM"];
const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "adiado",       label: "Adiado" },
  { value: "realizado",    label: "Realizado" },
  { value: "cancelado",    label: "Cancelado" },
];

const EMPTY: FormData = {
  city: "", state: "MT", date: "",
  individualTickets: 0, doubleTickets: 0, capacity: 350,
  trafficInvestment: 0, participantes_final: 0,
  faturamento_bruto: 0, faturamento_liquido: 0,
  stateName: "", status: "em_andamento",
  bandeira_tipo: "auto", bandeira_url: "", bandeira_custom: "",
  utm_nomenclatura: "", utm_aliases: [], is_archived: false,
};

function formatBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function parseCurrency(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes(",")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(s.replace(/[^\d.]/g, "")) || 0;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EventForm({ initialData, onSubmit, onCancel, isEdit }: Props) {
  const [form, setForm]                 = useState<FormData>({ ...EMPTY, ...initialData });
  const [rawFaturamento, setRawFaturamento] = useState<string>(
    initialData?.faturamento_bruto ? formatBR(initialData.faturamento_bruto) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY, ...initialData });
      setRawFaturamento(initialData.faturamento_bruto ? formatBR(initialData.faturamento_bruto) : "");
    }
  }, [initialData]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Arquivo muito grande. Máximo: 2MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploadError("");
    const b64 = await fileToBase64(file);
    set("bandeira_custom", b64);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.city.trim())                                   { setError("Nome da cidade é obrigatório."); return; }
    if (!form.date)                                          { setError("Data é obrigatória."); return; }
    if (form.bandeira_tipo === "url" && !form.bandeira_url.trim()) { setError("URL da bandeira é obrigatória."); return; }
    if (form.bandeira_tipo === "upload" && !form.bandeira_custom)  { setError("Faça upload de uma imagem."); return; }
    setSubmitting(true);
    try {
      const bruto = parseCurrency(rawFaturamento);
      await onSubmit({
        ...form,
        faturamento_bruto:  bruto,
        faturamento_liquido: parseFloat((bruto * 0.8).toFixed(2)),
        stateName:           form.state,
        individualTickets:   Number(form.individualTickets) || 0,
        doubleTickets:       Number(form.doubleTickets) || 0,
        trafficInvestment:   parseFloat(String(form.trafficInvestment).replace(",", ".")) || 0,
        participantes_final: Number(form.participantes_final) || 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar evento.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0d0d0d",
    border: "1px solid #333",
    color: "white",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#4b5563",
    marginBottom: 4,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div style={{ background: "#2d0f0f", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Cidade + Estado + Data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Cidade *</label>
          <input style={inputStyle} placeholder="Ex: Cuiabá" value={form.city}
            onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Estado *</label>
          <select style={inputStyle} value={form.state} onChange={(e) => set("state", e.target.value)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Data *</label>
          <input type="date" style={inputStyle} value={form.date}
            onChange={(e) => set("date", e.target.value)} />
        </div>
      </div>

      {/* Ingressos + Capacidade */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label style={labelStyle}>Ingressos individuais</label>
          <input type="text" inputMode="numeric" style={inputStyle}
            value={form.individualTickets === 0 ? "" : form.individualTickets}
            onChange={(e) => set("individualTickets", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Ingressos duplos</label>
          <input type="text" inputMode="numeric" style={inputStyle}
            value={form.doubleTickets === 0 ? "" : form.doubleTickets}
            onChange={(e) => set("doubleTickets", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Capacidade</label>
          <input type="number" min="1" style={inputStyle} value={form.capacity}
            onChange={(e) => set("capacity", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Investimento tráfego (R$)</label>
          <input type="text" inputMode="decimal" style={inputStyle}
            value={form.trafficInvestment === 0 ? "" : form.trafficInvestment}
            onChange={(e) => set("trafficInvestment", Number(e.target.value))} />
        </div>
      </div>

      {/* Resultados finais */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Participantes finais</label>
          <input type="text" inputMode="numeric" style={inputStyle}
            value={form.participantes_final === 0 ? "" : form.participantes_final}
            onChange={(e) => set("participantes_final", Number(e.target.value))} />
        </div>
        <div>
          <label style={labelStyle}>Faturamento bruto do evento (R$)</label>
          <input type="text" inputMode="decimal" style={inputStyle}
            placeholder="Ex: 1.500,50 ou 1500.50"
            value={rawFaturamento}
            onChange={(e) => setRawFaturamento(e.target.value)} />
        </div>
      </div>

      {/* Status + UTM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status}
            onChange={(e) => set("status", e.target.value as EventStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Nomenclatura UTM</label>
          <input style={inputStyle} placeholder="Ex: CUIABA" value={form.utm_nomenclatura}
            onChange={(e) => set("utm_nomenclatura", e.target.value.toUpperCase())} />
        </div>
      </div>

      {/* UTMs adicionais para atribuição */}
      <div>
        <label style={labelStyle}>UTMs adicionais para atribuição</label>
        <UtmTagsInput value={form.utm_aliases ?? []} onChange={(v) => set("utm_aliases", v)} />
        <p style={{ marginTop: 4, fontSize: 11, color: "#4b5563" }}>
          Além da nomenclatura principal, adicione códigos usados nos anúncios (ex.: EM, LEM). Vendas e investimento casam por qualquer um deles.
        </p>
      </div>

      {/* Bandeira */}
      <div style={{ borderRadius: 12, border: "1px solid #252525", background: "#111", padding: 16 }}>
        <label style={{ ...labelStyle, marginBottom: 12 }}>Bandeira / Imagem do evento</label>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          {(["auto", "upload", "url"] as BandeiraTipo[]).map((tipo) => (
            <label key={tipo} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" name="bandeira_tipo" value={tipo} checked={form.bandeira_tipo === tipo}
                onChange={() => {
                  setUploadError("");
                  if (tipo === "auto") {
                    setForm((prev) => ({ ...prev, bandeira_tipo: "auto", bandeira_url: "", bandeira_custom: "" }));
                    if (fileRef.current) fileRef.current.value = "";
                  } else if (tipo === "upload") {
                    setForm((prev) => ({ ...prev, bandeira_tipo: "upload", bandeira_url: "" }));
                  } else {
                    setForm((prev) => ({ ...prev, bandeira_tipo: "url", bandeira_custom: "" }));
                    if (fileRef.current) fileRef.current.value = "";
                  }
                }}
                className="accent-emerald-600" />
              <span style={{ fontSize: 13, color: "#9ca3af", textTransform: "capitalize" }}>
                {tipo === "auto" ? "Automática (SVG)" : tipo === "upload" ? "Upload" : "URL"}
              </span>
            </label>
          ))}
        </div>

        {form.bandeira_tipo === "upload" && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#1f1f1f] file:text-[#22c55e] file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer"
              style={{ color: "#6b7280" }} />
            {uploadError && <p style={{ marginTop: 4, fontSize: 11, color: "#ef4444" }}>{uploadError}</p>}
            <p style={{ marginTop: 4, fontSize: 11, color: "#4b5563" }}>Máximo 2MB. PNG, JPG ou SVG.</p>
          </div>
        )}

        {form.bandeira_tipo === "url" && (
          <div>
            <input style={inputStyle} placeholder="https://..." value={form.bandeira_url}
              onChange={(e) => set("bandeira_url", e.target.value)} />
            <p style={{ marginTop: 4, fontSize: 11, color: "#4b5563" }}>Se a URL falhar, o SVG automático é exibido.</p>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
          <span style={{ fontSize: 11, color: "#4b5563", flexShrink: 0 }}>Preview:</span>

          {form.bandeira_tipo === "auto" && (
            form.state
              ? <StateFlagSVG state={form.state} size={36} bandeira_tipo="auto" bandeira_url="" bandeira_custom="" />
              : <span style={{ fontSize: 11, color: "#4b5563", fontStyle: "italic" }}>Preencha o campo UF</span>
          )}

          {form.bandeira_tipo === "upload" && (
            form.bandeira_custom
              ? <img src={form.bandeira_custom} alt="" style={{ width: 54, height: 36, borderRadius: 4, objectFit: "cover" }} />
              : <div style={{ width: 54, height: 36, borderRadius: 4, background: "#1f1f1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "#4b5563" }}>—</span>
                </div>
          )}

          {form.bandeira_tipo === "url" && <UrlPreviewInForm url={form.bandeira_url} />}

          <span style={{ fontSize: 13, color: "#6b7280" }}>{form.city || "Cidade"} · {form.state}</span>
        </div>
      </div>

      {/* Custos operacionais (só na edição, quando já existe id) */}
      {isEdit && initialData?.id && (
        <EventCostsEditor eventId={String(initialData.id)} />
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            flex: "0 0 auto",
            minWidth: 140,
            background: "#22c55e",
            color: "white",
            fontWeight: 700,
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            fontSize: 13,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar evento"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              background: "#1f1f1f",
              border: "1px solid #252525",
              color: "#6b7280",
              padding: "10px 24px",
              borderRadius: 10,
              fontSize: 13,
              cursor: "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
