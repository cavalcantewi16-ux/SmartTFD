with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
# Fix 1: delete before save
c=c.replace('setSalvando(true); let ok=0','setSalvando(true); let ok=0\n    await sb.from(\'route_plans\').delete().eq(\'data\',data)',1)
# Fix 2: guard against overwriting user edits - only load once per date
c=c.replace(
  'useEffect(()=>{\n    if(!motoristas.length||!veiculos.length)return\n    async function load(){',
  'const loadedDate=useRef(\'\');useEffect(()=>{\n    if(!motoristas.length||!veiculos.length)return\n    if(loadedDate.current===data)return\n    async function load(){'
)
c=c.replace(
  'load()\n  },[data,motoristas,veiculos])',
  'load();loadedDate.current=data\n  },[data,motoristas,veiculos])'
)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
