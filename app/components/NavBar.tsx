"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export function NavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: "/",       label: "Dashboard" },
    { href: "/analise", label: "Análise UTM" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-50"
      style={{ background: "#0d0d0d", borderBottom: "1px solid #1f1f1f" }}
    >
      {/* Barra principal */}
      <div className="mx-auto max-w-7xl h-12 md:h-14 flex items-center justify-between px-4 sm:px-6">

        {/* Esquerda: logo + nav desktop */}
        <div className="flex items-center" style={{ gap: 28 }}>
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-efagro-regional.png"
              alt="EFAGRO Regional"
              className="h-7 md:h-8 w-auto"
            />
          </Link>

          {/* Nav links — apenas desktop */}
          <nav className="hidden md:flex items-center" style={{ gap: 24 }}>
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: active ? "#22c55e" : "#6b7280",
                    textDecoration: "none",
                    paddingBottom: active ? 2 : 0,
                    borderBottom: active ? "2px solid #22c55e" : "none",
                    transition: "color 0.2s",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Direita */}
        <div className="flex items-center" style={{ gap: 8 }}>
          {user && (
            <>
              {/* Nome do usuário — apenas desktop */}
              <span className="hidden md:block" style={{ fontSize: 13, color: "#6b7280" }}>
                {user.nome}
              </span>
              {/* Botão Sair — apenas desktop */}
              <button
                onClick={logout}
                className="hidden md:block"
                style={{
                  fontSize: 12, color: "#4b5563", background: "none",
                  border: "none", cursor: "pointer", transition: "color 0.2s",
                  padding: "0 8px", minHeight: 44,
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "#ef4444"; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "#4b5563"; }}
              >
                Sair
              </button>
            </>
          )}

          {/* Hamburguer — apenas mobile */}
          <button
            className="md:hidden flex items-center justify-center"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: menuOpen ? "#ffffff" : "#9ca3af",
              padding: 8, minWidth: 44, minHeight: 44, borderRadius: 8,
              transition: "color 0.2s",
            }}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown mobile */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            background: "#161616",
            borderTop: "1px solid #1f1f1f",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 500,
                  color: active ? "#22c55e" : "#9ca3af",
                  textDecoration: "none",
                  borderBottom: "1px solid #1f1f1f",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#4b5563" }}>{user.nome}</span>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                style={{
                  fontSize: 13, color: "#6b7280", background: "none",
                  border: "1px solid #252525", borderRadius: 8,
                  cursor: "pointer", padding: "6px 14px",
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
