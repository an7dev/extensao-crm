import type { SessionState } from "~/lib/auth"

export type ContatoData = {
  id_contato?: string
  id_conta: string
  nome: string
  email?: string
  telefone?: string
  cargo?: string
  cep?: string
  cidade?: string
  estado?: string
  endereco?: string
  bairro?: string
  numero?: string
}

export type NegotiationData = {
  nome: string
  responsavel: string
  empresa: string
  empresaId: string
  qualificacao: string
  etapaFunil: string
  etapaFunilId: string
  fonte: string
  fonteId: string
  campanha: string
  campanhaId: string
}

export type ConfigItem = {
  id: string
  titulo: string
}

type ConfigResponse = {
  itens: ConfigItem[]
}

const fetchConfig = async (
  session: SessionState,
  path: string,
  params: Record<string, string>
): Promise<ConfigItem[]> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const query = new URLSearchParams(params).toString()
  const endpoint = `${base}${path}?${query}`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.token}` },
    cache: "no-store"
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>
  if (!response.ok) {
    throw new Error(extractMessage(payload) || "Erro ao carregar configuracoes.")
  }

  return (payload?.data?.itens || payload?.itens || []) as ConfigItem[]
}

const criarConfig = async (
  session: SessionState,
  path: string,
  body: Record<string, string>
): Promise<ConfigItem> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}${path}`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify(body)
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>
  if (!response.ok) {
    throw new Error(extractMessage(payload) || "Erro ao criar item.")
  }

  return (payload?.data || payload) as ConfigItem
}

export const buscarEmpresas = (session: SessionState, idConta: string) =>
  fetchConfig(session, "/api-extensao/index.php?route=/config/empresas", { id_conta: idConta })

export const criarEmpresa = (session: SessionState, idConta: string, titulo: string) =>
  criarConfig(session, "/api-extensao/index.php?route=/config/empresa/criar", { id_conta: idConta, titulo })

export const buscarFontes = (session: SessionState, idConta: string) =>
  fetchConfig(session, "/api-extensao/index.php?route=/config/fontes", { id_conta: idConta })

export const criarFonte = (session: SessionState, idConta: string, titulo: string) =>
  criarConfig(session, "/api-extensao/index.php?route=/config/fonte/criar", { id_conta: idConta, titulo })

export const buscarCampanhas = (session: SessionState, idConta: string) =>
  fetchConfig(session, "/api-extensao/index.php?route=/config/campanhas", { id_conta: idConta })

export const criarCampanha = (session: SessionState, idConta: string, titulo: string) =>
  criarConfig(session, "/api-extensao/index.php?route=/config/campanha/criar", { id_conta: idConta, titulo })

export const buscarColunas = (session: SessionState, idConta: string) =>
  fetchConfig(session, "/api-extensao/index.php?route=/config/colunas", { id_conta: idConta })

type CreateLeadInput = {
  session: SessionState
  contactName: string
  negotiation: NegotiationData
  createLeadPath: string
  idFunilVenda?: string
}

const normalizeUrl = (crmUrl: string, path: string) => {
  const base = crmUrl.trim().replace(/\/+$/, "")
  const normalizedPath = path.trim().startsWith("/")
    ? path.trim()
    : `/${path.trim()}`

  return `${base}${normalizedPath}`
}

const extractMessage = (payload: Record<string, any>) =>
  payload?.message || payload?.error || payload?.data?.message

type CriarNegociacaoInput = {
  session: SessionState
  idFunilVenda: string
  tituloItem: string
  criarNegociacaoPath: string
  idEmpresaConta?: string
  idFonteConta?: string
  idCampanhaConta?: string
  idColuna?: string
  qualificacao?: string
}

export const criarNegociacao = async ({
  session,
  idFunilVenda,
  tituloItem,
  criarNegociacaoPath,
  idEmpresaConta,
  idFonteConta,
  idCampanhaConta,
  idColuna,
  qualificacao
}: CriarNegociacaoInput) => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const body: Record<string, string> = {
    id_funil_venda: idFunilVenda,
    titulo_item: tituloItem
  }

  if (idEmpresaConta) body.id_empresa_conta = idEmpresaConta
  if (idFonteConta) body.id_fonte_conta = idFonteConta
  if (idCampanhaConta) body.id_campanha_conta = idCampanhaConta
  if (idColuna) body.id_coluna = idColuna
  if (qualificacao) body.qualificacao = qualificacao

  const endpoint = normalizeUrl(session.crmUrl, criarNegociacaoPath)
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify(body)
  })

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) ||
        "Nao foi possivel criar a negociacao no CRM."
    )
  }

  return payload
}

type NegociacaoItem = {
  id: number
  titulo_item: string
  status_item: string
  data_cadastro: string
}

export type NegociacaoCompleta = {
  id: number
  id_funil_venda: number
  id_coluna: number | null
  titulo_item: string
  status_item: string
  data_cadastro: string
  id_usuario_cadastrou: number | null
  id_empresa_conta: number | null
  id_fonte_conta: number | null
  id_campanha_conta: number | null
  qualificacao: string | null
  data_vencimento: string | null
}

export const buscarNegociacoes = async (
  session: SessionState,
  idFunilVenda: string
): Promise<NegociacaoItem[]> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}/api-extensao/index.php?route=/negociacoes&id_funil_venda=${encodeURIComponent(idFunilVenda)}`

  const response = await fetch(endpoint, {
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
    throw new Error(
      extractMessage(payload) || "Nao foi possivel carregar as negociacoes."
    )
  }

  return (payload?.data?.negociacoes || payload?.negociacoes || []) as NegociacaoItem[]
}

export const buscarNegociacao = async (
  session: SessionState,
  idNegociacao: string
): Promise<NegociacaoCompleta> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}/api-extensao/index.php?route=/negociacao/buscar&id=${encodeURIComponent(idNegociacao)}`

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`
    },
    cache: "no-store"
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) || "Nao foi possivel carregar a negociacao."
    )
  }

  return (payload?.data?.negociacao || payload?.negociacao) as NegociacaoCompleta
}

export const atualizarNegociacao = async (
  session: SessionState,
  idNegociacao: string,
  dados: Partial<NegotiationData>
): Promise<void> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}/api-extensao/index.php?route=/negociacao/atualizar`

  const body: Record<string, any> = { id: idNegociacao }

  if (dados.nome !== undefined) body.titulo_item = dados.nome
  if (dados.etapaFunilId !== undefined) body.id_coluna = dados.etapaFunilId
  if (dados.empresaId !== undefined) body.id_empresa_conta = dados.empresaId || null
  if (dados.fonteId !== undefined) body.id_fonte_conta = dados.fonteId || null
  if (dados.campanhaId !== undefined) body.id_campanha_conta = dados.campanhaId || null
  if (dados.qualificacao !== undefined) body.qualificacao = dados.qualificacao || null

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, any>

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) || "Nao foi possivel atualizar a negociacao."
    )
  }
}

export const createLead = async ({
  session,
  contactName,
  negotiation,
  createLeadPath,
  idFunilVenda
}: CreateLeadInput) => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const endpoint = normalizeUrl(session.crmUrl, createLeadPath)
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify({
      contato: contactName,
      nome: negotiation.nome,
      responsavel: negotiation.responsavel,
      empresa: negotiation.empresa,
      qualificacao: negotiation.qualificacao,
      etapa_funil: negotiation.etapaFunil,
      fonte: negotiation.fonte,
      campanha: negotiation.campanha,
      negociacao: negotiation,
      id_funil_venda: idFunilVenda || ""
    })
  })

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) ||
        "Nao foi possivel criar a negociacao no CRM. Verifique o endpoint."
    )
  }

  return payload
}

type BuscarContatoInput = {
  session: SessionState
  idConta: string
  nome?: string
  telefone?: string
}

export const buscarContato = async ({
  session,
  idConta,
  nome,
  telefone
}: BuscarContatoInput): Promise<ContatoData[]> => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const params = new URLSearchParams({ id_conta: idConta })
  if (nome) params.set("nome", nome)
  if (telefone) params.set("telefone", telefone)

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}/api-extensao/index.php?route=/contato/buscar&${params.toString()}`

  const response = await fetch(endpoint, {
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
    throw new Error(
      extractMessage(payload) || "Nao foi possivel buscar o contato."
    )
  }

  return (payload?.data?.contatos || []) as ContatoData[]
}

type SalvarContatoInput = {
  session: SessionState
  contato: ContatoData
}

export const salvarContato = async ({
  session,
  contato
}: SalvarContatoInput) => {
  if (!session.token) {
    throw new Error("Sessao expirada. Faca login novamente.")
  }

  const base = session.crmUrl.trim().replace(/\/+$/, "")
  const endpoint = `${base}/api-extensao/index.php?route=/contato/salvar`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify(contato)
  })

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) || "Nao foi possivel salvar o contato."
    )
  }

  return payload
}

export const marcarStatusNegociacao = async (
  session: SessionState,
  idNegociacao: string,
  status: "Vendido" | "Perdido"
): Promise<Record<string, any>> => {
  const base = session.crmUrl?.trim().replace(/\/+$/, "") || ""

  const response = await fetch(
    `${base}/api-extensao/index.php?route=/negociacao/marcar-status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ id: idNegociacao, status })
    }
  )

  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    any
  >

  if (!response.ok) {
    throw new Error(
      extractMessage(payload) || "Nao foi possivel atualizar o status da negociacao."
    )
  }

  return payload
}
