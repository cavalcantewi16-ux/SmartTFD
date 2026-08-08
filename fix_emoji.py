with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
# fix emoji corrompido na linha do setMsg
import re
c=re.sub(r"setMsg\(`[^`]*\$\{ok\} rota\(s\) salva\(s\)![^`]*`\)",
         "setMsg(`Salvo: ${ok} rota(s)!`)",c,count=1)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
