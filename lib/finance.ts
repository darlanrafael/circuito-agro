export type EventCost = {
  id: string;
  event_id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  created_at?: string;
};

export function sumCosts(costs: { valor: number }[]): number {
  return costs.reduce((s, c) => s + (c.valor || 0), 0);
}

export function totalInvestment(trafficSpend: number, costs: { valor: number }[]): number {
  return trafficSpend + sumCosts(costs);
}

export function realRoi(netRevenue: number, totalInvestment: number): number {
  return totalInvestment > 0 ? netRevenue / totalInvestment : 0;
}
