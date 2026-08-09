with open(r'app\layout.tsx', encoding='utf-8') as f:
    src = f.read()
print(repr(src[:150]))
print('has use client:', "'use client'" in src)
