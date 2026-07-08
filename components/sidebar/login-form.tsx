import { Lock, User } from "lucide-react"
import { useState, type FormEvent } from "react"

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

export function LoginForm() {
  const [user, setUser] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")
  const { login, error, isSubmitting } = useAuth()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user.trim() || !password.trim()) {
      setLocalError("Preencha usuario e senha para continuar.")
      return
    }

    setLocalError("")
    await login(user.trim(), password)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="">
        <CardHeader className="space-y-2 p-5">
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0285D3]">
            CRM teste
          </CardDescription>
          <CardTitle className="text-xl text-slate-900">
            Entrar com LABEL CRM
          </CardTitle>
          <CardDescription>
            Essa extensao e uma funcionalidade exclusiva para clientes LABEL CRM.
            Faca seu login para continuar:
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 pt-0">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Login
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="Seu login"
                className="pl-9"
              />
            </div>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Senha
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                className="pl-9"
              />
            </div>
          </label>
          {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0285D3] text-white hover:bg-[#04427F]">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
