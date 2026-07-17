"use client";

import { useState } from "react";

export function UtmTagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim().toUpperCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {value.map((tag) => (
            <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#052e16", color: "#22c55e", borderRadius: 99, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remover ${tag}`}
                style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="Digite uma UTM e tecle Enter (ex.: EM, LEM)"
        style={{ width: "100%", background: "#0d0d0d", border: "1px solid #333", color: "white", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}
