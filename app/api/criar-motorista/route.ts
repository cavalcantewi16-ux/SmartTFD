import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { nome, email, senha, telefone } = await req.json()

  if (!nome || !email || !senha) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Criar usuário no Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário.' }, { status: 400 })
  }

  // Criar/atualizar profile com role motorista
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: authData.user.id,
    email,
    nome,
    role: 'motorista',
    telefone: telefone || null,
    created_at: new Date().toISOString(),
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
