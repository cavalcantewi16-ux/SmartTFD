import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Verificar sessão do gestor
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if ((perfil as any)?.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado: apenas gestores podem redefinir senhas' }, { status: 403 })
    }

    // Validar body
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { motorista_id, nova_senha } = body
    if (!motorista_id || !nova_senha) {
      return NextResponse.json({ error: 'motorista_id e nova_senha são obrigatórios' }, { status: 400 })
    }
    if (nova_senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Verificar chave admin
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 })
    }

    // Alterar senha via admin
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(motorista_id, {
      password: nova_senha,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
