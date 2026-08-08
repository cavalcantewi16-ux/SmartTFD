with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
# substituir aspas curvas por aspas ASCII
c=c.replace('\u2018',"'").replace('\u2019',"'").replace('\u201c','"').replace('\u201d','"')
# garantir que setMsg usa concatenacao simples
import re
c=re.sub(r"setMsg\([^;{]*ok[^;{]*\)",r"setMsg('Salvo: '+String(ok)+' rota(s)!')",c,count=1)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
