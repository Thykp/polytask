'use client'
import { supabase } from '~/lib/supabase'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const isAuthRoute = pathname?.startsWith('/auth')

  useEffect(() => {
    if (isAuthRoute) { 
      setReady(true) 
      return 
    }

    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      if (!data.session) {
        router.replace('/auth')
      } else {
        // ✅ ensure user profile exists
        const user = data.session.user
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
          })
        }
      }
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session && !isAuthRoute) {
        router.replace('/auth')
      } else if (session) {
        const user = session.user
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
          })
        }
      }
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [router, isAuthRoute])

  if (!ready) return null
  return <>{children}</>
}
