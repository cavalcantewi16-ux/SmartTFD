with open(r'app\layout.tsx', encoding='utf-8') as f:
    src = f.read()
if "export const dynamic" not in src:
    with open(r'app\layout.tsx', 'w', encoding='utf-8') as f:
        f.write("export const dynamic = 'force-dynamic'\n" + src)
    print('OK')
else:
    print('ja existe')
