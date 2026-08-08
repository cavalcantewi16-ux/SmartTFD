import re
with open(r'C:\SmartTFD\app\gestor\layout.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
lines[8]  = "  { href: '/gestor/rotas-do-dia', label: 'Rotas do Dia' },\n"
lines[13] = ""
lines[14] = ""
with open(r'C:\SmartTFD\app\gestor\layout.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('OK')
