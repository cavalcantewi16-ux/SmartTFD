with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()
# ver estado recorrente e onde o paciente eh carregado
idx = src.find('setRecorrente')
print(repr(src[idx-100:idx+300]))
