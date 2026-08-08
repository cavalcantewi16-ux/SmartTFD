path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Atualizar query para incluir dias_semana
old_q = "sb.from('pacientes').select('id,nome,bairro,endereco,hospital_frequente:hospitais(id,nome)').eq('recorrente', true).order('nome')"
new_q = "sb.from('pacientes').select('id,nome,bairro,dias_semana').eq('recorrente', true).order('nome')"
src = src.replace(old_q, new_q, 1)

# 2) Substituir painel inline por sidebar fixo com dias da semana
old_panel_start = "{/* \u2500\u2500 Pacientes Fixos Semanais \u2500\u2500 */}"
old_panel_end = """        """

DIAS = [('dom',0),('seg',1),('ter',2),('qua',3),('qui',4),('sex',5),('sab',6)]

new_sidebar = """{/* Sidebar pacientes recorrentes */}
        {pacientesFixos.length > 0 && (
          <div className="fixed right-3 top-20 w-60 max-h-[calc(100vh-5.5rem)] overflow-y-auto z-20">
            <div className="bg-white border border-amber-200 rounded-2xl shadow-lg overflow-hidden">
              <button onClick={() => setFixosAberto(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 hover:bg-amber-100 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-600 font-bold text-xs">\u2605 Recorrentes</span>
                  <span className="text-[10px] bg-amber-200 text-amber-700 rounded-full px-1.5 py-0.5">{pacientesFixos.length}</span>
                </div>
                <span className="text-amber-500 text-xs">{fixosAberto ? '\u25b2' : '\u25bc'}</span>
              </button>
              {fixosAberto && (
                <div className="divide-y divide-amber-50">
                  {pacientesFixos.map(p => {
                    const jaIncluido = rotas.some(r => r.pacs.some((pp: any) => pp.paciente_id === p.id))
                    const hoje = new Date().getDay()
                    const diasSemana: string[] = p.dias_semana || []
                    const dMap: Record<string,number> = {dom:0,seg:1,ter:2,qua:3,qui:4,sex:5,sab:6}
                    return (
                      <div key={p.id} className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <p className="font-semibold text-gray-800 text-xs leading-tight">{p.nome}</p>
                          {jaIncluido
                            ? <span className="text-[9px] text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">\u2713 na rota</span>
                            : <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">falta</span>
                          }
                        </div>
                        {diasSemana.length > 0 && (
                          <div className="flex gap-0.5 flex-wrap">
                            {['dom','seg','ter','qua','qui','sex','sab'].map(d => {
                              const ativo = diasSemana.includes(d)
                              const ehHoje = dMap[d] === hoje
                              return (
                                <span key={d} className={`text-[9px] px-1 py-0.5 rounded font-medium uppercase
                                  ${ativo && ehHoje ? 'bg-blue-600 text-white' : ativo ? 'bg-amber-100 text-amber-700' : 'text-gray-300'}`}>
                                  {d}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {diasSemana.length === 0 && (
                          <p className="text-[9px] text-gray-400">sem dias fixos</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        """

# Substituir o bloco do painel inline pelo sidebar
import re
pattern = r'\{/\*\s*\u2500\u2500 Pacientes Fixos Semanais \u2500\u2500 \*/\}.*?\}\s*\}\s*\)\s*\}\s*\}\s*\)\s*\}\s*\)\s*\}\s*\n\s*'
m = re.search(pattern, src, re.DOTALL)
if m:
    src = src[:m.start()] + new_sidebar + src[m.end():]
    print('Painel substituido por sidebar')
else:
    # Fallback: substituir apenas o comentario
    if old_panel_start in src:
        src = src.replace(old_panel_start, '/* sidebar abaixo */ ', 1)
        print('AVISO: substituicao parcial - verifique o arquivo')
    else:
        print('AVISO: painel nao encontrado')

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
