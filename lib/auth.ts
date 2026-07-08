export type CrmConfig = {
  crmUrl: string
  loginPath: string
}

export type CrmUser = {
  id?: string
  nome?: string
  email?: string
  usuario?: string
  role?: string
  funcao?: string
  id_conta?: string
}

export type SessionState = CrmConfig & {
  token: string
  user: CrmUser
}

type LoginPayload = CrmConfig & {
  user: string
  password: string
}

const STORAGE_KEY = "crmSession"

const browserStorage = chrome.storage.local

const normalizeUrl = (crmUrl: string, loginPath: string) => {
  const base = crmUrl.trim().replace(/\/+$/, "")
  const path = loginPath.trim().startsWith("/")
    ? loginPath.trim()
    : `/${loginPath.trim()}`

  return `${base}${path}`
}

const extractToken = (payload: Record<string, any>) =>
  payload.token ||
  payload.accessToken ||
  payload.access_token ||
  payload?.data?.token ||
  payload?.data?.accessToken ||
  payload?.data?.access_token

const extractUser = (payload: Record<string, any>, user: string): CrmUser =>
  payload.user || payload?.data?.user || { usuario: user }

const extractMessage = (payload: Record<string, any>) =>
  payload.message || payload.error || payload?.data?.message

export const getStoredSession = async (): Promise<SessionState | null> => {
  const result = await browserStorage.get(STORAGE_KEY)

  return (result[STORAGE_KEY] as SessionState | undefined) ?? null
}

export const saveCrmConfig = async (config: CrmConfig) => {
  const previous = await getStoredSession()

  if (previous?.token) {
    await browserStorage.set({
      [STORAGE_KEY]: {
        ...previous,
        ...config
      }
    })

    return
  }

  await browserStorage.set({
    [STORAGE_KEY]: {
      ...config,
      token: "",
      user: {}
    }
  })
}

export const loginToCrm = async ({
  crmUrl,
  loginPath,
  user,
  password
}: LoginPayload): Promise<SessionState> => {
  if (!crmUrl.trim()) {
    throw new Error("Informe a URL do CRM.")
  }

  if (!user.trim() || !password.trim()) {
    throw new Error("Informe usuario e senha.")
  }

  const endpoint = normalizeUrl(crmUrl, loginPath)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user,
      password
    })
  })

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) || "O CRM recusou as credenciais enviadas."
    )
  }

  const token = extractToken(payload)

  if (!token) {
    throw new Error(
      "A resposta do CRM nao retornou um token. Ajuste o endpoint ou adapte o parser."
    )
  }

  const session: SessionState = {
    crmUrl: crmUrl.trim().replace(/\/+$/, ""),
    loginPath: loginPath.trim() || "/api/auth/login",
    token,
    user: extractUser(payload, user)
  }

  await browserStorage.set({
    [STORAGE_KEY]: session
  })

  return session
}

export const clearSession = async () => {
  const previous = await getStoredSession()

  if (!previous) {
    return
  }

  await browserStorage.set({
    [STORAGE_KEY]: {
      crmUrl: previous.crmUrl,
      loginPath: previous.loginPath,
      token: "",
      user: {}
    }
  })
}

export const subscribeToSessionChanges = (
  callback: (session: SessionState | null) => void
) => {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return
    }

    callback((changes[STORAGE_KEY].newValue as SessionState | undefined) ?? null)
  }

  chrome.storage.onChanged.addListener(listener)

  return () => chrome.storage.onChanged.removeListener(listener)
}
