with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = 'className="text-blue-500 hover:text-blue-700 text-base px-1" title="Buscar no mapa">&#128205;</button>'
new = 'className="hover:opacity-80 px-1" title="Buscar no mapa"><img src="/maps-icon.png" className="w-5 h-5" alt="Maps"/></button>'

if old in src:
    with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO')
