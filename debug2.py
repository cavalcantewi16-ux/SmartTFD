f = r'C:\SmartTFD\app\api\otimizar-rotas\route.ts'
txt = open(f, encoding='utf-8').read()
for i, line in enumerate(txt.splitlines()):
    if 'createRoute' in line or 'session' in line or 'cookies' in line:
        print(i, repr(line))
