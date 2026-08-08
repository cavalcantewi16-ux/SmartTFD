with open(r'app\motorista\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
old='    const { data } = await supabase\n      .from(\'route_plans\')'
new='    let data:any=null\n    try{\n    const {data:d} = await supabase\n      .from(\'route_plans\')'
c=c.replace(old,new,1)
old='    setLoading(false)\n  }, [supabase, user?.id])'
new='    }catch(e){console.error(\'carregar error:\',e)}\n    setLoading(false)\n  }, [supabase, user?.id])'
c=c.replace(old,new,1)
# fix data reference inside if(data)
old='    if (data) {'
new='    if (d) { const data=d;'
c=c.replace(old,new,1)
with open(r'app\motorista\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
