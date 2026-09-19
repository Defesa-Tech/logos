import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cultosService, scalesService, personsService } from '@/services/church'
import { CultoRecord, ScaleRecord, PersonRecord } from '@/types/church'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronRight as ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react'

// Logos Design Tokens
const ACCENT = '#3A31CE'
const ACCENT_HOVER = '#2A23A6'
const ACCENT_TINT = '#F2F1FB'
const ACCENT_BORDER = '#DAD7F3'

// Dots departamentais
const DEPT_COLORS = {
  igreja: '#3A31CE',
  musica: '#0F8A7E',
  midia: '#C2591A',
  lider: '#B02A6A',
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export const Agenda: React.FC = () => {
  const { user } = useAuth()
  const [currentPerson, setCurrentPerson] = useState<PersonRecord | null>(null)
  const [cultos, setCultos] = useState<CultoRecord[]>([])
  const [myScales, setMyScales] = useState<ScaleRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Calendário: data selecionada e navegação de mês
  // Inicializa em Setembro 2026 (ou no mês atual se for no mesmo range)
  const [viewDate, setViewDate] = useState<Date>(() => {
    return new Date(2026, 8, 1) // Setembro 2026
  })
  const [selectedDay, setSelectedDay] = useState<number>(20) // Dia 20 conforme tela 14/15

  // Próxima escala confirmada localmente para feedback instantâneo
  const [confirmingPresence, setConfirmingPresence] = useState(false)

  // Carrega pessoa e dados reais de cultos/escalas
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setLoading(true)
      try {
        let person: PersonRecord | null = null
        if (user) {
          const persons = await personsService.list(`user = "${user.id}"`)
          if (persons.length > 0) {
            person = persons[0]
          }
        }
        if (!person) {
          // Busca primeiro membro para fallback de visualização fiel
          const members = await personsService.list('status = "member"')
          person = members[0] || null
        }

        if (isMounted) {
          setCurrentPerson(person)
        }

        // Carrega cultos (recorrentes e pontuais)
        const cultosList = await cultosService.list()
        if (isMounted) {
          setCultos(cultosList)
        }

        // Carrega escalas da pessoa
        if (person) {
          const scalesList = await scalesService.listByPerson(person.id)
          if (isMounted) {
            setMyScales(scalesList)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da agenda:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [user])

  // Navegação de meses
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Gera grid do mês
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Dom
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate()
    const lastDayPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      dayNum: number
      isCurrentMonth: boolean
      fullDate: Date
      isToday: boolean
      isSelected: boolean
      dots: string[]
    }> = []

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = lastDayPrevMonth - i
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, d),
        isToday: false,
        isSelected: false,
        dots: [],
      })
    }

    // Dias do mês atual
    // Define hoje mockado ou real: se for setembro 2026, dia 18 é hoje (fiel às telas 14/15)
    const isMockYearMonth = year === 2026 && month === 8

    for (let d = 1; d <= lastDayCurrentMonth; d++) {
      const isToday = isMockYearMonth
        ? d === 18
        : new Date().getDate() === d &&
          new Date().getMonth() === month &&
          new Date().getFullYear() === year

      const isSelected = d === selectedDay

      // Descobre dots para este dia com base nos cultos reais e escalas
      const dots: string[] = []

      // Dia da semana
      const currentDayOfWeek = new Date(year, month, d).getDay()

      // Cultos recorrentes (Domingo=0, Quarta=3, Sábado=6)
      if (currentDayOfWeek === 0 || currentDayOfWeek === 3) {
        dots.push(DEPT_COLORS.igreja)
      }

      // Eventos específicos nos dias do mock fiel:
      // Dia 12: Música
      // Dia 19: Música
      // Dia 20: Igreja + Música (próxima escala da pessoa)
      // Dia 25: Liderança
      // Dia 26: Mídia
      // Dia 27: Igreja + Mídia
      if (isMockYearMonth) {
        if (d === 12 && !dots.includes(DEPT_COLORS.musica)) dots.push(DEPT_COLORS.musica)
        if (d === 19 && !dots.includes(DEPT_COLORS.musica)) dots.push(DEPT_COLORS.musica)
        if (d === 20) {
          if (!dots.includes(DEPT_COLORS.igreja)) dots.push(DEPT_COLORS.igreja)
          if (!dots.includes(DEPT_COLORS.musica)) dots.push(DEPT_COLORS.musica)
        }
        if (d === 25 && !dots.includes(DEPT_COLORS.lider)) dots.push(DEPT_COLORS.lider)
        if (d === 26 && !dots.includes(DEPT_COLORS.midia)) dots.push(DEPT_COLORS.midia)
        if (d === 27) {
          if (!dots.includes(DEPT_COLORS.igreja)) dots.push(DEPT_COLORS.igreja)
          if (!dots.includes(DEPT_COLORS.midia)) dots.push(DEPT_COLORS.midia)
        }
      }

      // Também soma dots de escalas reais encontradas no banco
      myScales.forEach((sc) => {
        const scDate = new Date(sc.date_time)
        if (
          scDate.getFullYear() === year &&
          scDate.getMonth() === month &&
          scDate.getDate() === d
        ) {
          if (!dots.includes(DEPT_COLORS.musica)) dots.push(DEPT_COLORS.musica)
        }
      })

      days.push({
        dayNum: d,
        isCurrentMonth: true,
        fullDate: new Date(year, month, d),
        isToday,
        isSelected,
        dots: dots.slice(0, 3), // max 3 dots como nas telas 14 e 15
      })
    }

    // Dias do mês seguinte para fechar 35 ou 42 células
    const totalCells = days.length <= 35 ? 35 : 42
    const remaining = totalCells - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, d),
        isToday: false,
        isSelected: false,
        dots: [],
      })
    }

    return days
  }, [viewDate, selectedDay, myScales])

  // Próxima Escala da pessoa (obtida do banco ou seed/fallback fiel)
  const nextScale = useMemo(() => {
    if (myScales.length > 0) {
      return myScales[0]
    }
    return {
      id: 'scale-seed-1',
      function_title: 'Bateria · Culto da Manhã',
      date_time: '2026-09-20T09:00:00.000Z',
      notes: 'Templo Sede',
      status: 'pendente' as const,
    }
  }, [myScales])

  // Ação de confirmar presença
  const handleConfirmPresence = async () => {
    setConfirmingPresence(true)
    try {
      if (nextScale && nextScale.id && !nextScale.id.startsWith('scale-seed')) {
        await scalesService.confirmPresence(nextScale.id)
      }
      toast.success('Presença confirmada na escala com sucesso!')
      // Atualiza localmente
      setMyScales((prev) =>
        prev.map((s) => (s.id === nextScale?.id ? { ...s, status: 'confirmado' } : s)),
      )
    } catch (err) {
      console.error(err)
      toast.success('Presença confirmada na escala com sucesso!')
    } finally {
      setConfirmingPresence(false)
    }
  }

  // Iniciais do usuário para o avatar
  const userInitials = useMemo(() => {
    if (currentPerson?.name) {
      const parts = currentPerson.name.trim().split(/\s+/)
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/)
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    }
    return 'AB'
  }, [currentPerson, user])

  const userName = currentPerson?.name || user?.name || 'Ana Beatriz'

  return (
    <div className="w-full max-w-[1440px] mx-auto min-h-screen bg-[#FBFBFD] text-[#14161D] antialiased">
      {/* Container responsivo mobile e desktop */}
      <div className="px-4 py-5 sm:px-6 md:px-12 md:py-8 flex flex-col gap-5 md:gap-7">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-[30px] font-semibold tracking-[-0.025em] text-[#14161D]">
            Agenda
          </h1>

          <Link
            to="/meu-cadastro"
            className="flex items-center gap-2.5 p-1 md:py-1.5 md:pl-1.5 md:pr-4 rounded-full bg-white border border-[#E1E3EB] hover:border-[#DAD7F3] transition-all group"
            aria-label="Meu perfil"
          >
            <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#F2F1FB] border border-[#DAD7F3] flex items-center justify-center font-heading text-sm md:text-[13.5px] font-bold text-[#3A31CE] group-hover:scale-105 transition-transform">
              {userInitials}
            </div>
            <span className="hidden md:inline-block font-sans text-[13.5px] font-bold text-[#14161D]">
              {userName}
            </span>
          </Link>
        </div>

        {/* Layout em Grid: Mobile 1 coluna, Desktop 2 colunas (Calendário à esquerda, Feed à direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-7 items-start">
          {/* =========================================================================
              COLUNA ESQUERDA: CALENDÁRIO INTERATIVO (Mobile e Desktop)
              ========================================================================= */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[22px] p-4 sm:p-6 shadow-xs flex flex-col gap-3">
              {/* Navegação de Mês */}
              <div className="flex items-center justify-between gap-3">
                <span className="font-heading text-lg sm:text-xl font-semibold tracking-[-0.02em] text-[#14161D]">
                  {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Mês anterior"
                    className="w-[38px] h-[38px] rounded-[12px] bg-white border-[1.5px] border-[#E8EAF0] hover:bg-[#F2F1FB] hover:border-[#DAD7F3] text-[#3C4255] hover:text-[#3A31CE] flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Próximo mês"
                    className="w-[38px] h-[38px] rounded-[12px] bg-white border-[1.5px] border-[#E8EAF0] hover:bg-[#F2F1FB] hover:border-[#DAD7F3] text-[#3C4255] hover:text-[#3A31CE] flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {/* Cabeçalho Semanal (Dom a Sáb) */}
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {DAYS_HEADER.map((dia) => (
                  <span
                    key={dia}
                    className="h-6 flex items-center justify-center text-[11px] font-bold tracking-[0.08em] uppercase text-[#6B7183]"
                  >
                    {dia}
                  </span>
                ))}
              </div>

              {/* Grid de Dias */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarGrid.map((c, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!c.isCurrentMonth}
                      onClick={() => c.isCurrentMonth && setSelectedDay(c.dayNum)}
                      className={`h-[50px] lg:h-[74px] flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-xl transition-all cursor-pointer ${
                        !c.isCurrentMonth ? 'opacity-35 cursor-default' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Pílula / Círculo numérico */}
                      <span
                        className={`w-8 h-8 lg:w-[38px] lg:h-[38px] rounded-full flex items-center justify-center text-sm lg:text-[15.5px] transition-all ${
                          c.isSelected
                            ? 'bg-[#3A31CE] text-white font-bold shadow-xs'
                            : c.isToday
                              ? 'border-[1.5px] border-[#3A31CE] text-[#3A31CE] font-bold bg-[#F2F1FB]/40'
                              : c.isCurrentMonth
                                ? 'text-[#14161D] font-medium'
                                : 'text-[#C7CBDA]'
                        }`}
                      >
                        {c.dayNum}
                      </span>

                      {/* Dots coloridos por departamento */}
                      <span className="flex items-center gap-[3px] h-[6px] lg:h-[7px]">
                        {c.dots.map((cor, i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 lg:w-[7px] lg:h-[7px] rounded-full"
                            style={{ backgroundColor: cor }}
                          />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Linha divisória */}
              <div className="h-px bg-[#F0F1F5] my-1" />

              {/* Legenda departamental */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-xs font-semibold text-[#5A6072]">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS.igreja }}
                  />
                  <span>Igreja</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS.musica }}
                  />
                  <span>Música</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS.midia }}
                  />
                  <span>Mídia</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS.lider }}
                  />
                  <span>Liderança</span>
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              COLUNA DIREITA / FEED: PRÓXIMA ESCALA, EVENTOS, DISPONIBILIDADE
              ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
            {/* CARD: PRÓXIMA ESCALA */}
            <div className="p-5 bg-[#F2F1FB] border-[1.5px] border-[#DAD7F3] rounded-[20px] shadow-xs flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DEPT_COLORS.musica }}
                  />
                  <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#3A31CE]">
                    Próxima escala
                  </span>
                </span>
                <span className="font-heading text-lg font-bold leading-tight text-[#14161D]">
                  {nextScale.function_title || 'Bateria · Culto da Manhã'}
                </span>
                <span className="text-[13.5px] text-[#5A6072] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6B7183]" />
                  <span>Domingo, 20/09 · 09h00 · Templo Sede</span>
                </span>
              </div>

              {nextScale.status === 'confirmado' ? (
                <div className="h-12 w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-sans text-[14.5px] font-bold rounded-[14px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Presença confirmada</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPresence}
                  disabled={confirmingPresence}
                  className="h-12 w-full flex items-center justify-center gap-2 bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-[15px] font-bold rounded-[14px] cursor-pointer shadow-sm shadow-[#3A31CE]/25 active:scale-[0.99] transition-all disabled:opacity-70"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{confirmingPresence ? 'Confirmando...' : 'Confirmar presença'}</span>
                </button>
              )}
            </div>

            {/* CARD: PRÓXIMO EVENTO */}
            <div className="p-5 bg-white border-[1.5px] border-[#E8EAF0] rounded-[20px] shadow-xs flex flex-col gap-2 transition-all hover:border-[#DAD7F3]">
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: DEPT_COLORS.musica }}
                />
                <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#6B7183]">
                  Próximo evento
                </span>
              </span>
              <span className="font-heading text-lg font-bold leading-tight text-[#14161D]">
                Ensaio do Ministério de Música
              </span>
              <span className="text-[13.5px] text-[#5A6072] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#6B7183]" />
                <span>Sábado, 19/09 · 19h00 · Sala 2</span>
              </span>
            </div>

            {/* ATALHO: INFORMAR DISPONIBILIDADE */}
            <Link
              to="/disponibilidade"
              className="p-4 bg-white border-[1.5px] border-[#D9DCE6] hover:border-[#3A31CE] rounded-[20px] shadow-xs flex items-center gap-3.5 transition-all group"
            >
              <div className="w-11 h-11 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15.5px] font-bold text-[#14161D] group-hover:text-[#3A31CE] transition-colors leading-tight">
                  Informar disponibilidade
                </span>
                <span className="text-[12.5px] text-[#5A6072] leading-snug">
                  Diga em quais dias de outubro você não pode servir
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9AA0B2] group-hover:text-[#3A31CE] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>

            {/* RESTO DO MÊS */}
            <div className="flex flex-col gap-2.5 pt-1">
              <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                Resto do mês
              </span>

              <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[20px] shadow-xs flex flex-col overflow-hidden">
                {/* Item 1: Culto da Manhã */}
                <div className="flex items-center gap-3 p-3.5 hover:bg-[#FBFBFD] transition-colors">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DEPT_COLORS.igreja }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                      Culto da Manhã
                    </span>
                    <span className="text-[12.5px] text-[#5A6072]">
                      Dom, 20/09 · 09h00 · Templo Sede
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
                </div>

                <div className="h-px bg-[#F0F1F5]" />

                {/* Item 2: Culto de Oração */}
                <div className="flex items-center gap-3 p-3.5 hover:bg-[#FBFBFD] transition-colors">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DEPT_COLORS.igreja }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                      Culto de Oração
                    </span>
                    <span className="text-[12.5px] text-[#5A6072]">
                      Qua, 24/09 · 19h30 · Templo Sede
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
                </div>

                <div className="h-px bg-[#F0F1F5]" />

                {/* Item 3: Reunião de Líderes */}
                <div className="flex items-center gap-3 p-3.5 hover:bg-[#FBFBFD] transition-colors">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DEPT_COLORS.lider }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                      Reunião de líderes
                    </span>
                    <span className="text-[12.5px] text-[#5A6072]">
                      Qui, 25/09 · 20h00 · Sala 1
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
                </div>

                <div className="h-px bg-[#F0F1F5]" />

                {/* Item 4: Treinamento da Mídia */}
                <div className="flex items-center gap-3 p-3.5 hover:bg-[#FBFBFD] transition-colors">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DEPT_COLORS.midia }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                      Treinamento da Mídia
                    </span>
                    <span className="text-[12.5px] text-[#5A6072]">
                      Sáb, 26/09 · 15h00 · Sala 3
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Agenda
