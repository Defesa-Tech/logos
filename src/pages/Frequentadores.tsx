import React, { useState, useEffect } from 'react'
import {
  GitFork,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  presencesService,
  cultosService,
  stageHistoryService,
  churchSettingsService,
} from '@/services/church'
import type { PersonRecord, CultoRecord, PresenceRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

interface Candidate {
  person: PersonRecord
  regularCultosPresences: PresenceRecord[]
  distinctWeeksCount: number
  meetsR4: boolean
}

export default function Frequentadores() {
  const { user, permissions } = useAuth()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    weeksRequired: 3,
    windowWeeks: 8,
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsMap, allPersons, allCultos] = await Promise.all([
        churchSettingsService.getMap(),
        personsService.list('stage = "visitante" || status = "visitor"'),
        cultosService.list(),
      ])

      const reqWeeks = parseInt(settingsMap.r4_frequentador_weeks_required || '3', 10)
      const winWeeks = parseInt(settingsMap.r4_frequentador_window_weeks || '8', 10)
      setSettings({ weeksRequired: reqWeeks, windowWeeks: winWeeks })

      // Calculate window cutoff (winWeeks ago)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - winWeeks * 7)

      // Only regular cultos in the window
      const regularCultos = allCultos.filter((c) => c.is_regular && new Date(c.date_time) >= cutoff)
      const regularCultoIds = new Set(regularCultos.map((c) => c.id))

      const candList: Candidate[] = []

      for (const p of allPersons) {
        const presences = await presencesService.listByPerson(p.id)
        // Filter to regular cultos within the window
        const validPres = presences.filter((pr) => regularCultoIds.has(pr.culto))

        // Count distinct weeks (using ISO week or YYYY-WW key)
        const weekKeys = new Set(
          validPres.map((pr) => {
            const d = new Date(pr.created)
            // Get week number approximation: year + '-' + week
            const startOfYear = new Date(d.getFullYear(), 0, 1)
            const pastDays = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
            const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)
            return `${d.getFullYear()}-W${weekNum}`
          }),
        )

        const distinctWeeks = weekKeys.size
        candList.push({
          person: p,
          regularCultosPresences: validPres,
          distinctWeeksCount: distinctWeeks,
          meetsR4: distinctWeeks >= reqWeeks,
        })
      }

      // Sort with eligible candidates first
      candList.sort((a, b) => (b.meetsR4 ? 1 : 0) - (a.meetsR4 ? 1 : 0))
      setCandidates(candList)
    } catch {
      toast.error('Erro ao calcular sugestões de frequentador.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Confirm Frequentador (R5: Líder do Boas-Vindas ou Secretaria)
  const handleConfirm = async (cand: Candidate) => {
    try {
      // Update stage to 'frequentador'
      await personsService.update(cand.person.id, {
        stage: 'frequentador',
        status: 'attender',
      })

      // Record stage history
      await stageHistoryService.recordChange({
        person: cand.person.id,
        from_stage: 'visitante',
        to_stage: 'frequentador',
        author_name: user?.name || 'Líder de Boas-Vindas',
        reason: `Regra R4 atingida: ${cand.distinctWeeksCount} semanas distintas em ${settings.windowWeeks} semanas. Confirmado pelo Líder.`,
      })

      toast.success(`${cand.person.name} agora é oficialmente Frequentador!`)
      loadData()
    } catch {
      toast.error('Erro ao confirmar transição para frequentador.')
    }
  }

  // Postpone suggestion (volta na próxima presença)
  const handlePostpone = (cand: Candidate) => {
    toast.info(`Sugestão de ${cand.person.name} adiada. Retornará na próxima presença.`)
    setCandidates((prev) => prev.filter((c) => c.person.id !== cand.person.id))
  }

  const eligibleCandidates = candidates.filter((c) => c.meetsR4)
  const pendingCandidates = candidates.filter((c) => !c.meetsR4 && c.distinctWeeksCount > 0)

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J5</span>
            <span className="text-gray-300">/</span>
            <span>Regras R4 & R5</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Virada para Frequentador
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Regra R4: presença em <strong>{settings.weeksRequired} semanas diferentes</strong>{' '}
            dentro de uma janela de <strong>{settings.windowWeeks} semanas</strong> (somente cultos
            regulares). O sistema sugere e o Líder de Boas-Vindas confirma (R5).
          </p>
        </div>

        <div className="bg-[#F7EEFD] text-[#820AD1] border border-purple-200 px-3.5 py-2 rounded-2xl text-xs font-bold self-start sm:self-auto">
          {eligibleCandidates.length} pronto(s) para virada
        </div>
      </div>

      {/* Eligible Candidates Box */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#191919]">Sugestões de Virada Atingidas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pessoas que cumpriram a meta de frequência regular nos cultos
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
            {eligibleCandidates.length} elegíveis
          </span>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {loading ? (
            <p className="text-center py-10 text-gray-400">Calculando presenças...</p>
          ) : eligibleCandidates.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum visitante atingiu o critério R4 no momento.
            </div>
          ) : (
            eligibleCandidates.map((cand) => (
              <div
                key={cand.person.id}
                className="py-4 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F9FB] rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {cand.person.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191919] text-sm">{cand.person.name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {cand.distinctWeeksCount} de {settings.weeksRequired} semanas distintas
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Telefone: {cand.person.phone || cand.person.whatsapp || 'Sem telefone'} &bull;{' '}
                      {cand.regularCultosPresences.length} cultos regulares registrados
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePostpone(cand)}
                    className="text-xs h-9 px-3 rounded-full text-gray-600 border-gray-200 hover:bg-gray-50"
                  >
                    Adiar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!permissions.canConfirmFrequentador}
                    onClick={() => handleConfirm(cand)}
                    className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all cursor-pointer"
                    title={
                      !permissions.canConfirmFrequentador
                        ? 'Exclusivo do Líder do Boas-Vindas ou Secretaria'
                        : 'Confirmar como frequentador'
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Confirmar Frequentador
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Progressing Visitors (not yet reached R4) */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
        <div className="pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#191919]">Em Acompanhamento de Frequência</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Visitantes acumulando presenças nos cultos regulares
          </p>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {pendingCandidates.length === 0 ? (
            <p className="text-center py-6 text-gray-400">Nenhum visitante com presenças ativas.</p>
          ) : (
            pendingCandidates.map((cand) => (
              <div
                key={cand.person.id}
                className="py-3 px-2 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#191919]">{cand.person.name}</span>
                  <p className="text-[11px] text-gray-400">
                    {cand.distinctWeeksCount} de {settings.weeksRequired} semanas necessárias
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(settings.weeksRequired)].map((_, i) => (
                    <span
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < cand.distinctWeeksCount ? 'bg-[#820AD1]' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </PageTransition>
  )
}
