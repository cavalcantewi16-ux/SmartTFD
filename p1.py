with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar estado locModal apos modal
txt = txt.replace(
    "const [modal, setModal] = useState<{rotaUid:string;pacUid:string;q:string}|null>(null)",
    "const [modal, setModal] = useState<{rotaUid:string;pacUid:string;q:string}|null>(null)\n  const [locModal, setLocModal] = useState<{ru:string;pu:string;q:string;res:any[]}|null>(null)\n  const [buscando, setBuscando] = useState(false)"
)

# 2. Adicionar funcoes buscarLoc e selLoc apos selPac
OLD = "  async function salvar() {"
NEW = """  async function buscarLoc(q:string) {
    if(q.length<3) return
    setBuscando(true)
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&q='+encodeURIComponent(q), {headers:{'Accept-Language':'pt-BR'}})
      const d = await r.json()
      setLocModal(m=>m?{...m,res:d}:null)
    } finally { setBuscando(false) }
  }

  function selLoc(r:any) {
    if(!locModal) return
    setPac(locModal.ru,locModal.pu,{localizacao:r.display_name.split(',').slice(0,2).join(',').trim(),lat:parseFloat(r.lat),lng:parseFloat(r.lon)})
    setLocModal(null)
  }

  async function salvar() {"""
txt = txt.replace(OLD, NEW)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patch1')
