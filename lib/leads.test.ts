import { describe, it, expect } from "vitest";
import { isTestLead, normalizeLote, normalizeEmail, utmsFromUrl, leadIdFrom } from "./leads";

describe("isTestLead", () => {
  it("pega teste no nome, em qualquer caixa", () => {
    expect(isTestLead("TESTE GUILHERME VIP", "guilherme@x.com")).toBe(true);
    expect(isTestLead("Darlan teste novo", "dalran@gmai.co")).toBe(true);
  });
  it("pega a grafia errada testte e o e-mail de exemplo", () => {
    expect(isTestLead("DARLAN TESTTE", "dadfg@gmail.com")).toBe(true);
    expect(isTestLead("Teste Silva", "teste@exemplo.com")).toBe(true);
  });
  it("não derruba lead de verdade", () => {
    expect(isTestLead("Lucas Morais", "lucas.waishaupt@gmail.com")).toBe(false);
  });
});

describe("normalizeLote", () => {
  it("normaliza caixa e espaços", () => {
    expect(normalizeLote("Standard")).toBe("standard");
    expect(normalizeLote(" VIP ")).toBe("vip");
    expect(normalizeLote("Gold")).toBe("gold");
    expect(normalizeLote("basic")).toBe("basic");
  });
  it("traduz ausência para nao_informado", () => {
    expect(normalizeLote("Não informado")).toBe("nao_informado");
    expect(normalizeLote(null)).toBe("nao_informado");
    expect(normalizeLote("")).toBe("nao_informado");
  });
});

describe("normalizeEmail", () => {
  it("tira espaços e baixa a caixa", () => {
    expect(normalizeEmail("  DADFG@GMAIL.COM ")).toBe("dadfg@gmail.com");
  });
});

describe("utmsFromUrl", () => {
  it("extrai as UTMs da URL da landing page", () => {
    const url = "https://efagroregional.com.br/efagro-experience-lotes/?utm_source=ig&utm_medium=paid_Instagram_Feed&utm_campaign=%5Befagro_experience%5D_lead_frio_cbo_est%C3%A1ticos_set02&utm_term=ad03_vendas#ingressos";
    expect(utmsFromUrl(url)).toEqual({
      utm_source: "ig",
      utm_medium: "paid_Instagram_Feed",
      utm_campaign: "[efagro_experience]_lead_frio_cbo_estáticos_set02",
      utm_term: "ad03_vendas",
      utm_content: null,
    });
  });
  it("devolve tudo nulo quando não há UTM nem URL válida", () => {
    expect(utmsFromUrl("teste")).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
    });
    expect(utmsFromUrl(null)).toEqual({
      utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
    });
  });
});

describe("leadIdFrom", () => {
  it("usa o id da planilha quando ele existe", () => {
    expect(leadIdFrom("mulbekf2cm3iq", "a@b.com", "2026-09-28T14:00:00.000Z")).toBe("mulbekf2cm3iq");
  });
  it("gera id estável por e-mail e data quando não há id", () => {
    const a = leadIdFrom(null, "a@b.com", "2026-09-28T14:00:00.000Z");
    const b = leadIdFrom(null, "a@b.com", "2026-09-28T14:00:00.000Z");
    expect(a).toBe(b);
    expect(a).not.toBe(leadIdFrom(null, "c@d.com", "2026-09-28T14:00:00.000Z"));
  });
});
