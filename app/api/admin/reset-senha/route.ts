import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Verificar que quem chama é gestor
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((perfil as any)?.role !== 'gestor') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { motorista_id, nova_senha } = await req.json()
  if (!motorista_id || !nova_senha) {
    return NextResponse.json({ error: 'motorista_id e nova_senha são obrigatórios' }, { status: 400 })
  }
  if (nova_senha.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  // Usar service role para resetar senha
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin.auth.admin.updateUserById(motorista_id, {
    password: nova_senha,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
