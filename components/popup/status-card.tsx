import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "~/components/ui/card"

type StatusCardProps = {
  isLoading: boolean
  crmUrl?: string | null
  isAuthenticated: boolean
}

export function StatusCard({
  isLoading,
  crmUrl,
  isAuthenticated
}: StatusCardProps) {
  return (
    <Card className="border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-sm">
      <CardHeader className="p-4 pb-2">
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Status
        </CardDescription>
        <CardTitle className="text-base">Conexao com o CRM</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-emerald-50">
        {isLoading
          ? "Carregando..."
          : isAuthenticated
            ? `Conectado em ${crmUrl}`
            : "Sem autenticacao ativa"}
      </CardContent>
    </Card>
  )
}
