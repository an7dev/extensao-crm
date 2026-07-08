import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react"

import {
  clearSession,
  getStoredSession,
  loginToCrm,
  subscribeToSessionChanges,
  type SessionState
} from "~/lib/auth"

type AuthContextValue = {
  session: SessionState | null
  isAuthenticated: boolean
  isInitializing: boolean
  isSubmitting: boolean
  error: string
  login: (user: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

type AuthProviderProps = {
  children: ReactNode
}

const DEFAULT_CRM_URL = "https://app.an7.com.br"
const DEFAULT_LOGIN_PATH = "/api-extensao/index.php?route=/login"

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<SessionState | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let isActive = true

    const loadSession = async () => {
      const storedSession = await getStoredSession()

      if (!isActive) {
        return
      }

      setSession(storedSession)
      setIsInitializing(false)
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

  const login = async (user: string, password: string) => {
    setIsSubmitting(true)
    setError("")

    try {
      const nextSession = await loginToCrm({
        crmUrl: DEFAULT_CRM_URL,
        loginPath: DEFAULT_LOGIN_PATH,
        user,
        password
      })

      setSession(nextSession)
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Falha ao logar."
      setError(message)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const logout = async () => {
    await clearSession()
    setError("")
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      isInitializing,
      isSubmitting,
      error,
      login,
      logout
    }),
    [error, isInitializing, isSubmitting, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.")
  }

  return context
}
