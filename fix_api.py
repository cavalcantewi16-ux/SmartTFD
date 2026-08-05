f = r'C:\SmartTFD\app\api\otimizar-rotas\route.ts'
txt = open(f, encoding='utf-8').read()
# Normaliza line endings
txt = txt.replace('\r\n', '\n')
txt = txt.replace("import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'\n", '')
txt = txt.replace("import { cookies } from 'next/headers'\n", '')
old = "  const supabase = createRouteHandlerClient({ cookies })\n  const { data: { session } } = await supabase.auth.getSession()\n  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })\n"
txt = txt.replace(old, '')
open(f, 'w', encoding='utf-8').write(txt)
print('OK, removido:', 'createRouteHandlerClient' not in txt)
