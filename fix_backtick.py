with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
# remover a linha duplicada com o backtick-n literal
bad="await sb.from('route_plans').delete().eq('data',data)`n    await sb.from('route_plans').delete().eq('data',data)"
good="await sb.from('route_plans').delete().eq('data',data)"
if bad in c:
    c=c.replace(bad,good,1); print('OK - corrigido')
else:
    print('padrao nao encontrado, procurando...')
    idx=c.find('`n    await sb.from')
    print('backtick-n encontrado em pos:', idx)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
