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
    <PageTransition className="min-h-screen bg-gradient-to-b from-[#820AD1] via-[#6807AB] to-[#190326] flex flex-col justify-between text-white selection:bg-white selection:text-[#820AD1]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#820AD1]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white text-[#820AD1] flex items-center justify-center font-bold text-xs shadow-xs">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-tight">Logos</span>
            <span className="text-[10px] text-purple-200 leading-none">Gestão de Igreja</span>
          </div>
        </Link>
        <span className="text-[11px] font-bold text-white bg-white/15 px-3 py-1 rounded-full border border-white/20 backdrop-blur-xs">
          Ativação de Conta
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {loading ? (
            <div className="bg-white text-[#191919] rounded-3xl p-10 text-center shadow-2xl">
              <p className="text-xs text-gray-400">Verificando dados do convite institucional...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-white text-[#191919] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" strokeWidth={2} />
              </div>
              <h1 className="text-xl font-bold text-[#191919]">Convite Inválido</h1>
              <p className="text-xs text-gray-500 leading-relaxed">{errorMsg}</p>
              <div className="pt-2">
                <Link to="/">
                  <Button
                    variant="outline"
                    className="text-xs h-10 px-5 rounded-full border-gray-200 text-gray-800 hover:text-[#820AD1] hover:bg-[#F7EEFD] font-bold active:scale-95 transition-all"
                  >
                    Voltar para o Início
                  </Button>
                </Link>
              </div>
            </div>
          ) : claimed ? (
            <div className="bg-white text-[#191919] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.2} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#820AD1] block">
                  Acesso Liberado
                </span>
                <h1 className="text-2xl font-black text-[#191919] tracking-tight">
                  Conta Ativada com Sucesso!
                </h1>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Seu perfil foi vinculado e as permissões de{' '}
                  <strong className="text-[#820AD1]">{roleLabels[invite?.role || 'member']}</strong>{' '}
                  foram ativadas.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
              >
                Acessar Painel da Igreja
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2 mb-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Convite Institucional
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Ativar seu Acesso
                </h1>
                <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
                  Você foi convidado com a função{' '}
                  <strong className="text-white underline">
                    {roleLabels[invite?.role || 'member']}
                  </strong>
                  .
                </p>
              </div>

              <div className="bg-white text-[#191919] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-white/20">
                <div className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">E-mail associado:</span>
                    <span className="font-bold text-[#191919]">{invite?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Papel atribuído:</span>
                    <span className="font-bold text-[#820AD1]">{invite?.role}</span>
                  </div>
                </div>

                <form onSubmit={handleClaim} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="c-name" className="font-semibold text-gray-700">
                      Seu Nome Completo *
                    </Label>
                    <Input
                      id="c-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="c-pass" className="font-semibold text-gray-700">
                      Definir Senha de Acesso *
                    </Label>
                    <Input
                      id="c-pass"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="c-pass2" className="font-semibold text-gray-700">
                      Confirmar Senha *
                    </Label>
                    <Input
                      id="c-pass2"
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#820AD1]/25 cursor-pointer active:scale-95 transition-all"
                  >
                    {isSubmitting ? 'Ativando...' : 'Concluir Cadastro & Entrar'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6 text-center text-xs text-purple-200">
        Logos Gestão de Igreja &bull; Convite com token seguro
      </footer>
    </PageTransition>
  )
}
