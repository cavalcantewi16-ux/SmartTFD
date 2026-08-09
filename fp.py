with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# ver anchor do input de endereco do paciente
idx = src.find('pac.localizacao')
print(repr(src[idx-200:idx+200]))
