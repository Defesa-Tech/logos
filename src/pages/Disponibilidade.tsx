import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { availabilityService, personsService } from '@/services/church'
import { BlockedPeriodRecord, PersonRecord } from '@/types/church'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronRight as ArrowRight,
} from 'lucide-react'

// Cores do Design System e da tela 16
const ACCENT = '#3A31CE'
const ACCENT_TINT = '#F2F1FB'
const ACCENT_BORDER = '#DAD7F3'
const RED_DARK = '#B42318'
const RED_BG = '#FDF1F0'
const RED_BORDER = '#F4D6D3'
const GREEN_DARK = '#0E7C63'
const GREEN_BG = '#ECF7F4'
const GREEN_BORDER = '#CDE8E1'

const DAYS_HEADER = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MOTIVOS_LIST = [
  { id: 'compromisso', label: 'Compromisso pessoal' },
  { id: 'trabalho', label: 'Trabalho' },
  { id: 'viagem', label: 'Viagem' },
  { id: 'estudos', label: 'Estudos' },
  { id: 'outro', label: 'Outro' },
]

export const Disponibilidade: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [person, setPerson] = useState<PersonRecord | null>(null)

  // Mês e ano de trabalho (default: Outubro 2026, conforme tela 16)
  const [viewDate, setViewDate] = useState<Date>(new Date(2026, 9, 1)) // Mês 9 = Outubro

  // Modo: 'nao' = não posso servir nos dias marcados (vermelho)
  // 'sim' = posso servir nos dias marcados (verde)
  const [mode, setMode] = useState<'nao' | 'sim'>('nao')

  // Dias marcados (set ou mapa de números: 10, 11, 25 como na tela 16)
  const [markedDays, setMarkedDays] = useState<number[]>([10, 11, 25])

  // Motivo selecionado e detalhe opcional
  const [selectedReason, setSelectedReason] = useState<string>('compromisso')
  const [details, setDetails] = useState<string>('')

  // Períodos bloqueados cadastrados
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriodRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  const currentYearMonth = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`

  // Carrega pessoa e disponibilidades existentes
  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      try {
        let p: PersonRecord | null = null
        if (user) {
          const list = await personsService.list(`user = "${user.id}"`)
          if (list.length > 0) p = list[0]
        }
        if (!p) {
          const members = await personsService.list('status = "member"')
          p = members[0] || null
        }

        if (isMounted) setPerson(p)

        if (p) {
          // Busca disponibilidade para o mês atual
          const existing = await availabilityService.getByPersonAndMonth(p.id, currentYearMonth)
          if (existing && isMounted) {
            setMode(existing.mode || 'nao')
            if (Array.isArray(existing.marked_days)) {
              setMarkedDays(existing.marked_days)
            }
            if (existing.reason_id) setSelectedReason(existing.reason_id)
            if (existing.details) setDetails(existing.details)
          }

          // Busca períodos bloqueados
          const periods = await availabilityService.listBlockedPeriods(p.id)
          if (isMounted) {
            setBlockedPeriods(periods)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar disponibilidade:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [user, currentYearMonth])

  // Navegação de mês
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Alterna o modo
  const handleToggleMode = (newMode: 'nao' | 'sim') => {
    if (newMode === mode) return
    setMode(newMode)
    setMarkedDays([]) // Limpa marcas ao alternar modo
  }

  // Clique em um dia
  const handleDayClick = (dayNum: number) => {
    setMarkedDays((prev) => {
      if (prev.includes(dayNum)) {
        return prev.filter((d) => d !== dayNum)
      } else {
        return [...prev, dayNum].sort((a, b) => a - b)
      }
    })
  }

  // Limpar marcas
  const handleClear = () => {
    setMarkedDays([])
  }

  // Montagem das células do calendário
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const firstDayWeekIndex = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()
  const lastDayPrevMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate()

  const calendarCells = useMemo(() => {
    const list: Array<{
      dayNum: number
      isCurrentMonth: boolean
      isMarked: boolean
    }> = []

    // Dias do mês anterior
    for (let i = firstDayWeekIndex - 1; i >= 0; i--) {
      list.push({
        dayNum: lastDayPrevMonth - i,
        isCurrentMonth: false,
        isMarked: false,
      })
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({
        dayNum: d,
        isCurrentMonth: true,
        isMarked: markedDays.includes(d),
      })
    }

    // Dias do mês seguinte até múltiplo de 7
    const remaining = (7 - (list.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      list.push({
        dayNum: d,
        isCurrentMonth: false,
        isMarked: false,
      })
    }

    return list
  }, [firstDayWeekIndex, lastDayPrevMonth, daysInMonth, markedDays])

  // Cálculos de resumo
  const totalMarked = markedDays.length
  const totalResto = Math.max(0, daysInMonth - totalMarked)
  const isVazio = totalMarked === 0
  const activeColor = mode === 'nao' ? RED_DARK : GREEN_DARK

  // Salvar disponibilidade
  const handleSave = async () => {
    if (!person) {
      toast.error('Nenhum perfil de membro selecionado.')
      return
    }

    setSaving(true)
    try {
      await availabilityService.saveMonthly({
        person: person.id,
        year_month: currentYearMonth,
        mode,
        marked_days: markedDays,
        reason_id: selectedReason,
        details,
      })
      toast.success('Disponibilidade salva com sucesso!')
      navigate('/agenda')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar disponibilidade.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-screen bg-[#FBFBFD] px-4 py-6 sm:px-6 md:py-8 flex flex-col gap-4 text-[#14161D] antialiased">
      {/* Top Header com Voltar */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/agenda"
          aria-label="Voltar para a agenda"
          className="w-11 h-11 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] hover:bg-[#F2F1FB] hover:border-[#DAD7F3] text-[#3C4255] hover:text-[#3A31CE] flex items-center justify-center transition-all cursor-pointer active:scale-95 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        </Link>
        <h1 className="font-heading text-xl sm:text-[23px] font-semibold tracking-[-0.025em] text-[#14161D]">
          Disponibilidade
        </h1>
      </div>

      {/* Segmented Control: Modo Não Posso / Posso */}
      <div className="flex flex-col gap-2">
        <span className="text-[12.5px] font-semibold text-[#5A6072]">
          Estou marcando os dias em que
        </span>
        <div className="flex gap-1 p-1 bg-[#F1F2F7] rounded-[15px]">
          {/* Botão Não Posso */}
          <button
            type="button"
            onClick={() => handleToggleMode('nao')}
            className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-[12px] font-sans text-sm transition-all cursor-pointer ${
              mode === 'nao'
                ? 'bg-white text-[#B42318] font-bold shadow-xs'
                : 'bg-transparent text-[#5A6072] font-semibold hover:text-[#14161D]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                mode === 'nao' ? 'bg-[#B42318]' : 'bg-[#C7CBDA]'
              }`}
            />
            <span>não posso servir</span>
          </button>

          {/* Botão Posso */}
          <button
            type="button"
            onClick={() => handleToggleMode('sim')}
            className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-[12px] font-sans text-sm transition-all cursor-pointer ${
              mode === 'sim'
                ? 'bg-white text-[#0E7C63] font-bold shadow-xs'
                : 'bg-transparent text-[#5A6072] font-semibold hover:text-[#14161D]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                mode === 'sim' ? 'bg-[#0E7C63]' : 'bg-[#C7CBDA]'
              }`}
            />
            <span>posso servir</span>
          </button>
        </div>
      </div>

      {/* Banner Contextual */}
      {mode === 'nao' ? (
        <div className="p-4 bg-[#FDF1F0] border-[1.5px] border-[#F4D6D3] rounded-[18px]">
          <p className="text-[13px] leading-[1.45] text-[#5A6072]">
            Toque nos dias em que você <strong className="text-[#14161D]">não</strong> pode servir.
            Nos dias em branco, você continua disponível para ser escalada.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-[#ECF7F4] border-[1.5px] border-[#CDE8E1] rounded-[18px]">
          <p className="text-[13px] leading-[1.45] text-[#5A6072]">
            Toque nos dias em que você <strong className="text-[#14161D]">pode</strong> servir. Nos
            dias em branco, você não será escalada.
          </p>
        </div>
      )}

      {/* Calendário Seletor de Dias */}
      <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[22px] p-4 flex flex-col gap-3 shadow-xs">
        {/* Topo do calendário */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-heading text-lg font-semibold tracking-[-0.02em] text-[#14161D]">
            Outubro 2026
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="w-9 h-9 rounded-[12px] bg-white border-[1.5px] border-[#E8EAF0] text-[#3C4255] hover:text-[#3A31CE] hover:bg-[#F2F1FB] flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="w-9 h-9 rounded-[12px] bg-white border-[1.5px] border-[#E8EAF0] text-[#3C4255] hover:text-[#3A31CE] hover:bg-[#F2F1FB] flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Header semanal */}
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAYS_HEADER.map((d) => (
            <span
              key={d}
              className="h-6 flex items-center justify-center text-[11px] font-bold tracking-[0.08em] uppercase text-[#6B7183]"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarCells.map((c, i) => {
            return (
              <button
                key={i}
                type="button"
                disabled={!c.isCurrentMonth}
                onClick={() => c.isCurrentMonth && handleDayClick(c.dayNum)}
                className={`h-[50px] flex items-center justify-center p-0 bg-transparent border-none ${
                  c.isCurrentMonth ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`w-[38px] h-[38px] rounded-full flex items-center justify-center font-sans text-[15px] transition-all ${
                    c.isMarked
                      ? mode === 'nao'
                        ? 'bg-[#B42318] text-white font-bold shadow-xs'
                        : 'bg-[#0E7C63] text-white font-bold shadow-xs'
                      : !c.isCurrentMonth
                        ? 'text-[#C7CBDA]'
                        : 'text-[#14161D] font-medium hover:bg-gray-100'
                  }`}
                >
                  {c.dayNum}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de Resumo */}
      <div className="flex items-center gap-3.5 p-4 bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] shadow-xs">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: isVazio ? '#C7CBDA' : activeColor }}
        />
        <div className="flex-1 min-w-0">
          {isVazio ? (
            <div>
              <span className="block text-sm font-bold text-[#14161D] leading-[1.4]">
                Nenhum dia informado
              </span>
              <span className="block text-[12.5px] text-[#5A6072] leading-[1.4]">
                Você ainda não declarou nada para outubro.
              </span>
            </div>
          ) : mode === 'nao' ? (
            <div>
              <span className="block text-sm font-bold text-[#14161D] leading-[1.4]">
                {totalMarked} dias em que não pode servir
              </span>
              <span className="block text-[12.5px] text-[#5A6072] leading-[1.4]">
                Nos outros {totalResto} dias você fica disponível.
              </span>
            </div>
          ) : (
            <div>
              <span className="block text-sm font-bold text-[#14161D] leading-[1.4]">
                {totalMarked} dias em que pode servir
              </span>
              <span className="block text-[12.5px] text-[#5A6072] leading-[1.4]">
                Nos outros {totalResto} dias você não será escalada.
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="h-[38px] px-3.5 rounded-[12px] bg-transparent border-[1.5px] border-[#E1E3EB] hover:bg-gray-50 text-[13px] font-bold text-[#5A6072] hover:text-[#14161D] cursor-pointer transition-all active:scale-95 flex-shrink-0"
        >
          Limpar
        </button>
      </div>

      {/* Seção Motivo (visível quando há marcas) */}
      {!isVazio && (
        <div className="flex flex-col gap-2.5 p-4 bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] shadow-xs">
          <span className="text-[13.5px] font-bold leading-[1.3] text-[#14161D]">
            {mode === 'nao'
              ? 'Por que você não pode nesses dias? '
              : 'Por que você só pode nesses dias? '}
            <span className="text-[#B42318]">*</span>
          </span>

          {/* Chips de motivos */}
          <div className="flex flex-wrap gap-2 pt-1">
            {MOTIVOS_LIST.map((m) => {
              const isSelected = selectedReason === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedReason(m.id)}
                  className={`h-10 px-4 rounded-full font-sans text-[13.5px] border-[1.5px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#F2F1FB] text-[#3A31CE] border-[#DAD7F3] font-bold shadow-xs'
                      : 'bg-white text-[#3C4255] border-[#E1E3EB] font-semibold hover:border-[#DAD7F3]'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Input Detalhe opcional */}
          <input
            id="detalhe"
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Detalhe, se quiser (opcional)"
            className="w-full h-12 px-4 rounded-[14px] bg-[#FBFBFD] border-[1.5px] border-[#E1E3EB] text-[14.5px] text-[#14161D] placeholder:text-[#9AA0B2] focus:outline-none focus:border-[#3A31CE] mt-1 transition-all"
          />

          <div className="flex items-center gap-2 text-xs text-[#5A6072]">
            <Lock className="w-3.5 h-3.5 text-[#6B7183] flex-shrink-0" />
            <span>Só o líder do seu departamento vê a justificativa.</span>
          </div>
        </div>
      )}

      {/* Períodos Bloqueados */}
      <div className="flex flex-col gap-2.5 pt-1">
        <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
          Períodos bloqueados
        </span>

        {/* Lista de períodos ativos */}
        {blockedPeriods.length > 0 ? (
          blockedPeriods.map((bp) => {
            const start = new Date(bp.start_date)
            const end = new Date(bp.end_date)
            return (
              <div
                key={bp.id}
                className="flex items-center gap-3.5 p-3.5 bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] shadow-xs"
              >
                <span className="w-1 h-10 rounded-full bg-[#B42318] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                    {bp.description || 'Férias / Ausência'}
                  </span>
                  <span className="text-[12.5px] text-[#5A6072]">
                    {start.getDate()} a {end.getDate()} de Dezembro de 2026
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
              </div>
            )
          })
        ) : (
          <div className="flex items-center gap-3.5 p-3.5 bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] shadow-xs">
            <span className="w-1 h-10 rounded-full bg-[#B42318] flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14161D] leading-tight">
                Férias em família
              </span>
              <span className="text-[12.5px] text-[#5A6072]">12 a 26 de dezembro de 2026</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[#9AA0B2] flex-shrink-0" />
          </div>
        )}

        {/* Botão Bloquear um período */}
        <Link
          to="/bloquear-periodo"
          className="h-[50px] flex items-center justify-center gap-2 rounded-[16px] bg-white border-[1.5px] border-[#D9DCE6] hover:border-[#3A31CE] hover:bg-[#F2F1FB] font-sans text-[15px] font-bold text-[#3A31CE] shadow-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Bloquear um período</span>
        </Link>
      </div>

      <p className="text-[12.5px] leading-[1.45] text-[#5A6072] mt-1">
        Seu líder vê isso ao montar a escala do mês. Em caso de imprevisto, ele ainda pode falar com
        você.
      </p>

      {/* Botão Principal: Salvar disponibilidade */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-[54px] rounded-[16px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-base font-bold flex items-center justify-center gap-2 shadow-sm shadow-[#3A31CE]/25 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 mt-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{saving ? 'Salvando...' : 'Salvar disponibilidade'}</span>
      </button>
    </div>
  )
}

export default Disponibilidade
