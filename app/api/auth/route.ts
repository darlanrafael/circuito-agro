import { NextRequest, NextResponse } from "next/server";

const USERS = [
  {
    email: process.env.USER1_EMAIL || "rafael@circuito.com",
    senha: process.env.USER1_PASSWORD || "circuito2026",
    nome: process.env.USER1_NAME || "Rafael",
    role: process.env.USER1_ROLE || "admin",
  },
  {
    email: process.env.USER2_EMAIL || "user2@circuito.com",
    senha: process.env.USER2_PASSWORD || "circuito2026",
    nome: process.env.USER2_NAME || "Usuário 2",
    role: process.env.USER2_ROLE || "viewer",
  },
  {
    email: process.env.USER3_EMAIL || "user3@circuito.com",
    senha: process.env.USER3_PASSWORD || "circuito2026",
    nome: process.env.USER3_NAME || "Usuário 3",
    role: process.env.USER3_ROLE || "viewer",
  },
];

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();
    const user = USERS.find((u) => u.email === email && u.senha === senha);
    if (!user) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
    }
    const { senha: _omit, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
