with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('(p as any).recorrente')
print(repr(src[idx-50:idx+200]))
