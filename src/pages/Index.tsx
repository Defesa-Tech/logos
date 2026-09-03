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
      setPersons((prev) => prev.filter((p) => p.id === e.record.id))
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
        title: `Reunião Relatada: ${meetingGroup}`,
        description: `Presença de ${meetingAttendance} pessoas. Notas: ${meetingNotes || 'Reunião abençoada com louvor e oração.'}`,
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

  // Mock Family Growth Chart Data
  const chartData = [
    { month: 'Mar', familias: 1 },
    { month: 'Abr', familias: 2 },
    { month: 'Mai', familias: 2 },
    { month: 'Jun', familias: 3 },
    { month: 'Jul', familias: families.length || 3 },
  ]

  // Leader context filter: if leader, filter persons by same family or role
  const leaderGroupPersons = persons.filter((p) => {
    if (currentPerson?.family) {
      return p.family === currentPerson.family
    }
    return p.status === 'member' || p.status === 'attender'
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2C3E50] via-[#34495E] to-[#1E2B37] text-white p-6 md:p-8 shadow-xl border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-medium border border-amber-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Logos Sistema Integrado &bull; Visão do {role.toUpperCase()}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif-sacred font-bold tracking-tight text-white">
              Graça e Paz, {user?.name || currentPerson?.name || 'Comunidade Logos'}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Gestão de pessoas, acolhimento de novos visitantes e acompanhamento do crescimento
              familiar em Cristo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/visitante-cadastro">
              <Button className="bg-[#D4AF37] hover:bg-[#C29D26] text-[#2C3E50] font-semibold text-xs shadow-md">
                <QrCode className="w-4 h-4 mr-1.5" />
                Landing do Visitante
              </Button>
            </Link>

            {canAccessAll && (
              <Link to="/secretaria">
                <Button
                  variant="outline"
                  className="border-slate-500 bg-white/5 hover:bg-white/10 text-white text-xs"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Gerar Convite
                </Button>
              </Link>
            )}

            {!user && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-white text-[#2C3E50] hover:bg-slate-100 text-xs font-semibold">
                    <Lock className="w-4 h-4 mr-1.5" />
                    Entrar (Secretaria)
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white">
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
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Senha</label>
                      <Input
                        type="password"
                        value={authPass}
                        onChange={(e) => setAuthPass(e.target.value)}
                        required
                        className="mt-1 text-xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Seed inicial:{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                        cleristonx.lima@gmail.com
                      </code>{' '}
                      /{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                        Skip@Pass
                      </code>
                    </p>
                    <Button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#2C3E50] text-white text-xs"
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
          ROLE-BASED WIDGETS
          ========================================================================= */}

      {/* 1. SECRETARY / PASTOR WIDGETS (Acesso Total) */}
      {canAccessAll && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              Painel Geral da Secretaria & Pastoral
            </h2>
            <Badge
              variant="outline"
              className="text-xs font-medium bg-amber-50 text-amber-800 border-amber-200"
            >
              Tempo Real Ativo
            </Badge>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-subtle-hover border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Novos Visitantes
                </CardTitle>
                <div className="p-2 rounded-xl bg-amber-50 text-[#D4AF37]">
                  <UserPlus className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2C3E50]">{visitorsCount}</div>
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Recebidos recentemente
                </p>
              </CardContent>
            </Card>

            <Card className="card-subtle-hover border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Membros Efetivos
                </CardTitle>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2C3E50]">{membersCount}</div>
                <p className="text-xs text-slate-500 mt-1">
                  +{attendersCount} frequentadores em integração
                </p>
              </CardContent>
            </Card>

            <Card className="card-subtle-hover border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Famílias Cadastradas
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <HomeIcon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2C3E50]">{families.length}</div>
                <p className="text-xs text-slate-500 mt-1">Núcleos familiares ativos</p>
              </CardContent>
            </Card>

            <Card className="card-subtle-hover border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Convites Pendentes
                </CardTitle>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Mail className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#2C3E50]">{pendingInvitesCount}</div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Aguardando ativação por WhatsApp
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart & Quick List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50]">
                  Crescimento de Núcleos Familiares
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Evolução mensal de lares e famílias vinculadas à comunidade
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#2C3E50',
                        color: '#fff',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="familias"
                      stroke="#D4AF37"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorFam)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center justify-between">
                  <span>Novos Visitantes</span>
                  <Link
                    to="/pessoas"
                    className="text-xs text-[#D4AF37] hover:underline font-normal"
                  >
                    Ver todos
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Chegaram recentemente via QR Code
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {persons
                  .filter((p) => p.status === 'visitor')
                  .slice(0, 4)
                  .map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{v.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {v.whatsapp || 'WhatsApp não informado'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                      >
                        Visitante
                      </Badge>
                    </div>
                  ))}
                {visitorsCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Nenhum visitante recente.
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Painel do Líder de Grupo / Famílias
            </h2>
            <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs font-semibold shadow-sm">
                  <Send className="w-4 h-4 mr-1.5" />
                  Relatar Reunião
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white">
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
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Presentes</label>
                    <Input
                      type="number"
                      value={meetingAttendance}
                      onChange={(e) => setMeetingAttendance(e.target.value)}
                      required
                      className="mt-1 text-xs"
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
                      placeholder="Ex: Tivemos 2 novos visitantes. Oramos pela família Silva..."
                      className="mt-1 text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#2C3E50] text-white text-xs">
                    Enviar Relatório Pastoral
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Group Members List */}
            <Card className="md:col-span-2 border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center justify-between">
                  <span>Membros sob sua Liderança (Contexto)</span>
                  <Badge variant="outline" className="text-xs">
                    {leaderGroupPersons.length} pessoas
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Visibilidade restrita aos integrantes do seu núcleo familiar e pequenos grupos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {leaderGroupPersons.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.whatsapp || 'WhatsApp não informado'}
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
                        className="text-xs h-7 text-[#2C3E50] hover:text-[#D4AF37]"
                      >
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Birthdays & Care */}
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  Próximos Aniversários
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Atenção pastoral e felicitações do mês
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">Ana Carolina Silva</p>
                    <p className="text-[11px] text-slate-500">18 de Outubro &bull; Família Silva</p>
                  </div>
                  <Badge className="bg-[#D4AF37] text-[#2C3E50] text-[10px]">Em breve</Badge>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">Lucas Silva</p>
                    <p className="text-[11px] text-slate-500">
                      04 de Novembro &bull; Família Silva
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">Próx. mês</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. MEMBER / VISITOR WIDGETS (Visão Mais Restrita) */}
      {isMemberOrVisitor && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-600" />
              Minha Jornada & Espaço Comunitário
            </h2>
            <Button
              onClick={() => {
                setCheckedIn(true)
                toast.success('Check-in realizado com sucesso no culto de hoje!')
              }}
              disabled={checkedIn}
              className={`text-xs font-semibold ${
                checkedIn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#D4AF37] hover:bg-[#C29D26] text-[#2C3E50]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {checkedIn ? 'Check-in Confirmado' : 'Fazer Check-in no Culto'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Journey Tracker */}
            <Card className="md:col-span-2 border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center justify-between">
                  <span>Progresso na Jornada Logos</span>
                  <Badge className="bg-[#2C3E50] text-[#D4AF37] text-xs capitalize">
                    {currentPerson?.status || 'Visitante'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Etapas do seu crescimento e comunhão na igreja
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                    <span>
                      Etapa:{' '}
                      {currentPerson?.status === 'member'
                        ? 'Membro Confirmado'
                        : currentPerson?.status === 'attender'
                          ? 'Frequentador Assíduo'
                          : 'Novo Visitante'}
                    </span>
                    <span>
                      {currentPerson?.status === 'member'
                        ? '100%'
                        : currentPerson?.status === 'attender'
                          ? '65%'
                          : '25%'}
                    </span>
                  </div>
                  <Progress
                    value={
                      currentPerson?.status === 'member'
                        ? 100
                        : currentPerson?.status === 'attender'
                          ? 65
                          : 25
                    }
                    className="h-2.5 bg-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Primeira Visita Registrada</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-lg ${currentPerson?.checklist_welcome_class ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${currentPerson?.checklist_welcome_class ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                    <span>Classe de Boas-Vindas</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-lg ${currentPerson?.checklist_baptized ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${currentPerson?.checklist_baptized ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                    <span>Batismo Bíblico</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 p-2.5 rounded-lg ${currentPerson?.checklist_small_group ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${currentPerson?.checklist_small_group ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                    <span>Pequeno Grupo (Comunhão)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* My Family Shortcut */}
            <Card className="border-slate-200/80 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-[#D4AF37]" />
                  Meu Núcleo Familiar
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pessoas conectadas à sua casa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <p className="font-semibold text-xs text-slate-800">
                    {currentPerson?.expand?.family?.name || 'Família ainda não associada'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentPerson?.expand?.family?.address ||
                      'Solicite à secretaria o vínculo do seu lar.'}
                  </p>
                </div>
                <Link to="/familias" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full text-xs text-[#2C3E50] hover:bg-slate-50"
                  >
                    Ver Detalhes da Família
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVITY FEED (Jornada & Movimentações)
          ========================================================================= */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center gap-2">
              <GitFork className="w-4 h-4 text-[#D4AF37]" />
              Feed de Atividades & Mudanças de Jornada
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Linha do tempo das integrações e passos na fé da igreja
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs text-slate-500">
            Atualizações recentes
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                Nenhuma atividade registrada no momento.
              </p>
            ) : (
              activities.map((act) => {
                const isVisitor = act.type === 'visitor_signup'
                const isJourney = act.type === 'journey_change'
                return (
                  <div key={act.id} className="relative group">
                    {/* Bullet */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
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
                    {/* Content */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 group-hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-xs text-slate-800">{act.title}</span>
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
