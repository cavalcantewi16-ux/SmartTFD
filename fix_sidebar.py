path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# Achar o botao addRota corrompido e reconstruir
btn_marker = '<button onClick={addRota}'
btn_idx = src.find(btn_marker)
if btn_idx == -1:
    print('ERRO: botao nao encontrado'); exit()

# Achar onde comeca o texto do botao (depois do >)
tag_close = src.find('>', btn_idx) + 1

# Contar <button> aninhados para achar o </button> correto
depth = 1
i = tag_close
while i < len(src) and depth > 0:
    no = src.find('<button', i)
    nc = src.find('</button>', i)
    if nc == -1: break
    if no != -1 and no < nc:
        depth += 1; i = no + 7
    else:
        depth -= 1
        if depth == 0: btn_end = nc + 9; break
        i = nc + 9

print(f'Botao: linhas aprox {src[:btn_idx].count(chr(10))+1} a {src[:btn_end].count(chr(10))+1}')

sidebar = """{pacientesFixos.length > 0 && (
        <div className="fixed right-3 top-20 w-56 max-h-[calc(100vh-5.5rem)] overflow-y-auto z-20 shadow-xl">
          <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
            <button onClick={() => setFixosAberto(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 hover:bg-amber-100">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-bold text-xs">\u2605 Recorrentes</span>
                <span className="text-[10px] bg-amber-200 text-amber-700 rounded-full px-1.5">{pacientesFixos.length}</span>
              </div>
              <span className="text-amber-400 text-[10px]">{fixosAberto ? '\u25b2' : '\u25bc'}</span>
            </button>
            {fixosAberto && (
              <div className="divide-y divide-amber-50 max-h-96 overflow-y-auto">
                {pacientesFixos.map((p:any) => {
                  const jaIncluido = rotas.some((r:any) => r.pacs.some((pp:any) => pp.paciente_id === p.id))
                  const hojeIdx = new Date().getDay()
                  const dias: string[] = p.dias_semana || []
                  const dMap: Record<string,number> = {dom:0,seg:1,ter:2,qua:3,qui:4,sex:5,sab:6}
                  return (
                    <div key={p.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="font-semibold text-gray-800 text-[11px] leading-tight truncate">{p.nome}</p>
                        {jaIncluido
                          ? <span className="shrink-0 text-[9px] text-green-600 bg-green-50 border border-green-200 px-1 rounded-full">\u2713 ok</span>
                          : <span className="shrink-0 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded-full">falta</span>}
                      </div>
                      <div className="flex gap-0.5">
                        {['dom','seg','ter','qua','qui','sex','sab'].map((d:string) => (
                          <span key={d} className={'text-[8px] px-0.5 py-0.5 rounded font-bold uppercase '+(dias.includes(d)&&dMap[d]===hojeIdx?'bg-blue-600 text-white':dias.includes(d)?'bg-amber-100 text-amber-700':'text-gray-200')}>
                            {d.charAt(0)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <button onClick={addRota} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 font-semibold text-sm">+ Adicionar nova rota</button>"""

src = src[:btn_idx] + sidebar + src[btn_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
