with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Total: {len(lines)} linhas')
for i, l in enumerate(lines, 1):
    print(f'{i}: {l}', end='')
