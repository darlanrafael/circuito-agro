"use client";

import { useState, useEffect, useCallback } from "react";
import { NavBar } from "./NavBar";
import { EventForm } from "./EventForm";
import { StateFlagSVG } from "./StateFlagSVG";
import type { AppEvent, EventStatus } from "../types";

const STATUS_LABELS: Record<EventStatus, string> = {
  em_andamento: "Em andamento",
  adiado: "Adiado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const STATUS_BADGE_STYLE: Record<EventStatus, React.CSSProperties> = {
  em_andamento: { background: "#0f1a2e", color: "#60a5fa",  border: "1px solid #1d4ed8" },
  adiado:       { background: "#1f1a0a", color: "#fbbf24",  border: "1px solid #92400e" },
  realizado:    { background: "#0f1f0f", color: "#4ade80",  border: "1px solid #166534" },
  cancelado:    { background: "#1f0a0a", color: "#9ca3af",  border: "1px solid #374151" },
};

export function AdminPage() {
  const [events, setEvents]         = useState<AppEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Falha ao carregar eventos.");
      const data = await res.json();
      setEvents(data.events ?? data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  }

  async function handleAdd(formData: Omit<AppEvent, "id">) {
    // Gera id a partir da cidade: "Luís Eduardo" → "luiseduardo", "Rio Verde" → "rioverde"
    const id = formData.city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...formData }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro ao adicionar evento.");
    }
    await loadEvents();
    setShowAddForm(false);
    showSuccess("Evento adicionado com sucesso!");
  }

  async function handleEdit(id: string, formData: Omit<AppEvent, "id">) {
    const res = await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...formData }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro ao salvar evento.");
    }
    await loadEvents();
    setEditingId(null);
    showSuccess("Evento atualizado com sucesso!");
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Erro ao excluir evento.");
      await loadEvents();
      setDeleteId(null);
      showSuccess("Evento excluído.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const editingEvent = editingId !== null ? events.find((e) => e.id === String(editingId)) : undefined;
  const deleteEvent  = deleteId  !== null ? events.find((e) => e.id === String(deleteId))  : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>
      <NavBar />
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-lg sm:text-2xl" style={{ fontWeight: 700, color: "white" }}>Painel Administrativo</h1>
            <p className="text-xs sm:text-[13px] mt-1" style={{ color: "#6b7280" }}>
              Gerencie os eventos do Circuito Nacional Jurídico Agro 2026
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto text-[13px]"
            style={{
              borderRadius: 10, background: "#22c55e", color: "white",
              fontWeight: 700, padding: "10px 20px",
              border: "none", cursor: "pointer", minHeight: 44,
            }}
          >
            {showAddForm ? (
              <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Cancelar</>
            ) : (
              <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Novo evento</>
            )}
          </button>
        </div>

        {/* Toast de sucesso */}
        {successMsg && (
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, borderRadius: 10, background: "#0f1f0f", border: "1px solid #166534", padding: "10px 14px", fontSize: 13, color: "#4ade80" }}>
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {successMsg}
          </div>
        )}

        {/* Formulário de adição */}
        {showAddForm && (
          <section style={{ marginBottom: 32, borderRadius: 14, border: "1px solid #22c55e", background: "#161616", padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "white", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <svg className="h-5 w-5" style={{ color: "#22c55e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Adicionar novo evento
            </h2>
            <EventForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
          </section>
        )}

        {/* Lista de eventos */}
        <section>
          <h2 style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#4b5563", marginBottom: 16 }}>
            Eventos cadastrados {!loading && `(${events.length})`}
          </h2>

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
              <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {fetchError && !loading && (
            <div style={{ borderRadius: 10, background: "#2d0f0f", border: "1px solid #7f1d1d", padding: "10px 14px", fontSize: 13, color: "#f87171" }}>
              {fetchError}
              <button onClick={loadEvents} style={{ marginLeft: 12, textDecoration: "underline", fontWeight: 600, background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !fetchError && events.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#4b5563" }}>
              Nenhum evento cadastrado.
            </div>
          )}

          {!loading && events.map((event) => (
            <div key={event.id} style={{ marginBottom: 12, borderRadius: 14, border: "1px solid #252525", background: "#161616", overflow: "hidden" }}>

              {/* ── Desktop row (md+) ── */}
              <div className="hidden md:flex items-center gap-3 p-4">
                <StateFlagSVG
                  state={event.state} size={28}
                  bandeira_tipo={event.bandeira_tipo}
                  bandeira_url={event.bandeira_url}
                  bandeira_custom={event.bandeira_custom}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: "white" }}>{event.city}</span>
                    <span style={{ color: "#333" }}>·</span>
                    <span style={{ color: "#6b7280", fontSize: 13 }}>{event.state}</span>
                    <span style={{ color: "#333" }}>·</span>
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      {new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <span style={{ borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, ...STATUS_BADGE_STYLE[event.status] }}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "#4b5563" }}>
                    <span>Individual: {event.individualTickets}</span>
                    <span>Duplo: {event.doubleTickets}</span>
                    <span>Capacidade: {event.capacity}</span>
                    {event.utm_nomenclatura && <span>UTM: {event.utm_nomenclatura}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditingId(editingId === event.id ? null : event.id); setShowAddForm(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #252525", background: "transparent", color: "#6b7280", padding: "6px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#22c55e"; (e.currentTarget as HTMLButtonElement).style.color = "#22c55e"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#252525"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {editingId === event.id ? "Fechar" : "Editar"}
                  </button>
                  <button
                    onClick={() => setDeleteId(event.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 8, border: "1px solid #252525", background: "transparent", color: "#6b7280", padding: "6px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#252525"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Excluir
                  </button>
                </div>
              </div>

              {/* ── Mobile card (< md) ── */}
              <div className="md:hidden p-3">
                {/* Linha 1: bandeira + cidade/estado/data | badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StateFlagSVG
                      state={event.state} size={26}
                      bandeira_tipo={event.bandeira_tipo}
                      bandeira_url={event.bandeira_url}
                      bandeira_custom={event.bandeira_custom}
                    />
                    <div>
                      <p style={{ fontWeight: 600, color: "white", fontSize: 14, lineHeight: 1.2 }}>{event.city}</p>
                      <p style={{ fontSize: 11, color: "#6b7280" }}>
                        {event.state} · {new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600, flexShrink: 0, ...STATUS_BADGE_STYLE[event.status] }}>
                    {STATUS_LABELS[event.status]}
                  </span>
                </div>

                {/* Linha 2: ingressos/capacidade/UTM */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-3 text-[11px]" style={{ color: "#4b5563" }}>
                  <span>Individual: {event.individualTickets}</span>
                  <span>Duplo: {event.doubleTickets}</span>
                  <span>Capacidade: {event.capacity}</span>
                  {event.utm_nomenclatura && <span style={{ fontFamily: "monospace", fontSize: 10 }}>UTM: {event.utm_nomenclatura}</span>}
                </div>

                {/* Linha 3: botões 50/50 */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setEditingId(editingId === event.id ? null : event.id); setShowAddForm(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5"
                    style={{ borderRadius: 8, border: "1px solid #252525", background: "transparent", color: "#6b7280", padding: "9px 0", fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 44 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#22c55e"; (e.currentTarget as HTMLButtonElement).style.color = "#22c55e"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#252525"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {editingId === event.id ? "Fechar" : "Editar"}
                  </button>
                  <button
                    onClick={() => setDeleteId(event.id)}
                    className="flex-1 flex items-center justify-center gap-1.5"
                    style={{ borderRadius: 8, border: "1px solid #252525", background: "transparent", color: "#6b7280", padding: "9px 0", fontSize: 12, fontWeight: 500, cursor: "pointer", minHeight: 44 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#252525"; (e.currentTarget as HTMLButtonElement).style.color = "#6b7280"; }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Excluir
                  </button>
                </div>
              </div>

              {/* Formulário de edição inline */}
              {editingId === event.id && editingEvent && (
                <div className="p-4 sm:p-6" style={{ borderTop: "1px solid #252525", background: "#111" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 16 }}>
                    Editando: {event.city}
                  </h3>
                  <EventForm
                    isEdit
                    initialData={editingEvent}
                    onSubmit={(data) => handleEdit(event.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#161616", borderRadius: 20, boxShadow: "0 25px 50px rgba(0,0,0,0.5)", border: "1px solid #252525", padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 20, background: "#2d0f0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg className="h-5 w-5" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "white" }}>Excluir evento</h3>
                <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                  Tem certeza que deseja excluir o evento de{" "}
                  <strong style={{ color: "#9ca3af" }}>{deleteEvent?.city}</strong>?
                  {" "}Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                style={{
                  flex: 1, borderRadius: 10, background: "#ef4444", color: "white",
                  fontWeight: 700, padding: "10px 0", fontSize: 13, border: "none",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                style={{
                  flex: 1, borderRadius: 10, border: "1px solid #252525",
                  background: "#1f1f1f", color: "#9ca3af",
                  fontWeight: 500, padding: "10px 0", fontSize: 13,
                  cursor: "pointer", opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
