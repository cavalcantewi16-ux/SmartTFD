path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# Substituir a condicao do sidebar para filtrar pelo dia SELECIONADO, nao hoje
old = """{pacientesFixos.length > 0 && (
        <div className="fixed right-3 top-20 w-56 max-h-[calc(100vh-5.5rem)] overflow-y-auto z-20 shadow-xl">"""

new = """{(()=>{const _ds=new Date(data+'T12:00:00');const _di=_ds.getDay();const _dn=['dom','seg','ter','qua','qui','sex','sab'][_di];const _fx=pacientesFixos.filter((p:any)=>(p.dias_semana||[]).includes(_dn));return _fx.length>0&&(
        <div className="fixed right-3 top-20 w-56 max-h-[calc(100vh-5.5rem)] overflow-y-auto z-20 shadow-xl">"""

src = src.replace(old, new, 1)
print('cond OK' if '_fx' in src else 'AVISO cond')

# Substituir pacientesFixos.map por _fx.map dentro do sidebar
old_map = "                {pacientesFixos.map((p:any) => {"
new_map = "                {_fx.map((p:any) => {"
src = src.replace(old_map, new_map, 1)
print('map OK' if new_map in src else 'AVISO map')

# Substituir hojeIdx para usar o dia selecionado (ja calculado como _di)
old_hoje = "                   const hojeIdx = new Date().getDay()"
new_hoje = "                   const hojeIdx = _di"
src = src.replace(old_hoje, new_hoje, 1)
print('hoje OK' if new_hoje in src else 'AVISO hoje')

# Fechar o IIFE no final - achar o fechamento do sidebar e adicionar )})()}
# O sidebar fecha com: </div>\n        )}\n
old_close = """          </div>
        </div>
      )}
      <button onClick={addRota}"""
new_close = """          </div>
        </div>
      )})()}
      <button onClick={addRota}"""
src = src.replace(old_close, new_close, 1)
print('close OK' if ')})()}' in src else 'AVISO close')

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('Gravado')
