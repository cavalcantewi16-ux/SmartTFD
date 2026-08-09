with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
# onde pac.nome aparece no JSX do card da rota (nao no selPac)
idx = src.find('pac.nome')
while idx != -1:
    chunk = src[idx:idx+100]
    if 'className' in src[idx-200:idx] or 'truncate' in chunk or 'font' in chunk:
        print(repr(src[idx-100:idx+300]))
        break
    idx = src.find('pac.nome', idx+1)
