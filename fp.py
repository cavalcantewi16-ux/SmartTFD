with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# substituir botao pickup (endereco do paciente)
old1 = 'className="text-red-500 hover:text-red-700 text-base px-1" title="Buscar no mapa">&#128205;</button>'
new1 = 'className="hover:opacity-80 px-1" title="Buscar no mapa"><img src="/maps-icon.png" className="w-5 h-5" alt="Maps"/></button>'

# substituir botao destino
old2 = 'className="text-red-500 hover:text-red-700 text-base px-1" title="Buscar destino no mapa">&#128205;</button>'
new2 = 'className="hover:opacity-80 px-1" title="Buscar destino no mapa"><img src="/maps-icon.png" className="w-5 h-5" alt="Maps"/></button>'

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
