with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('toggleDia')
print(repr(src[idx-300:idx+50]))
