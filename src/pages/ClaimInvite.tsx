import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  KeyRound,
  Lock,
} from 'lucide-react'
import { invitesService, personsService } from '@/services/church'
import type { InviteRecord, PersonRecord, UserRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { PageTransition } from '@/components/MotionKit'

export default function ClaimInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { switchSimulatedRole } = useAuth()

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteRecord | null>(null)
  const [person, setPerson] = useState<PersonRecord | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Registration Form state
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setErrorMsg('Token de convite não fornecido na URL.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const record = await invitesService.getByToken(token)
        if (!record) {
          setErrorMsg('Convite não encontrado ou token inválido.')
          return
        }
        if (record.used) {
          setErrorMsg('Este convite já foi utilizado anteriormente.')
          return
        }
        setInvite(record)

        if (record.person) {
          const personRec = await personsService.getById(record.person)
          setPerson(personRec)
          setName(personRec.name)
        }
      } catch {
        setErrorMsg('Falha ao validar token do convite.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite) return

    if (password.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      toast.error('As senhas digitadas não coincidem.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Claim invite via service
      await invitesService.claim({
        token: invite.token,
        password,
        name: name.trim() || undefined,
        email: invite.email,
      })

      // 2. If no person was attached, create a person record
      if (!invite.person) {
        await personsService.create({
          name: name.trim() || invite.email.split('@')[0],
          email: invite.email,
          status:
            invite.role === 'pastor' ? 'pastor' : invite.role === 'leader' ? 'leader' : 'member',
        })
      }

      // 3. Switch role to the invited role
      switchSimulatedRole(invite.role as UserRole)

      setClaimed(true)
      toast.success('Convite resgatado com sucesso! Bem-vindo à equipe Logos.')
    } catch {
      toast.error('Erro ao finalizar o resgate do convite.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleLabels: Record<string, string> = {
    secretary: 'Secretaria (Acesso Pleno)',
    pastor: 'Pastoral & Ministérios',
    leader: 'Líder de Pequeno Grupo',
    member: 'Membro da Comunidade',
    visitor: 'Visitante',
  }

  return (
    <PageTransition className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            L
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">Logos</span>
        </Link>
        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
          Ativação de Conta
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {loading ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center shadow-xs">
              <p className="text-xs text-zinc-400">Verificando dados do convite institucional...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-10 shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-zinc-900">Convite Inválido</h1>
              <p className="text-xs text-zinc-500 leading-relaxed">{errorMsg}</p>
              <div className="pt-2">
                <Link to="/">
                  <Button
                    variant="outline"
                    className="text-xs h-9 rounded-lg border-zinc-200 text-zinc-800"
                  >
                    Voltar para o Início
                  </Button>
                </Link>
              </div>
            </div>
          ) : claimed ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-10 shadow-xs text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 block">
                  Acesso Liberado
                </span>
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  Conta Ativada com Sucesso!
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Seu perfil foi vinculado e as permissões de{' '}
                  <strong className="text-zinc-800">{roleLabels[invite?.role || 'member']}</strong>{' '}
                  foram ativadas.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs"
              >
                Acessar Painel da Igreja
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="space-y-1 pb-3 border-b border-zinc-100">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block">
                  Convite Pessoal
                </span>
                <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                  Ativar seu Acesso
                </h1>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Você foi convidado para integrar o sistema da Igreja Logos com o papel de{' '}
                  <strong className="text-zinc-800">{roleLabels[invite?.role || 'member']}</strong>.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">E-mail associado:</span>
                  <span className="font-semibold text-zinc-900">{invite?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Papel atribuído:</span>
                  <span className="font-semibold text-zinc-900">{invite?.role}</span>
                </div>
              </div>

              <form onSubmit={handleClaim} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="c-name" className="font-medium text-zinc-700">
                    Seu Nome Completo *
                  </Label>
                  <Input
                    id="c-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c-pass" className="font-medium text-zinc-700">
                    Definir Senha de Acesso *
                  </Label>
                  <Input
                    id="c-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="c-pass2" className="font-medium text-zinc-700">
                    Confirmar Senha *
                  </Label>
                  <Input
                    id="c-pass2"
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Ativando...' : 'Concluir Cadastro & Entrar'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 px-6 text-center text-xs text-zinc-400">
        Logos Gestão de Igreja &bull; Convite com token seguro
      </footer>
    </PageTransition>
  )
}
