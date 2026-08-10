from PIL import Image
img = Image.open(r'public\icone-google-maps.webp.png').convert('RGBA')
pixels = list(img.getdata())
new = [(r,g,b,0) if r>220 and g>220 and b>220 else (r,g,b,a) for r,g,b,a in pixels]
img.putdata(new)
img.save(r'public\icone-google-maps.webp.png','PNG')
print('OK')
