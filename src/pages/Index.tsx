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
  Briefcase,
  AlertCircle,
  HelpCircle,
  Phone,
  Search,
  ExternalLink,
  Layers,
  Award,
  Clock,
  Compass,
  GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  familiesService,
  invitesService,
  activitiesService,
  cultosService,
  presencesService,
  followUpService,
  departmentsService,
  assignmentsService,
  divergencesService,
  coursesService,
  volunteerProfilesService,
} from '@/services/church'
import { LogIn, LogOut } from 'lucide-react'
import type {
  PersonRecord,
  FamilyRecord,
  InviteRecord,
  ActivityRecord,
  CultoRecord,
  PresenceRecord,
  FollowUpTaskRecord,
  AssignmentRecord,
  RegistrationDivergenceRecord,
  VolunteerProfileRecord,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AnimatedCounter, PageTransition } from '@/components/MotionKit'

export default function Index() {
  const { currentPerson, activeAssignments, permissions, user, logout, setIsLoginModalOpen } =
    useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Você encerrou a sessão com sucesso.')
    navigate('/')
  }

  // Dashboard general state
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [openCultos, setOpenCultos] = useState<CultoRecord[]>([])
  const [todayPresences, setTodayPresences] = useState<PresenceRecord[]>([])
  const [orphanPresences, setOrphanPresences] = useState<PresenceRecord[]>([])
  const [followUps, setFollowUps] = useState<FollowUpTaskRecord[]>([])
  const [divergences, setDivergences] = useState<RegistrationDivergenceRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Nubank iconic eye toggle for numbers
  const [showValues, setShowValues] = useState(true)

  // Frequentador next step state
  const [nextStepSubmitted, setNextStepSubmitted] = useState<string | null>(null)

  // Feature 2: Bloco "Seu caminho para servir"
  const [volunteerProfile, setVolunteerProfile] = useState<VolunteerProfileRecord | null>(null)
  const [c1JourneyStatus, setC1JourneyStatus] = useState<{
    completed: boolean
    isEnrolled: boolean
    activeEnrollment?: any
    isWaived: boolean
    hasC1OrWaiver: boolean
  }>({
    completed: false,
    isEnrolled: false,
    isWaived: false,
    hasC1OrWaiver: false,
  })

  // Realtime hook for persons list
  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  // Realtime for presences
  useRealtime<PresenceRecord>('presences', (e) => {
    if (e.action === 'create') {
      setTodayPresences((prev) => [e.record, ...prev])
    }
  })

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [
        personsData,
        familiesData,
        invitesData,
        activitiesData,
        cultosData,
        followUpsData,
        divergencesData,
        orphansData,
      ] = await Promise.all([
        personsService.list(),
        familiesService.list(),
        invitesService.list(),
        activitiesService.list(10),
        cultosService.getOpenCultos(),
        followUpService.list('status = "aberta"'),
        divergencesService.list('status = "pendente"'),
        presencesService.listOrphans(),
      ])
      setPersons(personsData)
      setFamilies(familiesData)
      setInvites(invitesData)
      setActivities(activitiesData.items)
      setOpenCultos(cultosData)
      setFollowUps(followUpsData)
      setDivergences(divergencesData)
      setOrphanPresences(orphansData)

      if (cultosData.length > 0) {
        const pres = await presencesService.listByCulto(cultosData[0].id)
        setTodayPresences(pres)
      }

      // Feature 2: Carrega perfil de serviço e C1 da pessoa
      if (currentPerson?.id) {
        const [prof, c1] = await Promise.all([
          volunteerProfilesService.getByPerson(currentPerson.id),
          coursesService.checkC1Status(currentPerson.id),
        ])
        setVolunteerProfile(prof)
        setC1JourneyStatus(c1)
      }
    } catch {
      toast.error('Erro ao carregar dados do painel.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Frequentador request next step
  const handleRequestNextStep = async (step: 'batismo' | 'membro') => {
    try {
      setNextStepSubmitted(step)
      await activitiesService.create({
        title: `Interesse manifestado: ${step === 'batismo' ? 'Batismo Bíblico' : 'Tornar-se Membro'}`,
        description: `${currentPerson?.name || 'Frequentador'} manifestou interesse através do app. Notificar Secretaria.`,
        type: 'journey_change',
        person: currentPerson?.id || undefined,
      })
      toast.success('Seu interesse foi enviado com sucesso à equipe pastoral e secretaria!')
    } catch {
      toast.error('Erro ao enviar sua solicitação.')
    }
  }

  // Determine which blocks to show according to D8 (Tela única montada por atuações ativas)
  const isAnonymous = !user
  const stage =
    currentPerson?.stage || (currentPerson?.status === 'member' ? 'membro' : 'visitante')

  const isMembroStage = stage === 'membro'
  const isFrequentadorStage = stage === 'frequentador'
  const isVisitanteStage = stage === 'visitante' || isAnonymous

  // Atuações ativas
  const hasVolunteerAssignments = activeAssignments.some(
    (a) => a.leadership_level === 'voluntario' || !a.leadership_level,
  )
  const hasLeaderAssignments = activeAssignments.some(
    (a) =>
      a.leadership_level === 'lider' ||
      a.leadership_level === 'vice_lider' ||
      a.expand?.role?.level === 'lider',
  )
  const isBoasVindasMember = activeAssignments.some((a) => {
    const dName = a.expand?.role?.expand?.department?.name || ''
    const dCode = a.expand?.role?.expand?.department?.code || ''
    return /boas[-_ ]?vindas|recep/i.test(dName) || /boas[-_ ]?vindas|recep/i.test(dCode)
  })

  // Boas-vindas líder vs voluntário
  const isBoasVindasLider = permissions.isBoasVindasLider
  const isBoasVindasVoluntario = isBoasVindasMember && !isBoasVindasLider

  // Metrics
  const visitorsCount = persons.filter(
    (p) => p.stage === 'visitante' || p.status === 'visitor',
  ).length
  const attendersCount = persons.filter(
    (p) => p.stage === 'frequentador' || p.status === 'attender',
  ).length
  const membersCount = persons.filter(
    (p) =>
      p.stage === 'membro' ||
      p.status === 'member' ||
      p.status === 'leader' ||
      p.status === 'pastor',
  )
  const todayTotalCount = todayPresences.length + (openCultos[0]?.anonymous_count || 0)
  const todayQrCount = todayPresences.filter((p) => p.origin === 'qr_code').length
  const todayRecepcaoCount = todayPresences.filter(
    (p) => p.origin === 'boas_vindas' || !p.origin,
  ).length

  // Chart data
  const chartData = [
    { month: 'Jan', membros: Math.max(1, membersCount.length - 4) },
    { month: 'Fev', membros: Math.max(2, membersCount.length - 3) },
    { month: 'Mar', membros: Math.max(3, membersCount.length - 2) },
    { month: 'Abr', membros: Math.max(4, membersCount.length - 1) },
    { month: 'Mai', membros: membersCount.length },
    { month: 'Jun', membros: membersCount.length + 1 },
  ]

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* =========================================================================
          NUBANK HERO & GREETING
          ========================================================================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Olá, {user?.name ? user.name.split(' ')[0] : 'Visitante da Defesa da Fé'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Logos Gestão de Igreja
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            {isAnonymous
              ? 'Bem-vindo(a) à Igreja Defesa da Fé. Faça seu registro pelo QR Code ou entre com sua conta.'
              : `Seu painel integrado montado conforme suas atuações ativas na comunidade.`}
          </p>
        </div>

        {/* User Account Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {user ? (
            <div className="flex items-center gap-2 bg-[#F8F9FB] border border-[#E9ECEF] px-3.5 py-2 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-gray-700 max-w-[140px] truncate">
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1.5 flex items-center gap-1 text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer active:scale-95 transition-all"
                title="Desconectar do sistema"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#820AD1] text-white hover:bg-[#7008B7] font-bold text-xs shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Entrar no Sistema</span>
            </button>
          )}
        </div>
      </section>

      {/* =========================================================================
          BLOCO 0: VISITANTE PÚBLICO (sem login)
          ========================================================================= */}
      {isAnonymous && (
        <section className="bg-gradient-to-br from-[#820AD1] to-[#490777] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#820AD1]/15 space-y-4">
          <div className="max-w-2xl space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-200 bg-white/10 px-2.5 py-1 rounded-full">
              Boas-Vindas à Defesa da Fé
            </span>
            <h2 className="text-2xl font-black">Você está visitando a nossa igreja hoje?</h2>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Registre sua presença em menos de 10 segundos pelo nosso QR Code fixo ou conheça
              nossos cultos e ministérios.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/visitante-cadastro">
              <Button className="bg-white text-[#820AD1] hover:bg-purple-50 font-bold text-xs h-10 px-5 rounded-full shadow-md">
                <QrCode className="w-4 h-4 mr-2" />
                Registrar Presença pelo QR Code
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setIsLoginModalOpen(true)}
              className="border-white/30 text-white hover:bg-white/10 font-bold text-xs h-10 px-5 rounded-full"
            >
              Já sou membro / Entrar
            </Button>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 1: SECRETARIA (se possuir permissão)
          ========================================================================= */}
      {permissions.isSecretaria && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                  Painel de Secretaria
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#191919]">
                  Culto de Hoje &amp; Pendências Oficiais
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/cultos">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs font-bold border-gray-200"
                >
                  Lista em Tempo Real &rarr;
                </Button>
              </Link>
              <Link to="/departamentos">
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs font-bold bg-[#820AD1] text-white"
                >
                  Gestão de Estrutura
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Presenças Hoje
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#191919] tabular-nums">
                <AnimatedCounter value={todayTotalCount} />
              </span>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                <span className="text-[#820AD1] font-semibold">{todayQrCount} QR</span>
                <span>&bull;</span>
                <span>{todayRecepcaoCount} Boas-Vindas</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Divergências QR
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 tabular-nums">
                <AnimatedCounter value={divergences.length} />
              </span>
              <p className="text-[10px] text-gray-400 mt-1">Revisão de nome/e-mail</p>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Novos Frequentadores
              </span>
              <span className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">
                <AnimatedCounter value={attendersCount} />
              </span>
              <p className="text-[10px] text-gray-400 mt-1">Critério R4</p>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">
                Membros Ativos
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
                <AnimatedCounter value={membersCount.length} />
              </span>
              <p className="text-[10px] text-gray-400 mt-1">Rol geral</p>
            </div>
          </div>

          {/* Alerta de Presenças Órfãs / Sem Evento na Agenda */}
          {orphanPresences.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>
                    {orphanPresences.length} Presença(s) sem evento correspondente (Agenda
                    desatualizada)
                  </span>
                </div>
                <Link to="/secretaria" className="text-amber-800 font-bold hover:underline">
                  Vincular na Secretaria &rarr;
                </Link>
              </div>
              <p className="text-amber-700 text-[11px]">
                Visitantes escanearam o QR Code fixo num horário sem evento cadastrado. O cadastro
                foi salvo, mas requer vinculação manual ou configuração de evento recorrente.
              </p>
            </div>
          )}

          {/* Divergências Pendentes Alert Box */}
          {divergences.length > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#820AD1] font-bold">
                  <AlertCircle className="w-4 h-4 text-[#820AD1]" />
                  <span>
                    {divergences.length} Divergência(s) de Cadastro do QR Code para Conciliação
                  </span>
                </div>
                <Link to="/secretaria" className="text-[#820AD1] font-bold hover:underline">
                  Verificar na Secretaria &rarr;
                </Link>
              </div>
              <p className="text-purple-700 text-[11px]">
                Visitantes preencheram telefones existentes com nomes ou e-mails divergentes. O
                sistema não sobrescreveu os dados originais.
              </p>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          BLOCO 2: PASTOR (se possuir permissão)
          ========================================================================= */}
      {permissions.isPastor && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-[#820AD1] flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                  Acompanhamento Pastoral
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#191919]">
                  Saúde Comunitária &amp; Lista de Atenção
                </h2>
              </div>
            </div>
            <Link to="/atencao-ausencia">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full text-xs font-bold border-gray-200"
              >
                Lista de Ausentes (R10) &rarr;
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <p className="font-bold text-[#191919]">Frequência no Culto Atual</p>
              <p className="text-2xl font-black text-[#820AD1] mt-1 tabular-nums">
                {todayTotalCount} pessoas
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Presenças confirmadas hoje</p>
            </div>

            <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <p className="font-bold text-[#191919]">Novos Visitantes Acolhidos</p>
              <p className="text-2xl font-black text-[#191919] mt-1 tabular-nums">
                {visitorsCount}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">No pipeline da igreja</p>
            </div>

            <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
              <p className="font-bold text-[#191919]">Núcleos Familiares</p>
              <p className="text-2xl font-black text-[#191919] mt-1 tabular-nums">
                {families.length}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Lares acompanhados</p>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 3: LÍDER DO BOAS-VINDAS (se atuar nesta liderança)
          ========================================================================= */}
      {isBoasVindasLider && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Liderança de Boas-Vindas
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#191919]">
                  Follow-ups da Equipe &amp; Sugestões de Frequentador
                </h2>
              </div>
            </div>
            <Link to="/follow-up">
              <Button
                size="sm"
                className="h-8 rounded-full text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white"
              >
                Gestão de Follow-up
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">Tarefas de Acolhimento Abertas</span>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {followUps.length}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Acompanhe o contato com os visitantes nas primeiras 48h pós-culto.
              </p>
            </div>

            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#820AD1]">Sugestões de Frequentador (R4)</span>
                <Link
                  to="/frequentadores"
                  className="text-xs font-bold text-[#820AD1] hover:underline"
                >
                  Confirmar &rarr;
                </Link>
              </div>
              <p className="text-[11px] text-purple-700 mt-1">
                Visitantes com 3 semanas de presença na janela de 8 semanas.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 4: VOLUNTÁRIO DO BOAS-VINDAS (Modo Culto & Uso com uma mão)
          ========================================================================= */}
      {(isBoasVindasVoluntario || isBoasVindasLider) && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                  Modo Culto &bull; Recepção
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#191919]">
                  Busca Rápida por Telefone &amp; Presença com 1 Toque
                </h2>
              </div>
            </div>
            <Link to="/cultos">
              <Button
                size="sm"
                className="h-8 rounded-full text-xs font-bold bg-[#820AD1] text-white"
              >
                Abrir Recepção
              </Button>
            </Link>
          </div>

          <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-[#191919]">
                Culto Atual:{' '}
                <span className="text-[#820AD1]">
                  {openCultos[0]?.name || 'Nenhum culto aberto no momento'}
                </span>
              </p>
              <p className="text-[11px] text-gray-500">
                {todayTotalCount} presenças já registradas hoje ({todayQrCount} via QR Code,{' '}
                {todayRecepcaoCount} pela recepção).
              </p>
            </div>
            <Link to="/cultos">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 rounded-full border-gray-300 font-bold"
              >
                Registrar no Balcão
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 5: LÍDER DE DEPARTAMENTO (gestão de equipe e sobreposições)
          ========================================================================= */}
      {hasLeaderAssignments && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Liderança de Unidade
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#191919]">
                  Minha Equipe, Funções &amp; Requisitos
                </h2>
              </div>
            </div>
            <Link to="/departamentos">
              <Button
                size="sm"
                className="h-8 rounded-full text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white"
              >
                Gerenciar Equipe
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-600 space-y-2">
            <p>Você lidera as seguintes unidades departamentais:</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {activeAssignments
                .filter(
                  (a) =>
                    a.leadership_level === 'lider' ||
                    a.leadership_level === 'vice_lider' ||
                    a.expand?.role?.level === 'lider',
                )
                .map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200"
                  >
                    <span>{a.expand?.role?.expand?.department?.name || 'Unidade'}</span>
                    <span className="text-[10px] uppercase font-semibold text-blue-600">
                      ({a.expand?.role?.name})
                    </span>
                  </span>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          FEATURE 2: BLOCO "SEU CAMINHO PARA SERVIR" (Membro ou Frequentador com Perfil/C1)
          ========================================================================= */}
      {(isMembroStage || isFrequentadorStage || volunteerProfile) && (
        <section className="bg-gradient-to-br from-[#820AD1] to-[#5A0792] rounded-3xl p-6 sm:p-7 text-white shadow-lg shadow-[#820AD1]/15 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
                Jornada Ministerial
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold mt-1">Seu Caminho Para Servir</h2>
              <p className="text-xs text-purple-100 max-w-xl">
                Acompanhe o seu progresso rumo ao serviço nos departamentos da Igreja Defesa da Fé.
              </p>
            </div>

            <Link to="/quero-servir">
              <Button className="bg-white text-[#820AD1] hover:bg-purple-50 font-bold text-xs h-9 px-4 rounded-full shadow-sm">
                Abrir Jornada Completa &rarr;
              </Button>
            </Link>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-purple-200">Etapa Atual</span>
              <p className="font-extrabold text-white text-sm sm:text-base">
                {c1JourneyStatus.hasC1OrWaiver
                  ? c1JourneyStatus.isWaived
                    ? 'C1 Dispensado pela Secretaria — Pronto para Ativação!'
                    : 'C1 Concluído — Pronto para Atuação nos Ministérios!'
                  : c1JourneyStatus.isEnrolled
                    ? `Inscrito no C1 (${c1JourneyStatus.activeEnrollment?.expand?.course_class?.name || 'Turma em andamento'})`
                    : volunteerProfile
                      ? 'Perfil de serviço cadastrado &bull; Aguardando inscrição no C1'
                      : 'Descubra seus dons &bull; Inicie sua jornada ministerial'}
              </p>
              <p className="text-[11px] text-purple-200">
                {c1JourneyStatus.hasC1OrWaiver
                  ? 'Os líderes dos departamentos podem convidá-lo(a) formalmente para as funções.'
                  : c1JourneyStatus.isEnrolled
                    ? 'Aguardando encerramento das aulas e confirmação oficial da Secretaria.'
                    : 'O C1 é requisito da igreja para qualquer função. Inscrição em 1 toque na jornada.'}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                {c1JourneyStatus.hasC1OrWaiver
                  ? 'Etapa 3 de 4: Alinhamento'
                  : c1JourneyStatus.isEnrolled
                    ? 'Etapa 2 de 4: C1 em curso'
                    : 'Etapa 1 de 4: Perfil'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 6: ONDE EU SIRVO (Voluntário)
          ========================================================================= */}
      {hasVolunteerAssignments && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
              Voluntariado Logos
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#191919]">Onde Eu Sirvo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Suas funções ativas nos departamentos da igreja
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {activeAssignments
              .filter((a) => a.leadership_level === 'voluntario' || !a.leadership_level)
              .map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 space-y-1.5"
                >
                  <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {a.expand?.role?.expand?.department?.name || 'Departamento'}
                  </span>
                  <p className="font-bold text-[#191919] text-sm">{a.expand?.role?.name}</p>
                  <p className="text-[11px] text-gray-400">
                    Desde: {new Date(a.start_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 7: MEMBRO (Carteirinha, Programação, Meus Dados, Família)
          ========================================================================= */}
      {isMembroStage && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Carteirinha em Destaque (7 cols) */}
            <div className="lg:col-span-7 bg-gradient-to-br from-[#190326] via-[#2A0845] to-[#820AD1] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-[#820AD1]/15 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
                    Igreja Defesa da Fé &bull; Carteirinha Digital
                  </span>
                  <h3 className="text-xl font-black mt-0.5">{currentPerson?.name || user?.name}</h3>
                </div>
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Membro Regular
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-purple-200 block">Matrícula</span>
                  <span className="font-mono font-bold text-sm">
                    {currentPerson?.provisional_number || currentPerson?.rol_number || 'MAT-0001'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-purple-200 block">
                    Status da Foto
                  </span>
                  <span className="capitalize font-semibold text-purple-100">
                    {currentPerson?.card_photo_status || 'Aprovada'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                <Link
                  to="/carteirinha"
                  className="text-white font-bold hover:underline flex items-center gap-1"
                >
                  Abrir carteirinha completa &rarr;
                </Link>
                <Link to="/meu-cadastro" className="text-purple-200 hover:text-white font-medium">
                  Atualizar dados
                </Link>
              </div>
            </div>

            {/* Programação & Família (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
                  Agenda Defesa da Fé
                </span>
                <h3 className="text-base font-bold text-[#191919]">Programação da Semana</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#191919]">Culto da Palavra &bull; Domingo</p>
                    <p className="text-[11px] text-gray-500">10h00 &bull; Celebração e Ceia</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#820AD1] bg-[#F7EEFD] px-2 py-0.5 rounded-full">
                    Presencial
                  </span>
                </div>

                <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#191919]">Culto de Doutrina &bull; Quarta</p>
                    <p className="text-[11px] text-gray-500">19h30 &bull; Estudo Expositivo</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Híbrido
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <Link to="/familias" className="font-bold text-[#820AD1] hover:underline">
                  Minha Família no Rol &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCO 8: FREQUENTADOR (Ficha cadastral e convite aos próximos passos)
          ========================================================================= */}
      {isFrequentadorStage && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
              Integração Congregacional
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#191919]">
              Olá, {currentPerson?.name}! Dê o seu próximo passo na Defesa da Fé
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Você já é parte da nossa comunidade. Escolha o próximo marco da sua caminhada com
              Cristo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-5 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-3">
              <div>
                <h3 className="font-bold text-sm text-[#820AD1]">Quero ser Batizado(a)</h3>
                <p className="text-xs text-purple-900 mt-1">
                  Confesse publicamente sua fé através do batismo bíblico na Igreja Defesa da Fé.
                </p>
              </div>
              <Button
                onClick={() => handleRequestNextStep('batismo')}
                disabled={nextStepSubmitted === 'batismo'}
                className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 rounded-full font-bold"
              >
                {nextStepSubmitted === 'batismo'
                  ? 'Interesse Registrado'
                  : 'Tenho Interesse no Batismo'}
              </Button>
            </div>

            <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
              <div>
                <h3 className="font-bold text-sm text-blue-900">Quero me Tornar Membro</h3>
                <p className="text-xs text-blue-900 mt-1">
                  Se você já é batizado bíblico, solicite seu ingresso formal no rol de membros.
                </p>
              </div>
              <Button
                onClick={() => handleRequestNextStep('membro')}
                disabled={nextStepSubmitted === 'membro'}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs h-9 rounded-full font-bold"
              >
                {nextStepSubmitted === 'membro'
                  ? 'Interesse Registrado'
                  : 'Solicitar Ingresso como Membro'}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          NUBANK ICON SHORTCUTS BAR
          ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 px-1">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 sm:gap-4">
          <Link to="/cultos" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <Users className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Cultos &amp; Presenças</span>
          </Link>

          <Link to="/quero-servir" className="nu-action-btn group">
            <div className="nu-action-circle bg-purple-50 text-[#820AD1] group-hover:bg-[#ebdcfc] transition-all">
              <HeartHandshake className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label font-bold text-[#820AD1]">Quero Servir</span>
          </Link>

          <Link to="/cursos" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <GraduationCap className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Cursos &amp; C1</span>
          </Link>

          <Link to="/departamentos" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <Layers className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Departamentos</span>
          </Link>

          <Link to="/follow-up" className="nu-action-btn group">
            <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
              <HeartHandshake className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="nu-action-label">Follow-up 48h</span>
          </Link>

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

          {permissions.canManageAssignments && (
            <Link to="/secretaria" className="nu-action-btn group">
              <div className="nu-action-circle group-hover:bg-[#F7EEFD] group-hover:text-[#820AD1] transition-all">
                <Mail className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="nu-action-label">Convites</span>
            </Link>
          )}

          {permissions.canManageAssignments && (
            <Link to="/pessoas" className="nu-action-btn group">
              <div className="nu-action-circle bg-[#F7EEFD] text-[#820AD1] group-hover:bg-[#ebdcfc] transition-all">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="nu-action-label text-[#820AD1]">Nova Pessoa</span>
            </Link>
          )}
        </div>
      </section>

      {/* =========================================================================
          ACTIVITY CHRONICLE (Feed em tempo real)
          ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1]">
              Feed da Comunidade
            </span>
            <h2 className="text-base font-bold text-[#191919]">Atividades Recentes</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F7EEFD] text-[#820AD1] hidden sm:inline-block">
            Tempo Real
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
