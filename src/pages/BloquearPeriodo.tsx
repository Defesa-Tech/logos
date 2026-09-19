import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { availabilityService, personsService } from '@/services/church'
import { PersonRecord } from '@/types/church'
import { toast } from 'sonner'
import { ChevronLeft, Lock } from 'lucide-react'

const ACCENT = '#3A31CE'
const ACCENT_TINT = '#F2F1FB'
const ACCENT_BORDER = '#DAD7F3'

const MOTIVOS_BLOQUEIO = [
  { id: 'ferias', label: 'Férias' },
  { id: 'viagem', label: 'Viagem' },
  { id: 'trabalho', label: 'Trabalho' },
  { id: 'estudos', label: 'Estudos' },
  { id: 'outro', label: 'Outro' },
] as const

type MotivoId = (typeof MOTIVOS_BLOQUEIO)[number]['id']

const MONTH_NAMES_SHORT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const BloquearPeriodo: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [person, setPerson] = useState<PersonRecord | null>(null)

  // Inputs date padrão conforme tela 17 (12 a 26 de dezembro de 2026)
  const [startDate, setStartDate] = useState<string>('2026-12-12')
  const [endDate, setEndDate] = useState<string>('2026-12-26')

  // Motivo e descrição
  const [motivo, setMotivo] = useState<MotivoId>('ferias')
  const [descricao, setDescricao] = useState<string>('Férias em família')

  const [saving, setSaving] = useState<boolean>(false)

  // Carrega pessoa autenticada
  useEffect(() => {
    async function load() {
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
        setPerson(p)
      } catch (err) {
        console.error('Erro ao carregar pessoa:', err)
      }
    }
    load()
  }, [user])

  // Cálculo de intervalo e dias bloqueados
  const intervalPreview = useMemo(() => {
    if (!startDate || !endDate) {
      return {
        label: 'Selecione as datas',
        daysCount: 0,
        subLabel: 'Informe início e fim',
      }
    }

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return {
        label: 'Intervalo inválido',
        daysCount: 0,
        subLabel: 'A data final deve ser igual ou posterior à inicial',
      }
    }

    const diffMs = end.getTime() - start.getTime()
    const daysCount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

    const startDay = start.getDate()
    const endDay = end.getDate()
    const startMonth = MONTH_NAMES_SHORT[start.getMonth()]
    const endMonth = MONTH_NAMES_SHORT[end.getMonth()]

    let label = ''
    if (startMonth === endMonth) {
      label = `${startDay} a ${endDay} de ${startMonth}`
    } else {
      label = `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`
    }

    return {
      label,
      daysCount,
      subLabel: `${daysCount} dia${daysCount > 1 ? 's' : ''} em que você não será escalada`,
    }
  }, [startDate, endDate])

  // Submissão do bloqueio
  const handleSave = async () => {
    if (!person) {
      toast.error('Nenhum perfil de membro selecionado.')
      return
    }

    if (!startDate || !endDate) {
      toast.error('Informe a data de início e de fim.')
      return
    }

    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T23:59:59`)

    if (end < start) {
      toast.error('A data final não pode ser anterior à data inicial.')
      return
    }

    setSaving(true)
    try {
      await availabilityService.createBlockedPeriod({
        person: person.id,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        reason: motivo,
        description: descricao.trim() || undefined,
      })

      toast.success('Período bloqueado com sucesso!')
      navigate('/disponibilidade')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao bloquear período.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-[500px] mx-auto min-h-screen bg-[#FBFBFD] px-4 py-6 sm:px-6 md:py-8 flex flex-col gap-4 text-[#14161D] antialiased">
      {/* Header com Voltar */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/disponibilidade"
          aria-label="Voltar para disponibilidade"
          className="w-11 h-11 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] hover:bg-[#F2F1FB] hover:border-[#DAD7F3] text-[#3C4255] hover:text-[#3A31CE] flex items-center justify-center transition-all cursor-pointer active:scale-95 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        </Link>
        <h1 className="font-heading text-xl sm:text-[23px] font-semibold tracking-[-0.025em] text-[#14161D]">
          Bloquear período
        </h1>
      </div>

      {/* Card de prévia do intervalo */}
      <div className="flex items-center gap-3.5 p-4 bg-[#FDF1F0] border-[1.5px] border-[#F4D6D3] rounded-[18px]">
        <span className="w-1 h-11 rounded-full bg-[#B42318] flex-shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-[15.5px] font-bold leading-tight text-[#14161D]">
            {intervalPreview.label}
          </span>
          <span className="text-[12.5px] text-[#5A6072]">{intervalPreview.subLabel}</span>
        </div>
      </div>

      {/* Inputs Início e Fim */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inicio" className="text-[12.5px] font-bold text-[#3C4255]">
            Início
          </label>
          <input
            id="inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-[52px] px-3.5 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] text-[15px] font-medium text-[#14161D] focus:outline-none focus:border-[#3A31CE] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fim" className="text-[12.5px] font-bold text-[#3C4255]">
            Fim
          </label>
          <input
            id="fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-[52px] px-3.5 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] text-[15px] font-medium text-[#14161D] focus:outline-none focus:border-[#3A31CE] transition-all"
          />
        </div>
      </div>

      {/* Pílulas de Motivo */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[12.5px] font-bold text-[#3C4255]">
          Motivo <span className="text-[#B42318]">*</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS_BLOQUEIO.map((m) => {
            const isSelected = motivo === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMotivo(m.id)}
                className={`h-[42px] px-4 rounded-full font-sans text-sm border-[1.5px] transition-all cursor-pointer ${
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
      </div>

      {/* Campo Descrição Opcional */}
      <div className="flex flex-col gap-1.5 pt-1">
        <label htmlFor="descricao" className="text-[12.5px] font-bold text-[#3C4255]">
          Descrição <span className="font-semibold text-[#6B7183]">(opcional)</span>
        </label>
        <input
          id="descricao"
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: viagem com a família"
          className="w-full h-[52px] px-4 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] text-[15px] text-[#14161D] placeholder:text-[#9AA0B2] focus:outline-none focus:border-[#3A31CE] transition-all"
        />
      </div>

      {/* Card de Privacidade */}
      <div className="flex items-start gap-3 p-4 bg-[#F2F1FB] border-[1.5px] border-[#DAD7F3] rounded-[18px]">
        <Lock className="w-5 h-5 text-[#3A31CE] flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-[#14161D] leading-snug">Quem vê isso</span>
          <span className="text-[12.5px] leading-[1.45] text-[#5A6072]">
            Só o líder do seu departamento vê o período e o motivo. Nenhum outro membro tem acesso.
          </span>
        </div>
      </div>

      {/* Aviso de escopo amplo */}
      <p className="text-[12.5px] leading-[1.45] text-[#5A6072]">
        O período bloqueado vale para todos os departamentos em que você serve.
      </p>

      <div className="flex-1 min-h-2" />

      {/* Botão Principal */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-[54px] rounded-[16px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-base font-bold flex items-center justify-center gap-2 shadow-sm shadow-[#3A31CE]/25 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70 mt-2"
      >
        <span>{saving ? 'Bloqueando período...' : 'Bloquear período'}</span>
      </button>
    </div>
  )
}

export default BloquearPeriodo
