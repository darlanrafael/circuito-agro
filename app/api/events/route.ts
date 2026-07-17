import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const includeArchived = new URL(req.url).searchParams.get('all') === '1'
  try {
    let q = supabase.from('events').select('*').order('date', { ascending: true })
    if (!includeArchived) q = q.eq('is_archived', false)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao ler eventos.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, created_at, ...rest } = body
    const { data, error } = await supabase
      .from('events')
      .insert([{ id, ...rest }])
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar evento.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, created_at, ...updates } = body
    console.log('PUT id:', id)
    console.log('PUT updates keys:', Object.keys(updates))
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir evento.' }, { status: 500 })
  }
}
