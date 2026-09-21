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
  MapPin,
  Users,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  presencesService,
  cultosService,
  stageHistoryService,
  churchSettingsService,
  familiesService,
} from '@/services/church'
import type { PersonRecord, CultoRecord, PresenceRecord, FamilyRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    weeksRequired: 3,
    windowWeeks: 8,
  })

  // Modal de Virada para Frequentador com Coleta Progressiva
  // Tabela: Endereço, núcleo familiar, se já é batizado e interesse em ser membro ou ser batizado
  // Microcopy: "Aproximar do caminho da membresia"
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [address, setAddress] = useState('')
  const [familyId, setFamilyId] = useState<string>('none')
  const [hasBaptism, setHasBaptism] = useState(false)
  const [baptismDate, setBaptismDate] = useState('')
  const [interestInMembership, setInterestInMembership] = useState(false)
  const [interestInBaptism, setInterestInBaptism] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsMap, allPersons, allCultos, allFamilies] = await Promise.all([
        churchSettingsService.getMap(),
        personsService.list('stage = "visitante" || status = "visitor"'),
        cultosService.list(),
        familiesService.list(),
      ])

      setFamilies(allFamilies)

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

  // Abrir modal com pré-preenchimento (NUNCA pedir de novo o que já foi informado)
  const openConfirmModal = (cand: Candidate) => {
    const p = cand.person
    setSelectedCandidate(cand)
    setAddress(p.address || (p.neighborhood ? `Bairro ${p.neighborhood}` : ''))
    setFamilyId(p.family || 'none')
    setHasBaptism(!!p.baptism_date)
    setBaptismDate(p.baptism_date ? p.baptism_date.slice(0, 10) : '')
    setInterestInMembership(!!p.interest_in_membership)
    setInterestInBaptism(!!p.interest_in_baptism)
    setConfirmModalOpen(true)
  }

  // Confirm Frequentador (R5: Líder do Boas-Vindas ou Secretaria)
  const handleConfirmWithData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate) return

    try {
      setIsSubmitting(true)
      const p = selectedCandidate.person

      // Update person record with progressive collection data
      await personsService.update(p.id, {
        stage: 'frequentador',
        status: 'attender',
        address: address.trim() || undefined,
        family: familyId !== 'none' ? familyId : undefined,
        baptism_date: hasBaptism && baptismDate ? new Date(baptismDate).toISOString() : undefined,
        interest_in_membership: interestInMembership,
        interest_in_baptism: interestInBaptism,
      })

      // Record stage history
      await stageHistoryService.recordChange({
        person: p.id,
        from_stage: 'visitante',
        to_stage: 'frequentador',
        author_name: user?.name || 'Líder de Boas-Vindas',
        reason: `Regra R4 atingida (${selectedCandidate.distinctWeeksCount} semanas distintas em ${settings.windowWeeks} semanas). Confirmado com coleta progressiva de endereço e aproximação de membresia.`,
      })

      toast.success(`${p.name} agora é oficialmente Frequentador!`)
      setConfirmModalOpen(false)
      setSelectedCandidate(null)
      loadData()
    } catch {
      toast.error('Erro ao confirmar transição para frequentador.')
    } finally {
      setIsSubmitting(false)
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
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3A31CE] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3A31CE]" />
            <span>Jornada J5</span>
            <span className="text-gray-300">/</span>
            <span>Regras R4 & R5 &bull; Coleta Progressiva</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161D] font-heading">
            Virada para Frequentador
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6072] mt-1 max-w-2xl font-normal">
            Regra R4: presença em <strong>{settings.weeksRequired} semanas diferentes</strong>{' '}
            dentro de <strong>{settings.windowWeeks} semanas</strong>. Na confirmação (R5),
            coletamos progressivamente endereço, família, batismo e interesse em membresia
            ("aproximar do caminho da membresia").
          </p>
        </div>

        <div className="bg-[#F2F1FB] text-[#3A31CE] border border-[#DAD7F3] px-3.5 py-2 rounded-2xl text-xs font-bold self-start sm:self-auto">
          {eligibleCandidates.length} pronto(s) para virada
        </div>
      </div>

      {/* Eligible Candidates Box */}
      <section className="bg-white rounded-[22px] p-6 sm:p-7 border border-[#E8EAF0] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAF0]">
          <div>
            <h2 className="text-base font-bold text-[#14161D] font-heading">
              Sugestões de Virada Atingidas
            </h2>
            <p className="text-xs text-[#5A6072] mt-0.5">
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
                  <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold text-xs flex-shrink-0 font-heading">
                    {cand.person.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#14161D] text-sm">{cand.person.name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {cand.distinctWeeksCount} de {settings.weeksRequired} semanas distintas
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A6072] mt-0.5">
                      Telefone: {cand.person.phone || cand.person.whatsapp || 'Sem telefone'} &bull;{' '}
                      {cand.regularCultosPresences.length} cultos regulares registrados
                      {cand.person.neighborhood && ` &bull; Bairro: ${cand.person.neighborhood}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePostpone(cand)}
                    className="text-xs h-9 px-3 rounded-full text-[#5A6072] border-[#E8EAF0] hover:bg-[#F2F1FB]"
                  >
                    Adiar
                  </Button>
                  <Button
                    size="sm"
                    disabled={!permissions.canConfirmFrequentador}
                    onClick={() => openConfirmModal(cand)}
                    className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all cursor-pointer"
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
      <section className="bg-white rounded-[22px] p-6 sm:p-7 border border-[#E8EAF0] shadow-sm space-y-4">
        <div className="pb-3 border-b border-[#E8EAF0]">
          <h2 className="text-base font-bold text-[#14161D] font-heading">
            Em Acompanhamento de Frequência
          </h2>
          <p className="text-xs text-[#5A6072] mt-0.5">
            Visitantes acumulando presenças nos cultos regulares
          </p>
        </div>

        <div className="divide-y divide-[#E8EAF0] text-xs">
          {pendingCandidates.length === 0 ? (
            <p className="text-center py-6 text-[#6B7183]">
              Nenhum visitante com presenças ativas.
            </p>
          ) : (
            pendingCandidates.map((cand) => (
              <div
                key={cand.person.id}
                className="py-3 px-2 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#14161D]">{cand.person.name}</span>
                  <p className="text-[11px] text-[#6B7183]">
                    {cand.distinctWeeksCount} de {settings.weeksRequired} semanas necessárias
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(settings.weeksRequired)].map((_, i) => (
                    <span
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < cand.distinctWeeksCount ? 'bg-[#3A31CE]' : 'bg-[#E8EAF0]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL COLETA PROGRESSIVA: VIRADA PARA FREQUENTADOR */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A31CE] bg-[#F2F1FB] px-2.5 py-0.5 rounded-full">
                Jornada J5 &bull; Coleta Progressiva
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-[#14161D] font-heading">
              Confirmar Frequentador: {selectedCandidate?.person.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmWithData} className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-[#F2F1FB] rounded-2xl border border-[#DAD7F3] text-[11px] text-[#3A31CE] space-y-1">
              <strong>Microcopy de Propósito:</strong>
              <p className="text-[#5A6072]">
                Solicitamos estes dados para aproximar a pessoa da comunhão bíblica, grupos pequenos
                e do caminho da membresia. Campos opcionais.
              </p>
            </div>

            {/* Campo 1: Endereço */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-gray-700">Endereço Residencial</Label>
                <span className="text-[10px] text-gray-400">Opcional</span>
              </div>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            {/* Campo 2: Núcleo Familiar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-gray-700">Núcleo Familiar</Label>
                <span className="text-[10px] text-gray-400">Vínculo na igreja</span>
              </div>
              <Select value={familyId} onValueChange={setFamilyId}>
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  <SelectItem value="none">Nenhum núcleo vinculado ainda</SelectItem>
                  {families.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      Família {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo 3: Já é batizado? */}
            <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-gray-100 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={hasBaptism}
                  onChange={(e) => setHasBaptism(e.target.checked)}
                  className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                />
                <span>Já é batizado(a) nas águas</span>
              </label>

              {hasBaptism && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] font-semibold text-[#5A6072]">
                    Data aproximada do batismo
                  </Label>
                  <Input
                    type="date"
                    value={baptismDate}
                    onChange={(e) => setBaptismDate(e.target.value)}
                    className="h-9 rounded-[14px] bg-white border-[#E8EAF0]"
                  />
                </div>
              )}
            </div>

            {/* Campo 4: Interesse em Membresia ou Batismo */}
            <div className="space-y-2 p-3 bg-[#F2F1FB] rounded-2xl border border-[#DAD7F3]">
              <Label className="font-bold text-[#14161D] block">
                Caminho da Membresia (Interesses Declarados):
              </Label>
              <label className="flex items-center gap-2 cursor-pointer text-[#5A6072]">
                <input
                  type="checkbox"
                  checked={interestInMembership}
                  onChange={(e) => setInterestInMembership(e.target.checked)}
                  className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                />
                <span>Tem interesse em se tornar membro oficial</span>
              </label>
              {!hasBaptism && (
                <label className="flex items-center gap-2 cursor-pointer text-[#5A6072]">
                  <input
                    type="checkbox"
                    checked={interestInBaptism}
                    onChange={(e) => setInterestInBaptism(e.target.checked)}
                    className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                  />
                  <span>Deseja ser batizado(a) nas águas</span>
                </label>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all mt-2"
            >
              {isSubmitting ? 'Salvando...' : 'Efetivar Virada para Frequentador'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
