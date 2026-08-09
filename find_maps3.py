with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
# ver como locModal eh aberto e como salva
idx = src.find('setLocModal({')
print('setLocModal:', repr(src[idx:idx+400]))
print()
idx2 = src.find('locPick&&')
print('salvar pick:', repr(src[idx2:idx2+300]))
