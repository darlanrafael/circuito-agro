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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg mb-4">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="24" y1="8" x2="24" y2="40" stroke="#FEDF00" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="12" y1="12" x2="36" y2="12" stroke="#FEDF00" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M10,14 L8,22 Q14,26 18,22 L16,14" stroke="#FEDF00" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
              <path d="M32,14 L30,22 Q36,26 40,22 L38,14" stroke="#FEDF00" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
              <path d="M20,34 Q18,30 22,28 Q20,32 24,34 Q22,30 26,28 Q24,32 28,34" stroke="#A3E635" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            Circuito Nacional
          </h1>
          <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
            Jurídico Agro 2026
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-5">
            Entrar na plataforma
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-xs text-gray-400 dark:text-gray-600">
          Acesso restrito · Circuito Nacional Jurídico Agro 2026
        </p>
      </div>
    </div>
  );
}
