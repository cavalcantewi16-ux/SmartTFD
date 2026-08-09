with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
src2 = src.replace('/icone-google-maps.webp', '/icone-google-maps.webp.png')
with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(src2)
print('OK')
