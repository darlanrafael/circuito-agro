export type EventStatus = "em_andamento" | "adiado" | "realizado" | "cancelado";
export type BandeiraTipo = "auto" | "upload" | "url";

export type AppEvent = {
  id: number;
  city: string;
  state: string;
  date: string;
  individualTickets: number;
  doubleTickets: number;
  capacity: number;
  trafficInvestment: number;
  participantes_final: number;
  faturamento_final: number;
  status: EventStatus;
  bandeira_tipo: BandeiraTipo;
  bandeira_url: string;
  bandeira_custom: string;
  utm_nomenclatura: string;
};

export type SessionUser = {
  email: string;
  nome: string;
  role: string;
};
