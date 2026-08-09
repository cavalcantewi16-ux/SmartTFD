import os, shutil

# renomear gestor/layout.tsx -> GestorLayoutClient.tsx
shutil.copy(r'app\gestor\layout.tsx', r'app\gestor\GestorLayoutClient.tsx')

# criar novo layout.tsx server component com dynamic
with open(r'app\gestor\layout.tsx', 'w', encoding='utf-8') as f:
    f.write("export const dynamic = 'force-dynamic'\nimport GestorLayoutClient from './GestorLayoutClient'\nexport default function Layout({children}:{children:React.ReactNode}){\n  return <GestorLayoutClient>{children}</GestorLayoutClient>\n}\n")

print('OK')
