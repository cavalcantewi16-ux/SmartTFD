import os
# verificar se ja existe gestor/layout.tsx
path = r'app\gestor\layout.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()
print(repr(content[:200]))
