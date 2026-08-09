with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('salvarRecorrente')
print(repr(src[idx-50:idx+200]))
