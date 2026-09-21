import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Users,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Phone,
  ArrowRight,
  Archive,
  RefreshCw,
  UserPlus,
  Send,
  ArrowLeftRight,
  Shield,
  Filter,
  AlertCircle,
  Repeat,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  cultosService,
  presencesService,
  personsService,
  followUpService,
  stageHistoryService,
  DEFAULT_TOLERANCES_BY_TYPE,
} from '@/services/church'
import type { CultoRecord, PresenceRecord, PersonRecord } from '@/types/church'
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
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

export default function Cultos() {
  const { user, permissions } = useAuth()

  const [cultos, setCultos] = useState<CultoRecord[]>([])
  const [selectedCulto, setSelectedCulto] = useState<CultoRecord | null>(null)
  const [presences, setPresences] = useState<PresenceRecord[]>([])
  const [loading, setLoading] = useState(true)

  // J1: Boas-Vindas Quick Search & Register
  const [searchPhone, setSearchPhone] = useState('')
  const [matchedPerson, setMatchedPerson] = useState<PersonRecord | null>(null)
  const [isSearchingPhone, setIsSearchingPhone] = useState(false)

  // Quick Signup Modal (when phone not found)
  const [signupModalOpen, setSignupModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newHowFound, setNewHowFound] = useState('Culto presencial')
  const [newContactAuthorized, setNewContactAuthorized] = useState(true)
  const [newNoContact, setNewNoContact] = useState(false)
  const [newNotes, setNewNotes] = useState('')
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false)

  // Anonymous count modal
  const [anonymousCount, setAnonymousCount] = useState(0)

  // Move presence modal (Secretaria only)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [presenceToMove, setPresenceToMove] = useState<PresenceRecord | null>(null)
  const [targetCultoId, setTargetCultoId] = useState('')

  // Presenças sem evento (órfãs) - Pendência de secretaria
  const [orphanPresences, setOrphanPresences] = useState<PresenceRecord[]>([])
  const [linkOrphanModalOpen, setLinkOrphanModalOpen] = useState(false)
  const [orphanToLink, setOrphanToLink] = useState<PresenceRecord | null>(null)
  const [linkTargetCultoId, setLinkTargetCultoId] = useState('')

  // Create Culto/Evento Modal
  const [createCultoOpen, setCreateCultoOpen] = useState(false)
  const [cultoName, setCultoName] = useState('Culto da Palavra')
  const [cultoEventType, setCultoEventType] = useState<string>('culto_domingo')
  const [cultoDate, setCultoDate] = useState(new Date().toISOString().slice(0, 16))
  const [cultoEndDate, setCultoEndDate] = useState('')
  const [cultoTolBefore, setCultoTolBefore] = useState(60)
  const [cultoTolAfter, setCultoTolAfter] = useState(0)
  const [cultoIsRegular, setCultoIsRegular] = useState(true)
  // Recorrência semanal
  const [cultoIsRecurrent, setCultoIsRecurrent] = useState(false)
  const [cultoRecurrenceDays, setCultoRecurrenceDays] = useState<number[]>([0])
  const [cultoRecurrenceStartTime, setCultoRecurrenceStartTime] = useState('18:00')
  const [cultoRecurrenceEndTime, setCultoRecurrenceEndTime] = useState('20:00')

  // Realtime subscription for presences
  useRealtime<PresenceRecord>('presences', (e) => {
    if (selectedCulto && e.record.culto === selectedCulto.id) {
      if (e.action === 'create') {
        // Fetch with expand
        presencesService.listByCulto(selectedCulto.id).then(setPresences)
      } else if (e.action === 'update') {
        setPresences((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
      } else if (e.action === 'delete') {
        setPresences((prev) => prev.filter((p) => p.id !== e.record.id))
      }
    }
    // Atualizar órfãs se for relevante
    if (!e.record.culto || e.record.is_orphan) {
      presencesService
        .listOrphans()
        .then(setOrphanPresences)
        .catch(() => {})
    }
  })

  const loadCultos = async () => {
    try {
      setLoading(true)
      const list = await cultosService.list()
      setCultos(list)
      if (list.length > 0) {
        // Pick first open or first available
        const open = list.find((c) => c.status === 'aberto') || list[0]
        setSelectedCulto(open)
      }
      // Carregar presenças sem evento (órfãs)
      const orphans = await presencesService.listOrphans()
      setOrphanPresences(orphans)
    } catch {
      toast.error('Erro ao carregar cultos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCultos()
  }, [])

  // Load presences whenever selectedCulto changes
  useEffect(() => {
    if (selectedCulto) {
      setAnonymousCount(selectedCulto.anonymous_count || 0)
      presencesService
        .listByCulto(selectedCulto.id)
        .then(setPresences)
        .catch(() => setPresences([]))
    }
  }, [selectedCulto])

  // Phone search debounced for J1
  useEffect(() => {
    if (!searchPhone.trim() || searchPhone.length < 4) {
      setMatchedPerson(null)
      setIsSearchingPhone(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingPhone(true)
      try {
        const found = await personsService.findByPhone(searchPhone)
        setMatchedPerson(found)
      } catch {
        setMatchedPerson(null)
      } finally {
        setIsSearchingPhone(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchPhone])

  // J1: Register 1-tap presence
  const handleRegisterPresence = async (person: PersonRecord) => {
    if (!selectedCulto) {
      toast.error('Selecione um culto aberto para registrar presença.')
      return
    }

    try {
      // Check existing presences to determine if first visit vs return
      const existingPresences = await presencesService.listByPerson(person.id)
      const isFirst = existingPresences.length === 0
      const currentStage = person.stage || (person.status === 'member' ? 'membro' : 'visitante')

      const presenceType: 'primeira_visita' | 'retorno' | 'membro_regular' =
        currentStage === 'membro' ? 'membro_regular' : isFirst ? 'primeira_visita' : 'retorno'

      // Check if already registered in this culto
      const alreadyInCulto = presences.some((p) => p.person === person.id)
      if (alreadyInCulto) {
        toast.info(`${person.name} já teve presença registrada neste culto hoje!`)
        return
      }

      await presencesService.create({
        culto: selectedCulto.id,
        person: person.id,
        modality: 'presencial',
        presence_type: presenceType,
        registered_by_name: user?.name || 'Recepção Boas-Vindas',
        origin: 'boas_vindas',
      })

      // If visitor or attender, create follow-up task with 48h deadline (per spec J1/J3)
      if (currentStage === 'visitante' || currentStage === 'frequentador') {
        if (!person.refuses_contact && !person.no_contact) {
          const due = new Date()
          due.setHours(due.getHours() + 48)
          await followUpService.create({
            person: person.id,
            responsible_name: user?.name || 'Equipe Boas-Vindas',
            due_date: due.toISOString(),
            status: 'aberta',
            result: 'pendente',
            notes: isFirst
              ? 'Primeira visita ao culto. Enviar mensagem de boas-vindas e acolhimento.'
              : `Retorno ao culto (${existingPresences.length + 1}ª presença). Manter acompanhamento.`,
          })
        }
      }

      toast.success(`Presença confirmada para ${person.name}!`)
      setSearchPhone('')
      setMatchedPerson(null)
      // Refresh presences
      const updated = await presencesService.listByCulto(selectedCulto.id)
      setPresences(updated)
    } catch {
      toast.error('Erro ao registrar presença.')
    }
  }

  // J1: Quick Visitor Signup (when not found)
  const handleQuickSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    if (!selectedCulto) return

    try {
      setIsSubmittingSignup(true)
      // Create person as visitante
      const person = await personsService.create({
        name: newName.trim(),
        phone: newNoContact ? undefined : newPhone.trim() || undefined,
        whatsapp: newNoContact ? undefined : newPhone.trim() || undefined,
        stage: 'visitante',
        status: 'visitor',
        how_found: newHowFound,
        how_met: newHowFound,
        contact_authorized: newNoContact ? false : newContactAuthorized,
        contact_auth_date: newContactAuthorized ? new Date().toISOString() : undefined,
        contact_auth_by: user?.name || 'Boas-Vindas',
        no_contact: newNoContact,
        refuses_contact: !newContactAuthorized,
        notes: newNotes.trim() || undefined,
      })

      // Record stage history
      await stageHistoryService.recordChange({
        person: person.id,
        from_stage: 'inicio',
        to_stage: 'visitante',
        author_name: user?.name || 'Recepção Boas-Vindas',
        reason: 'Primeira visita presencial ao culto',
      })

      // Register presence
      await presencesService.create({
        culto: selectedCulto.id,
        person: person.id,
        modality: 'presencial',
        presence_type: 'primeira_visita',
        registered_by_name: user?.name || 'Recepção Boas-Vindas',
        origin: 'boas_vindas',
      })

      // Create 48h follow-up task if contact authorized
      if (!newNoContact && newContactAuthorized) {
        const due = new Date()
        due.setHours(due.getHours() + 48)
        await followUpService.create({
          person: person.id,
          responsible_name: user?.name || 'Voluntário de Recepção',
          due_date: due.toISOString(),
          status: 'aberta',
          result: 'pendente',
          notes: `Acolhimento da 1ª visita de ${newName}. Contato: ${newPhone || 'Sem telefone'}`,
        })
      }

      toast.success(`Visitante ${newName} cadastrado e presença confirmada!`)
      setSignupModalOpen(false)
      setNewName('')
      setNewPhone('')
      setNewNotes('')
      setSearchPhone('')
      setMatchedPerson(null)

      const updated = await presencesService.listByCulto(selectedCulto.id)
      setPresences(updated)
    } catch {
      toast.error('Erro ao cadastrar visitante.')
    } finally {
      setIsSubmittingSignup(false)
    }
  }

  // Update anonymous count
  const handleUpdateAnonymous = async (delta: number) => {
    if (!selectedCulto) return
    const nextVal = Math.max(0, anonymousCount + delta)
    setAnonymousCount(nextVal)
    try {
      await cultosService.update(selectedCulto.id, { anonymous_count: nextVal })
      setSelectedCulto({ ...selectedCulto, anonymous_count: nextVal })
    } catch {
      toast.error('Erro ao atualizar contagem anônima.')
    }
  }

  // J2: Move presence to another culto (Secretaria only)
  const handleMovePresence = async () => {
    if (!presenceToMove || !targetCultoId) return
    try {
      await presencesService.moveToCulto(presenceToMove.id, targetCultoId)
      toast.success('Presença transferida para o culto correto.')
      setMoveModalOpen(false)
      setPresenceToMove(null)
      if (selectedCulto) {
        const updated = await presencesService.listByCulto(selectedCulto.id)
        setPresences(updated)
      }
    } catch {
      toast.error('Erro ao mover presença.')
    }
  }

  // Vincular presença órfã a um evento da agenda
  const handleLinkOrphan = async () => {
    if (!orphanToLink || !linkTargetCultoId) return
    try {
      await presencesService.linkToCulto(orphanToLink.id, linkTargetCultoId)
      toast.success('Presença vinculada ao evento com sucesso!')
      setLinkOrphanModalOpen(false)
      setOrphanToLink(null)
      setLinkTargetCultoId('')
      // Recarregar órfãs e lista do culto atual
      const orphans = await presencesService.listOrphans()
      setOrphanPresences(orphans)
      if (selectedCulto) {
        const updated = await presencesService.listByCulto(selectedCulto.id)
        setPresences(updated)
      }
    } catch {
      toast.error('Erro ao vincular presença.')
    }
  }

  // Descartar/Ignorar presença órfã
  const handleDeleteOrphan = async (id: string) => {
    if (!confirm('Deseja descartar este registro de presença órfã?')) return
    try {
      await presencesService.delete(id)
      toast.success('Registro de presença descartado.')
      setOrphanPresences((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error('Erro ao descartar presença.')
    }
  }

  // Create new Culto / Evento da Agenda
  const handleCreateCulto = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const startDate = new Date(cultoDate)
      const endDate = cultoEndDate
        ? new Date(cultoEndDate)
        : new Date(startDate.getTime() + 2 * 3600000)

      const created = await cultosService.create({
        name: cultoName,
        event_type: (cultoEventType as any) || 'outro',
        date_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        tolerance_minutes_before: Number(cultoTolBefore),
        tolerance_minutes_after: Number(cultoTolAfter),
        is_regular: cultoIsRegular,
        status: 'aberto',
        anonymous_count: 0,
        is_recurrent: cultoIsRecurrent,
        recurrence_days: cultoIsRecurrent ? cultoRecurrenceDays : undefined,
        recurrence_start_time: cultoIsRecurrent ? cultoRecurrenceStartTime : undefined,
        recurrence_end_time: cultoIsRecurrent ? cultoRecurrenceEndTime : undefined,
      })
      setCultos([created, ...cultos])
      setSelectedCulto(created)
      setCreateCultoOpen(false)
      toast.success('Evento da agenda aberto com sucesso! Pronto para receber visitantes.')
    } catch {
      toast.error('Erro ao criar evento na agenda.')
    }
  }

  // Archive culto (Secretaria)
  const handleArchiveCulto = async () => {
    if (!selectedCulto) return
    if (!confirm(`Deseja arquivar a lista do "${selectedCulto.name}"?`)) return
    try {
      const updated = await cultosService.archive(selectedCulto.id)
      setSelectedCulto(updated)
      setCultos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success('Culto arquivado no histórico da igreja.')
    } catch {
      toast.error('Erro ao arquivar culto.')
    }
  }

  // Statistics for J2 (Secretaria / Pastor)
  const firstVisits = presences.filter((p) => p.presence_type === 'primeira_visita')
  const returns = presences.filter((p) => p.presence_type === 'retorno')
  const regularMembers = presences.filter((p) => p.presence_type === 'membro_regular')
  const totalPresences = presences.length + anonymousCount

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3A31CE] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#3A31CE]" />
            <span>Jornadas J1 & J2</span>
            <span className="text-gray-300">/</span>
            <span>Registro & Lista de Culto</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#14161D]">
            Recepção, Agenda & Presenças
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            A agenda da igreja recebe visitantes automaticamente em qualquer evento (cultos,
            conferências, vigílias e estudos), com busca rápida por telefone (R3), autoatendimento
            QR Code fixo e lista em tempo real para a Secretaria (J2).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {permissions.canManageAssignments && (
            <Button
              onClick={() => setCreateCultoOpen(true)}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-10 px-4 rounded-[14px] font-bold shadow-sm shadow-[#3A31CE]/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
              Novo Evento na Agenda
            </Button>
          )}
        </div>
      </div>

      {/* ALERTA DE PRESENÇAS ÓRFÃS / SEM EVENTO NA AGENDA (Secretaria) */}
      {orphanPresences.length > 0 && permissions.canManageAssignments && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-900">
                    {orphanPresences.length}{' '}
                    {orphanPresences.length === 1
                      ? 'Presença sem evento correspondente'
                      : 'Presenças sem evento correspondente'}
                  </h3>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                    Ação Necessária
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Pessoas registraram presença pelo QR Code quando não havia evento ativo na agenda.
                  Isso é um sinal de que a agenda pode estar desatualizada. Vincule manualmente a um
                  evento ou descarte.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white/70 rounded-2xl border border-amber-200/50 overflow-hidden text-xs">
            {orphanPresences.map((orphan) => {
              const person = orphan.expand?.person
              return (
                <div
                  key={orphan.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/90"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px]">
                      {person?.name ? person.name.slice(0, 2).toUpperCase() : 'PS'}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">
                        {person?.name || 'Pessoa Registrada'}
                      </span>
                      <span className="text-gray-500 text-[11px] ml-2">
                        WhatsApp: {person?.phone || person?.whatsapp || 'Sem número'} &bull;
                        Registrado às{' '}
                        {new Date(orphan.created).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({new Date(orphan.created).toLocaleDateString('pt-BR')})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      onClick={() => {
                        setOrphanToLink(orphan)
                        setLinkTargetCultoId(selectedCulto?.id || '')
                        setLinkOrphanModalOpen(true)
                      }}
                      className="h-8 text-xs bg-[#820AD1] hover:bg-[#7008B7] text-white rounded-full font-bold px-3 shadow-xs cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5 mr-1" />
                      Vincular a Evento
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteOrphan(orphan.id)}
                      className="h-8 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full px-2 cursor-pointer"
                      title="Descartar este registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Select Culto Bar */}
      <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-[#E8EAF0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Culto Selecionado
            </Label>
            <div className="flex items-center gap-2 mt-0.5">
              <Select
                value={selectedCulto?.id || ''}
                onValueChange={(id) => {
                  const c = cultos.find((item) => item.id === id)
                  if (c) setSelectedCulto(c)
                }}
              >
                <SelectTrigger className="h-9 font-bold text-xs rounded-xl bg-[#F8F9FB] border-gray-200">
                  <SelectValue placeholder="Selecione o culto" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  {cultos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.is_recurrent ? '🔁 ' : ''}
                      {c.name} — {new Date(c.date_time).toLocaleDateString('pt-BR')} (
                      {c.status === 'aberto' ? '● Aberto' : 'Arquivado'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedCulto && (
          <div className="flex items-center gap-3 self-end md:self-center">
            {selectedCulto.is_recurrent && (
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#F2F1FB] text-[#3A31CE] border border-[#DAD7F3] flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                Recorrente ({selectedCulto.recurrence_start_time || 'Horário fixo'})
              </span>
            )}
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold ${
                selectedCulto.status === 'aberto'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {selectedCulto.status === 'aberto' ? '● Culto em Andamento' : 'Arquivado'}
            </span>

            {permissions.canManageAssignments && selectedCulto.status === 'aberto' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveCulto}
                className="h-8 rounded-full text-xs font-bold text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Encerrar / Arquivar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* J1: BOAS-VINDAS FLOW (Search by Phone, 1-tap presence, or quick signup) */}
      {permissions.canRegisterPresence && selectedCulto?.status === 'aberto' && (
        <section className="bg-[#3A31CE] text-white rounded-[22px] p-6 sm:p-7 shadow-lg shadow-[#3A31CE]/20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/15 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">
                Jornada J1 &bull; Recepção de Boas-Vindas
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight">
                Identificar e Acolher na Chegada
              </h2>
            </div>
            <span className="text-xs bg-white/15 px-3 py-1 rounded-full border border-white/20 font-semibold self-start sm:self-auto">
              Regra R3: Identificação por Telefone
            </span>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-indigo-100 font-semibold">
              Digite o telefone/WhatsApp da pessoa que chegou:
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-200" />
                <Input
                  type="text"
                  placeholder="(11) 98765-4321..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="pl-10 h-11 rounded-[14px] bg-white/15 border-white/20 text-white placeholder:text-indigo-200 text-sm focus:bg-white focus:text-[#14161D]"
                />
              </div>

              <Button
                onClick={() => {
                  setNewPhone(searchPhone)
                  setSignupModalOpen(true)
                }}
                className="bg-white text-[#3A31CE] hover:bg-[#F2F1FB] h-11 px-5 rounded-[14px] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Primeira Visita (Novo Cadastro)</span>
              </Button>
            </div>
          </div>

          {/* Search Result Banner */}
          {isSearchingPhone ? (
            <p className="text-xs text-purple-200">Consultando telefone...</p>
          ) : matchedPerson ? (
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base">{matchedPerson.name}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20 text-purple-100">
                    {matchedPerson.stage || matchedPerson.status}
                  </span>
                </div>
                <p className="text-xs text-purple-200 mt-0.5">
                  Telefone: {matchedPerson.phone || matchedPerson.whatsapp || 'Cadastrado'} &bull;{' '}
                  {matchedPerson.how_found || 'Igreja Sede'}
                </p>
              </div>

              <Button
                onClick={() => handleRegisterPresence(matchedPerson)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-10 px-5 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Presença (1 Toque)</span>
              </Button>
            </div>
          ) : searchPhone.length >= 8 ? (
            <div className="bg-white/10 p-4 rounded-2xl border border-dashed border-white/20 flex items-center justify-between text-xs">
              <span className="text-purple-200">
                Nenhum cadastro encontrado para este número. Clique em &quot;Primeira Visita&quot;
                para registrar.
              </span>
              <Button
                size="sm"
                onClick={() => {
                  setNewPhone(searchPhone)
                  setSignupModalOpen(true)
                }}
                className="bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-xs"
              >
                Cadastrar agora &rarr;
              </Button>
            </div>
          ) : null}

          {/* Anonymous count counter */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-purple-200">
            <span>Pessoas que não querem cadastro (contagem anônima J1):</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateAnonymous(-1)}
                className="h-7 w-7 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
              >
                -
              </Button>
              <span className="font-bold text-white text-sm tabular-nums">{anonymousCount}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateAnonymous(1)}
                className="h-7 w-7 rounded-full p-0 border-white/20 text-white hover:bg-white/10"
              >
                +
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* J2: SECRETARIA / CULTO LIVE LIST */}
      <section className="bg-white rounded-[22px] p-6 sm:p-7 border border-[#E8EAF0] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EAF0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A31CE]">
                Jornada J2 &bull; Lista em Tempo Real
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="font-heading text-xl font-bold text-[#14161D]">
              Presenças {selectedCulto ? `— ${selectedCulto.name}` : 'do Evento'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Lista pronta para a Secretaria apresentar os visitantes no púlpito.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#F8F9FB] p-2 rounded-2xl border border-gray-100 text-xs">
            <div className="px-3 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Total</span>
              <span className="font-extrabold text-[#191919] text-base">{totalPresences}</span>
            </div>
            <div className="border-l border-gray-200 px-3 text-center">
              <span className="text-[10px] uppercase font-bold text-[#3A31CE] block">
                1ª Visita
              </span>
              <span className="font-extrabold text-[#3A31CE] text-base">{firstVisits.length}</span>
            </div>
            <div className="border-l border-gray-200 px-3 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Retornos</span>
              <span className="font-extrabold text-blue-600 text-base">{returns.length}</span>
            </div>
            <div className="border-l border-gray-200 px-3 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                Membros
              </span>
              <span className="font-extrabold text-emerald-600 text-base">
                {regularMembers.length}
              </span>
            </div>
            {anonymousCount > 0 && (
              <div className="border-l border-gray-200 px-3 text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Anônimos
                </span>
                <span className="font-extrabold text-zinc-600 text-base">{anonymousCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabular List of Presences */}
        <div className="divide-y divide-gray-100 text-xs">
          {presences.length === 0 ? (
            <p className="text-center py-12 text-gray-400">
              Nenhuma presença registrada ainda neste culto.
            </p>
          ) : (
            presences.map((pres) => {
              const person = pres.expand?.person
              const isFirst = pres.presence_type === 'primeira_visita'
              const isRet = pres.presence_type === 'retorno'

              return (
                <div
                  key={pres.id}
                  className="py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FB] rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isFirst
                          ? 'bg-[#F2F1FB] text-[#3A31CE]'
                          : isRet
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {person?.name ? person.name.slice(0, 2).toUpperCase() : 'PS'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#191919] text-sm">
                          {person?.name || 'Pessoa Registrada'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            isFirst
                              ? 'bg-[#F2F1FB] text-[#3A31CE] border border-[#DAD7F3]'
                              : isRet
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isFirst ? '1ª Visita' : isRet ? 'Retorno' : 'Membro'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {pres.origin === 'qr_code' ? '📱 QR Code Fixo' : '🤝 Boas-Vindas'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Contato: {person?.phone || person?.whatsapp || 'Sem telefone'} &bull; Canal:{' '}
                        {pres.origin === 'qr_code' ? 'Autoatendimento QR' : 'Balcão Recepção'}{' '}
                        &bull; Horário:{' '}
                        {new Date(pres.created).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Secretaria: Move to correct culto */}
                  {permissions.canManageAssignments && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPresenceToMove(pres)
                        setTargetCultoId(selectedCulto?.id || '')
                        setMoveModalOpen(true)
                      }}
                      className="text-xs text-[#6B7183] hover:text-[#3A31CE] hover:bg-[#F2F1FB] rounded-full self-end sm:self-auto"
                      title="Mover presença para outro culto (caso registrada por engano)"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                      Mover culto
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* QUICK SIGNUP MODAL (J1 Exceção / Novo visitante) */}
      <Dialog open={signupModalOpen} onOpenChange={setSignupModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-bold mb-1">
              L
            </div>
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Cadastro de Primeira Visita (J1)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickSignup} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Nome Completo *</Label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Carlos Santana"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Telefone / WhatsApp</Label>
              <Input
                disabled={newNoContact}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Como conheceu a igreja?</Label>
              <Select value={newHowFound} onValueChange={setNewHowFound}>
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  <SelectItem value="Culto presencial">Culto presencial</SelectItem>
                  <SelectItem value="Convite de membro">Convite de membro</SelectItem>
                  <SelectItem value="Instagram / Redes Sociais">
                    Instagram / Redes Sociais
                  </SelectItem>
                  <SelectItem value="Familiares">Familiares</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* LGPD & Contact Consent */}
            <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-gray-100 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newContactAuthorized}
                  onChange={(e) => setNewContactAuthorized(e.target.checked)}
                  className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                />
                <span className="font-semibold text-gray-800">
                  Autoriza contato da igreja (Boas-Vindas)?
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-gray-200">
                <input
                  type="checkbox"
                  checked={newNoContact}
                  onChange={(e) => {
                    setNewNoContact(e.target.checked)
                    if (e.target.checked) setNewContactAuthorized(false)
                  }}
                  className="rounded text-red-600 focus:ring-red-600"
                />
                <span className="text-gray-600">
                  Pessoa sem telefone / Marcar &quot;sem contato&quot;
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-[14px] font-bold shadow-sm shadow-[#3A31CE]/20 active:scale-95 transition-all"
            >
              {' '}
              {isSubmittingSignup ? 'Cadastrando...' : 'Confirmar Presença e Cadastrar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MOVE PRESENCE MODAL (J2 Exceção) */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Mover Presença para Outro Culto (J2)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <p className="text-gray-500">
              Se a presença foi lançada por engano no culto incorreto, selecione o culto de destino:
            </p>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Culto de Destino</Label>
              <Select value={targetCultoId} onValueChange={setTargetCultoId}>
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent">
                  <SelectValue placeholder="Selecione o culto correto" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  {cultos
                    .filter((c) => c.id !== selectedCulto?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({new Date(c.date_time).toLocaleDateString('pt-BR')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleMovePresence}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20"
            >
              Transferir Presença
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VINCULAR PRESENÇA ÓRFÃ A EVENTO (Secretaria) */}
      <Dialog open={linkOrphanModalOpen} onOpenChange={setLinkOrphanModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Vincular Presença a um Evento da Agenda
            </DialogTitle>
            <p className="text-xs text-gray-500">
              Corrija o registro atribuindo-o ao culto ou evento correspondente (inclusive passado).
            </p>
          </DialogHeader>

          {orphanToLink && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <span className="font-bold text-purple-900 block">
                  {orphanToLink.expand?.person?.name || 'Pessoa'}
                </span>
                <span className="text-[11px] text-purple-700">
                  Data/Hora do escaneamento:{' '}
                  {new Date(orphanToLink.created).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-gray-700">Evento de Destino</Label>
                <Select value={linkTargetCultoId} onValueChange={setLinkTargetCultoId}>
                  <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent">
                    <SelectValue placeholder="Selecione o evento para vincular" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl">
                    {cultos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({new Date(c.date_time).toLocaleDateString('pt-BR')} - {c.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreateTotemPresence}
                disabled={submitting}
                className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-10 rounded-[14px] font-bold shadow-sm shadow-[#3A31CE]/20"
              >
                {' '}
                Confirmar Vinculação
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE CULTO MODAL */}
      <Dialog open={createCultoOpen} onOpenChange={setCreateCultoOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Abrir Novo Evento na Agenda
            </DialogTitle>
            <p className="text-xs text-gray-500">
              Qualquer evento da agenda recebe visitantes automaticamente via QR Code fixo ou
              recepção.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateCulto} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Tipo de Evento</Label>
              <Select
                value={cultoEventType}
                onValueChange={(val) => {
                  setCultoEventType(val)
                  // Aplicar tolerância e duração padrão de acordo com o tipo
                  const def = DEFAULT_TOLERANCES_BY_TYPE[val] || DEFAULT_TOLERANCES_BY_TYPE.outro
                  setCultoTolBefore(def.before)
                  setCultoTolAfter(def.after)

                  if (val === 'culto_domingo') {
                    setCultoName('Culto da Palavra (Domingo)')
                    setCultoRecurrenceDays([0])
                    setCultoRecurrenceStartTime('18:00')
                    setCultoRecurrenceEndTime('20:00')
                  } else if (val === 'culto_quarta') {
                    setCultoName('Culto de Doutrina (Quarta)')
                    setCultoRecurrenceDays([3])
                    setCultoRecurrenceStartTime('19:30')
                    setCultoRecurrenceEndTime('21:00')
                  } else if (val === 'estudo_biblico') {
                    setCultoName('Estudo Bíblico')
                    setCultoRecurrenceDays([6])
                    setCultoRecurrenceStartTime('16:00')
                    setCultoRecurrenceEndTime('18:00')
                  } else if (val === 'conferencia') {
                    setCultoName('Conferência')
                    setCultoIsRecurrent(false)
                  } else if (val === 'vigilia') {
                    setCultoName('Vigília de Oração')
                    setCultoIsRecurrent(false)
                  } else if (val === 'congresso') {
                    setCultoName('Congresso')
                    setCultoIsRecurrent(false)
                  }
                }}
              >
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  <SelectItem value="culto_domingo">
                    Culto de Domingo (Padrão: 60min antes até o fim)
                  </SelectItem>
                  <SelectItem value="culto_quarta">
                    Culto de Quarta (Padrão: 60min antes até o fim)
                  </SelectItem>
                  <SelectItem value="estudo_biblico">
                    Estudo Bíblico (Padrão: 45min antes até o fim)
                  </SelectItem>
                  <SelectItem value="conferencia">
                    Conferência de Dia Inteiro (Padrão: 90min antes)
                  </SelectItem>
                  <SelectItem value="vigilia">Vigília (Padrão: 60min antes)</SelectItem>
                  <SelectItem value="congresso">Congresso (Padrão: 90min antes)</SelectItem>
                  <SelectItem value="outro">Outro Evento / Celebração Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Nome do Evento / Culto *</Label>
              <Input
                required
                value={cultoName}
                onChange={(e) => setCultoName(e.target.value)}
                placeholder="Ex: Conferência da Família, Estudo Bíblico..."
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            {/* Recorrência Semanal */}
            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cultoIsRecurrent}
                  onChange={(e) => setCultoIsRecurrent(e.target.checked)}
                  className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                />
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" />
                  Evento Recorrente Semanal (rotina automática)
                </span>
              </label>
              <p className="text-[11px] text-purple-700 leading-tight">
                Gera automaticamente a janela de aceite de presença toda semana, sem depender de
                cadastro manual antes de cada culto.
              </p>

              {cultoIsRecurrent && (
                <div className="space-y-2 pt-1 border-t border-purple-200/60">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700">
                      Dias da Semana
                    </Label>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { day: 0, label: 'Dom' },
                        { day: 1, label: 'Seg' },
                        { day: 2, label: 'Ter' },
                        { day: 3, label: 'Qua' },
                        { day: 4, label: 'Qui' },
                        { day: 5, label: 'Sex' },
                        { day: 6, label: 'Sáb' },
                      ].map((d) => {
                        const selected = cultoRecurrenceDays.includes(d.day)
                        return (
                          <button
                            type="button"
                            key={d.day}
                            onClick={() => {
                              if (selected) {
                                setCultoRecurrenceDays(
                                  cultoRecurrenceDays.filter((x) => x !== d.day),
                                )
                              } else {
                                setCultoRecurrenceDays([...cultoRecurrenceDays, d.day])
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              selected
                                ? 'bg-[#820AD1] text-white shadow-xs'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-700">
                        Horário Início
                      </Label>
                      <Input
                        type="time"
                        value={cultoRecurrenceStartTime}
                        onChange={(e) => setCultoRecurrenceStartTime(e.target.value)}
                        className="h-9 rounded-xl bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-700">
                        Horário Término
                      </Label>
                      <Input
                        type="time"
                        value={cultoRecurrenceEndTime}
                        onChange={(e) => setCultoRecurrenceEndTime(e.target.value)}
                        className="h-9 rounded-xl bg-white border-gray-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="font-semibold text-gray-700">
                  {cultoIsRecurrent ? 'Data de Início da Recorrência *' : 'Início Previsto *'}
                </Label>
                <Input
                  type="datetime-local"
                  required
                  value={cultoDate}
                  onChange={(e) => setCultoDate(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-gray-700">Término Previsto</Label>
                <Input
                  type="datetime-local"
                  value={cultoEndDate}
                  onChange={(e) => setCultoEndDate(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-gray-700">Tolerância Antes</Label>
                  <span className="text-[10px] text-[#820AD1] font-bold">padrão: 60 min</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={cultoTolBefore}
                  onChange={(e) => setCultoTolBefore(Number(e.target.value))}
                  placeholder="Minutos antes do início"
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-gray-700">Tolerância Após Término</Label>
                  <span className="text-[10px] text-gray-500">padrão: 0 min</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={cultoTolAfter}
                  onChange={(e) => setCultoTolAfter(Number(e.target.value))}
                  placeholder="Minutos após o fim"
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cultoIsRegular}
                  onChange={(e) => setCultoIsRegular(e.target.checked)}
                  className="rounded text-[#820AD1]"
                />
                <span className="font-semibold text-gray-800">
                  É um culto regular da igreja? (Conta para regra R4 de Frequentador)
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 mt-2"
            >
              Criar e Salvar Evento na Agenda
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
