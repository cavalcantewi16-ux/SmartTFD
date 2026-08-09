with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('setRecorrente(')
print(repr(src[idx-30:idx+300]))
