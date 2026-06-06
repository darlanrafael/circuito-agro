"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";

export function NavBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/analise", label: "Análise UTM" },
  ];

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-0">
        {/* Links de navegação */}
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-emerald-600 dark:bg-emerald-500" />
                )}
              </Link>
            );
          })}

          {/* Link Admin — apenas para admins */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              ⚙️ Admin
              {pathname === "/admin" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-emerald-600 dark:bg-emerald-500" />
              )}
            </Link>
          )}
        </nav>

        {/* Lado direito: usuário + logout + tema */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                {user.nome}
              </span>
              <button
                onClick={logout}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1"
              >
                Sair
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
