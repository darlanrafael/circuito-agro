import { describe, it, expect } from "vitest";
import { sumCosts, totalInvestment, realRoi } from "./finance";

describe("finance", () => {
  it("sumCosts soma valores", () => {
    expect(sumCosts([{ valor: 100 }, { valor: 50.5 }])).toBe(150.5);
    expect(sumCosts([])).toBe(0);
  });
  it("totalInvestment = tráfego + custos", () => {
    expect(totalInvestment(1000, [{ valor: 200 }, { valor: 300 }])).toBe(1500);
  });
  it("realRoi = líquido / investimento total", () => {
    expect(realRoi(3000, 1500)).toBe(2);
    expect(realRoi(3000, 0)).toBe(0);
  });
});
