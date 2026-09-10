import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Home as HomeIcon,
  Mail,
  ArrowUpRight,
  GitFork,
  Calendar,
  CheckCircle2,
  QrCode,
  Clock,
  Send,
  Lock,
  ChevronRight,
  Activity,
  ArrowRight,
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
  const attendersCount = persons.filter((p) => p.status === 'attender').length
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
    <PageTransition className="space-y-8 sm:space-y-12">
      {/* =========================================================================
          HERO MASTHEAD — Austere, bold editorial headline (44-60px), zero AI glow
          ========================================================================= */}
      <section className="border-b border-[#E6E2D8] pb-6 sm:pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
              <span>Logos Eclesial</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#141B22] font-semibold">Persona {role}</span>
            </div>

            <h1 className="font-serif-sacred text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#141B22] leading-[1.05]">
              Cuidado pastoral e crescimento dos lares.
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Acompanhamento de novos visitantes acolhidos no culto de domingo, discipulado nos
              lares e integração de membros na comunhão bíblica.
            </p>
          </div>

          {/* Quick Actions Bar — Editorial buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 flex-shrink-0">
            <Link to="/visitante-cadastro" target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#141B22] hover:bg-[#1E2732] text-[#FAF9F6] text-xs h-9 px-4 rounded font-mono shadow-none cursor-pointer">
                <QrCode className="w-3.5 h-3.5 mr-2 text-[#C5A046]" strokeWidth={1.75} />
                QR Culto
              </Button>
            </Link>

            {canAccessAll && (
              <Link to="/secretaria">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-slate-50 text-[#141B22] border-[#E6E2D8] text-xs h-9 px-4 rounded font-mono shadow-none"
                >
                  <Mail className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                  Gerar Convite
                </Button>
              </Link>
            )}

            {!user && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-transparent hover:bg-slate-100 text-slate-700 border-[#E6E2D8] text-xs h-9 px-3 rounded font-mono"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                    Entrar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-md p-6 border-[#E6E2D8]">
                  <DialogHeader>
                    <DialogTitle className="font-serif-sacred text-2xl text-[#141B22]">
                      Acesso ao Sistema
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-mono uppercase tracking-wider text-slate-600">
                        E-mail
                      </label>
                      <Input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                        className="mt-1 text-xs h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono uppercase tracking-wider text-slate-600">
                        Senha
                      </label>
                      <Input
                        type="password"
                        value={authPass}
                        onChange={(e) => setAuthPass(e.target.value)}
                        required
                        className="mt-1 text-xs h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 bg-[#FAF9F6] p-3 rounded border border-[#E6E2D8]">
                      Acesso demonstrativo: <br />
                      <span className="text-[#141B22] font-semibold">
                        cleristonx.lima@gmail.com
                      </span>{' '}
                      / <span className="text-[#141B22] font-semibold">Skip@Pass</span>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
                    >
                      {isLoggingIn ? 'Autenticando...' : 'Confirmar Entrada'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          ASYMMETRIC EDITORIAL BLOCK (Secretary / Pastor)
          Left: Giant Dominant Hero Number + Trend. Right: Editorial Dense List.
          ========================================================================= */}
      {canAccessAll && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* DOMINANT HERO BLOCK (7 cols) — Dark Sovereign Surface, Big Serif Number */}
            <div className="lg:col-span-7 bg-[#141B22] text-[#FAF9F6] p-6 sm:p-8 lg:p-10 rounded border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#C5A046]">
                    Indicador Central de Acolhimento
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-slate-300">
                    Semana Vigente
                  </span>
                </div>

                <div className="pt-6 sm:pt-8 space-y-2">
                  <p className="text-xs sm:text-sm text-slate-400 font-normal">
                    Pessoas recebidas e cadastradas no culto:
                  </p>
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif-sacred text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-[#FAF9F6]">
                      <AnimatedCounter value={visitorsCount} />
                    </span>
                    <span className="text-sm font-mono text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      em acolhimento
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-8 sm:pt-10 border-t border-white/10 mt-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Membros Plenos
                  </p>
                  <p className="font-serif-sacred text-2xl sm:text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={membersCount} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Lares & Famílias
                  </p>
                  <p className="font-serif-sacred text-2xl sm:text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={families.length} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Convites Ativos
                  </p>
                  <p className="font-serif-sacred text-2xl sm:text-3xl font-bold text-white mt-1">
                    <AnimatedCounter value={pendingInvitesCount} />
                  </p>
                </div>
              </div>
            </div>

            {/* SECONDARY EDITORIAL BLOCK (5 cols) — Dense Typographic Visitor Register */}
            <div className="lg:col-span-5 bg-white border border-[#E6E2D8] p-6 rounded flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E6E2D8]">
                  <div>
                    <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
                      Acolhimentos Recentes
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Últimos visitantes registrados via QR Code
                    </p>
                  </div>
                  <Link
                    to="/pessoas?filter=visitor"
                    className="text-xs font-mono text-[#141B22] hover:text-[#C5A046] flex items-center gap-1 font-medium"
                  >
                    Ver todos
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Dense Typographic List — Thin Hairlines */}
                <div className="divide-y divide-[#F0EDE4] pt-1">
                  {recentVisitors.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center font-mono">
                      Nenhum novo visitante registrado.
                    </p>
                  ) : (
                    recentVisitors.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => navigate(`/pessoas?id=${v.id}`)}
                        className="py-3 flex items-baseline justify-between gap-3 group cursor-pointer hover:bg-[#FAF9F6] px-1 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-[#141B22] group-hover:text-[#C5A046] transition-colors truncate">
                            {v.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {v.whatsapp || 'WhatsApp não informado'} &bull; {v.how_met || 'Culto'}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-[#E6E2D8] text-slate-600 flex-shrink-0">
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

              <div className="pt-4 border-t border-[#E6E2D8] mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{visitorsCount} visitantes no pipeline</span>
                <Link
                  to="/jornada"
                  className="text-[#141B22] hover:underline flex items-center gap-1 font-semibold"
                >
                  Abrir pipeline &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* EDITORIAL DATA ROW: Growth Chart + Secondary Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Chart: Growth of Families (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-[#E6E2D8] p-6 rounded space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-[#E6E2D8]">
                <div>
                  <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
                    Evolução dos Núcleos Familiares
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Histórico de lares ativos mapeados e integrados à igreja
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-600">
                  Visão Semestral
                </span>
              </div>

              <div className="h-56 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="editorialGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#141B22" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#141B22" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      stroke="#8E8B82"
                      fontSize={11}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                    />
                    <YAxis
                      stroke="#8E8B82"
                      fontSize={11}
                      allowDecimals={false}
                      tickLine={false}
                      fontFamily="Inter, sans-serif"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141B22',
                        color: '#FAF9F6',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        fontSize: '11px',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="familias"
                      stroke="#141B22"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#editorialGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Management Shortcuts (4 cols) — Editorial Text Menu */}
            <div className="lg:col-span-4 bg-white border border-[#E6E2D8] p-6 rounded space-y-4">
              <div className="pb-3 border-b border-[#E6E2D8]">
                <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
                  Cadernos Pastorais
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Acesso direto aos livros de registros
                </p>
              </div>

              <nav className="divide-y divide-[#F0EDE4] text-xs">
                <Link
                  to="/pessoas"
                  className="py-3 flex items-center justify-between group hover:text-[#C5A046] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#141B22] group-hover:text-[#C5A046]">
                      Livro de Pessoas
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {persons.length} registros cadastrados
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#C5A046] transition-colors" />
                </Link>

                <Link
                  to="/familias"
                  className="py-3 flex items-center justify-between group hover:text-[#C5A046] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#141B22] group-hover:text-[#C5A046]">
                      Núcleos Familiares
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {families.length} lares organizados
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#C5A046] transition-colors" />
                </Link>

                <Link
                  to="/jornada"
                  className="py-3 flex items-center justify-between group hover:text-[#C5A046] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#141B22] group-hover:text-[#C5A046]">
                      Jornada Logos (Pipeline)
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      3 estágios de maturidade bíblica
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#C5A046] transition-colors" />
                </Link>

                <Link
                  to="/secretaria"
                  className="py-3 flex items-center justify-between group hover:text-[#C5A046] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#141B22] group-hover:text-[#C5A046]">
                      Secretaria & Convites
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {pendingInvitesCount} convites aguardando
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#C5A046] transition-colors" />
                </Link>
              </nav>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          LEADER VIEW (Restricted to Context) — Sharp Editorial Layout
          ========================================================================= */}
      {isLeader && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E6E2D8] pb-4">
            <div>
              <h2 className="font-serif-sacred text-2xl font-bold text-[#141B22]">
                Pequeno Grupo & Pessoas Acompanhadas
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Visão restrita às pessoas e lares sob sua liderança espiritual
              </p>
            </div>

            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 px-4 rounded font-mono shadow-none">
                  <Send className="w-3.5 h-3.5 mr-1.5 text-[#C5A046]" strokeWidth={1.75} />
                  Relatar Encontro do Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-md p-6 border-[#E6E2D8]">
                <DialogHeader>
                  <DialogTitle className="font-serif-sacred text-xl text-[#141B22]">
                    Relatório do Pequeno Grupo
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReportMeeting} className="space-y-4 pt-2 text-xs">
                  <div>
                    <label className="font-mono uppercase tracking-wider text-slate-600 block">
                      Nome do Grupo
                    </label>
                    <Input
                      value={meetingGroup}
                      onChange={(e) => setMeetingGroup(e.target.value)}
                      required
                      className="mt-1 h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                    />
                  </div>
                  <div>
                    <label className="font-mono uppercase tracking-wider text-slate-600 block">
                      Presentes no Encontro
                    </label>
                    <Input
                      type="number"
                      value={meetingAttendance}
                      onChange={(e) => setMeetingAttendance(e.target.value)}
                      required
                      className="mt-1 h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                    />
                  </div>
                  <div>
                    <label className="font-mono uppercase tracking-wider text-slate-600 block">
                      Notas Pastorais / Pedidos de Oração
                    </label>
                    <Textarea
                      rows={3}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Ex: Tivemos 2 visitantes no lar. Oramos pela recuperação da saúde da irmã Maria..."
                      className="mt-1 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
                  >
                    Registrar Relatório
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Members table */}
            <div className="lg:col-span-8 bg-white border border-[#E6E2D8] p-6 rounded space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-[#E6E2D8]">
                <h3 className="font-serif-sacred text-base font-bold text-[#141B22]">
                  Integrantes sob seu Acompanhamento ({leaderGroupPersons.length})
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Comunhão no Lar</span>
              </div>

              <div className="divide-y divide-[#F0EDE4] text-xs">
                {leaderGroupPersons.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/pessoas?id=${p.id}`)}
                    className="py-3 flex items-center justify-between hover:bg-[#FAF9F6] px-1 transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="font-medium text-[#141B22] group-hover:text-[#C5A046] transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {p.whatsapp || 'Sem telefone'} &bull; {p.status}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 group-hover:text-[#141B22]">
                      Ver perfil &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pastoral alerts / Birthdays */}
            <div className="lg:col-span-4 bg-white border border-[#E6E2D8] p-6 rounded space-y-4">
              <div className="pb-3 border-b border-[#E6E2D8]">
                <h3 className="font-serif-sacred text-base font-bold text-[#141B22] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C5A046]" strokeWidth={1.75} />
                  Aniversários do Mês
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Atenção pastoral direta
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D8] rounded">
                  <p className="font-medium text-[#141B22]">Ana Carolina Silva</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    18 de Outubro &bull; Família Silva
                  </p>
                  <span className="inline-block text-[10px] font-mono uppercase text-[#C5A046] mt-1">
                    Esta semana
                  </span>
                </div>
                <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D8] rounded">
                  <p className="font-medium text-[#141B22]">Lucas Silva</p>
                  <p className="text-[11px] font-mono text-slate-500">
                    04 de Novembro &bull; Família Silva
                  </p>
                  <span className="inline-block text-[10px] font-mono uppercase text-slate-400 mt-1">
                    Próximo mês
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          MEMBER / VISITOR VIEW — Clean Personal Progress, No Glassmorphism
          ========================================================================= */}
      {isMemberOrVisitor && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E6E2D8] pb-4">
            <div>
              <h2 className="font-serif-sacred text-2xl font-bold text-[#141B22]">
                Minha Jornada Comunitária
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Passos na fé e comunhão da Igreja Logos
              </p>
            </div>

            <Button
              onClick={() => {
                setCheckedIn(true)
                toast.success('Presença confirmada no culto de hoje.')
              }}
              disabled={checkedIn}
              className={`text-xs h-9 px-4 rounded font-mono shadow-none transition-colors ${
                checkedIn
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#141B22] hover:bg-[#1E2732] text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
              {checkedIn ? 'Presença Confirmada' : 'Fazer Check-in no Culto'}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Progress Card */}
            <div className="lg:col-span-8 bg-white border border-[#E6E2D8] p-6 rounded space-y-6">
              <div className="flex items-baseline justify-between pb-3 border-b border-[#E6E2D8]">
                <div>
                  <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
                    Progresso Espiritual
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Estágio atual: {currentPerson?.status || 'Visitante'}
                  </p>
                </div>
                <span className="font-serif-sacred text-xl font-bold text-[#141B22]">
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
                  className="h-2 bg-[#FAF9F6] border border-[#E6E2D8] rounded"
                />
              </div>

              {/* Steps with hairline dividers */}
              <div className="divide-y divide-[#F0EDE4] text-xs">
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-[#141B22]">
                    1. Primeiro Acolhimento no Culto
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                    ● Concluído
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-[#141B22]">2. Classe de Boas-Vindas</span>
                  <span
                    className={`text-[10px] font-mono ${
                      currentPerson?.checklist_welcome_class
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {currentPerson?.checklist_welcome_class ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-[#141B22]">3. Batismo Bíblico</span>
                  <span
                    className={`text-[10px] font-mono ${
                      currentPerson?.checklist_baptized
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {currentPerson?.checklist_baptized ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="font-medium text-[#141B22]">4. Pequeno Grupo nos Lares</span>
                  <span
                    className={`text-[10px] font-mono ${
                      currentPerson?.checklist_small_group
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {currentPerson?.checklist_small_group ? '● Concluído' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>

            {/* My Family Card */}
            <div className="lg:col-span-4 bg-white border border-[#E6E2D8] p-6 rounded space-y-4">
              <div className="pb-3 border-b border-[#E6E2D8]">
                <h3 className="font-serif-sacred text-lg font-bold text-[#141B22] flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-[#C5A046]" strokeWidth={1.75} />
                  Meu Lar / Família
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Vínculo familiar cadastrado
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F6] border border-[#E6E2D8] rounded text-xs space-y-2">
                <p className="font-bold text-[#141B22]">
                  {currentPerson?.expand?.family?.name || 'Família ainda não associada'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                  {currentPerson?.expand?.family?.address ||
                    'Solicite à secretaria da igreja a confirmação do seu vínculo familiar.'}
                </p>
              </div>

              <Link to="/familias" className="block pt-2">
                <Button
                  variant="outline"
                  className="w-full text-xs font-mono h-9 rounded border-[#E6E2D8] text-[#141B22] hover:bg-[#FAF9F6]"
                >
                  Consultar Núcleos Familiares
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ACTIVITY CHRONICLE — Editorial Line Timeline (No Round Cards)
          ========================================================================= */}
      <section className="bg-white border border-[#E6E2D8] p-6 sm:p-8 rounded space-y-4">
        <div className="flex items-baseline justify-between pb-4 border-b border-[#E6E2D8]">
          <div>
            <h2 className="font-serif-sacred text-xl font-bold text-[#141B22]">
              Crônica Comunitária & Movimentações
            </h2>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Registro histórico em tempo real de novos cadastros, avanços na fé e avisos pastorais
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-600 hidden sm:inline-block">
            Histórico Recente
          </span>
        </div>

        <div className="divide-y divide-[#F0EDE4] text-xs">
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center font-mono">
              Nenhuma movimentação recente registrada.
            </p>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-[#FAF9F6] px-2 transition-colors"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#141B22]" />
                    <p className="font-semibold text-[#141B22] tracking-tight">{act.title}</p>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed pl-3.5">
                    {act.description}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 flex-shrink-0 pl-3.5 sm:pl-0">
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
