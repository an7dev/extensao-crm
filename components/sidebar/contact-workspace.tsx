import { Check, ChevronDown, LogOut, MoreHorizontal, X } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react"

import imgAn7 from "~/assets/icon.png"
import { useAuth } from "~/components/sidebar/auth-context"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Toast, type ToastData } from "~/components/ui/toast"
import {
  atualizarNegociacao,
  buscarCampanhas,
  buscarColunas,
  buscarContato,
  buscarEmpresas,
  buscarFontes,
  buscarNegociacao,
  buscarNegociacoes,
  createLead,
  criarCampanha,
  criarEmpresa,
  criarFonte,
  criarNegociacao,
  marcarStatusNegociacao,
  salvarContato,
  type ConfigItem,
  type ContatoData,
  type NegociacaoCompleta,
  type NegotiationData
} from "~/lib/lead"

type ContactWorkspaceProps = {
  detectedContact: string | null
}

type WorkspacePage = "create" | "select"

type LinkedAccount = {
  id: string
  nome_conta: string
}

type SavedNegotiation = NegotiationData & {
  id: string
  contact: string
}

type NegociacaoItem = {
  id: number
  titulo_item: string
  status_item: string
  data_cadastro: string
}

const CREATE_LEAD_PATH = "/api-extensao/index.php?route=/criar-lead"
const CRIAR_NEGOCIACAO_PATH = "/api-extensao/index.php?route=/negociacao/criar"
const LINKED_ACCOUNTS_PATH = "/api-extensao/index.php?route=/contas-vinculadas"

const EMPTY_CONTACT_FORM: ContatoData = {
  id_conta: "",
  nome: "",
  email: "",
  telefone: "",
  cargo: "",
  cep: "",
  cidade: "",
  estado: "",
  endereco: "",
  bairro: "",
  numero: ""
}

const QUALIFICACAO_OPTIONS = ["Qualificando", "Qualificado", "Desqualificado"]

const EMPTY_NEGOTIATION: NegotiationData = {
  nome: "",
  responsavel: "",
  empresa: "",
  empresaId: "",
  qualificacao: "",
  etapaFunil: "",
  etapaFunilId: "",
  fonte: "",
  fonteId: "",
  campanha: "",
  campanhaId: ""
}

function AccordionField({
  title,
  children
}: {
  title: string
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded-[5px] overflow-hidden transition-all duration-200">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50/80 hover:bg-slate-100 transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}>
        {title}
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="transition-all duration-200"
        style={{
          maxHeight: isOpen ? "250px" : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden"
        }}>
        <div className="px-3 py-2.5 border-t border-slate-200 bg-white">
          {children}
        </div>
      </div>
    </div>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  onCreateNew?: (label: string) => void
}

function SelectField({
  label,
  value,
  options,
  onChange,
  onCreateNew
}: SelectFieldProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState("")

  if (isCreating && onCreateNew) {
    return (
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        {label} (novo)
        <div className="flex gap-1.5">
          <Input
            className="flex-1"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={`Nome da ${label.toLowerCase()}`}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-11 px-3 bg-[#0285D3] text-white hover:bg-[#04427F]"
            onClick={() => {
              if (newLabel.trim()) {
                onCreateNew(newLabel.trim())
                setIsCreating(false)
                setNewLabel("")
              }
            }}>
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11 px-3"
            onClick={() => {
              setIsCreating(false)
              setNewLabel("")
            }}>
            <X className="size-4" />
          </Button>
        </div>
      </label>
    )
  }

  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <div className="relative">
        <select
          className="h-11 w-full rounded-[5px] bg-white px-3 pr-10 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
          value={value}
          onChange={(event) => {
            const val = event.target.value
            if (val === "__create_new__") {
              setIsCreating(true)
            } else {
              onChange(val)
            }
          }}>
          <option value="">Selecione</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          {onCreateNew && (
            <option
              value="__create_new__"
              className="text-[#0285D3] font-medium">
              + Criar novo
            </option>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  )
}

export function ContactWorkspace({ detectedContact }: ContactWorkspaceProps) {
  const [page, setPage] = useState<WorkspacePage>("create")
  const [contactName, setContactName] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draftNegotiation, setDraftNegotiation] =
    useState<NegotiationData>(EMPTY_NEGOTIATION)
  const [savedNegotiations, setSavedNegotiations] = useState<
    SavedNegotiation[]
  >([])
  const [selectedNegotiationId, setSelectedNegotiationId] = useState("")
  const [editingNegotiationId, setEditingNegotiationId] = useState("")
  const [toast, setToast] = useState<ToastData | null>(null)
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false)
  const [negociacoes, setNegociacoes] = useState<NegociacaoItem[]>([])
  const [isLoadingNegociacoes, setIsLoadingNegociacoes] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactFormData, setContactFormData] =
    useState<ContatoData>(EMPTY_CONTACT_FORM)
  const [existingContactName, setExistingContactName] = useState<string | null>(
    null
  )
  const [negociacaoEditando, setNegociacaoEditando] =
    useState<NegociacaoCompleta | null>(null)
  const [isLoadingNegociacao, setIsLoadingNegociacao] = useState(false)
  const [isSavingNegociacao, setIsSavingNegociacao] = useState(false)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"venda" | "perda" | null>(
    null
  )
  const [empresas, setEmpresas] = useState<ConfigItem[]>([])
  const [fontes, setFontes] = useState<ConfigItem[]>([])
  const [campanhas, setCampanhas] = useState<ConfigItem[]>([])
  const [colunas, setColunas] = useState<ConfigItem[]>([])
  const { session, logout } = useAuth()
  const userRole = (session?.user?.funcao || session?.user?.role || "").trim()
  const canLoadLinkedAccounts = Boolean(session?.token)
  const shouldShowLinkedAccounts =
    canLoadLinkedAccounts && userRole.toLowerCase() !== "comum"

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type })
    },
    []
  )

  const reloadNegociacoes = useCallback(async () => {
    if (!session?.token || !selectedAccountId) {
      setNegociacoes([])
      return
    }

    try {
      const lista = await buscarNegociacoes(session, selectedAccountId)
      setNegociacoes(lista)
    } catch {
      // mantem a lista atual em caso de erro
    }
  }, [session, selectedAccountId])

  const userLabel = useMemo(() => {
    if (session?.user?.nome) {
      return session.user.nome
    }

    if (session?.user?.usuario) {
      return session.user.usuario
    }

    if (session?.user?.email) {
      return session.user.email
    }

    return "Usuario"
  }, [session?.user?.email, session?.user?.nome, session?.user?.usuario])

  useEffect(() => {
    setContactName(detectedContact ?? "")
    setToast(null)
  }, [detectedContact])

  useEffect(() => {
    setDraftNegotiation((previous) => ({
      ...previous,
      responsavel: userLabel
    }))
  }, [userLabel])

  useEffect(() => {
    const fetchExistingContact = async () => {
      const nome = (detectedContact || "").trim()
      if (!session?.token || !selectedAccountId || !nome) {
        setExistingContactName(null)
        return
      }
      try {
        const contatos = await buscarContato({
          session,
          idConta: selectedAccountId,
          nome
        })
        if (contatos.length > 0) {
          setExistingContactName(contatos[0].nome || null)
        } else {
          setExistingContactName(null)
        }
      } catch {
        setExistingContactName(null)
      }
    }
    fetchExistingContact()
  }, [detectedContact, selectedAccountId, session?.token, session?.crmUrl])

  useEffect(() => {
    const loadLinkedAccounts = async () => {
      if (!session?.token || !canLoadLinkedAccounts) {
        setLinkedAccounts([])
        setSelectedAccountId("")
        return
      }

      try {
        const base = session.crmUrl.trim().replace(/\/+$/, "")
        const endpoint = `${base}${LINKED_ACCOUNTS_PATH}`
        const userId = session?.user?.id
          ? `&id_usuario=${encodeURIComponent(session.user.id)}`
          : ""
        const response = await fetch(`${endpoint}${userId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.token}`
          },
          cache: "no-store"
        })
        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          any
        >

        if (!response.ok) {
          setLinkedAccounts([])
          setSelectedAccountId("")
          return
        }

        const contas = (payload?.data?.contas || payload?.contas || []) as
          | LinkedAccount[]
          | undefined
        const safeContas = Array.isArray(contas) ? contas : []
        setLinkedAccounts(safeContas)
        setSelectedAccountId((prev) => prev || safeContas[0]?.id || "")
      } catch {
        setLinkedAccounts([])
        setSelectedAccountId("")
      }
    }

    loadLinkedAccounts()
  }, [
    canLoadLinkedAccounts,
    session?.crmUrl,
    session?.token,
    session?.user?.id
  ])

  useEffect(() => {
    const loadConfigs = async () => {
      if (!session?.token || !selectedAccountId) {
        setEmpresas([])
        setFontes([])
        setCampanhas([])
        setColunas([])
        return
      }

      try {
        const [emp, fontes, camp, cols] = await Promise.all([
          buscarEmpresas(session, selectedAccountId),
          buscarFontes(session, selectedAccountId),
          buscarCampanhas(session, selectedAccountId),
          buscarColunas(session, selectedAccountId)
        ])
        setEmpresas(emp)
        setFontes(fontes)
        setCampanhas(camp)
        setColunas(cols)
      } catch {
        setEmpresas([])
        setFontes([])
        setCampanhas([])
        setColunas([])
      }
    }

    loadConfigs()
  }, [session?.token, session?.crmUrl, selectedAccountId])

  useEffect(() => {
    const loadNegociacoes = async () => {
      if (!session?.token || !selectedAccountId) {
        setNegociacoes([])
        return
      }

      setIsLoadingNegociacoes(true)

      try {
        const lista = await buscarNegociacoes(session, selectedAccountId)
        setNegociacoes(lista)
      } catch {
        setNegociacoes([])
      } finally {
        setIsLoadingNegociacoes(false)
      }
    }

    loadNegociacoes()
  }, [session, selectedAccountId])

  const handleSelectNegociacao = async (idNegociacao: string) => {
    setSelectedNegotiationId(idNegociacao)

    if (!idNegociacao || !session?.token) {
      setNegociacaoEditando(null)
      return
    }

    setIsLoadingNegociacao(true)
    try {
      const dados = await buscarNegociacao(session, idNegociacao)
      setNegociacaoEditando(dados)

      // Preencher os campos de edição com os dados da negociação
      const empresaConfig = empresas.find(
        (e) => Number(e.id) === dados.id_empresa_conta
      )
      const fonteConfig = fontes.find(
        (f) => Number(f.id) === dados.id_fonte_conta
      )
      const campanhaConfig = campanhas.find(
        (c) => Number(c.id) === dados.id_campanha_conta
      )
      const colunaConfig = colunas.find((c) => Number(c.id) === dados.id_coluna)

      setDraftNegotiation({
        nome: dados.titulo_item || "",
        responsavel: userLabel,
        empresa: empresaConfig?.titulo || "",
        empresaId: empresaConfig?.id || "",
        qualificacao: dados.qualificacao || "",
        etapaFunil: colunaConfig?.titulo || "",
        etapaFunilId: colunaConfig?.id || "",
        fonte: fonteConfig?.titulo || "",
        fonteId: fonteConfig?.id || "",
        campanha: campanhaConfig?.titulo || "",
        campanhaId: campanhaConfig?.id || ""
      })
    } catch {
      setNegociacaoEditando(null)
    } finally {
      setIsLoadingNegociacao(false)
    }
  }

  const handleSaveEditNegociacao = async () => {
    if (!negociacaoEditando || !session?.token) return

    if (!draftNegotiation.etapaFunil) {
      showToast("Selecione a etapa do funil.", "error")
      return
    }

    setIsSavingNegociacao(true)
    try {
      await atualizarNegociacao(
        session,
        String(negociacaoEditando.id),
        draftNegotiation
      )
      showToast("Negociacao atualizada com sucesso.", "success")
      setNegociacaoEditando(null)
      setSelectedNegotiationId("")

      // Recarregar lista
      const lista = await buscarNegociacoes(session, selectedAccountId)
      setNegociacoes(lista)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Erro ao atualizar negociacao."
      showToast(message, "error")
    } finally {
      setIsSavingNegociacao(false)
    }
  }

  const handleMarcarStatus = async () => {
    if (!confirmAction || !selectedNegotiationId) return

    setIsSavingNegociacao(true)
    try {
      const status = confirmAction === "venda" ? "Vendido" : "Perdido"
      await marcarStatusNegociacao(session, selectedNegotiationId, status)
      showToast(
        status === "Vendido"
          ? "Venda marcada com sucesso."
          : "Perda marcada com sucesso.",
        "success"
      )
      setShowConfirmModal(false)
      setConfirmAction(null)
      setSelectedNegotiationId("")

      // Recarregar lista
      const lista = await buscarNegociacoes(session, selectedAccountId)
      setNegociacoes(lista)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Erro ao marcar status."
      showToast(message, "error")
    } finally {
      setIsSavingNegociacao(false)
    }
  }

  const openNegotiationModal = (negotiation?: SavedNegotiation) => {
    const baseContact = (
      negotiation?.contact ||
      contactName ||
      detectedContact ||
      ""
    ).trim()

    setDraftNegotiation({
      nome: negotiation?.nome || baseContact,
      responsavel: userLabel,
      empresa: negotiation?.empresa || "",
      empresaId: negotiation?.empresaId || "",
      qualificacao: negotiation?.qualificacao || "",
      etapaFunil: negotiation?.etapaFunil || "",
      etapaFunilId: negotiation?.etapaFunilId || "",
      fonte: negotiation?.fonte || "",
      fonteId: negotiation?.fonteId || "",
      campanha: negotiation?.campanha || "",
      campanhaId: negotiation?.campanhaId || ""
    })

    setEditingNegotiationId(negotiation?.id || "")
    if (baseContact) {
      setContactName(baseContact)
    }

    setToast(null)
    setIsModalOpen(true)
  }

  const handleSaveNegotiation = async () => {
    if (!draftNegotiation.etapaFunil) {
      showToast("Selecione a etapa do funil.", "error")
      return
    }

    const normalizedContact = contactName.trim() || detectedContact || ""

    if (!normalizedContact) {
      showToast("Informe o nome ou numero do contato.", "error")
      return
    }

    const nextItem: SavedNegotiation = {
      id:
        editingNegotiationId ||
        `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      ...draftNegotiation,
      nome: draftNegotiation.nome.trim(),
      responsavel: draftNegotiation.responsavel.trim(),
      contact: normalizedContact
    }

    setSavedNegotiations((previous) => {
      if (!editingNegotiationId) {
        return [nextItem, ...previous]
      }

      return previous.map((item) =>
        item.id === editingNegotiationId ? nextItem : item
      )
    })

    setSelectedNegotiationId(nextItem.id)

    // Enviar para o CRM via API (apenas ao criar, nao ao editar)
    const isCreating = !editingNegotiationId

    if (isCreating && session?.token) {
      if (!selectedAccountId) {
        showToast(
          "Selecione uma conta vinculada antes de criar a negociacao.",
          "error"
        )
        setEditingNegotiationId("")
        setIsModalOpen(false)
        return
      }

      setEditingNegotiationId("")
      setIsModalOpen(false)

      try {
        const response = await criarNegociacao({
          session,
          idFunilVenda: selectedAccountId,
          tituloItem: draftNegotiation.nome.trim(),
          criarNegociacaoPath: CRIAR_NEGOCIACAO_PATH,
          idEmpresaConta: draftNegotiation.empresaId || undefined,
          idFonteConta: draftNegotiation.fonteId || undefined,
          idCampanhaConta: draftNegotiation.campanhaId || undefined,
          idColuna: draftNegotiation.etapaFunilId || undefined,
          qualificacao: draftNegotiation.qualificacao || undefined
        })

        showToast(
          response?.message || "Negociacao criada com sucesso no CRM.",
          "success"
        )
        reloadNegociacoes()
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Erro ao criar negociacao no CRM."
        showToast("Falhou ao enviar ao CRM: " + message, "error")
      }
    } else {
      setEditingNegotiationId("")
      setIsModalOpen(false)
      showToast(
        editingNegotiationId
          ? "Negociacao atualizada com sucesso."
          : "Negociacao criada com sucesso.",
        "success"
      )
    }
  }

  const handleCreateLead = async () => {
    if (!session || !selectedNegotiationId) {
      showToast("Selecione uma negociacao para enviar.", "error")
      return
    }

    const selected = negociacoes.find(
      (item) => String(item.id) === selectedNegotiationId
    )

    if (!selected) {
      showToast("Negociacao selecionada invalida.", "error")
      return
    }

    setIsCreatingLead(true)

    try {
      const response = await createLead({
        session,
        contactName: selected.titulo_item,
        negotiation: { nome: selected.titulo_item } as NegotiationData,
        createLeadPath: CREATE_LEAD_PATH,
        idFunilVenda: selectedAccountId
      })

      showToast(
        response?.message || "Negociacao enviada com sucesso.",
        "success"
      )
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Erro ao enviar negociacao."
      showToast(message, "error")
    } finally {
      setIsCreatingLead(false)
    }
  }

  const handleDraftChange = (field: keyof NegotiationData, value: string) => {
    setDraftNegotiation((previous) => ({
      ...previous,
      [field]: value
    }))
  }

  const handleSelectConfig = (
    field: "empresa" | "fonte" | "campanha" | "etapaFunil",
    label: string,
    id: string
  ) => {
    const idField = (
      field === "empresa"
        ? "empresaId"
        : field === "fonte"
          ? "fonteId"
          : field === "campanha"
            ? "campanhaId"
            : "etapaFunilId"
    ) as keyof NegotiationData
    setDraftNegotiation((previous) => ({
      ...previous,
      [field]: label,
      [idField]: id
    }))
  }

  const handleCreateConfig = async (
    field: "empresa" | "fonte" | "campanha",
    titulo: string
  ) => {
    if (!session || !selectedAccountId) return

    try {
      let created: ConfigItem
      if (field === "empresa") {
        created = await criarEmpresa(session, selectedAccountId, titulo)
        setEmpresas((prev) => [...prev, created])
      } else if (field === "fonte") {
        created = await criarFonte(session, selectedAccountId, titulo)
        setFontes((prev) => [...prev, created])
      } else {
        created = await criarCampanha(session, selectedAccountId, titulo)
        setCampanhas((prev) => [...prev, created])
      }

      handleSelectConfig(field, created.titulo, created.id)
      showToast(
        `${field === "empresa" ? "Empresa" : field === "fonte" ? "Fonte" : "Campanha"} criada com sucesso.`,
        "success"
      )
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Erro ao criar item."
      showToast(message, "error")
    }
  }

  const openContactModal = async () => {
    if (!selectedAccountId) {
      showToast(
        "Selecione uma conta vinculada antes de editar o contato.",
        "error"
      )
      return
    }

    setToast(null)

    const baseContact = (detectedContact || "").trim()

    if (!baseContact) {
      showToast("Nenhum contato detectado na conversa.", "error")
      return
    }

    setIsContactModalOpen(true)
    setContactFormData({
      ...EMPTY_CONTACT_FORM,
      id_conta: selectedAccountId,
      nome: baseContact
    })

    try {
      const contatos = await buscarContato({
        session,
        idConta: selectedAccountId,
        nome: baseContact
      })

      if (contatos.length > 0) {
        const c = contatos[0]
        setContactFormData({
          id_contato: String(c.id_contato),
          id_conta: selectedAccountId,
          nome: c.nome || baseContact,
          email: c.email || "",
          telefone: c.telefone || "",
          cargo: c.cargo || "",
          cep: c.cep || "",
          cidade: c.cidade || "",
          estado: c.estado || "",
          endereco: c.endereco || "",
          bairro: c.bairro || "",
          numero: c.numero || ""
        })
      }
    } catch {
      // mantem o formulario com o nome preenchido
    }
  }

  const handleContactFormChange = (field: keyof ContatoData, value: string) => {
    setContactFormData((previous) => ({
      ...previous,
      [field]: value
    }))
  }

  const handleSaveContact = async () => {
    if (!contactFormData.nome.trim()) {
      showToast("Informe o nome do contato.", "error")
      return
    }

    if (!selectedAccountId) {
      showToast("Selecione uma conta vinculada.", "error")
      return
    }

    setIsSavingContact(true)

    try {
      await salvarContato({
        session,
        contato: {
          ...contactFormData,
          id_conta: selectedAccountId
        }
      })

      const isEdit = Boolean(contactFormData.id_contato)
      showToast(
        isEdit
          ? "Contato atualizado com sucesso."
          : "Contato cadastrado com sucesso.",
        "success"
      )
      setExistingContactName(contactFormData.nome.trim())
      setIsContactModalOpen(false)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Erro ao salvar contato."
      showToast(message, "error")
    } finally {
      setIsSavingContact(false)
    }
  }

  return (
    <div className="relative h-full overflow-visible">
      <Card className="h-full border-[#0285D3] flex flex-col">
        <CardHeader className="space-y-2 p-3">
          <div className="flex items-center justify-between pl-3 pr-3">
            <CardDescription className="text-[16px] font-regular text-[#06101C] flex items-center gap-2">
              <img src={imgAn7} className="w-[50px]" />
              Olá, {userLabel}
            </CardDescription>
            <Button type="button" variant="ghost" size="icon" onClick={logout}>
              <LogOut className="size-5" />
            </Button>
          </div>

          {detectedContact ? (
            <>
              <div className="bg-[#06101C] text-white p-3 text-[16px] rounded-b flex items-center justify-between relative">
                <span className="truncate pr-2">
                  {existingContactName || detectedContact}
                </span>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/10"
                    onClick={() => setIsPageMenuOpen((prev) => !prev)}>
                    <MoreHorizontal className="size-5" />
                  </Button>
                  {isPageMenuOpen ? (
                    <div className="absolute right-0 top-9 z-20 min-w-[210px] rounded border border-slate-200 bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => {
                          setPage("create")
                          setIsPageMenuOpen(false)
                        }}>
                        Criar negociação
                      </button>
                      <button
                        type="button"
                        className="w-full rounded px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => {
                          setPage("select")
                          setIsPageMenuOpen(false)
                        }}>
                        Selecionar negociação
                      </button>
                      <hr className="my-1 border-slate-200" />
                      <button
                        type="button"
                        className="w-full rounded px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                        onClick={() => {
                          setIsPageMenuOpen(false)
                          openContactModal()
                        }}>
                        Editar contato
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {shouldShowLinkedAccounts ? (
                <div className="px-3 pt-2">
                  <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                    Conta vinculada
                    <div className="relative">
                      <select
                        className="h-11 w-full rounded-[5px] bg-white px-3 pr-10 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedAccountId}
                        onChange={(event) =>
                          setSelectedAccountId(event.target.value)
                        }>
                        <option value="">Selecione uma conta</option>
                        {linkedAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.nome_conta}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
        </CardHeader>

        {detectedContact ? (
          <div className="p-2 h-auto mt-3 rounded m-3">
            <CardContent className="space-y-4 pt-0 mt-2 overflow-auto flex-1">
              {page === "create" ? (
                <>
                  <CardTitle className="text-xl text-slate-900 ">
                    Criar negociacao
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Preencha um contato e abra o formulario da negociacao.
                  </CardDescription>
                  <Input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="Nome ou numero do contato"
                    className="bg-white"
                  />
                  <Button
                    type="button"
                    onClick={() => openNegotiationModal()}
                    className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
                    Nova negociacao
                  </Button>
                </>
              ) : (
                <>
                  {!selectedAccountId ? (
                    <p className="text-sm text-slate-600">
                      Selecione uma conta vinculada acima para ver as
                      negociacoes.
                    </p>
                  ) : isLoadingNegociacoes ? (
                    <p className="text-sm text-slate-600">
                      Carregando negociacoes...
                    </p>
                  ) : negociacoes.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Nenhuma negociacao encontrada para esta conta.
                    </p>
                  ) : (
                    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                      Negociacao
                      <div className="relative">
                        <select
                          className="h-11 w-full rounded-[5px] bg-white px-3 pr-10 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedNegotiationId}
                          onChange={(event) =>
                            handleSelectNegociacao(event.target.value)
                          }>
                          <option value="">Selecione uma negociacao</option>
                          {negociacoes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.titulo_item} ({item.status_item})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </label>
                  )}

                  {!selectedNegotiationId ? (
                    <Button
                      type="button"
                      onClick={handleCreateLead}
                      disabled={!selectedNegotiationId || isCreatingLead}
                      className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
                      {isCreatingLead
                        ? "Enviando..."
                        : "Enviar negociacao ao CRM"}
                    </Button>
                  ) : isLoadingNegociacao ? (
                    <p className="text-sm text-slate-600">
                      Carregando dados da negociacao...
                    </p>
                  ) : negociacaoEditando ? (
                    <>
                      <div className="rounded-[5px] bg-white shadow-md border border-slate-200 p-3 space-y-3">
                        <AccordionField title="Nome">
                          <Input
                            value={draftNegotiation.nome}
                            onChange={(event) =>
                              handleDraftChange("nome", event.target.value)
                            }
                            placeholder="Nome da negociacao"
                          />
                        </AccordionField>

                        <AccordionField title="Empresa">
                          <SelectField
                            label=""
                            value={draftNegotiation.empresa}
                            options={empresas.map((e) => e.titulo)}
                            onChange={(value) => {
                              const item = empresas.find(
                                (e) => e.titulo === value
                              )
                              handleSelectConfig(
                                "empresa",
                                value,
                                item?.id || ""
                              )
                            }}
                            onCreateNew={(titulo) =>
                              handleCreateConfig("empresa", titulo)
                            }
                          />
                        </AccordionField>

                        <AccordionField title="Qualificacao">
                          <SelectField
                            label=""
                            value={draftNegotiation.qualificacao}
                            options={QUALIFICACAO_OPTIONS}
                            onChange={(value) =>
                              handleDraftChange("qualificacao", value)
                            }
                          />
                        </AccordionField>

                        <AccordionField title="Etapa do Funil *">
                          <SelectField
                            label=""
                            value={draftNegotiation.etapaFunil}
                            options={colunas.map((c) => c.titulo)}
                            onChange={(value) => {
                              const item = colunas.find(
                                (c) => c.titulo === value
                              )
                              handleSelectConfig(
                                "etapaFunil",
                                value,
                                item?.id || ""
                              )
                            }}
                          />
                        </AccordionField>

                        <AccordionField title="Fonte e Campanha">
                          <div className="space-y-3">
                            <SelectField
                              label="Fonte"
                              value={draftNegotiation.fonte}
                              options={fontes.map((f) => f.titulo)}
                              onChange={(value) => {
                                const item = fontes.find(
                                  (f) => f.titulo === value
                                )
                                handleSelectConfig(
                                  "fonte",
                                  value,
                                  item?.id || ""
                                )
                              }}
                              onCreateNew={(titulo) =>
                                handleCreateConfig("fonte", titulo)
                              }
                            />
                            <SelectField
                              label="Campanha"
                              value={draftNegotiation.campanha}
                              options={campanhas.map((c) => c.titulo)}
                              onChange={(value) => {
                                const item = campanhas.find(
                                  (c) => c.titulo === value
                                )
                                handleSelectConfig(
                                  "campanha",
                                  value,
                                  item?.id || ""
                                )
                              }}
                              onCreateNew={(titulo) =>
                                handleCreateConfig("campanha", titulo)
                              }
                            />
                          </div>
                        </AccordionField>

                        <Button
                          type="button"
                          onClick={handleSaveEditNegociacao}
                          disabled={isSavingNegociacao}
                          className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
                          {isSavingNegociacao
                            ? "Salvando..."
                            : "Salvar alterações"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const base =
                              session?.crmUrl?.trim().replace(/\/+$/, "") || ""
                            window.open(
                              `${base}/crm/index.php?p=editar-item-funil-venda&id=${selectedNegotiationId}`,
                              "_blank"
                            )
                          }}
                          className="w-full text-[#0285D3]"
                          style={{ border: "1px solid #0285D3" }}>
                          Abrir no CRM
                        </Button>
                      </div>

                      <div className="rounded-[5px] bg-white shadow-md border border-slate-200 p-3 space-y-3">
                        <h3 className="text-lg font-bold text-slate-900">
                          Status da negociação
                        </h3>
                        <div className="grid grid-cols-1 gap-2.5">
                          <Button
                            type="button"
                            onClick={() => {
                              setConfirmAction("venda")
                              setShowConfirmModal(true)
                            }}
                            className="bg-emerald-500 text-white hover:bg-emerald-600">
                            Marcar venda
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              setConfirmAction("perda")
                              setShowConfirmModal(true)
                            }}
                            className="bg-red-500 text-white hover:bg-red-600">
                            Marcar perda
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleCreateLead}
                      disabled={isCreatingLead}
                      className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
                      {isCreatingLead
                        ? "Enviando..."
                        : "Enviar negociacao ao CRM"}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-slate-500">Selecione um contato</p>
          </div>
        )}
      </Card>

      {isModalOpen ? (
        <div
          className="bg-slate-950/45 backdrop-blur-[1px]"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2147483646
          }}
          onClick={() => setIsModalOpen(false)}>
          <div
            className="w-[92%] max-w-[320px] max-h-[90vh] overflow-auto rounded-[5px] border border-slate-200 bg-white p-4 shadow-2xl"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)"
            }}
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingNegotiationId
                    ? "Editar negociacao"
                    : "Criar negociacao"}
                </h3>
                <p className="text-sm text-slate-500">
                  Preencha os campos para montar a negociacao.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Nome
                <Input
                  value={draftNegotiation.nome}
                  onChange={(event) =>
                    handleDraftChange("nome", event.target.value)
                  }
                  placeholder="Nome da negociacao"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Responsavel
                <Input
                  className="bg-slate-50"
                  value={draftNegotiation.responsavel}
                  disabled
                />
              </label>

              <SelectField
                label="Empresa"
                value={draftNegotiation.empresa}
                options={empresas.map((e) => e.titulo)}
                onChange={(value) => {
                  const item = empresas.find((e) => e.titulo === value)
                  handleSelectConfig("empresa", value, item?.id || "")
                }}
                onCreateNew={(titulo) => handleCreateConfig("empresa", titulo)}
              />

              <SelectField
                label="Qualificacao"
                value={draftNegotiation.qualificacao}
                options={QUALIFICACAO_OPTIONS}
                onChange={(value) => handleDraftChange("qualificacao", value)}
              />

              <SelectField
                label="Etapa do Funil *"
                value={draftNegotiation.etapaFunil}
                options={colunas.map((c) => c.titulo)}
                onChange={(value) => {
                  const item = colunas.find((c) => c.titulo === value)
                  handleSelectConfig("etapaFunil", value, item?.id || "")
                }}
              />

              <SelectField
                label="Fonte"
                value={draftNegotiation.fonte}
                options={fontes.map((f) => f.titulo)}
                onChange={(value) => {
                  const item = fontes.find((f) => f.titulo === value)
                  handleSelectConfig("fonte", value, item?.id || "")
                }}
                onCreateNew={(titulo) => handleCreateConfig("fonte", titulo)}
              />

              <SelectField
                label="Campanha"
                value={draftNegotiation.campanha}
                options={campanhas.map((c) => c.titulo)}
                onChange={(value) => {
                  const item = campanhas.find((c) => c.titulo === value)
                  handleSelectConfig("campanha", value, item?.id || "")
                }}
                onCreateNew={(titulo) => handleCreateConfig("campanha", titulo)}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveNegotiation}
                className="bg-[#0285D3] text-white hover:bg-[#04427F]">
                Salvar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isContactModalOpen ? (
        <div
          className="bg-slate-950/45 backdrop-blur-[1px]"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2147483646
          }}
          onClick={() => setIsContactModalOpen(false)}>
          <div
            className="w-[92%] max-w-[320px] max-h-[90vh] overflow-auto rounded-[5px] border border-slate-200 bg-white p-4 shadow-2xl"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)"
            }}
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {contactFormData.id_contato
                    ? "Editar contato"
                    : "Cadastrar contato"}
                </h3>
                <p className="text-sm text-slate-500">
                  {contactFormData.id_contato
                    ? "Atualize os dados do contato."
                    : "Preencha os dados para cadastrar o contato."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsContactModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Nome *
                <Input
                  value={contactFormData.nome}
                  onChange={(event) =>
                    handleContactFormChange("nome", event.target.value)
                  }
                  placeholder="Nome do contato"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Email
                <Input
                  type="email"
                  value={contactFormData.email || ""}
                  onChange={(event) =>
                    handleContactFormChange("email", event.target.value)
                  }
                  placeholder="email@exemplo.com"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Telefone
                <Input
                  value={contactFormData.telefone || ""}
                  onChange={(event) =>
                    handleContactFormChange("telefone", event.target.value)
                  }
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Cargo
                <Input
                  value={contactFormData.cargo || ""}
                  onChange={(event) =>
                    handleContactFormChange("cargo", event.target.value)
                  }
                  placeholder="Cargo do contato"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  CEP
                  <Input
                    value={contactFormData.cep || ""}
                    onChange={(event) =>
                      handleContactFormChange("cep", event.target.value)
                    }
                    placeholder="00000-000"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Estado
                  <Input
                    value={contactFormData.estado || ""}
                    onChange={(event) =>
                      handleContactFormChange("estado", event.target.value)
                    }
                    placeholder="UF"
                    maxLength={2}
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Cidade
                <Input
                  value={contactFormData.cidade || ""}
                  onChange={(event) =>
                    handleContactFormChange("cidade", event.target.value)
                  }
                  placeholder="Cidade"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Endereco
                <Input
                  value={contactFormData.endereco || ""}
                  onChange={(event) =>
                    handleContactFormChange("endereco", event.target.value)
                  }
                  placeholder="Rua, Avenida..."
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Bairro
                  <Input
                    value={contactFormData.bairro || ""}
                    onChange={(event) =>
                      handleContactFormChange("bairro", event.target.value)
                    }
                    placeholder="Bairro"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Numero
                  <Input
                    value={contactFormData.numero || ""}
                    onChange={(event) =>
                      handleContactFormChange("numero", event.target.value)
                    }
                    placeholder="Numero"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsContactModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveContact}
                disabled={isSavingContact}
                className="bg-[#0285D3] text-white hover:bg-[#04427F]">
                {isSavingContact ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}

      {showConfirmModal ? (
        <div
          className="bg-slate-950/45 backdrop-blur-[1px]"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2147483646
          }}
          onClick={() => setShowConfirmModal(false)}>
          <div
            className="w-[92%] max-w-[320px] max-h-[90vh] overflow-auto rounded-[5px] border border-slate-200 bg-white p-4 shadow-2xl"
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)"
            }}
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {confirmAction === "venda" ? "Marcar como venda" : "Marcar como perda"}
                </h3>
                <p className="text-sm text-slate-500">
                  Deseja mesmo marcar a negociação como{" "}
                  {confirmAction === "venda" ? "venda" : "perda"}?
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                
                onClick={() => setShowConfirmModal(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="w-full text-[#0285D3]"
                style={{ border: "1px solid #0285D3" }}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleMarcarStatus}
                disabled={isSavingNegociacao}
                className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
                {isSavingNegociacao ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
