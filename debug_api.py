f = r'C:\SmartTFD\app\api\otimizar-rotas\route.ts'
txt = open(f, encoding='utf-8').read()
# Mostra as primeiras 10 linhas com repr para ver encoding exato
for i, line in enumerate(txt.splitlines()[:10]):
    print(i, repr(line))
