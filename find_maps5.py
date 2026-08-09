with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('hospital_id')
# pegar o trecho do select de hospital no JSX
while idx != -1:
    chunk = src[idx:idx+200]
    if 'select' in chunk or 'onChange' in chunk or 'option' in chunk:
        print(repr(src[idx-100:idx+400]))
        break
    idx = src.find('hospital_id', idx+1)
