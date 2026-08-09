import base64, shutil
# copiar do sandbox para o projeto
src = r'C:\Users\willi\AppData\Roaming\Claude\local-agent-mode-sessions\95aa13ae-ba49-41c8-bf6d-6efa6a642c91\75e7893c-3ee7-41f2-8898-b3aded6d689d\local_a804ed8f-032c-42b0-81dc-5af5dd502f34\outputs\maps-icon-check.png'
dst = r'C:\SmartTFD\public\maps-icon.png'
shutil.copy(src, dst)
print('imagem copiada')
