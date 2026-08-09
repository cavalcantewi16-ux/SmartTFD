with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
# buscar o componente de maps/geocode
for kw in ['Maps','geocod','LatLng','places','maps.google','pickLoc','salvarLoc']:
    idx = src.find(kw)
    if idx >= 0:
        print(f'--- {kw} @ {idx} ---')
        print(repr(src[idx:idx+300]))
        print()
