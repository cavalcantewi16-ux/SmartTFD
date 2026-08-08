with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    lines=f.readlines()
line=lines[261]
print('Chars 310-325:', repr(line[310:325]))
bad=[(i,ord(ch),repr(ch)) for i,ch in enumerate(line) if ord(ch)>127]
print('Non-ASCII na linha 262:')
for pos,cp,ch in bad[:20]:
    print(f'  pos {pos}: U+{cp:04X} {ch}')
