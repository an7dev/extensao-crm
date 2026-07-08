import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"

import "~/styles/globals.css"

import { AuthProvider, useAuth } from "~/components/sidebar/auth-context"
import { ContactWorkspace } from "~/components/sidebar/contact-workspace"
import { LoginForm } from "~/components/sidebar/login-form"

export const config: PlasmoCSConfig = {
  matches: ["https://web.whatsapp.com/*"],
  run_at: "document_idle"
}

const SIDEBAR_WIDTH = 330
const ROOT_ID = "crm-whatsapp-sidebar-root"
const STYLE_ID = "crm-whatsapp-sidebar-style"
const PHONE_REGEX = /\+?\d[\d\s().-]{6,}\d/
const INVALID_CONTACT_LABELS = [
  "clique para mostrar dados do contato",
  "click to see contact info",
  "contact info",
  "dados do contato",
  "dados do perfil",
  "profile info"
]

const findWhatsAppLayout = () =>
  document.querySelector(".two") as HTMLElement | null

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim()
const normalizeComparison = (value: string) =>
  normalizeText(value).toLowerCase()

const isLikelyPhone = (value: string) => {
  const compactDigits = value.replace(/[^\d+]/g, "")

  return PHONE_REGEX.test(value) || /^\+?\d{7,}$/.test(compactDigits)
}

const isInvalidContactLabel = (value: string) => {
  const normalized = normalizeComparison(value)

  return INVALID_CONTACT_LABELS.some((label) => normalized.includes(label))
}

const getConversationContact = () => {
  const header = document.querySelector("#main header")

  if (!header) {
    return null
  }

  const candidates: string[] = []

  const pushCandidate = (rawValue: string | null | undefined) => {
    if (!rawValue) {
      return
    }

    const value = normalizeText(rawValue)

    if (!value || isInvalidContactLabel(value) || candidates.includes(value)) {
      return
    }

    candidates.push(value)
  }

  const selectors = [
    '[data-testid="conversation-info-header-chat-title"]'
  ]

  selectors.forEach((selector) => {
    header.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      pushCandidate(node.getAttribute("title"))
      pushCandidate(node.textContent)
    })
  })

  if (!candidates.length) {
    const headerText = normalizeText(header.textContent ?? "")
    const phoneMatch = headerText.match(PHONE_REGEX)

    return phoneMatch?.[0] ?? null
  }

  const nameCandidate = candidates.find(
    (candidate) => !isLikelyPhone(candidate) && /[A-Za-z]/.test(candidate)
  )

  if (nameCandidate) {
    return nameCandidate
  }

  const phoneCandidate = candidates.find((candidate) => isLikelyPhone(candidate))

  if (phoneCandidate) {
    return phoneCandidate
  }

  return candidates[0]
}

const ensureSidebarStyle = () => {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = `
    #${ROOT_ID} {
      width: ${SIDEBAR_WIDTH}px;
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      z-index: 20;
      overflow: hidden;
    }

    #${ROOT_ID} .plasmo-csui-container {
      display: flex;
      position: absolute;
      top: 0;
      right: 0;
      width: ${SIDEBAR_WIDTH}px;
      height: 100%;
    }

    #${ROOT_ID} .plasmo-inline {
      display: block;
      width: ${SIDEBAR_WIDTH}px;
      height: 100%;
    }
  `

  document.head.appendChild(style)
}

export const getRootContainer: PlasmoGetRootContainer = async () => {
  ensureSidebarStyle()

  const existingRoot = document.getElementById(ROOT_ID)

  if (existingRoot) {
    return existingRoot
  }

  const root = document.createElement("div")
  root.id = ROOT_ID

  const attachRoot = () => {
    const layout = findWhatsAppLayout()

    if (!layout) {
      return false
    }

    layout.appendChild(root)
    return true
  }

  if (attachRoot()) {
    return root
  }

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!attachRoot()) {
        return
      }

      observer.disconnect()
      resolve()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })
  })

  return root
}

function SidebarContent() {
  const [detectedContact, setDetectedContact] = useState<string | null>(null)
  const { isAuthenticated, isInitializing } = useAuth()

  useEffect(() => {
    let currentLayout: HTMLElement | null = null
    let cleanup: (() => void) | null = null

    const updateLayout = () => {
      const layout = findWhatsAppLayout()

      if (!layout) {
        return
      }

      if (layout !== currentLayout) {
        cleanup?.()
        currentLayout = layout

        const previousPosition = layout.style.position
        const previousPaddingRight = layout.style.paddingRight
        const previousBoxSizing = layout.style.boxSizing

        cleanup = () => {
          layout.style.position = previousPosition
          layout.style.paddingRight = previousPaddingRight
          layout.style.boxSizing = previousBoxSizing
        }
      }

      layout.style.position = "relative"
      layout.style.paddingRight = `${SIDEBAR_WIDTH}px`
      layout.style.boxSizing = "border-box"
    }

    updateLayout()

    const observer = new MutationObserver(updateLayout)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    window.addEventListener("resize", updateLayout)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateLayout)
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setDetectedContact(null)
      return
    }

    const updateContact = () => {
      const nextContact = getConversationContact()

      setDetectedContact((currentContact) =>
        currentContact === nextContact ? currentContact : nextContact
      )
    }

    updateContact()

    const observer = new MutationObserver(updateContact)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })

    window.addEventListener("focus", updateContact)

    return () => {
      observer.disconnect()
      window.removeEventListener("focus", updateContact)
    }
  }, [isAuthenticated])

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(240,253,250,0.96)_100%)] text-slate-900">
      {isInitializing ? (
        <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
          Carregando sessao...
        </p>
      ) : isAuthenticated ? (
        <ContactWorkspace detectedContact={detectedContact} />
      ) : (
        <LoginForm />
      )}
    </aside>
  )
}

function WhatsAppSidebar() {
  return (
    <AuthProvider>
      <SidebarContent />
    </AuthProvider>
  )
}

export default WhatsAppSidebar
