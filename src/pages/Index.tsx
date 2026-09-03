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
  Sparkles,
  QrCode,
  HeartHandshake,
  Clock,
  Compass,
  FileCheck,
  Send,
  Lock,
  ChevronRight,
  Phone,
  ArrowRight,
  Check,
  Activity,
  Layers,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      toast.info(`Novo cadastro recebido: ${e.record.name}!`)
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
      toast.error('Erro ao carregar dados do dashboard.')
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
      toast.success('Autenticado com sucesso como Secretaria!')
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
        description: `Presença de ${meetingAttendance} pessoas. Notas: ${meetingNotes || 'Reunião abençoada com louvor e palavra.'}`,
        type: 'meeting_report',
        person: currentPerson?.id || undefined,
      })
      toast.success('Relatório de reunião registrado com sucesso!')
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* =========================================================================
          HERO BANNER - Modern Sacred Gradient
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C2936] via-[#243444] to-[#2C3E50] text-white p-5 sm:p-7 md:p-8 shadow-xl border border-slate-700/60">
        {/* Subtle decorative gold glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-semibold border border-amber-400/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Logos &bull; Visão do {role.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-sacred font-bold tracking-tight text-white leading-tight">
              Graça e Paz,{' '}
              {user?.name?.split(' ')[0] ||
                currentPerson?.name?.split(' ')[0] ||
                'Comunidade Logos'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
              Cuidado pastoral de pessoas, acolhimento de novos visitantes e acompanhamento do
              crescimento dos lares em Cristo.
            </p>
          </div>

          {/* Quick Actions (Responsive touch-friendly) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 md:pt-0">
            <Link to="/visitante-cadastro" target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#D4AF37] hover:bg-[#C59F29] text-[#1E2B37] font-semibold text-xs h-10 px-4 rounded-xl shadow-md transition-all active:scale-95">
                <QrCode className="w-4 h-4 mr-2" />
                QR Visitante
              </Button>
            </Link>

            {canAccessAll && (
              <Link to="/secretaria">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs h-10 px-4 rounded-xl backdrop-blur-sm transition-all"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Gerar Convite
                </Button>
              </Link>
            )}

            {!user && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-white text-[#2C3E50] hover:bg-slate-100 text-xs font-semibold h-10 px-4 rounded-xl shadow-sm">
                    <Lock className="w-4 h-4 mr-2" />
                    Entrar (Secretaria)
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
                      Entrar no Logos
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleLogin} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-medium text-slate-700">
                        Email da Secretaria
                      </label>
                      <Input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                        className="mt-1 text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Senha</label>
                      <Input
                        type="password"
                        value={authPass}
                        onChange={(e) => setAuthPass(e.target.value)}
                        required
                        className="mt-1 text-xs h-10 rounded-xl"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      Seed padrão:{' '}
                      <code className="font-bold text-slate-700">cleristonx.lima@gmail.com</code> /{' '}
                      <code className="font-bold text-slate-700">Skip@Pass</code>
                    </p>
                    <Button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs h-10 rounded-xl font-semibold"
                    >
                      {isLoggingIn ? 'Entrando...' : 'Confirmar Acesso'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE QUICK ACTIONS ROW (Horizontal Touch Bar)
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          to="/pessoas"
          className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#D4AF37]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D4AF37] flex items-center justify-center group-hover:scale-105 transition-transform">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Pessoas</p>
            <p className="text-[10px] text-slate-400">Ver cadastros</p>
          </div>
        </Link>

        <Link
          to="/jornada"
          className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#D4AF37]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Jornada</p>
            <p className="text-[10px] text-slate-400">Pipeline de fé</p>
          </div>
        </Link>

        <Link
          to="/familias"
          className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#D4AF37]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <HomeIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Famílias</p>
            <p className="text-[10px] text-slate-400">Casas e lares</p>
          </div>
        </Link>

        {canAccessAll ? (
          <Link
            to="/secretaria"
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#D4AF37]/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Secretaria</p>
              <p className="text-[10px] text-slate-400">Convites ativos</p>
            </div>
          </Link>
        ) : (
          <Link
            to="/visitante-cadastro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#D4AF37]/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">QR Recepção</p>
              <p className="text-[10px] text-slate-400">Abrir cartão</p>
            </div>
          </Link>
        )}
      </div>

      {/* =========================================================================
          ROLE-BASED WIDGETS
          ========================================================================= */}

      {/* 1. SECRETARY / PASTOR WIDGETS (Acesso Total & Desktop Management) */}
      {canAccessAll && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
              <h2 className="text-base sm:text-lg font-serif-sacred font-bold text-[#2C3E50]">
                Indicadores Pastorais & Gestão
              </h2>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 px-2.5 py-0.5 rounded-full"
            >
              <Activity className="w-3 h-3 mr-1 text-emerald-600 animate-pulse" />
              Tempo Real
            </Badge>
          </div>

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Visitors */}
            <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Novos Visitantes
                </CardTitle>
                <div className="p-2 rounded-xl bg-amber-50 text-[#D4AF37]">
                  <UserPlus className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-[#2C3E50]">{visitorsCount}</div>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  No acolhimento
                </p>
              </CardContent>
            </Card>

            {/* Members */}
            <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Membros Efetivos
                </CardTitle>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-[#2C3E50]">{membersCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">+{attendersCount} frequentadores</p>
              </CardContent>
            </Card>

            {/* Families */}
            <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Lares & Famílias
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <HomeIcon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-[#2C3E50]">
                  {families.length}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Núcleos familiares</p>
              </CardContent>
            </Card>

            {/* Invites */}
            <Card className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Convites Ativos
                </CardTitle>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Mail className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-[#2C3E50]">
                  {pendingInvitesCount}
                </div>
                <p className="text-[11px] text-amber-600 mt-1 font-semibold">Aguardando ativação</p>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Rich Management Grid: Chart + Visitor Quick Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Growth */}
            <Card className="lg:col-span-2 border-slate-200/90 bg-white shadow-sm rounded-2xl">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-serif-sacred text-[#2C3E50]">
                      Crescimento de Lares e Famílias
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Evolução mensal de núcleos familiares conectados ao Logos
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    Semestral
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFamModern" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E2B37',
                        color: '#fff',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="familias"
                      stroke="#D4AF37"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorFamModern)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Visitors List */}
            <Card className="border-slate-200/90 bg-white shadow-sm rounded-2xl flex flex-col">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                    <span>Acolhimento Rápido</span>
                  </CardTitle>
                  <Link
                    to="/pessoas"
                    className="text-xs text-[#D4AF37] hover:underline font-semibold"
                  >
                    Ver todos
                  </Link>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Visitantes recentes cadastrados via QR Code
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 flex-1 space-y-2.5">
                {persons
                  .filter((p) => p.status === 'visitor')
                  .slice(0, 4)
                  .map((v) => (
                    <div
                      key={v.id}
                      onClick={() => navigate(`/pessoas?id=${v.id}`)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer border border-slate-100 group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-xs text-slate-800 truncate group-hover:text-[#2C3E50]">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {v.whatsapp || 'WhatsApp não informado'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                    </div>
                  ))}
                {visitorsCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Nenhum visitante recente no momento.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. LEADER WIDGETS (Restrito ao Contexto) */}
      {isLeader && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Painel do Líder de Grupo
              </h2>
              <p className="text-xs text-slate-500">
                Pessoas e lares sob seu acompanhamento espiritual
              </p>
            </div>
            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs font-semibold h-9 rounded-xl shadow-sm self-start sm:self-auto">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Relatar Reunião do Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
                    Relatar Encontro do Pequeno Grupo
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReportMeeting} className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Nome do Grupo</label>
                    <Input
                      value={meetingGroup}
                      onChange={(e) => setMeetingGroup(e.target.value)}
                      required
                      className="mt-1 text-xs h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Presentes no Lar</label>
                    <Input
                      type="number"
                      value={meetingAttendance}
                      onChange={(e) => setMeetingAttendance(e.target.value)}
                      required
                      className="mt-1 text-xs h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Notas / Pedidos de Oração
                    </label>
                    <Textarea
                      rows={3}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Ex: Tivemos 2 novos visitantes. Oramos pela família do Pedro..."
                      className="mt-1 text-xs rounded-xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#2C3E50] text-white text-xs h-10 rounded-xl font-semibold"
                  >
                    Enviar Relatório Pastoral
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Members List */}
            <Card className="md:col-span-2 border-slate-200/90 bg-white shadow-sm rounded-2xl">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-serif-sacred text-[#2C3E50]">
                    Membros sob sua Liderança
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {leaderGroupPersons.length} pessoas
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Visibilidade focada nos integrantes do seu grupo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
                {leaderGroupPersons.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.whatsapp || 'WhatsApp não cadastrado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {p.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/pessoas?id=${p.id}`)}
                        className="text-xs h-8 text-[#2C3E50] hover:text-[#D4AF37]"
                      >
                        Perfil &rarr;
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Birthdays */}
            <Card className="border-slate-200/90 bg-white shadow-sm rounded-2xl">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  Aniversários do Mês
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Atenção e oração pastoral
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs">
                  <p className="font-semibold text-slate-800">Ana Carolina Silva</p>
                  <p className="text-[11px] text-slate-500">18 de Outubro &bull; Família Silva</p>
                  <Badge className="bg-[#D4AF37] text-[#2C3E50] text-[10px] font-bold mt-1.5">
                    Em breve
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                  <p className="font-semibold text-slate-800">Lucas Silva</p>
                  <p className="text-[11px] text-slate-500">04 de Novembro &bull; Família Silva</p>
                  <span className="text-[10px] text-slate-400 block mt-1">Próximo mês</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. MEMBER / VISITOR WIDGETS (Mobile-First Experience) */}
      {isMemberOrVisitor && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                Minha Jornada & Espaço da Igreja
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe seus passos na fé e comunhão da comunidade
              </p>
            </div>
            <Button
              onClick={() => {
                setCheckedIn(true)
                toast.success('Check-in confirmado no culto de hoje!')
              }}
              disabled={checkedIn}
              className={`text-xs font-semibold h-10 px-4 rounded-xl shadow-md ${
                checkedIn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#D4AF37] hover:bg-[#C59F29] text-[#1E2B37]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {checkedIn ? 'Presença Confirmada Hoje' : 'Fazer Check-in no Culto'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Journey Tracker */}
            <Card className="md:col-span-2 border-slate-200/90 bg-white shadow-sm rounded-2xl">
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-serif-sacred text-[#2C3E50]">
                    Progresso da Minha Jornada
                  </CardTitle>
                  <Badge className="bg-[#2C3E50] text-[#D4AF37] text-xs capitalize rounded-full">
                    {currentPerson?.status || 'Visitante'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Seus marcos espirituais e de serviço na igreja
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>
                      Estágio:{' '}
                      {currentPerson?.status === 'member'
                        ? 'Membro Confirmado'
                        : currentPerson?.status === 'attender'
                          ? 'Frequentador Assíduo'
                          : 'Novo Visitante'}
                    </span>
                    <span className="text-[#D4AF37] font-bold">
                      {currentPerson?.status === 'member'
                        ? '100%'
                        : currentPerson?.status === 'attender'
                          ? '65%'
                          : '30%'}
                    </span>
                  </div>
                  <Progress
                    value={
                      currentPerson?.status === 'member'
                        ? 100
                        : currentPerson?.status === 'attender'
                          ? 65
                          : 30
                    }
                    className="h-2.5 bg-slate-100 rounded-full"
                  />
                </div>

                {/* Steps List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">Primeira Visita Registrada</span>
                  </div>
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentPerson?.checklist_welcome_class
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 ${
                        currentPerson?.checklist_welcome_class
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                    />
                    <span className="font-medium">Classe de Boas-Vindas</span>
                  </div>
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentPerson?.checklist_baptized
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 ${
                        currentPerson?.checklist_baptized ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="font-medium">Batismo Bíblico</span>
                  </div>
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentPerson?.checklist_small_group
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 ${
                        currentPerson?.checklist_small_group ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="font-medium">Pequeno Grupo (Comunhão)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Family Card */}
            <Card className="border-slate-200/90 bg-white shadow-sm rounded-2xl">
              <CardHeader className="p-4 sm:p-5">
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-[#D4AF37]" />
                  Meu Lar / Família
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Vínculo familiar cadastrado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <p className="font-bold text-xs text-slate-800">
                    {currentPerson?.expand?.family?.name || 'Família ainda não associada'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {currentPerson?.expand?.family?.address ||
                      'Solicite à secretaria o vínculo oficial do seu lar no sistema.'}
                  </p>
                </div>
                <Link to="/familias" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full text-xs text-[#2C3E50] hover:bg-slate-50 h-9 rounded-xl"
                  >
                    Ver Detalhes do Lar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVITY FEED (Linha do Tempo da Comunidade)
          ========================================================================= */}
      <Card className="border-slate-200/90 bg-white shadow-sm rounded-2xl">
        <CardHeader className="p-4 sm:p-6 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[#D4AF37]" />
              Linha do Tempo & Movimentações
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Passos na jornada, novos visitantes e celebrações da igreja
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs text-slate-500 hidden sm:inline-flex">
            Recentes
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2">
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Nenhuma atividade recente.</p>
            ) : (
              activities.map((act) => {
                const isVisitor = act.type === 'visitor_signup'
                const isJourney = act.type === 'journey_change'
                return (
                  <div key={act.id} className="relative group">
                    {/* Circle Bullet */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${
                        isVisitor
                          ? 'bg-[#D4AF37] text-white'
                          : isJourney
                            ? 'bg-[#2C3E50] text-[#D4AF37]'
                            : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {isVisitor ? (
                        <UserPlus className="w-3 h-3" />
                      ) : isJourney ? (
                        <GitFork className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                    </div>
                    {/* Content Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 group-hover:bg-slate-100/70 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-slate-800">{act.title}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(act.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
