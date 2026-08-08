with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
# Mostrar as partes relevantes
import re
lines = src.split('\n')
for i,l in enumerate(lines,1):
    if any(x in l for x in ['hoje','useState','carregar','dataVis','setData','plans','sel','Header','ListaRota']):
        print(f'{i}: {l[:120]}')
