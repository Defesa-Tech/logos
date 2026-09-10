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
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* =========================================================================
          PAGE HEADER (SaaS Dashboard Header — Clean & Crisp)
          ========================================================================= */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>Visão Geral</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-700 capitalize">Modo {role}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Painel da Igreja
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-xl">
            Acompanhamento em tempo real de novos visitantes, núcleos familiares e jornada de
            membresia.
          </p>
        </div>

        {/* Quick Actions Bar — Clean SaaS buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0 flex-shrink-0">
          <Link to="/visitante-cadastro" target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              className="bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200 text-xs h-9 px-3.5 rounded-lg shadow-xs cursor-pointer font-medium"
            >
              <QrCode className="w-3.5 h-3.5 mr-2 text-zinc-600" strokeWidth={1.75} />
              QR Recepção
            </Button>
          </Link>

          {canAccessAll && (
            <Link to="/secretaria">
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-3.5 rounded-lg shadow-xs cursor-pointer font-medium">
                <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                Gerar Convite
              </Button>
            </Link>
          )}

          {!user && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 text-xs h-9 px-3 rounded-lg shadow-xs font-medium"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5 text-zinc-500" strokeWidth={1.75} />
                  Entrar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-xl p-6 border-zinc-200 shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-zinc-900">
                    Acesso ao Sistema
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">
                      E-mail institucional
                    </label>
                    <Input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="text-xs h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Senha</label>
                    <Input
                      type="password"
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      required
                      className="text-xs h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    Acesso demonstrativo disponível: <br />
                    <span className="text-zinc-800 font-semibold">
                      cleristonx.lima@gmail.com
                    </span> /{' '}
                    <span className="text-zinc-800 font-semibold">Skip@Pass</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs"
                  >
                    {isLoggingIn ? 'Autenticando...' : 'Confirmar Entrada'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </section>

      {/* =========================================================================
          KEY PERFORMANCE METRICS (SaaS KPI Cards — Linear / Stripe style)
          Crisp numbers, tabular-nums, zinc-200 1px borders, rounded-xl (~12px)
          ========================================================================= */}
      {canAccessAll && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Novos Visitantes */}
            <div className="bg-white border border-zinc-200/90 rounded-xl p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Novos Visitantes</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 tabular-nums">
                  <AnimatedCounter value={visitorsCount} />
                </span>
                <span className="text-xs text-emerald-600 font-medium flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  acolhidos
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Cadastrados via QR no culto</p>
            </div>

            {/* KPI 2: Membros Plenos */}
            <div className="bg-white border border-zinc-200/90 rounded-xl p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Membros & Líderes</span>
                <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 tabular-nums">
                  <AnimatedCounter value={membersCount} />
                </span>
                <span className="text-xs text-zinc-500 font-medium">ativos</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Integrados à membresia</p>
            </div>

            {/* KPI 3: Lares & Famílias */}
            <div className="bg-white border border-zinc-200/90 rounded-xl p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Núcleos Familiares</span>
                <HomeIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 tabular-nums">
                  <AnimatedCounter value={families.length} />
                </span>
                <span className="text-xs text-zinc-500 font-medium">lares</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Casas mapeadas e pastoreadas</p>
            </div>

            {/* KPI 4: Convites Pendentes */}
            <div className="bg-white border border-zinc-200/90 rounded-xl p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Convites Ativos</span>
                <Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 tabular-nums">
                  <AnimatedCounter value={pendingInvitesCount} />
                </span>
                <span className="text-xs text-amber-600 font-medium">pendentes</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Aguardando resgate no link</p>
            </div>
          </div>

          {/* MAIN DASHBOARD GRID: Left: Chart + Pipeline Link. Right: Recent Visitors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Chart: Growth of Families (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Evolução dos Núcleos Familiares
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Histórico de lares ativos mapeados e integrados à igreja
                  </p>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600">
                  Semestral
                </span>
              </div>

              <div className="h-60 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saasChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      stroke="#a1a1aa"
                      fontSize={11}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                    />
                    <YAxis
                      stroke="#a1a1aa"
                      fontSize={11}
                      allowDecimals={false}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        color: '#ffffff',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="familias"
                      stroke="#18181b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#saasChartGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                <span>{families.length} lares cadastrados</span>
                <Link
                  to="/familias"
                  className="font-medium text-zinc-900 hover:underline flex items-center gap-1"
                >
                  Ver todos os núcleos &rarr;
                </Link>
              </div>
            </div>

            {/* RECENT VISITORS (5 cols) — Clean SaaS Table / List */}
            <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Visitantes Recentes</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Últimos cadastros recebidos no culto
                    </p>
                  </div>
                  <Link
                    to="/pessoas?filter=visitor"
                    className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-0.5 font-medium"
                  >
                    Ver todos
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Dense Clean List */}
                <div className="divide-y divide-zinc-100 pt-1">
                  {recentVisitors.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-8 text-center">
                      Nenhum novo visitante registrado.
                    </p>
                  ) : (
                    recentVisitors.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => navigate(`/pessoas?id=${v.id}`)}
                        className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-zinc-50/80 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-zinc-900 group-hover:text-zinc-950 truncate">
                            {v.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {v.whatsapp || 'WhatsApp não inf.'} &bull; {v.how_met || 'Culto'}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600 flex-shrink-0">
                          {new Date(v.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{visitorsCount} no pipeline</span>
                <Link
                  to="/jornada"
                  className="text-zinc-900 hover:underline flex items-center gap-1 font-semibold"
                >
                  Abrir pipeline de integração &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          LEADER VIEW (Restricted to Small Group Context)
          ========================================================================= */}
      {isLeader && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Pequeno Grupo & Pessoas Acompanhadas
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Visão restrita às pessoas e lares sob sua liderança espiritual
              </p>
            </div>

            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-3.5 rounded-lg font-medium shadow-xs">
                  <Send className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                  Relatar Encontro do Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-xl p-6 border-zinc-200 shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-zinc-900">
                    Relatório do Pequeno Grupo
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReportMeeting} className="space-y-4 pt-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 block">Nome do Grupo</label>
                    <Input
                      value={meetingGroup}
                      onChange={(e) => setMeetingGroup(e.target.value)}
                      required
                      className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 block">Presentes no Encontro</label>
                    <Input
                      type="number"
                      value={meetingAttendance}
                      onChange={(e) => setMeetingAttendance(e.target.value)}
                      required
                      className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-zinc-700 block">
                      Notas / Pedidos de Oração
                    </label>
                    <Textarea
                      rows={3}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Ex: Tivemos 2 visitantes no lar. Oramos pela recuperação da saúde..."
                      className="rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs"
                  >
                    Registrar Relatório
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Members table */}
            <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Integrantes sob seu Acompanhamento ({leaderGroupPersons.length})
                </h3>
                <span className="text-[11px] text-zinc-400">Comunhão no Lar</span>
              </div>

              <div className="divide-y divide-zinc-100 text-xs">
                {leaderGroupPersons.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/pessoas?id=${p.id}`)}
                    className="py-3 flex items-center justify-between hover:bg-zinc-50 px-2 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {p.whatsapp || 'Sem telefone'} &bull; {p.status}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 group-hover:text-zinc-900">
                      Ver perfil &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pastoral alerts / Birthdays */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                  Aniversários do Mês
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Atenção pastoral direta</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg">
                  <p className="font-semibold text-zinc-900">Ana Carolina Silva</p>
                  <p className="text-[11px] text-zinc-500">18 de Outubro &bull; Família Silva</p>
                  <span className="inline-block text-[10px] font-semibold text-amber-600 mt-1">
                    Esta semana
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg">
                  <p className="font-semibold text-zinc-900">Lucas Silva</p>
                  <p className="text-[11px] text-zinc-500">04 de Novembro &bull; Família Silva</p>
                  <span className="inline-block text-[10px] font-medium text-zinc-400 mt-1">
                    Próximo mês
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          MEMBER / VISITOR VIEW — Clean Personal Progress (SaaS Progress Tracker)
          ========================================================================= */}
      {isMemberOrVisitor && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Minha Jornada na Igreja</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Passos na fé e comunhão da Igreja Logos
              </p>
            </div>

            <Button
              onClick={() => {
                setCheckedIn(true)
                toast.success('Presença confirmada no culto de hoje.')
              }}
              disabled={checkedIn}
              className={`text-xs h-9 px-4 rounded-lg font-medium shadow-xs transition-colors ${
                checkedIn ? 'bg-emerald-600 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              {checkedIn ? 'Presença Confirmada' : 'Fazer Check-in no Culto'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Progress Card */}
            <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Progresso de Integração</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Estágio atual: {currentPerson?.status || 'Visitante'}
                  </p>
                </div>
                <span className="text-xl font-bold text-zinc-900 tabular-nums">
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
                  className="h-2 bg-zinc-100 rounded-full"
                />
              </div>

              {/* Steps with clean dividers */}
              <div className="divide-y divide-zinc-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-zinc-900">
                    1. Primeiro Acolhimento no Culto
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">● Concluído</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-zinc-900">2. Classe de Boas-Vindas</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      currentPerson?.checklist_welcome_class ? 'text-emerald-600' : 'text-zinc-400'
                    }`}
                  >
                    {currentPerson?.checklist_welcome_class ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-zinc-900">3. Batismo Bíblico</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      currentPerson?.checklist_baptized ? 'text-emerald-600' : 'text-zinc-400'
                    }`}
                  >
                    {currentPerson?.checklist_baptized ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-zinc-900">4. Pequeno Grupo nos Lares</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      currentPerson?.checklist_small_group ? 'text-emerald-600' : 'text-zinc-400'
                    }`}
                  >
                    {currentPerson?.checklist_small_group ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>

            {/* My Family Card */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                  Meu Lar / Família
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Vínculo familiar cadastrado</p>
              </div>

              <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-lg text-xs space-y-1.5">
                <p className="font-semibold text-zinc-900">
                  {currentPerson?.expand?.family?.name || 'Família ainda não associada'}
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {currentPerson?.expand?.family?.address ||
                    'Solicite à secretaria da igreja a confirmação do seu vínculo familiar.'}
                </p>
              </div>

              <Link to="/familias" className="block pt-1">
                <Button
                  variant="outline"
                  className="w-full text-xs h-9 rounded-lg border-zinc-200 text-zinc-800 hover:bg-zinc-50 font-medium"
                >
                  Consultar Núcleos Familiares
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ACTIVITY CHRONICLE (SaaS Timeline — Clean & Minimal)
          ========================================================================= */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Atividades Recentes & Movimentações
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Registro em tempo real de novos cadastros, avanços na jornada e avisos
            </p>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 hidden sm:inline-block">
            Histórico Recente
          </span>
        </div>

        <div className="divide-y divide-zinc-100 text-xs">
          {activities.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Nenhuma movimentação recente registrada.
            </p>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-zinc-50 px-2 rounded-lg transition-colors"
              >
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                    <p className="font-semibold text-zinc-900">{act.title}</p>
                  </div>
                  <p className="text-zinc-500 text-[11px] leading-relaxed pl-3.5">
                    {act.description}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-400 flex-shrink-0 pl-3.5 sm:pl-0 font-medium">
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
