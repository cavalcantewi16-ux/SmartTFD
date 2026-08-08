with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()
txt = txt.replace(
    'const tempo=Math.ceil(km*1.45/68*60)',
    'const pickup=rota.pacs.length*10\n    const tempo=Math.ceil(km*1.6)+pickup'
)
with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK')
