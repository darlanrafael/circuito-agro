"use client";

import { useState, useRef, useEffect } from "react";
import type { AppEvent, EventStatus, BandeiraTipo } from "../types";
import { StateFlagSVG } from "./StateFlagSVG";

// Preview dedicado para URLs — mostra "URL inválida" em vez de fallback silencioso
function UrlPreviewInForm({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [url]);

  if (!url.trim()) {
    return (
      <div className="rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
        style={{ width: 54, height: 36 }}>
        <span className="text-xs text-gray-400">...</span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-center"
          style={{ width: 54, height: 36 }}>
          <svg className="h-4 w-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-xs text-red-500 dark:text-red-400 font-medium">URL inválida</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className="rounded object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
      style={{ width: 54, height: 36 }}
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
  { value: "adiado", label: "Adiado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];

const EMPTY: FormData = {
  city: "",
  state: "MT",
  date: "",
  individualTickets: 0,
  doubleTickets: 0,
  capacity: 350,
  trafficInvestment: 0,
  participantes_final: 0,
  faturamento_final: 0,
  status: "em_andamento",
  bandeira_tipo: "auto",
  bandeira_url: "",
  bandeira_custom: "",
  utm_nomenclatura: "",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EventForm({ initialData, onSubmit, onCancel, isEdit }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, ...initialData });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) setForm({ ...EMPTY, ...initialData });
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
    if (!form.city.trim()) { setError("Nome da cidade é obrigatório."); return; }
    if (!form.date) { setError("Data é obrigatória."); return; }
    if (form.bandeira_tipo === "url" && !form.bandeira_url.trim()) {
      setError("URL da bandeira é obrigatória."); return;
    }
    if (form.bandeira_tipo === "upload" && !form.bandeira_custom) {
      setError("Faça upload de uma imagem."); return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar evento.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400 dark:placeholder-gray-500";
  const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cidade + Estado + Data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Cidade *</label>
          <input className={inputClass} placeholder="Ex: Cuiabá" value={form.city}
            onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Estado *</label>
          <select className={inputClass} value={form.state} onChange={(e) => set("state", e.target.value)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Data *</label>
          <input type="date" className={inputClass} value={form.date}
            onChange={(e) => set("date", e.target.value)} />
        </div>
      </div>

      {/* Ingressos + Capacidade */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Ingressos individuais</label>
          <input type="number" min="0" className={inputClass} value={form.individualTickets}
            onChange={(e) => set("individualTickets", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Ingressos duplos</label>
          <input type="number" min="0" className={inputClass} value={form.doubleTickets}
            onChange={(e) => set("doubleTickets", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Capacidade</label>
          <input type="number" min="1" className={inputClass} value={form.capacity}
            onChange={(e) => set("capacity", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Investimento tráfego (R$)</label>
          <input type="number" min="0" step="0.01" className={inputClass} value={form.trafficInvestment}
            onChange={(e) => set("trafficInvestment", Number(e.target.value))} />
        </div>
      </div>

      {/* Resultados finais */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Participantes finais</label>
          <input type="number" min="0" className={inputClass} value={form.participantes_final}
            onChange={(e) => set("participantes_final", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Faturamento bruto do evento (R$)</label>
          <input type="number" min="0" step="0.01" className={inputClass} value={form.faturamento_final}
            onChange={(e) => set("faturamento_final", Number(e.target.value))} />
        </div>
      </div>

      {/* Status + UTM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={form.status}
            onChange={(e) => set("status", e.target.value as EventStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Nomenclatura UTM</label>
          <input className={inputClass} placeholder="Ex: CUIABA" value={form.utm_nomenclatura}
            onChange={(e) => set("utm_nomenclatura", e.target.value.toUpperCase())} />
        </div>
      </div>

      {/* Bandeira */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
        <label className={labelClass + " mb-3"}>Bandeira / Imagem do evento</label>

        <div className="flex gap-4 mb-4">
          {(["auto", "upload", "url"] as BandeiraTipo[]).map((tipo) => (
            <label key={tipo} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="bandeira_tipo" value={tipo} checked={form.bandeira_tipo === tipo}
                onChange={() => {
                  setUploadError("");
                  // Limpa os campos do outro tipo ao trocar
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
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {tipo === "auto" ? "Automática (SVG)" : tipo === "upload" ? "Upload" : "URL"}
              </span>
            </label>
          ))}
        </div>

        {form.bandeira_tipo === "upload" && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 dark:file:bg-emerald-900/30 file:text-emerald-700 dark:file:text-emerald-400 file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-emerald-100 dark:hover:file:bg-emerald-900/50 cursor-pointer" />
            {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Máximo 2MB. PNG, JPG ou SVG.</p>
          </div>
        )}

        {form.bandeira_tipo === "url" && (
          <div>
            <input className={inputClass} placeholder="https://..." value={form.bandeira_url}
              onChange={(e) => set("bandeira_url", e.target.value)} />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Se a URL falhar, o SVG automático é exibido.</p>
          </div>
        )}

        {/* Preview */}
        <div className="mt-4 flex items-center gap-3 min-h-[44px]">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Preview:</span>

          {form.bandeira_tipo === "auto" && (
            form.state
              ? <StateFlagSVG state={form.state} size={36} bandeira_tipo="auto" bandeira_url="" bandeira_custom="" />
              : <span className="text-xs text-gray-400 dark:text-gray-500 italic">Preencha o campo UF</span>
          )}

          {form.bandeira_tipo === "upload" && (
            form.bandeira_custom
              ? <img src={form.bandeira_custom} alt="" className="rounded object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 54, height: 36 }} />
              : <div className="rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center" style={{ width: 54, height: 36 }}>
                  <span className="text-xs text-gray-400">—</span>
                </div>
          )}

          {form.bandeira_tipo === "url" && <UrlPreviewInForm url={form.bandeira_url} />}

          <span className="text-sm text-gray-600 dark:text-gray-400">{form.city || "Cidade"} · {form.state}</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting}
          className="flex-1 sm:flex-none sm:min-w-[140px] rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 px-6 text-sm transition-colors">
          {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar evento"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium py-2.5 px-6 text-sm transition-colors disabled:opacity-60">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
