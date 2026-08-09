with open(r'app\gestor\configuracoes\page.tsx', encoding='utf-8') as f:
    src = f.read()
# remover o dynamic que colocamos no topo, reposicionar apos use client
src = src.replace("export const dynamic = 'force-dynamic'\n'use client'", "'use client'\nexport const dynamic = 'force-dynamic'", 1)
with open(r'app\gestor\configuracoes\page.tsx', 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
