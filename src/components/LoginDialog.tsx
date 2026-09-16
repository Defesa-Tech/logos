import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LogIn, KeyRound, Mail, Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export function LoginDialog() {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useAuth()
  const [email, setEmail] = useState('cleristonx.lima@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Preencha e-mail e senha para prosseguir.')
      return
    }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      toast.success('Login realizado com sucesso! Bem-vindo de volta.')
      setIsLoginModalOpen(false)
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Falha na autenticação. Verifique os dados inseridos.'
      toast.error(`Não foi possível entrar: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
  }

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold shadow-xs">
            <LogIn className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight text-[#191919]">
            Acessar a Plataforma Logos
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 leading-relaxed">
            Entre com suas credenciais para gerenciar membros, núcleos familiares e a secretaria da
            igreja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              E-mail de acesso
            </Label>
            <Input
              type="email"
              required
              autoFocus
              placeholder="ex: seu.email@logos.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1] focus:ring-1 focus:ring-[#820AD1]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-gray-400" />
              Senha
            </Label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1] focus:ring-1 focus:ring-[#820AD1]"
            />
          </div>

          {/* Preset quick test helper */}
          <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#820AD1]" />
                Acesso Inicial (Gestão / Secretaria)
              </span>
              <button
                type="button"
                onClick={() => fillQuickCredentials('cleristonx.lima@gmail.com', 'Skip@Pass')}
                className="text-[#820AD1] font-bold hover:underline cursor-pointer"
              >
                Preencher
              </button>
            </div>
            <p className="text-gray-400 font-mono text-[10px]">
              cleristonx.lima@gmail.com &bull; Skip@Pass
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLoginModalOpen(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-800 rounded-full h-9"
            >
              Continuar como visitante
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
