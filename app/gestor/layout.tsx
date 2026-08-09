export const dynamic = 'force-dynamic'
import GestorLayoutClient from './GestorLayoutClient'
export default function Layout({children}:{children:React.ReactNode}){
  return <GestorLayoutClient>{children}</GestorLayoutClient>
}
