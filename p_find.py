with open(r'app\gestor\pacientes\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('Paciente Recorrente')
print(repr(src[idx-200:idx+100]))
