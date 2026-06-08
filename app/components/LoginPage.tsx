"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("session");
    if (stored) router.replace("/");
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Credenciais inválidas.");
      } else {
        const user = await res.json();
        localStorage.setItem("session", JSON.stringify(user));
        router.replace("/");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "#0d0d0d",
        backgroundImage: "radial-gradient(circle, #1a1a1a 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Card */}
        <div
          style={{
            background: "#161616",
            border: "1px solid #252525",
            borderRadius: 20,
            padding: 40,
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          }}
        >
          {/* Linha tricolor */}
          <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#22c55e" }} />
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#eab308" }} />
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#ef4444" }} />
          </div>

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-efagro-regional.png"
            alt="EFAGRO Regional"
            style={{ width: 200, display: "block", margin: "0 auto 8px" }}
          />

          {/* Subtítulo */}
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#4b5563",
            textAlign: "center",
            marginBottom: 32,
          }}>
            Dashboard de Gestão · Acesso Restrito
          </p>

          <form onSubmit={handleSubmit}>
            {/* Label email */}
            <label style={{
              display: "block",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#4b5563",
              marginBottom: 6,
            }}>
              EMAIL
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                display: "block",
                width: "100%",
                background: "#0d0d0d",
                border: "1px solid #333",
                color: "white",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#22c55e"; }}
              onBlur={(e) => { e.target.style.borderColor = "#333"; }}
            />

            {/* Label senha */}
            <label style={{
              display: "block",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#4b5563",
              marginBottom: 6,
            }}>
              SENHA
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              style={{
                display: "block",
                width: "100%",
                background: "#0d0d0d",
                border: "1px solid #333",
                color: "white",
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                outline: "none",
                marginBottom: 24,
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#22c55e"; }}
              onBlur={(e) => { e.target.style.borderColor = "#333"; }}
            />

            {/* Erro */}
            {error && (
              <div style={{
                background: "#2d0f0f",
                border: "1px solid #7f1d1d",
                color: "#f87171",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#15803d" : "#22c55e",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.05em",
                padding: 14,
                borderRadius: 12,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#16a34a"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#22c55e"; }}
            >
              {loading ? (
                <span style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
              ) : null}
              {loading ? "Entrando..." : "ENTRAR →"}
            </button>
          </form>

          {/* Rodapé */}
          <p style={{
            fontSize: 11,
            color: "#374151",
            textAlign: "center",
            marginTop: 24,
          }}>
            Circuito Nacional Jurídico Agro 2026 · EFAGRO
          </p>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #4b5563; }
      `}</style>
    </div>
  );
}
