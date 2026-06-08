"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export function NavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/analise", label: "Análise UTM" },
  ];

  return (
    <div
      className="sticky top-0 z-50"
      style={{ background: "#0d0d0d", borderBottom: "1px solid #1f1f1f", height: 56 }}
    >
      <div className="mx-auto max-w-7xl h-full flex items-center justify-between px-6">

        {/* Esquerda: logo + nav */}
        <div className="flex items-center" style={{ gap: 32 }}>
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-efagro-regional.png" alt="EFAGRO Regional" style={{ height: 32, width: "auto" }} />
          </Link>

          <nav className="flex items-center" style={{ gap: 24 }}>
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

            {user?.role === "admin" && (
              <Link
                href="/admin"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: pathname === "/admin" ? "#22c55e" : "#6b7280",
                  textDecoration: "none",
                  paddingBottom: pathname === "/admin" ? 2 : 0,
                  borderBottom: pathname === "/admin" ? "2px solid #22c55e" : "none",
                  transition: "color 0.2s",
                }}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        {/* Direita: usuário + sair */}
        <div className="flex items-center" style={{ gap: 16 }}>
          {user && (
            <>
              <span style={{ fontSize: 13, color: "#6b7280" }} className="hidden sm:block">
                {user.nome}
              </span>
              <button
                onClick={logout}
                style={{ fontSize: 12, color: "#4b5563", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "#ef4444"; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "#4b5563"; }}
              >
                Sair
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
