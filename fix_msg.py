with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
import re
# substituir qualquer variante do setMsg com ok na linha 221
c=re.sub(r"setMsg\([^)]*\$\{ok\}[^)]*\)", "setMsg('Salvo: '+ok+' rota(s)!')", c, count=1)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
