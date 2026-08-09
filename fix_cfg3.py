# remover o dynamic do page.tsx
with open(r'app\gestor\configuracoes\page.tsx', encoding='utf-8') as f:
    src = f.read()
src = src.replace("export const dynamic = 'force-dynamic'\n", "", 1)
with open(r'app\gestor\configuracoes\page.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

# criar layout.tsx server component com dynamic
with open(r'app\gestor\configuracoes\layout.tsx', 'w', encoding='utf-8') as f:
    f.write("export const dynamic = 'force-dynamic'\nexport default function Layout({children}:{children:React.ReactNode}){return<>{children}</>}\n")
print('OK')
