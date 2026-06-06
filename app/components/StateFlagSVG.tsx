"use client";

import { ReactElement, useEffect, useState } from "react";
import type { BandeiraTipo } from "../types";

type Props = {
  state: string;
  size?: number;
  bandeira_tipo?: BandeiraTipo;
  bandeira_url?: string;
  bandeira_custom?: string;
};

const flags: Record<string, ReactElement> = {
  MT: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#009B3A" />
      <polygon points="30,4 56,20 30,36 4,20" fill="#FEDF00" />
      <circle cx="30" cy="20" r="10" fill="#002776" />
      <path d="M20.5,17.5 Q30,12 39.5,17.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="24" cy="21" r="1.2" fill="white" />
      <circle cx="30" cy="19.5" r="1.2" fill="white" />
      <circle cx="36" cy="21" r="1.2" fill="white" />
    </svg>
  ),
  GO: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#CC0000" />
      <polygon points="0,0 60,0 30,40" fill="#FEDF00" />
      <rect x="22" y="14" width="16" height="11" fill="#009B3A" />
      <rect x="24" y="16" width="12" height="7" fill="white" />
    </svg>
  ),
  PR: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#003F87" />
      <rect x="0" y="13" width="60" height="14" fill="white" />
      <circle cx="30" cy="20" r="9" fill="#003F87" stroke="white" strokeWidth="1.5" />
      <circle cx="30" cy="20" r="6" fill="#009B3A" />
      <text x="30" y="24" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">PR</text>
    </svg>
  ),
  MG: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#009B3A" />
      <polygon points="30,3 58,37 2,37" fill="white" />
      <polygon points="30,10 52,35 8,35" fill="#CC0000" />
      <circle cx="30" cy="26" r="7" fill="#002776" />
      <text x="30" y="29" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold">MG</text>
    </svg>
  ),
  MS: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#003F87" />
      <polygon points="0,0 35,0 35,40 0,40" fill="#009B3A" />
      <circle cx="17" cy="20" r="8" fill="white" />
      <text x="17" y="23" textAnchor="middle" fill="#003F87" fontSize="6" fontWeight="bold">MS</text>
    </svg>
  ),
  BA: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#FEDF00" />
      <polygon points="0,0 60,0 60,40 0,40 30,20" fill="white" />
      <polygon points="30,20 0,0 0,40" fill="#FEDF00" />
      <rect x="21" y="14" width="18" height="12" fill="#CC0000" />
      <text x="30" y="23" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">BA</text>
    </svg>
  ),
  SP: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="white" />
      <rect x="0" y="13" width="60" height="7" fill="#CC0000" />
      <rect x="0" y="20" width="60" height="7" fill="#1a1a1a" />
      <circle cx="30" cy="20" r="8" fill="white" stroke="#CC0000" strokeWidth="1.5" />
      <text x="30" y="23" textAnchor="middle" fill="#CC0000" fontSize="6" fontWeight="bold">SP</text>
    </svg>
  ),
};

function AutoFlag({ state, size }: { state: string; size: number }) {
  const svg = flags[state] ?? (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="40" fill="#64748B" />
      <text x="30" y="24" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{state}</text>
    </svg>
  );
  return (
    <span
      className="inline-block rounded overflow-hidden shadow-sm ring-1 ring-black/10 dark:ring-white/10"
      style={{ width: size * 1.5, height: size }}
    >
      {svg}
    </span>
  );
}

function UrlFlag({ src, size, fallback }: { src: string; size: number; fallback: ReactElement }) {
  const [failed, setFailed] = useState(false);

  // Reset error state whenever the URL changes
  useEffect(() => { setFailed(false); }, [src]);

  if (failed || !src) return fallback;
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="rounded object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
      style={{ width: size * 1.5, height: size }}
    />
  );
}

export function StateFlagSVG({
  state,
  size = 48,
  bandeira_tipo = "auto",
  bandeira_url = "",
  bandeira_custom = "",
}: Props) {
  const autoFlag = <AutoFlag state={state} size={size} />;

  if (bandeira_tipo === "upload" && bandeira_custom) {
    return (
      <img
        src={bandeira_custom}
        alt={state}
        className="rounded object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
        style={{ width: size * 1.5, height: size }}
      />
    );
  }

  if (bandeira_tipo === "url" && bandeira_url) {
    return <UrlFlag src={bandeira_url} size={size} fallback={autoFlag} />;
  }

  return autoFlag;
}
