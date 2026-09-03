import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Compass,
  CheckCircle2,
  Lock,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Shield,
} from 'lucide-react'
import { invitesService } from '@/services/church'
import type { InviteRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export default function ClaimInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [invite, setInvite] = useState<InviteRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token de convite não fornecido na URL.')
      setLoading(false)
      return
    }

    invitesService
      .getByToken(token)
      .then((inv) => {
        if (inv.used) {
          setErrorMsg('Este convite já foi utilizado anteriormente.')
        } else {
          setInvite(inv)
          if (inv.expand?.person?.name) {
            setName(inv.expand.person.name)
          }
          if (inv.email) {
            setEmail(inv.email)
          } else if (inv.expand?.person?.email) {
            setEmail(inv.expand.person.email)
          }
        }
      })
      .catch(() => {
        setErrorMsg('Convite não encontrado ou token inválido.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    try {
      setSubmitting(true)
      const res = await invitesService.claim({
        token,
        password,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      })

      setSuccess(true)
      toast.success(res.message || 'Conta ativada com sucesso!')

      // Automatically authenticate if possible
      try {
        await login(res.email, password)
      } catch {
        // User can manually log in
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao ativar convite.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center px-4 py-8 md:py-16">
      {/* Top Header Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#2C3E50] shadow-md">
          <Compass className="w-6 h-6 stroke-[2.2]" />
        </div>
        <span className="font-serif-sacred text-2xl font-bold text-[#2C3E50]">Logos</span>
      </div>

      {/* Main Content */}
      <div className="max-w-md w-full space-y-6">
        {loading ? (
          <Card className="border-slate-200 p-8 text-center bg-white shadow-sm">
            <p className="text-xs text-slate-500">Validando convite seguro...</p>
          </Card>
        ) : errorMsg ? (
          <Card className="border-red-200 p-8 text-center bg-white shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-serif-sacred font-bold text-slate-800">
              Convite Indisponível
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
            <Link to="/">
              <Button variant="outline" className="text-xs mt-2">
                Ir para a Página Inicial
              </Button>
            </Link>
          </Card>
        ) : success ? (
          <Card className="border-emerald-200 p-8 text-center bg-white shadow-lg space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-serif-sacred font-bold text-[#2C3E50]">
              Conta Ativada com Sucesso!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sua senha foi configurada e seu acesso ao Logos está liberado.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-[#2C3E50] text-white text-xs font-semibold h-10 mt-2"
            >
              Acessar Painel Logos
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-xl bg-white rounded-2xl overflow-hidden">
            <div className="bg-[#2C3E50] text-white p-6 space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convite Oficial de Acesso</span>
              </div>
              <h1 className="text-xl font-serif-sacred font-bold text-white">
                Bem-vindo(a) ao Logos
              </h1>
              <p className="text-xs text-slate-300">
                Defina sua senha de acesso para ingressar no sistema.
              </p>
            </div>

            <CardContent className="p-6 space-y-5">
              <form onSubmit={handleClaim} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="c-name">Nome Completo</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c-email">E-mail de Acesso</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c-password">Defina sua Senha (mínimo 8 dígitos)</Label>
                  <Input
                    id="c-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c-confirm">Confirme sua Senha</Label>
                  <Input
                    id="c-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white font-semibold text-xs h-10 rounded-xl shadow-md transition-all mt-2"
                >
                  {submitting ? 'Ativando sua conta...' : 'Ativar Minha Conta'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 mt-8">
        Logos Gestão de Igreja &bull; Todos os direitos reservados.
      </footer>
    </div>
  )
}
