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

const STATUS_BADGE: Record<EventStatus, string> = {
  em_andamento: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  adiado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  realizado: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelado: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function AdminPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
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
  const deleteEvent = deleteId !== null ? events.find((e) => e.id === String(deleteId)) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar />
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel Administrativo</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie os eventos do Circuito Nacional Jurídico Agro 2026</p>
          </div>
          <button
            onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 text-sm transition-colors">
            {showAddForm ? (
              <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Cancelar</>
            ) : (
              <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Novo evento</>
            )}
          </button>
        </div>

        {/* Toast de sucesso */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {successMsg}
          </div>
        )}

        {/* Formulário de adição */}
        {showAddForm && (
          <section className="mb-8 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Adicionar novo evento
            </h2>
            <EventForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
          </section>
        )}

        {/* Lista de eventos */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
            Eventos cadastrados {!loading && `(${events.length})`}
          </h2>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {fetchError && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {fetchError}
              <button onClick={loadEvents} className="ml-3 underline font-medium">Tentar novamente</button>
            </div>
          )}

          {!loading && !fetchError && events.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              Nenhum evento cadastrado.
            </div>
          )}

          {!loading && events.map((event) => (
            <div key={event.id} className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">

              {/* Row principal */}
              <div className="flex items-center gap-4 p-4">
                <StateFlagSVG
                  state={event.state}
                  size={28}
                  bandeira_tipo={event.bandeira_tipo}
                  bandeira_url={event.bandeira_url}
                  bandeira_custom={event.bandeira_custom}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{event.city}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{event.state}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">·</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[event.status]}`}>
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>Individual: {event.individualTickets}</span>
                    <span>Duplo: {event.doubleTickets}</span>
                    <span>Capacidade: {event.capacity}</span>
                    {event.utm_nomenclatura && <span>UTM: {event.utm_nomenclatura}</span>}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(editingId === event.id ? null : event.id); setShowAddForm(false); }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 py-1.5 px-3 text-sm font-medium transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {editingId === event.id ? "Fechar" : "Editar"}
                  </button>
                  <button
                    onClick={() => setDeleteId(event.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 py-1.5 px-3 text-sm font-medium transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Excluir
                  </button>
                </div>
              </div>

              {/* Formulário de edição inline */}
              {editingId === event.id && editingEvent && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Editando: {event.city}</h3>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Excluir evento</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Tem certeza que deseja excluir o evento de <strong className="text-gray-700 dark:text-gray-300">{deleteEvent?.city}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteLoading}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition-colors">
                {deleteLoading ? "Excluindo..." : "Sim, excluir"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2.5 text-sm transition-colors disabled:opacity-60">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
