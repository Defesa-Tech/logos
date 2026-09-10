import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Home as HomeIcon,
  Mail,
  ArrowUpRight,
  GitFork,
  Calendar,
  CheckCircle2,
  QrCode,
  Send,
  Lock,
  ChevronRight,
  Plus,
  ArrowRight,
  TrendingUp,
  Eye,
  EyeOff,
  Sparkles,
  HeartHandshake,
  UserCheck,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  familiesService,
  invitesService,
  activitiesService,
} from '@/services/church'
import type { PersonRecord, FamilyRecord, InviteRecord, ActivityRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AnimatedCounter, PageTransition } from '@/components/MotionKit'

export default function Index() {
  const { role, currentPerson, canAccessAll, isLeader, isMemberOrVisitor, login, user } = useAuth()
  const navigate = useNavigate()

  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Report meeting modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [meetingGroup, setMeetingGroup] = useState('Pequeno Grupo Esperança')
  const [meetingAttendance, setMeetingAttendance] = useState('8')
  const [meetingNotes, setMeetingNotes] = useState('')

  // Nubank iconic eye toggle for hiding balance / numbers
  const [showValues, setShowValues] = useState(true)

  // Quick check-in state for member/visitor
  const [checkedIn, setCheckedIn] = useState(false)

  // Login shortcut helper
  const [authEmail, setAuthEmail] = useState('cleristonx.lima@gmail.com')
  const [authPass, setAuthPass] = useState('Skip@Pass')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Realtime hook for persons list
  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
      toast.info(`Novo cadastro recebido: ${e.record.name}`)
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  // Realtime for activities
  useRealtime<ActivityRecord>('activities', (e) => {
    if (e.action === 'create') {
      setActivities((prev) => [e.record, ...prev])
    }
  })

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [personsData, familiesData, invitesData, activitiesData] = await Promise.all([
        personsService.list(),
        familiesService.list(),
        invitesService.list(),
        activitiesService.list(10),
      ])
      setPersons(personsData)
      setFamilies(familiesData)
      setInvites(invitesData)
      setActivities(activitiesData.items)
    } catch {
      toast.error('Erro ao carregar dados do painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    try {
      await login(authEmail, authPass)
      toast.success('Autenticado com sucesso como Secretaria.')
      loadDashboardData()
    } catch {
      toast.error('Falha no login. Verifique as credenciais.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleReportMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await activitiesService.create({
        title: `Reunião: ${meetingGroup}`,
        description: `Presença de ${meetingAttendance} pessoas. ${meetingNotes ? `Notas: ${meetingNotes}` : 'Encontro de comunhão e palavra.'}`,
        type: 'meeting_report',
        person: currentPerson?.id || undefined,
      })
      toast.success('Relatório pastoral registrado com sucesso.')
      setReportModalOpen(false)
      setMeetingNotes('')
    } catch {
      toast.error('Erro ao enviar relatório.')
    }
  }

  // Metrics
  const visitorsCount = persons.filter((p) => p.status === 'visitor').length
  const membersCount = persons.filter(
    (p) => p.status === 'member' || p.status === 'leader' || p.status === 'pastor',
  ).length
  const pendingInvitesCount = invites.filter((i) => !i.used).length

  // Family Growth Chart Data
  const chartData = [
    { month: 'Jan', familias: 1 },
    { month: 'Fev', familias: 1 },
    { month: 'Mar', familias: 2 },
    { month: 'Abr', familias: 2 },
    { month: 'Mai', familias: Math.max(2, families.length - 1) },
    { month: 'Jun', familias: families.length || 3 },
  ]

  // Leader context filter
  const leaderGroupPersons = persons.filter((p) => {
    if (currentPerson?.family) {
      return p.family === currentPerson.family
    }
    return p.status === 'member' || p.status === 'attender'
  })

  const recentVisitors = persons.filter((p) => p.status === 'visitor').slice(0, 5)

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* =========================================================================
          NUBANK HERO & GREETING
          ========================================================================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Olá, {user?.name ? user.name.split(' ')[0] : 'Igreja Logos'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Painel da Igreja
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            Tudo o que está acontecendo na membresia, acolhimento e lares hoje.
          </p>
        </div>

        {/* Action Pills Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowValues(!showValues)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-xs transition-all active:scale-95 cursor-pointer"
            title={showValues ? 'Ocultar números' : 'Exibir números'}
          >
            {showValues ? (
              <>
                <EyeOff className="w-4 h-4 text-gray-500" strokeWidth={2} />
                <span className="hidden sm:inline">Ocultar valores</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-[#820AD1]" strokeWidth={2} />
                <span className="hidden sm:inline text-[#820AD1]">Mostrar valores</span>
              </>
            )}
          </button>

          <Link to="/visitante-cadastro" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="bg-white hover:bg-purple-50 text-[#820AD1] border-purple-200 text-xs h-9 px-4 rounded-full shadow-xs cursor-pointer font-bold active:scale-95 transition-all"
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5 text-[#820AD1]" strokeWidth={2.2} />
              QR Recepção
            </Button>
          </Link>

          {canAccessAll && (
            <Link to="/secretaria">
              <Button className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full shadow-md shadow-[#820AD1]/20 cursor-pointer font-bold active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
                Gerar Convite
              </Button>
            </Link>
          )}

          {!user && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-gray-50 text-gray-800 border-gray-200 text-xs h-9 px-3.5 rounded-full shadow-xs font-semibold active:scale-95 transition-all"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-gray-500" strokeWidth={2} />
                  Entrar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border-gray-100 shadow-2xl">
                <DialogHeader>
                  <div className="w-10 h-10 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-bold mb-2">
                    L
                  </div>
                  <DialogTitle className="text-xl font-bold text-[#191919]">
                    Acesso ao Sistema
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">
                      E-mail institucional
                    </label>
                    <Input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="text-xs h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Senha</label>
                    <Input
                      type="password"
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      required
                      className="text-xs h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>
                  <div className="text-xs text-gray-600 bg-[#F7EEFD] p-3.5 rounded-2xl border border-purple-100">
                    Acesso demonstrativo disponível: <br />
                    <span className="text-[#820AD1] font-bold">cleristonx.lima@gmail.com</span> /{' '}
                    <span className="text-[#820AD1] font-bold">Skip@Pass</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
                  >
                    {isLoggingIn ? 'Autenticando...' : 'Entrar na Conta'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      {/* =========================================================================
          NUBANK ICONIC "CARTÃO DE SALDO" (Dark Purple & Eye Toggle Hero Card)
          ========================================================================= */}
      {canAccessAll && (
        <section>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#190326] via-[#2A0845] to-[#820AD1] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#820AD1]/15">
            {/* Background subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#820AD1]/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <span className="text-xs font-semibold tracking-wider uppercase text-purple-200">
                    Novos Visitantes Acolhidos
                  </span>
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="p-1 rounded-full text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
                    title={showValues ? 'Ocultar' : 'Mostrar'}
                  >
                    {showValues ? (
                      <Eye className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <EyeOff className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                </div>

                <div className="flex items-baseline gap-3">
                  {showValues ? (
                    <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
                      <AnimatedCounter value={visitorsCount} />
                    </span>
                  ) : (
                    <span className="text-3xl font-black tracking-widest text-purple-200 select-none">
                      ••••
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-purple-200 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    No pipeline da igreja
                  </span>
                </div>

                <p className="text-xs text-purple-200/80 max-w-md pt-1">
                  Cadastrados pelo QR Code na recepção e em integração para as próximas classes e
                  células.
                </p>
              </div>

              {/* Quick stats mini-row inside hero */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-200 block">
                    Membros
                  </span>
                  <span className="text-lg sm:text-xl font-black tabular-nums">
                    {showValues ? <AnimatedCounter value={membersCount} /> : '••'}
                  </span>
                </div>
                <div className="text-center border-x border-white/15 px-2">
                  <span className="text-[10px] uppercase font-bold text-purple-200 block">
                    Lares
                  </span>
                  <span className="text-lg sm:text-xl font-black tabular-nums">
                    {showValues ? <AnimatedCounter value={families.length} /> : '••'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-200 block">
                    Convites
                  </span>
                  <span className="text-lg sm:text-xl font-black tabular-nums">
                    {showValues ? <AnimatedCounter value={pendingInvitesCount} /> : '••'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          NUBANK ICON SHORTCUTS BAR (Circular Actions Grid — Pix/Transferir Style)
          ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
          {/* Shortcut 1: Pessoas */}
          <Link to="/pessoas" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <Users className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Pessoas</span>
          </Link>

          {/* Shortcut 2: Jornada */}
          <Link to="/jornada" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <GitFork className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Jornada</span>
          </Link>

          {/* Shortcut 3: Famílias */}
          <Link to="/familias" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <HomeIcon className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Famílias</span>
          </Link>

          {/* Shortcut 4: QR Recepção */}
          <Link
            to="/visitante-cadastro"
            target="_blank"
            rel="noopener noreferrer"
            className="nu-action-btn group"
          >
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <QrCode className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">QR Recepção</span>
          </Link>

          {/* Shortcut 5: Secretaria (if allowed) */}
          {canAccessAll && (
            <Link to="/secretaria" className="nu-action-btn group">
              <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
                <Mail className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="nu-action-label">Convites</span>
            </Link>
          )}

          {/* Shortcut 6: Adicionar Pessoa */}
          {canAccessAll && (
            <Link to="/pessoas" className="nu-action-btn group">
              <div className="nu-action-circle bg-[#F7EEFD] text-[#820AD1] group-hover:bg-[#ebdcfc] transition-all">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="nu-action-label text-[#820AD1]">Novo Membro</span>
            </Link>
          )}
        </div>
      </section>

      {/* =========================================================================
          NUBANK CARDS GRID (Growth Chart + Recent Visitors List "Extrato")
          ========================================================================= */}
      {canAccessAll && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Chart Card: Growth of Families (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                  Crescimento Comunitário
                </span>
                <h3 className="text-base font-bold text-[#191919]">
                  Evolução dos Núcleos Familiares
                </h3>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F7EEFD] text-[#820AD1]">
                Últimos 6 meses
              </span>
            </div>

            <div className="h-60 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nuChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#820AD1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#820AD1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    fontFamily="Inter, sans-serif"
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    fontFamily="Inter, sans-serif"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#190326',
                      color: '#ffffff',
                      borderRadius: '16px',
                      border: 'none',
                      fontSize: '12px',
                      fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 8px 24px rgba(130,10,209,0.25)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="familias"
                    stroke="#820AD1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#nuChartGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">{families.length} lares acolhidos no total</span>
              <Link
                to="/familias"
                className="font-bold text-[#820AD1] hover:underline flex items-center gap-1"
              >
                Ver todos os núcleos &rarr;
              </Link>
            </div>
          </div>

          {/* RECENT VISITORS — Nubank "Extrato" style list (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                    Acolhimento
                  </span>
                  <h3 className="text-base font-bold text-[#191919]">Visitantes Recentes</h3>
                </div>
                <Link
                  to="/pessoas?filter=visitor"
                  className="text-xs text-[#820AD1] hover:underline flex items-center gap-0.5 font-bold"
                >
                  Ver todos
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Nubank Extrato List */}
              <div className="divide-y divide-gray-100 pt-1">
                {recentVisitors.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">
                    Nenhum novo visitante registrado.
                  </p>
                ) : (
                  recentVisitors.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => navigate(`/pessoas?id=${v.id}`)}
                      className="nu-list-item px-2"
                    >
                      {/* Avatar circle */}
                      <div className="w-10 h-10 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#191919] truncate">{v.name}</p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {v.whatsapp || 'WhatsApp não inf.'} &bull; {v.how_met || 'Culto'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-semibold text-gray-500">
                          {new Date(v.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">{visitorsCount} visitantes no pipeline</span>
              <Link
                to="/jornada"
                className="text-[#820AD1] hover:underline flex items-center gap-1 font-bold"
              >
                Abrir pipeline &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          LEADER VIEW (Restricted to Small Group Context)
          ========================================================================= */}
      {isLeader && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-[#191919]">
                Pequeno Grupo & Pessoas Acompanhadas
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Visão restrita às pessoas e lares sob sua liderança espiritual
              </p>
            </div>

            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all">
                  <Send className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                  Relatar Encontro do Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border-gray-100 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[#191919]">
                    Relatório do Pequeno Grupo
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReportMeeting} className="space-y-4 pt-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">Nome do Grupo</label>
                    <Input
                      value={meetingGroup}
                      onChange={(e) => setMeetingGroup(e.target.value)}
                      required
                      className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">
                      Presentes no Encontro
                    </label>
                    <Input
                      type="number"
                      value={meetingAttendance}
                      onChange={(e) => setMeetingAttendance(e.target.value)}
                      required
                      className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">
                      Notas / Pedidos de Oração
                    </label>
                    <Textarea
                      rows={3}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Ex: Tivemos 2 visitantes no lar. Oramos pela recuperação da saúde..."
                      className="rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20"
                  >
                    Registrar Relatório
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Members table Nubank style */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#191919]">
                  Integrantes sob seu Acompanhamento ({leaderGroupPersons.length})
                </h3>
                <span className="text-[11px] font-semibold text-[#820AD1]">Comunhão no Lar</span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {leaderGroupPersons.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/pessoas?id=${p.id}`)}
                    className="nu-list-item px-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#191919]">{p.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {p.whatsapp || 'Sem telefone'} &bull; {p.status}
                      </p>
                    </div>
                    <span className="text-xs text-[#820AD1] font-bold flex items-center gap-1">
                      Ver perfil &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pastoral alerts / Birthdays */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#191919] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#820AD1]" strokeWidth={2} />
                  Aniversários do Mês
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Atenção pastoral direta</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
                  <p className="font-bold text-[#191919]">Ana Carolina Silva</p>
                  <p className="text-[11px] text-gray-500">18 de Outubro &bull; Família Silva</p>
                  <span className="inline-block text-[10px] font-bold text-[#820AD1] bg-[#F7EEFD] px-2.5 py-0.5 rounded-full mt-2">
                    Esta semana
                  </span>
                </div>
                <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
                  <p className="font-bold text-[#191919]">Lucas Silva</p>
                  <p className="text-[11px] text-gray-500">04 de Novembro &bull; Família Silva</p>
                  <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full mt-2">
                    Próximo mês
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          MEMBER / VISITOR VIEW — Clean Personal Progress (Nubank Style Card)
          ========================================================================= */}
      {isMemberOrVisitor && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-[#191919]">Minha Jornada na Igreja</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Passos na fé e comunhão da Igreja Logos
              </p>
            </div>

            <Button
              onClick={() => {
                setCheckedIn(true)
                toast.success('Presença confirmada no culto de hoje.')
              }}
              disabled={checkedIn}
              className={`text-xs h-9 px-5 rounded-full font-bold shadow-md transition-all active:scale-95 ${
                checkedIn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#820AD1] hover:bg-[#7008B7] text-white shadow-[#820AD1]/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={2} />
              {checkedIn ? 'Presença Confirmada' : 'Fazer Check-in no Culto'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Progress Card */}
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-[#191919]">Progresso de Integração</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Estágio atual: {currentPerson?.status || 'Visitante'}
                  </p>
                </div>
                <span className="text-2xl font-black text-[#820AD1] tabular-nums">
                  {currentPerson?.status === 'member'
                    ? '100%'
                    : currentPerson?.status === 'attender'
                      ? '65%'
                      : '30%'}
                </span>
              </div>

              <div>
                <Progress
                  value={
                    currentPerson?.status === 'member'
                      ? 100
                      : currentPerson?.status === 'attender'
                        ? 65
                        : 30
                  }
                  className="h-2.5 bg-gray-100 rounded-full"
                />
              </div>

              {/* Steps with clean dividers */}
              <div className="divide-y divide-gray-100 text-xs">
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-[#191919]">
                    1. Primeiro Acolhimento no Culto
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Concluído
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-[#191919]">2. Classe de Boas-Vindas</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      currentPerson?.checklist_welcome_class
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-gray-400 bg-gray-100'
                    }`}
                  >
                    {currentPerson?.checklist_welcome_class ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-[#191919]">3. Batismo Bíblico</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      currentPerson?.checklist_baptized
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-gray-400 bg-gray-100'
                    }`}
                  >
                    {currentPerson?.checklist_baptized ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-[#191919]">4. Pequeno Grupo nos Lares</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      currentPerson?.checklist_small_group
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-gray-400 bg-gray-100'
                    }`}
                  >
                    {currentPerson?.checklist_small_group ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>

            {/* My Family Card */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#191919] flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-[#820AD1]" strokeWidth={2} />
                  Meu Lar / Família
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Vínculo familiar cadastrado</p>
              </div>

              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-xs space-y-1.5">
                <p className="font-bold text-[#191919]">
                  {currentPerson?.expand?.family?.name || 'Família ainda não associada'}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {currentPerson?.expand?.family?.address ||
                    'Solicite à secretaria da igreja a confirmação do seu vínculo familiar.'}
                </p>
              </div>

              <Link to="/familias" className="block pt-1">
                <Button
                  variant="outline"
                  className="w-full text-xs h-9 rounded-full border-gray-200 text-gray-800 hover:bg-gray-50 font-bold active:scale-95"
                >
                  Consultar Núcleos Familiares
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ACTIVITY CHRONICLE (Nubank Timeline / Feed)
          ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
              Feed em Tempo Real
            </span>
            <h2 className="text-base font-bold text-[#191919]">
              Atividades Recentes & Movimentações
            </h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F7EEFD] text-[#820AD1] hidden sm:inline-block">
            Histórico Recente
          </span>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              Nenhuma movimentação recente registrada.
            </p>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8F9FB] px-3 rounded-2xl transition-colors"
              >
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
                    <p className="font-bold text-[#191919]">{act.title}</p>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed pl-4">
                    {act.description}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0 pl-4 sm:pl-0 font-medium">
                  {new Date(act.created).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </PageTransition>
  )
}
