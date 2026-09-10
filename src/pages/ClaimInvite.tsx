import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Check, ShieldCheck, ArrowRight, Lock, UserCheck, AlertCircle } from 'lucide-react'
import { invitesService, personsService } from '@/services/church'
import { useAuth } from '@/contexts/AuthContext'
import type { InviteRecord, PersonRecord, UserRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function ClaimInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteRecord | null>(null)
  const [person, setPerson] = useState<PersonRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [claimedSuccess, setClaimedSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token de convite não fornecido.')
      setLoading(false)
      return
    }

    const verifyToken = async () => {
      try {
        setLoading(true)
        const inv = await invitesService.getByToken(token)
        if (!inv) {
          setError('Convite não encontrado ou inválido.')
          return
        }

        if (inv.used) {
          setError('Este convite já foi resgatado anteriormente.')
          return
        }

        setInvite(inv)

        if (inv.person) {
          try {
            const p = await personsService.getById(inv.person)
            setPerson(p)
          } catch {
            // person could be deleted or unlinked
          }
        }
      } catch {
        setError('Erro ao validar o link de convite.')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite) return

    if (password.length < 8) {
      toast.error('A senha deve conter pelo menos 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      toast.error('As senhas não coincidem.')
      return
    }

    try {
      setSubmitting(true)
      await invitesService.claim({
        token: invite.token,
        password,
        name: person?.name,
        email: invite.email,
      })
      setClaimedSuccess(true)
      toast.success('Conta ativada com sucesso!')

      // Auto login
      try {
        if (invite.email) {
          await login(invite.email, password)
        }
        setTimeout(() => navigate('/'), 1200)
      } catch {
        // If login failed, user will be redirected to home
        setTimeout(() => navigate('/'), 1200)
      }
    } catch {
      toast.error('Erro ao resgatar convite.')
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabels: Record<UserRole, string> = {
    secretary: 'Secretaria Geral',
    pastor: 'Pastor',
    leader: 'Líder de Pequeno Grupo',
    member: 'Membro da Igreja',
    visitor: 'Visitante',
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#17212A] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Masthead */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <span className="font-serif-sacred text-4xl font-bold tracking-tight text-[#141B22]">
              Logos
            </span>
          </Link>
          <p className="text-xs font-mono uppercase tracking-widest text-[#C5A046]">
            Ativação de Credencial Eclesial
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E6E2D8] p-8 rounded shadow-editorial space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400">
              Validando autenticidade do convite...
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" strokeWidth={1.5} />
              <h3 className="font-serif-sacred text-xl font-bold text-[#141B22]">
                Link Não Disponível
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">{error}</p>
              <Link to="/">
                <Button
                  variant="outline"
                  className="mt-4 text-xs font-mono rounded border-[#E6E2D8]"
                >
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          ) : claimedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="font-serif-sacred text-2xl font-bold text-[#141B22]">
                Acesso Ativado!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sua credencial foi ativada com sucesso. Redirecionando para o painel pastoral...
              </p>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-5 text-xs">
              <div className="p-4 bg-[#FAF9F6] border border-[#E6E2D8] rounded space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#C5A046] tracking-wider block">
                  Perfil Identificado
                </span>
                <p className="font-serif-sacred text-lg font-bold text-[#141B22]">
                  {person?.name || 'Membro Convidado'}
                </p>
                <p className="text-[11px] font-mono text-slate-500">{invite?.email}</p>
                <div className="pt-2">
                  <span className="inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] bg-white text-slate-700">
                    Papel: {invite?.role ? roleLabels[invite.role] : 'Membro'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pass" className="font-mono uppercase tracking-wider text-slate-600">
                  Criar Nova Senha *
                </Label>
                <Input
                  id="pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="h-10 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="pass-conf"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Confirmar Senha *
                </Label>
                <Input
                  id="pass-conf"
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita sua nova senha"
                  className="h-10 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-10 rounded font-mono shadow-none"
              >
                {submitting ? 'Ativando credencial...' : 'Ativar e Entrar no Logos'}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center text-[11px] font-mono text-slate-400">
          Igreja Logos &bull; Gestão Eclesial & Discipulado
        </div>
      </div>
    </div>
  )
}
