import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const eventsPath = path.join(process.cwd(), "data", "events.json");

async function readData() {
  const raw = await fs.readFile(eventsPath, "utf-8");
  return JSON.parse(raw);
}

async function writeData(data: unknown) {
  await fs.writeFile(eventsPath, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao ler eventos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await readData();
    const maxId = data.events.reduce((m: number, e: { id: number }) => Math.max(m, e.id), 0);
    const newEvent = { id: maxId + 1, ...body };
    data.events.push(newEvent);
    await writeData(data);
    return NextResponse.json(newEvent, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await readData();
    const idx = data.events.findIndex((e: { id: number }) => e.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    data.events[idx] = body;
    await writeData(data);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar evento." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const data = await readData();
    data.events = data.events.filter((e: { id: number }) => e.id !== id);
    await writeData(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir evento." }, { status: 500 });
  }
}
