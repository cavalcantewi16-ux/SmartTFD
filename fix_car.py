path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# Remove o lixo que sobrou apos o DateCarousel ser inserido incorretamente
bad = r'setData(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"/>'
src = src.replace(bad, '', 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
