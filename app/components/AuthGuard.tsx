"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function AuthGuard({ children, requireAdmin = false }: Props) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("session");
    if (!stored) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(stored);
      if (requireAdmin && user.role !== "admin") {
        router.replace("/");
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace("/login");
    }
  }, [router, requireAdmin]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
