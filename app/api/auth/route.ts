import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const usersPath = path.join(process.cwd(), "data", "users.json");

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();
    const raw = await fs.readFile(usersPath, "utf-8");
    const users: Array<{ email: string; senha: string; nome: string; role: string }> = JSON.parse(raw);
    const user = users.find((u) => u.email === email && u.senha === senha);
    if (!user) {
      return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
    }
    const { senha: _omit, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
