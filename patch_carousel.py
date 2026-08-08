import re, sys

path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Adicionar funcao de carrossel de datas logo antes do return principal
carousel_fn = """
function DateCarousel({ data, onChange }: { data: string; onChange: (d: string) => void }) {
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const dates: Date[] = []
  const base = new Date(data + 'T12:00:00')
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i); dates.push(d)
  }
  function toISO(d: Date) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  }
  const hoje = toISO(new Date())
  function shift(n: number) {
    const d = new Date(base); d.setDate(base.getDate() + n); onChange(toISO(d))
  }
  return (
    <div className="flex items-center gap-1 my-3 justify-center select-none">
      <button onClick={() => shift(-7)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#171;</button>
      <button onClick={() => shift(-1)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#8249;</button>
      <div className="flex gap-1">
        {dates.map((d, i) => {
          const iso = toISO(d)
          const sel = iso === data
          const isHoje = iso === hoje
          return (
            <button key={i} onClick={() => onChange(iso)}
              className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl text-xs transition-all
                ${sel ? 'bg-blue-600 text-white font-bold shadow-md scale-105'
                : isHoje ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold'
                : 'text-gray-500 hover:bg-gray-100'}`}>
              <span className="text-[10px] uppercase">{dias[d.getDay()]}</span>
              <span className="text-base font-bold leading-tight">{d.getDate()}</span>
              <span className="text-[9px]">{meses[d.getMonth()]}</span>
            </button>
          )
        })}
      </div>
      <button onClick={() => shift(1)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#8250;</button>
      <button onClick={() => shift(7)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#187;</button>
      <button onClick={() => onChange(hoje)} className="ml-2 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">Hoje</button>
    </div>
  )
}
"""

# Inserir antes de "export default function"
src = src.replace('export default function', carousel_fn + '\nexport default function', 1)

# 2) Substituir o input de data existente pelo DateCarousel
# Procura padrao: <input type="date" ... value={data} onChange={...} ... />
old_input = re.search(r'<input[^>]*type=["\']date["\'][^>]*/>', src)
if old_input:
    src = src[:old_input.start()] + '<DateCarousel data={data} onChange={setData} />' + src[old_input.end():]
    print('Input de data substituido pelo DateCarousel')
else:
    # Tenta variacao sem self-closing
    old_input2 = re.search(r'<input[^>]*type=["\']date["\'][^>]*>', src)
    if old_input2:
        src = src[:old_input2.start()] + '<DateCarousel data={data} onChange={setData} />' + src[old_input2.end():]
        print('Input de data substituido (variacao)')
    else:
        print('AVISO: input date nao encontrado - adicione manualmente')

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
