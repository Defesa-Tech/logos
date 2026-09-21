import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Home as HomeIcon,
  Mail,
  Calendar,
  CheckCircle2,
  QrCode,
  Shield,
  Briefcase,
  AlertCircle,
  Phone,
  Layers,
  HeartHandshake,
  Compass,
  GraduationCap,
  Clock,
  MapPin,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Plus,
  LogIn,
  LogOut,
  CreditCard,
  User,
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
import type {
  PersonRecord,
  FamilyRecord,
  InviteRecord,
  ActivityRecord,
  CultoRecord,
  PresenceRecord,
  FollowUpTaskRecord,
  RegistrationDivergenceRecord,
  VolunteerProfileRecord,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'
import { churchNoticesService } from '@/data/churchNotices'

export default function Index() {
  const { currentPerson, activeAssignments, permissions, user, logout, setIsLoginModalOpen } =
    useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Você encerrou a sessão com sucesso.')
    navigate('/')
  }

  // Dashboard state
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
  const [presencaConfirmada, setPresencaConfirmada] = useState(false)

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

  const handleConfirmarPresenca = () => {
    setPresencaConfirmada(true)
    toast.success('Presença confirmada na sua escala com sucesso!')
  }

  // Identificação e Atuações
  const isAnonymous = !user
  const stage =
    currentPerson?.stage || (currentPerson?.status === 'member' ? 'membro' : 'visitante')

  const isMembroStage = stage === 'membro'
  const isFrequentadorStage = stage === 'frequentador'
  const isVisitanteStage = stage === 'visitante' || isAnonymous

  const hasVolunteerAssignments = activeAssignments.some(
    (a) => a.leadership_level === 'voluntario' || !a.leadership_level,
  )
  const isVoluntario = hasVolunteerAssignments || activeAssignments.length > 0

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

  const isBoasVindasLider = permissions.isBoasVindasLider
  const isBoasVindasVoluntario = isBoasVindasMember && !isBoasVindasLider

  // Dados do usuário / cabeçalho
  const userName = currentPerson?.name || user?.name || (isAnonymous ? 'Visitante' : 'Membro')
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || 'LG'

  // Data formatada no estilo da tela extraída: "Sexta-feira, 18 de setembro"
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  // Culto ativo ou próximo
  const activeCulto = openCultos[0] || {
    name: 'Culto de Celebração',
    date: 'Domingo',
    time: '18h00',
    local: 'Templo Sede',
  }

  // Primeira escala do voluntário (se houver)
  const firstVolunteerAssignment = activeAssignments[0]
  const volunteerRoleTitle = firstVolunteerAssignment
    ? `${firstVolunteerAssignment.expand?.role?.name || 'Serviço'} · ${firstVolunteerAssignment.expand?.role?.expand?.department?.name || 'Ministério'}`
    : 'Bateria · Culto da Manhã'

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* =========================================================================
          CABEÇALHO PRINCIPAL DA HOME (Fiel a 03, 04, 05, 06)
          Data com tracking-wider + "Olá, [Nome]" em Sora + Avatar circular
          ========================================================================= */}
      <section className="flex items-start justify-between gap-4 pt-1 sm:pt-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-[#6B7183]">
            {capitalizedDate}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#14161D] leading-tight">
            Olá, {userName.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6072] mt-0.5">
            {isAnonymous
              ? 'Seja bem-vindo(a) à Igreja Defesa da Fé. Entre para acessar suas escalas e atividades.'
              : isVoluntario
                ? 'Aqui está o resumo da sua próxima escala e avisos da congregação.'
                : 'Acompanhe os cultos da semana, avisos e sua vida na igreja.'}
          </p>
        </div>

        {/* Avatar / Perfil rápido */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/meu-cadastro"
            aria-label="Meu perfil"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#F2F1FB] border-[1.5px] border-[#DAD7F3] flex items-center justify-center font-heading text-sm font-bold text-[#3A31CE] hover:bg-[#e6e2fa] transition-colors"
          >
            {userInitials}
          </Link>
          {isAnonymous ? (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 h-10 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs font-bold transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão"
              className="hidden sm:inline-flex p-2 text-[#5A6072] hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* =========================================================================
          HERO CARD ROXO / ÍNDIGO (#3A31CE)
          Voluntário: Próxima Escala (03_Home_Membro_voluntário & 05_Desktop)
          Membro Comum / Visitante: Próximo Encontro (04_Home_Membro_comum & 06_Desktop)
          ========================================================================= */}
      {isVoluntario && !isAnonymous ? (
        /* HERO VOLUNTÁRIO: PRÓXIMA ESCALA */
        <div className="bg-[#3A31CE] rounded-[22px] sm:rounded-[24px] p-6 sm:p-7 lg:p-8 text-white shadow-lg shadow-[#3A31CE]/20 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold tracking-[0.11em] uppercase">
              Sua próxima escala
            </span>
            <span className="text-xs sm:text-sm font-semibold opacity-90">em breve</span>
          </div>

          <div className="space-y-2">
            <div className="font-heading text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight tracking-[-0.015em]">
              {volunteerRoleTitle}
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium opacity-90">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Próximo Domingo · 09h00</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>Templo Sede</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleConfirmarPresenca}
              className={`flex-grow sm:flex-grow-0 sm:min-w-[200px] h-[48px] px-5 rounded-[14px] font-sans text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                presencaConfirmada
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-[#3A31CE] hover:bg-[#F2F1FB]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{presencaConfirmada ? 'Presença Confirmada!' : 'Confirmar presença'}</span>
            </button>
            <Link
              to="/cultos"
              className="h-[48px] px-5 rounded-[14px] border-[1.5px] border-white/40 hover:bg-white/10 text-white font-sans text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Ver escala</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* HERO MEMBRO COMUM / VISITANTE: PRÓXIMO ENCONTRO */
        <div className="bg-[#3A31CE] rounded-[22px] sm:rounded-[24px] p-6 sm:p-7 lg:p-8 text-white shadow-lg shadow-[#3A31CE]/20 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold tracking-[0.11em] uppercase">
              Próximo encontro
            </span>
            <span className="text-xs sm:text-sm font-semibold opacity-90">neste domingo</span>
          </div>

          <div className="space-y-2">
            <div className="font-heading text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight tracking-[-0.015em]">
              {openCultos[0]?.name || 'Culto de Celebração'}
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium opacity-90">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Domingo · 18h00</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>Templo Sede</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-1">
            <Link
              to="/cultos"
              className="flex-grow sm:flex-grow-0 sm:min-w-[200px] h-[48px] px-5 rounded-[14px] bg-white text-[#3A31CE] hover:bg-[#F2F1FB] font-sans text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>Ver detalhes do culto</span>
            </Link>
            {isAnonymous ? (
              <Link
                to="/visitante-cadastro"
                className="h-[48px] px-5 rounded-[14px] border-[1.5px] border-white/40 hover:bg-white/10 text-white font-sans text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Check-in QR Code</span>
              </Link>
            ) : (
              <Link
                to="/carteirinha"
                className="h-[48px] px-5 rounded-[14px] border-[1.5px] border-white/40 hover:bg-white/10 text-white font-sans text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Carteirinha digital</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          BANNER INFORMATIVO "VOCÊ PODE SERVIR NA IGREJA"
          (Fiel a 04_Home_Membro_comum & 06_Desktop)
          Exibido para membros comuns e frequentadores que ainda não servem
          ========================================================================= */}
      {!isVoluntario && (
        <div className="p-5 sm:p-6 bg-[#F2F1FB] border-[1.5px] border-[#DAD7F3] rounded-[20px] sm:rounded-[22px] flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="font-heading text-base sm:text-lg font-semibold text-[#14161D]">
              Você pode servir na igreja
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6072] leading-relaxed">
              Como membro ou frequentador, você pode fazer parte de um ministério. Conheça as áreas
              e converse com um líder.
            </p>
          </div>
          <Link
            to="/quero-servir"
            aria-label="Conhecer departamentos"
            className="flex-shrink-0 h-11 px-4 sm:px-5 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <span>Conhecer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* =========================================================================
          ONDE VOCÊ SERVE (Apenas Voluntário ativo)
          (Fiel a 05_Home_Desktop_Membro_voluntário)
          ========================================================================= */}
      {isVoluntario && activeAssignments.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold tracking-[-0.015em] text-[#14161D]">
            Onde você serve
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeAssignments.map((a) => (
              <Link
                key={a.id}
                to="/departamentos"
                className="p-4 sm:p-5 bg-white border-[1.5px] border-[#E8EAF0] hover:border-[#3A31CE] rounded-[18px] flex flex-col gap-1 transition-all shadow-xs group"
              >
                <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#3A31CE]">
                  {a.expand?.role?.expand?.department?.name || 'Ministério'}
                </span>
                <span className="font-sans text-base font-bold text-[#14161D] group-hover:text-[#3A31CE] transition-colors">
                  {a.expand?.role?.name || 'Voluntário'}
                </span>
                <span className="text-xs text-[#5A6072]">
                  {a.start_date
                    ? `Atuando desde ${new Date(a.start_date).toLocaleDateString('pt-BR')}`
                    : 'Escalado neste mês'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          AVISOS DA IGREJA (Cards no estilo original das 4 telas de Home)
          Conectado aos dados centralizados e link para a tela completa /avisos
          ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-[-0.015em] text-[#14161D]">
              Avisos da igreja
            </h2>
            {churchNoticesService.getUnreadCount() > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                {churchNoticesService.getUnreadCount()} novos
              </span>
            )}
          </div>
          <Link
            to="/avisos"
            className="text-xs font-bold text-[#3A31CE] hover:underline flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {churchNoticesService
            .getAll()
            .slice(0, 3)
            .map((item) => {
              const isUnread = !item.read
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3.5 p-4 sm:p-4.5 rounded-[18px] transition-all ${
                    isUnread
                      ? 'bg-[#F2F1FB] border border-[#DAD7F3]'
                      : 'bg-white border-[1.5px] border-[#E8EAF0]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      isUnread ? 'bg-[#3A31CE]' : 'bg-[#C7CBDA]'
                    }`}
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h3 className="font-sans text-sm sm:text-base font-bold text-[#14161D] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5A6072] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  {item.actionLabel && item.actionLink ? (
                    <Link
                      to={item.actionLink}
                      className="text-xs font-bold text-[#3A31CE] hover:underline self-center flex-shrink-0 whitespace-nowrap"
                    >
                      {item.actionLabel} &rarr;
                    </Link>
                  ) : (
                    <Link
                      to="/avisos"
                      className="text-xs font-semibold text-[#8A90A2] hover:text-[#3A31CE] self-center flex-shrink-0"
                    >
                      {item.timeAgo}
                    </Link>
                  )}
                </div>
              )
            })}
        </div>
      </section>

      {/* =========================================================================
          ATALHOS RÁPIDOS DO SISTEMA (Manter acesso pleno aos módulos existentes)
          Design limpo em pills / cards no novo estilo Logos
          ========================================================================= */}
      <section className="bg-white rounded-[22px] p-5 sm:p-6 border-[1.5px] border-[#E8EAF0] shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7183]">
          Acesso aos Módulos da Igreja
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/cultos"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">Cultos &amp; Presenças</span>
          </Link>

          <Link
            to="/quero-servir"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">Quero Servir</span>
          </Link>

          <Link
            to="/cursos"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">Cursos &amp; C1</span>
          </Link>

          <Link
            to="/departamentos"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">Departamentos</span>
          </Link>

          <Link
            to="/carteirinha"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">Carteirinha</span>
          </Link>

          <Link
            to="/visitante-cadastro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[16px] bg-[#FBFBFD] hover:bg-[#F2F1FB] border border-[#E8EAF0] text-center transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] group-hover:bg-[#3A31CE] group-hover:text-white flex items-center justify-center transition-colors">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#14161D]">QR Recepção</span>
          </Link>
        </div>
      </section>

      {/* =========================================================================
          PAINEL DE SECRETARIA & LIDERANÇAS (Mantido intacto se tiver permissão)
          ========================================================================= */}
      {permissions.isSecretaria && (
        <section className="bg-white rounded-[22px] p-6 border-[1.5px] border-[#E8EAF0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EAF0]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[12px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A31CE]">
                  Painel de Secretaria
                </span>
                <h2 className="text-base font-bold text-[#14161D]">
                  Culto &amp; Métricas Oficiais
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/cultos">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-[12px] text-xs font-bold border-[#E8EAF0]"
                >
                  Lista em Tempo Real &rarr;
                </Button>
              </Link>
              <Link to="/secretaria">
                <Button
                  size="sm"
                  className="h-8 rounded-[12px] text-xs font-bold bg-[#3A31CE] hover:bg-[#2A23A6] text-white"
                >
                  Secretaria Plena
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#FBFBFD] rounded-[16px] border border-[#E8EAF0]">
              <span className="text-[10px] text-[#6B7183] font-bold uppercase block">
                Presenças Hoje
              </span>
              <span className="text-2xl font-black text-[#14161D] tabular-nums">
                {todayPresences.length + (openCultos[0]?.anonymous_count || 0)}
              </span>
            </div>
            <div className="p-3.5 bg-[#FBFBFD] rounded-[16px] border border-[#E8EAF0]">
              <span className="text-[10px] text-[#6B7183] font-bold uppercase block">
                Divergências QR
              </span>
              <span className="text-2xl font-black text-amber-600 tabular-nums">
                {divergences.length}
              </span>
            </div>
            <div className="p-3.5 bg-[#FBFBFD] rounded-[16px] border border-[#E8EAF0]">
              <span className="text-[10px] text-[#6B7183] font-bold uppercase block">
                Frequentadores
              </span>
              <span className="text-2xl font-black text-blue-600 tabular-nums">
                {persons.filter((p) => p.stage === 'frequentador').length}
              </span>
            </div>
            <div className="p-3.5 bg-[#FBFBFD] rounded-[16px] border border-[#E8EAF0]">
              <span className="text-[10px] text-[#6B7183] font-bold uppercase block">
                Membros no Rol
              </span>
              <span className="text-2xl font-black text-emerald-600 tabular-nums">
                {persons.filter((p) => p.stage === 'membro' || p.status === 'member').length}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          FEED DE ATIVIDADES RECENTES (Histórico em tempo real)
          ========================================================================= */}
      <section className="bg-white rounded-[22px] p-6 border-[1.5px] border-[#E8EAF0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAF0]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A31CE]">
              Feed da Comunidade
            </span>
            <h2 className="text-base font-bold text-[#14161D]">Atividades Recentes</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
            Tempo Real
          </span>
        </div>

        <div className="divide-y divide-[#E8EAF0] text-xs">
          {activities.length === 0 ? (
            <p className="text-xs text-[#6B7183] py-6 text-center">
              Nenhuma atividade recente registrada.
            </p>
          ) : (
            activities.slice(0, 6).map((act) => (
              <div
                key={act.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-[#14161D]">{act.title}</p>
                  <p className="text-[#5A6072] text-[11px]">{act.description}</p>
                </div>
                <span className="text-[10px] text-[#6B7183] font-medium flex-shrink-0">
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
