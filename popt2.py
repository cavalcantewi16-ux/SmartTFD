with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. Estados de drag
txt = txt.replace(
    "const mapRef = useRef<any>(null)\n  const markerRef = useRef<any>(null)",
    "const mapRef = useRef<any>(null)\n  const markerRef = useRef<any>(null)\n  const [dragging, setDragging] = useState<{ru:string;pu:string}|null>(null)\n  const [dragOver, setDragOver] = useState<{ru:string;pu:string}|null>(null)"
)

# 2. Funcao onDropOnPac antes de confirmarLoc
txt = txt.replace(
    "  function confirmarLoc(){",
    """  function onDropOnPac(targetRu:string,targetPu:string){
    if(!dragging) return
    if(dragging.ru===targetRu&&dragging.pu===targetPu){setDragging(null);return}
    setRotas(prev=>{
      let moved:PacRota|undefined
      const step1=prev.map(r=>{
        if(r._uid!==dragging.ru) return r
        moved=r.pacs.find(p=>p._uid===dragging.pu)
        return{...r,pacs:r.pacs.filter(p=>p._uid!==dragging.pu)}
      })
      if(!moved) return prev
      return step1.map(r=>{
        if(r._uid!==targetRu) return r
        const pacs=[...r.pacs]
        const toIdx=pacs.findIndex(p=>p._uid===targetPu)
        pacs.splice(toIdx>=0?toIdx:pacs.length,0,moved!)
        return{...r,pacs}
      })
    })
    setDragging(null);setDragOver(null)
  }

  function confirmarLoc(){"""
)

# 3. Card do paciente com drag handlers
OLD_CARD = '<div key={pac._uid} className="bg-white rounded-xl border border-gray-200 p-3 min-w-[170px] w-44 flex-shrink-0 space-y-2 text-xs">'
NEW_CARD = '<div key={pac._uid} draggable onDragStart={()=>setDragging({ru:rota._uid,pu:pac._uid})} onDragOver={e=>{e.preventDefault();setDragOver({ru:rota._uid,pu:pac._uid})}} onDrop={e=>{e.preventDefault();onDropOnPac(rota._uid,pac._uid)}} onDragEnd={()=>{setDragging(null);setDragOver(null)}} className={`bg-white rounded-xl border p-3 min-w-[170px] w-44 flex-shrink-0 space-y-2 text-xs cursor-grab transition-opacity ${dragOver?.pu===pac._uid&&dragging?.pu!==pac._uid?"border-blue-400 border-2":"border-gray-200"} ${dragging?.pu===pac._uid?"opacity-40":""}`}>'
txt = txt.replace(OLD_CARD, NEW_CARD)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchB')
