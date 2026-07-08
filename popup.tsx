import "~/styles/globals.css"

import { useEffect, useState } from "react"

import { StatusCard } from "~/components/popup/status-card"
import {
  getStoredSession,
  subscribeToSessionChanges,
  type SessionState
} from "~/lib/auth"

function IndexPopup() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadSession = async () => {
      const storedSession = await getStoredSession()

      if (!isActive) {
        return
      }

      setSession(storedSession)
      setIsLoading(false)
    }

    loadSession()

    const unsubscribe = subscribeToSessionChanges((nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  const isAuthenticated = Boolean(session?.token)

  return (
    <main className="w-80 bg-[linear-gradient(160deg,_#0f172a_0%,_#134e4a_100%)] p-5 text-slate-50">
      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-200">
        Extensao CRM
      </span>
      <h1 className="mt-2 text-2xl font-semibold leading-tight">
        Sidebar para WhatsApp Web
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Abra o WhatsApp Web para usar a sidebar de login e autenticar no seu CRM.
      </p>

      <div className="mt-5">
        <StatusCard
          isLoading={isLoading}
          isAuthenticated={isAuthenticated}
          crmUrl={session?.crmUrl}
        />
      </div>
    </main>
  )
}

export default IndexPopup
