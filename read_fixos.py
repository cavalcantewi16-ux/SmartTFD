path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines, 1):
    if 'Paciente' in l or 'fixo' in l.lower() or 'recorr' in l.lower() or 'sidebar' in l.lower():
        start = max(0, i-2)
        end = min(len(lines), i+2)
        for j in range(start, end):
            print(f"{j+1}: {lines[j]}", end='')
        print('---')
