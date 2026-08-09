with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
src2 = src.replace('/maps-icon.png', '/icone-google-maps.webp')
with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(src2)
print('OK' if '/maps-icon.png' not in src2 else 'AVISO')
