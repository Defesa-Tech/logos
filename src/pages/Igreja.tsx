import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Clock,
  Phone,
  Heart,
  ChevronRight,
  Info,
  Music,
  Video,
  HeartHandshake,
  Baby,
  Users,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
} from 'lucide-react'
import { departmentsService, cultosService, assignmentsService } from '@/services/church'
import { DepartmentRecord, CultoRecord, AssignmentRecord } from '@/types/church'
import { useAuth } from '@/contexts/AuthContext'
import { CHURCH_PROFILE } from '@/data/churchData'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/MotionKit'
import { toast } from '@/hooks/use-toast'

// Map department codes/names to colors/icons for faithful visual replication
const getDepartmentTheme = (dept: DepartmentRecord) => {
  const code = dept.code?.toLowerCase() || ''
  const name = dept.name?.toLowerCase() || ''

  if (code.includes('musica') || name.includes('música') || name.includes('musica')) {
    return {
      color: '#0F8A7E',
      bg: '#E6F4F2',
      border: '#0F8A7E',
      icon: Music,
    }
  }
  if (code.includes('midia') || name.includes('mídia') || name.includes('midia')) {
    return {
      color: '#C2591A',
      bg: '#FDF1E8',
      border: '#C2591A',
      icon: Video,
    }
  }
  if (code.includes('boas') || name.includes('boas-vindas') || name.includes('acolhimento')) {
    return {
      color: '#3A31CE',
      bg: '#F2F1FB',
      border: '#DAD7F3',
      icon: HeartHandshake,
    }
  }
  if (code.includes('infantil') || name.includes('criança') || name.includes('infantil')) {
    return {
      color: '#9A2B47',
      bg: '#FCEDF1',
      border: '#E8EAF0',
      icon: Baby,
    }
  }
  return {
    color: '#6B7183',
    bg: '#F3F4F9',
    border: '#E8EAF0',
    icon: Users,
  }
}

export const Igreja: React.FC = () => {
  const { user, currentPerson } = useAuth()
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [myAssignments, setMyAssignments] = useState<AssignmentRecord[]>([])
  const [cultos, setCultos] = useState<CultoRecord[]>([])
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [showSecretaryModal, setShowSecretaryModal] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const [deptList, cultosList] = await Promise.all([
          departmentsService.list('status = "ativo"'),
          cultosService.list(),
        ])
        if (isMounted) {
          // Filtrar unidades principais para exibição
          const mainDepts = deptList.filter((d) => d.unit_type === 'departamento' || !d.parent_unit)
          setDepartments(mainDepts)
          setCultos(cultosList)
        }

        if (currentPerson?.id) {
          const asgs = await assignmentsService.listByPerson(currentPerson.id)
          if (isMounted) {
            setMyAssignments(asgs.filter((a) => a.status === 'ativa'))
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da igreja:', err)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [currentPerson?.id])

  // Checa se o usuário serve em um departamento específico
  const isServingInDept = (deptId: string, deptCode: string) => {
    return myAssignments.some((a) => {
      const matchId = a.department === deptId || a.expand?.role?.department === deptId
      const matchCode = a.expand?.role?.expand?.department?.code === deptCode
      return matchId || matchCode
    })
  }

  const handleCopyPix = () => {
    navigator.clipboard.writeText(CHURCH_PROFILE.pixKey)
    setCopiedPix(true)
    toast({
      title: 'Chave PIX copiada!',
      description: CHURCH_PROFILE.pixKey,
    })
    setTimeout(() => setCopiedPix(false), 2500)
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(CHURCH_PROFILE.fullAddress)
    setCopiedAddress(true)
    toast({
      title: 'Endereço copiado!',
      description: CHURCH_PROFILE.fullAddress,
    })
    setTimeout(() => setCopiedAddress(false), 2500)
  }

  // Filtrar cultos recorrentes da lista real ou utilizar os do churchData
  const activeRecurrentServices = cultos
    .filter((c) => c.status === 'aberto' && c.is_recurrent && c.recurrence_start_time)
    .sort((a, b) => (a.recurrence_days?.[0] ?? 0) - (b.recurrence_days?.[0] ?? 0))

  return (
    <PageTransition>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* =====================================================================
            CABEÇALHO DA PÁGINA (Desktop e Mobile) — Conforme Telas 18 e 20
            ===================================================================== */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-[#14161D]">
              Igreja
            </h1>
            <p className="text-xs md:text-sm text-[#5A6072]">
              Vida comunitária, departamentos e horários de culto
            </p>
          </div>

          {/* Avatar com link para Perfil (Fiel ao design extraído) */}
          <Link
            to="/meu-cadastro"
            className="flex items-center gap-2.5 px-3 py-1.5 md:px-4 md:py-2 bg-white hover:bg-[#F2F1FB] border border-[#DAD7F3] rounded-full transition-all group shadow-xs select-none"
            title="Meu perfil"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#F2F1FB] border border-[#DAD7F3] text-[#3A31CE] flex items-center justify-center font-heading font-bold text-xs md:text-sm">
              {currentPerson?.name
                ? currentPerson.name.slice(0, 2).toUpperCase()
                : user?.name
                  ? user.name.slice(0, 2).toUpperCase()
                  : 'DF'}
            </div>
            <span className="hidden sm:inline font-bold text-xs md:text-sm text-[#14161D] group-hover:text-[#3A31CE] transition-colors truncate max-w-[140px]">
              {currentPerson?.name || user?.name || 'Meu Perfil'}
            </span>
          </Link>
        </div>

        {/* =====================================================================
            CARD DE IDENTIDADE DA IGREJA (Templo Sede · Natal/RN)
            ===================================================================== */}
        <div className="flex items-center gap-4 md:gap-5 p-4 md:p-6 bg-white border border-[#E8EAF0] rounded-[22px] shadow-xs">
          <div className="w-13 h-13 md:w-16 md:h-16 flex-shrink-0 rounded-[18px] bg-[#3A31CE] text-white flex items-center justify-center shadow-md shadow-[#3A31CE]/20">
            <svg
              className="w-7 h-7 md:w-9 md:h-9"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7.6 4.6 C10.4 4.2 11.6 6.2 12.6 8.9 L16.6 19.4"
                stroke="#FFFFFF"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <path
                d="M11.9 10.6 L6.6 19.4"
                stroke="#FFFFFF"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="font-heading text-lg md:text-2xl font-bold tracking-tight text-[#14161D] leading-tight">
              {CHURCH_PROFILE.name}
            </h2>
            <p className="text-xs md:text-sm text-[#5A6072] flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#14161D]">{CHURCH_PROFILE.campus}</span>
              <span>&bull;</span>
              <span>
                {CHURCH_PROFILE.streetAndNumber} — {CHURCH_PROFILE.neighborhood},{' '}
                {CHURCH_PROFILE.cityState}
              </span>
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Link
              to="/publica"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-xs font-bold text-[#3A31CE] bg-[#F2F1FB] hover:bg-[#e4e1f7] transition-all border border-[#DAD7F3]"
            >
              <span>Ver página pública</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* =====================================================================
            CORPO RESPONSIVO (Mobile: Coluna única / Desktop: Grid 2 Colunas)
            ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* COLUNA ESQUERDA (Desktop: 7 colunas / Mobile: Linha 1) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SEÇÃO DE DEPARTAMENTOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
                  Departamentos
                </span>
                <Link
                  to="/departamentos"
                  className="text-xs md:text-sm font-bold text-[#3A31CE] hover:underline"
                >
                  Ver todos
                </Link>
              </div>

              {/* Grid / Lista de Departamentos */}
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {departments.length > 0 ? (
                  departments.map((dept) => {
                    const theme = getDepartmentTheme(dept)
                    const IconComp = theme.icon
                    const serving = isServingInDept(dept.id, dept.code)

                    return (
                      <StaggerItem key={dept.id}>
                        <Link
                          to="/departamentos"
                          style={{
                            borderColor: serving ? theme.color : '#E8EAF0',
                            borderWidth: serving ? '2px' : '1.5px',
                          }}
                          className={`flex items-start gap-3.5 p-4 bg-white rounded-[18px] transition-all hover:shadow-md hover:border-[#3A31CE] group`}
                        >
                          <div
                            style={{
                              backgroundColor: theme.bg,
                              color: theme.color,
                              borderColor: theme.color,
                            }}
                            className="w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-[14px] flex items-center justify-center border transition-transform group-hover:scale-105"
                          >
                            <IconComp className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.8} />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-heading text-sm md:text-base font-bold text-[#14161D] group-hover:text-[#3A31CE] transition-colors truncate">
                                {dept.name}
                              </span>
                              <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] transition-colors flex-shrink-0" />
                            </div>

                            <p className="text-xs text-[#5A6072] line-clamp-2 leading-relaxed">
                              {dept.description || 'Atividades e escalas ministeriais'}
                            </p>

                            {serving && (
                              <div className="pt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F2F1FB] text-[#3A31CE]">
                                  Você serve aqui
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                      </StaggerItem>
                    )
                  })
                ) : (
                  // Fallback estático caso o banco ainda esteja carregando
                  <>
                    <div className="p-4 bg-white border-2 border-[#0F8A7E] rounded-[18px] flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-[14px] bg-[#E6F4F2] text-[#0F8A7E] flex items-center justify-center border border-[#0F8A7E]">
                        <Music className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-[#14161D]">Música</span>
                        <p className="text-xs text-[#5A6072]">Louvor nos cultos e eventos</p>
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F2F1FB] text-[#3A31CE]">
                          Você serve
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-white border-2 border-[#C2591A] rounded-[18px] flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-[14px] bg-[#FDF1E8] text-[#C2591A] flex items-center justify-center border border-[#C2591A]">
                        <Video className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-[#14161D]">Mídia</span>
                        <p className="text-xs text-[#5A6072]">Som, projeção e transmissão</p>
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F2F1FB] text-[#3A31CE]">
                          Você serve
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </StaggerContainer>

              <p className="text-xs text-[#6B7183] leading-relaxed pt-1">
                A borda colorida marca os departamentos em que você serve — as mesmas cores da sua
                agenda de escalas.
              </p>
            </div>

            {/* SEÇÃO INSTITUCIONAL RÁPIDA (QUEM SOMOS & VISÃO) */}
            <div className="p-5 md:p-6 bg-[#F2F1FB] border border-[#DAD7F3] rounded-[22px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A31CE]">
                  Nossa Identidade & Fé
                </span>
                <Link
                  to="/quem-somos"
                  className="text-xs font-bold text-[#3A31CE] hover:underline inline-flex items-center gap-1"
                >
                  Conhecer em detalhes
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <h3 className="font-heading text-base md:text-lg font-bold text-[#14161D] leading-snug">
                &ldquo;{CHURCH_PROFILE.vision}&rdquo;
              </h3>

              <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">
                {CHURCH_PROFILE.doctrineBase}
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA (Desktop: 5 colunas / Mobile: Linha 2) */}
          <div className="lg:col-span-5 space-y-6">
            {/* HORÁRIOS DOS CULTOS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
                  Horários dos Cultos
                </span>
                <Link to="/agenda" className="text-xs font-bold text-[#3A31CE] hover:underline">
                  Ver agenda
                </Link>
              </div>

              <div className="bg-white border border-[#E8EAF0] rounded-[20px] divide-y divide-[#F0F1F5] overflow-hidden shadow-xs">
                {activeRecurrentServices.length > 0
                  ? activeRecurrentServices.map((culto) => {
                      const dayNum = culto.recurrence_days?.[0] ?? 0
                      const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                      const dayLabel = dayLabels[dayNum] || 'Dom'

                      return (
                        <div
                          key={culto.id}
                          className="flex items-center gap-3.5 px-4 md:px-5 py-3.5"
                        >
                          <span className="w-12 flex-shrink-0 font-heading text-xs font-bold uppercase tracking-wider text-[#6B7183]">
                            {dayLabel}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="block font-semibold text-sm text-[#14161D] truncate">
                              {culto.name}
                            </span>
                          </div>
                          <span className="flex-shrink-0 font-heading font-bold text-sm text-[#3A31CE]">
                            {culto.recurrence_start_time?.replace(':', 'h') || '18h00'}
                          </span>
                        </div>
                      )
                    })
                  : // Fallback com base nas constantes da igreja
                    CHURCH_PROFILE.services.map((svc, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 px-4 md:px-5 py-3.5">
                        <span className="w-12 flex-shrink-0 font-heading text-xs font-bold uppercase tracking-wider text-[#6B7183]">
                          {svc.dayOfWeekShort}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="block font-semibold text-sm text-[#14161D] truncate">
                            {svc.name}
                          </span>
                        </div>
                        <span className="flex-shrink-0 font-heading font-bold text-sm text-[#3A31CE]">
                          {svc.time}
                        </span>
                      </div>
                    ))}
              </div>
            </div>

            {/* SEÇÃO SOBRE A IGREJA (Ações e Links rápidos) */}
            <div className="space-y-3">
              <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
                Sobre a Igreja
              </span>

              <div className="bg-white border border-[#E8EAF0] rounded-[20px] divide-y divide-[#F0F1F5] overflow-hidden shadow-xs">
                {/* 1. Quem somos */}
                <Link
                  to="/quem-somos"
                  className="flex items-center gap-3.5 p-4 hover:bg-[#FBFBFD] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-bold text-sm text-[#14161D] group-hover:text-[#3A31CE] transition-colors block">
                      Quem somos
                    </span>
                    <span className="text-xs text-[#5A6072] block">
                      Nossa base, visão e pilares de fé
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] transition-colors" />
                </Link>

                {/* 2. Endereço */}
                <a
                  href={CHURCH_PROFILE.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 p-4 hover:bg-[#FBFBFD] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-bold text-sm text-[#14161D] group-hover:text-[#3A31CE] transition-colors block">
                      Endereço
                    </span>
                    <span className="text-xs text-[#5A6072] block truncate">
                      {CHURCH_PROFILE.fullAddress}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] transition-colors" />
                </a>

                {/* 3. Falar com a secretaria */}
                <button
                  type="button"
                  onClick={() => setShowSecretaryModal(true)}
                  className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-[#FBFBFD] transition-colors group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-bold text-sm text-[#14161D] group-hover:text-[#3A31CE] transition-colors block">
                      Falar com a secretaria
                    </span>
                    <span className="text-xs text-[#5A6072] block">
                      {CHURCH_PROFILE.secretariaHours}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] transition-colors" />
                </button>

                {/* 4. Contribuir */}
                <button
                  type="button"
                  onClick={() => setShowPixModal(true)}
                  className="w-full text-left flex items-center gap-3.5 p-4 hover:bg-[#FBFBFD] transition-colors group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-[11px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading font-bold text-sm text-[#14161D] group-hover:text-[#3A31CE] transition-colors block">
                      Contribuir
                    </span>
                    <span className="text-xs text-[#5A6072] block">
                      Chave PIX e dados para dízimos e ofertas
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] transition-colors" />
                </button>
              </div>
            </div>

            {/* ATALHO PÁGINA PÚBLICA (Mobile e Tablet) */}
            <div className="pt-2">
              <Link
                to="/publica"
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-white border border-[#D9DCE6] hover:border-[#3A31CE] rounded-[16px] text-xs md:text-sm font-bold text-[#3A31CE] transition-all shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Ver página pública de apresentação</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: CONTRIBUIR / PIX
          ========================================================================= */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 space-y-5 border border-[#E8EAF0] shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#14161D]">Contribuir</h3>
                  <p className="text-xs text-[#5A6072]">Dízimos e Ofertas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPixModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">
              Ofertas e dízimos voluntários sustentam as atividades pastorais, obras sociais e a
              manutenção do templo.
            </p>

            <div className="p-4 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[18px] space-y-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                Chave PIX ({CHURCH_PROFILE.pixType})
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm md:text-base text-[#14161D] break-all">
                  {CHURCH_PROFILE.pixKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="flex-shrink-0 px-3 py-1.5 rounded-[12px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-[#6B7183] space-y-1">
              <p className="font-semibold text-[#14161D]">Transferência Bancária:</p>
              <p>{CHURCH_PROFILE.bankInfo}</p>
              <p className="text-[11px] text-[#5A6072]">Titular: {CHURCH_PROFILE.name}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowPixModal(false)}
              className="w-full py-3 bg-[#F2F1FB] hover:bg-[#e4e1f7] text-[#3A31CE] font-bold text-sm rounded-[14px] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SECRETARIA & CONTATO
          ========================================================================= */}
      {showSecretaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[24px] p-6 space-y-5 border border-[#E8EAF0] shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#14161D]">
                    Secretaria da Igreja
                  </h3>
                  <p className="text-xs text-[#5A6072]">{CHURCH_PROFILE.campus}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSecretaryModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                  Horário de Atendimento
                </span>
                <p className="text-sm font-semibold text-[#14161D]">
                  {CHURCH_PROFILE.secretariaHours}
                </p>
              </div>

              <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                  Telefone & WhatsApp
                </span>
                <p className="text-sm font-semibold text-[#14161D]">
                  {CHURCH_PROFILE.secretariaWhatsapp}
                </p>
              </div>

              <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                  E-mail Oficial
                </span>
                <p className="text-sm font-semibold text-[#14161D]">
                  {CHURCH_PROFILE.secretariaEmail}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://wa.me/55${CHURCH_PROFILE.secretariaWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs md:text-sm rounded-[14px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Falar no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowSecretaryModal(false)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-[#14161D] font-bold text-xs md:text-sm rounded-[14px] transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  )
}

export default Igreja
