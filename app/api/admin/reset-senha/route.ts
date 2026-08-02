import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuração incompleta no servidor' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Extrair JWT dos cookies da request ──────────────────────────────────
    let accessToken: string | null = null

    // Formato antigo: sb-access-token
    const tokenCookie = req.cookies.get('sb-access-token')
    if (tokenCookie?.value) accessToken = tokenCookie.value

    // Formato novo: sb-{projectRef}-auth-token (JSON)
    if (!accessToken) {
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
      if (projectRef) {
        const authCookie = req.cookies.get(`sb-${projectRef}-auth-token`)
        if (authCookie?.value) {
          try {
            const parsed = JSON.parse(decodeURIComponent(authCookie.value))
            accessToken = parsed.access_token ?? null
          } catch { /* ignorar */ }
        }
      }
    }

    // Fallback: Authorization header
    if (!accessToken) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) accessToken = authHeader.slice(7)
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Sessão não encontrada — faça login novamente' }, { status: 401 })
    }

    // ── Verificar usuário com o token ───────────────────────────────────────
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(accessToken)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Sessão inválida — faça login novamente' }, { status: 401 })
    }

    // ── Verificar que é gestor ──────────────────────────────────────────────
    const { data: perfil } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if ((perfil as any)?.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // ── Validar body ────────────────────────────────────────────────────────
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { motorista_id, nova_senha } = body
    if (!motorista_id || !nova_senha) {
      return NextResponse.json({ error: 'motorista_id e nova_senha são obrigatórios' }, { status: 400 })
    }
    if (nova_senha.length < 6) {
      return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 })
    }

    // ── Alterar senha ───────────────────────────────────────────────────────
    const { error } = await supabaseAdmin.auth.admin.updateUserById(motorista_id, {
      password: nova_senha,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
