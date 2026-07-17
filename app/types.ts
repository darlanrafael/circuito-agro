export type EventStatus = "em_andamento" | "adiado" | "realizado" | "cancelado";
export type BandeiraTipo = "auto" | "upload" | "url";

export type AppEvent = {
  id: string;
  city: string;
  state: string;
  date: string;
  individualTickets: number;
  doubleTickets: number;
  capacity: number;
  trafficInvestment: number;
  participantes_final: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
  stateName: string;
  status: EventStatus;
  bandeira_tipo: BandeiraTipo;
  bandeira_url: string;
  bandeira_custom: string;
  utm_nomenclatura: string;
  utm_aliases: string[];
  is_archived: boolean;
};

export type { EventCost } from "@/lib/finance";

export type SessionUser = {
  email: string;
  nome: string;
  role: string;
};
