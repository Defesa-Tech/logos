import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitFork,
  CheckCircle2,
  ArrowRight,
  Phone,
  Home as HomeIcon,
  Check,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
import type { PersonRecord, PersonStatus } from '@/types/church'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

export default function Journey() {
  const { canAccessAll } = useAuth()
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<PersonStatus | null>(null)

  // Mobile active tab view ('visitor' | 'attender' | 'member')
  const [activeMobileStage, setActiveMobileStage] = useState<PersonStatus>('visitor')

  // Realtime updates
  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await personsService.list()
      setPersons(data)
    } catch {
      toast.error('Erro ao carregar pessoas da jornada.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Drag and drop handlers (Desktop)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setActiveDragId(id)
  }

  const handleDragOver = (e: React.DragEvent, stageStatus: PersonStatus) => {
    e.preventDefault()
    if (dragOverStage !== stageStatus) {
      setDragOverStage(stageStatus)
    }
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: PersonStatus) => {
    e.preventDefault()
    setDragOverStage(null)
    const id = e.dataTransfer.getData('text/plain') || activeDragId
    setActiveDragId(null)
    if (!id) return

    const person = persons.find((p) => p.id === id)
    if (!person || person.status === targetStatus) return

    if (!canAccessAll) {
      toast.error('Apenas administradores/pastores podem mover etapas na Jornada.')
      return
    }

    try {
      const oldStatus = person.status
      const updated = await personsService.update(id, { status: targetStatus })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

      const stageNames: Record<PersonStatus, string> = {
        visitor: 'Visitante',
        attender: 'Frequentador',
        member: 'Membro',
        leader: 'Líder',
        pastor: 'Pastor',
      }

      await activitiesService.create({
        title: 'Avanço na Jornada Logos',
        description: `${person.name} avançou de ${stageNames[oldStatus]} para ${stageNames[targetStatus]}.`,
        type: 'journey_change',
        person: person.id,
      })

      toast.success(`${person.name} avançou para ${stageNames[targetStatus]}!`)
    } catch {
      toast.error('Erro ao atualizar estágio da pessoa.')
    }
  }

  // Toggle checklist requirement
  const handleToggleChecklist = async (
    personId: string,
    field:
      | 'checklist_welcome_class'
      | 'checklist_baptized'
      | 'checklist_small_group'
      | 'checklist_ministry',
    currentVal: boolean = false,
  ) => {
    if (!canAccessAll) {
      toast.error('Permissão restrita para alterar requisitos.')
      return
    }
    try {
      const newVal = !currentVal
      const updated = await personsService.update(personId, { [field]: newVal })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Requisito atualizado!')
    } catch {
      toast.error('Erro ao marcar requisito.')
    }
  }

  // Quick promote button (crucial for Mobile)
  const handlePromote = async (person: PersonRecord, targetStatus: PersonStatus) => {
    if (!canAccessAll) {
      toast.error('Acesso restrito.')
      return
    }
    try {
      const updated = await personsService.update(person.id, { status: targetStatus })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

      const stageLabels: Record<string, string> = {
        attender: 'Frequentador',
        member: 'Membro Efetivo',
      }

      await activitiesService.create({
        title: 'Avanço na Jornada Logos',
        description: `${person.name} avançou para ${stageLabels[targetStatus]}.`,
        type: 'journey_change',
        person: person.id,
      })

      toast.success(`${person.name} promovido(a) a ${stageLabels[targetStatus]}!`)
    } catch {
      toast.error('Erro ao avançar estágio.')
    }
  }

  // Columns definition
  const stages: {
    status: PersonStatus
    number: number
    title: string
    shortTitle: string
    subtitle: string
    headerBg: string
    color: string
    badgeColor: string
    activeBorder: string
    requirements: string[]
  }[] = [
    {
      status: 'visitor',
      number: 1,
      title: '1. Novos Visitantes',
      shortTitle: 'Visitantes',
      subtitle: 'Primeiro contato (QR Code / Culto)',
      headerBg: 'bg-amber-500/10 text-amber-900',
      color: 'bg-gradient-to-b from-amber-50/40 via-white to-slate-50/30 border-amber-200/80',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      activeBorder: 'ring-2 ring-amber-400 bg-amber-50/50',
      requirements: ['Cartão de Boas-Vindas preenchido', 'Primeiro contato pastoral'],
    },
    {
      status: 'attender',
      number: 2,
      title: '2. Frequentadores',
      shortTitle: 'Frequentadores',
      subtitle: 'Retorno assíduo & Pequenos Grupos',
      headerBg: 'bg-blue-500/10 text-blue-900',
      color: 'bg-gradient-to-b from-blue-50/40 via-white to-slate-50/30 border-blue-200/80',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      activeBorder: 'ring-2 ring-blue-400 bg-blue-50/50',
      requirements: ['Classe de Boas-Vindas concluída', 'Inserido em Pequeno Grupo'],
    },
    {
      status: 'member',
      number: 3,
      title: '3. Membros Efetivos',
      shortTitle: 'Membros',
      subtitle: 'Aliança, Batismo & Compromisso',
      headerBg: 'bg-emerald-500/10 text-emerald-900',
      color: 'bg-gradient-to-b from-emerald-50/40 via-white to-slate-50/30 border-emerald-200/80',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      activeBorder: 'ring-2 ring-emerald-400 bg-emerald-50/50',
      requirements: [
        'Batismo Bíblico confirmado',
        'Vínculo familiar cadastrado',
        'Ministério ativo',
      ],
    },
  ]

  // Render Person Card Helper
  const renderCard = (person: PersonRecord, stageStatus: PersonStatus) => {
    return (
      <motion.div
        key={person.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        whileTap={{ scale: 0.98 }}
        draggable={canAccessAll}
        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, person.id)}
        className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-elevated transition-all space-y-3 cursor-grab active:cursor-grabbing group select-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-[#1F2D3A]">
              {person.name}
            </h4>
            {person.whatsapp && (
              <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{person.whatsapp}</span>
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#1F2D3A] text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-slate-200/70 shadow-sm">
            {person.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Family tag */}
        {person.expand?.family && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <HomeIcon className="w-3 h-3 text-[#D4AF37]" />
            <span className="truncate">{person.expand.family.name}</span>
          </div>
        )}

        {/* Interactive Checklist */}
        <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none group/chk">
            <Checkbox
              checked={!!person.checklist_welcome_class}
              onCheckedChange={() =>
                handleToggleChecklist(
                  person.id,
                  'checklist_welcome_class',
                  person.checklist_welcome_class,
                )
              }
              disabled={!canAccessAll}
              className="w-3.5 h-3.5 rounded"
            />
            <span
              className={
                person.checklist_welcome_class
                  ? 'line-through text-slate-400 font-normal'
                  : 'font-medium group-hover/chk:text-slate-900'
              }
            >
              Classe Boas-Vindas
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none group/chk">
            <Checkbox
              checked={!!person.checklist_small_group}
              onCheckedChange={() =>
                handleToggleChecklist(
                  person.id,
                  'checklist_small_group',
                  person.checklist_small_group,
                )
              }
              disabled={!canAccessAll}
              className="w-3.5 h-3.5 rounded"
            />
            <span
              className={
                person.checklist_small_group
                  ? 'line-through text-slate-400 font-normal'
                  : 'font-medium group-hover/chk:text-slate-900'
              }
            >
              Pequeno Grupo
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none group/chk">
            <Checkbox
              checked={!!person.checklist_baptized}
              onCheckedChange={() =>
                handleToggleChecklist(person.id, 'checklist_baptized', person.checklist_baptized)
              }
              disabled={!canAccessAll}
              className="w-3.5 h-3.5 rounded"
            />
            <span
              className={
                person.checklist_baptized
                  ? 'line-through text-slate-400 font-normal'
                  : 'font-medium group-hover/chk:text-slate-900'
              }
            >
              Batismo Bíblico
            </span>
          </label>
        </div>

        {/* Mobile / Fast Promotion Action */}
        {canAccessAll && (
          <div className="pt-2 flex justify-end border-t border-slate-100">
            {stageStatus === 'visitor' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePromote(person, 'attender')}
                className="text-[10px] h-7 px-3 bg-blue-50/70 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-lg font-semibold"
              >
                Promover a Frequentador &rarr;
              </Button>
            )}
            {stageStatus === 'attender' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePromote(person, 'member')}
                className="text-[10px] h-7 px-3 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border-emerald-200 rounded-lg font-semibold"
              >
                Promover a Membro &rarr;
              </Button>
            )}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#1F2D3A] flex items-center gap-2">
            <GitFork className="w-6 h-6 text-[#D4AF37]" />
            Jornada Logos (Pipeline de Integração)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe o caminho de cada pessoa: desde o cartão de visitante até o discipulado e
            membro pleno.
          </p>
        </div>

        <Badge
          variant="outline"
          className="text-xs bg-white text-slate-700 rounded-full px-3 py-1 self-start sm:self-auto shadow-soft border-slate-200"
        >
          {persons.length} Pessoas na Comunidade
        </Badge>
      </div>

      {/* Progress Path Steps Banner */}
      <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-soft text-xs">
        <div className="flex items-center gap-2 text-amber-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-amber-100 text-[#D4AF37] flex items-center justify-center text-xs flex-shrink-0 font-bold">
            1
          </div>
          <span className="truncate">Visitante</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto hidden sm:block" />
        </div>
        <div className="flex items-center gap-2 text-blue-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs flex-shrink-0 font-bold">
            2
          </div>
          <span className="truncate">Frequentador</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto hidden sm:block" />
        </div>
        <div className="flex items-center gap-2 text-emerald-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs flex-shrink-0 font-bold">
            3
          </div>
          <span className="truncate">Membro Efetivo</span>
        </div>
      </div>

      {/* =========================================================================
          MOBILE VIEW: TABS SWITCHER WITH SPRING INDICATOR
          ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Mobile Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-200/60 rounded-2xl relative">
          {stages.map((st) => {
            const count = persons.filter((p) => p.status === st.status).length
            const active = activeMobileStage === st.status
            return (
              <button
                key={st.status}
                onClick={() => setActiveMobileStage(st.status)}
                className="relative py-2.5 px-1 text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center select-none cursor-pointer"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-journey-tab"
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <span
                  className={`relative z-10 ${active ? 'text-[#1F2D3A] font-bold' : 'text-slate-600'}`}
                >
                  {st.shortTitle}
                </span>
                <span
                  className={`relative z-10 text-[10px] font-normal ${
                    active ? 'text-amber-700 font-semibold' : 'text-slate-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile Active Column Content with AnimatePresence */}
        <AnimatePresence mode="wait">
          {(() => {
            const currentStage = stages.find((s) => s.status === activeMobileStage)!
            const currentPersons = persons.filter((p) => p.status === currentStage.status)

            return (
              <motion.div
                key={currentStage.status}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className={`rounded-3xl border ${currentStage.color} p-4 space-y-3 shadow-soft`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div>
                    <h3 className="font-serif-sacred font-bold text-slate-800 text-base">
                      {currentStage.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">{currentStage.subtitle}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold ${currentStage.badgeColor}`}
                  >
                    {currentPersons.length}
                  </Badge>
                </div>

                {/* Requirements hint */}
                <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60 text-[11px] space-y-1">
                  <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                    Requisitos desta etapa:
                  </p>
                  {currentStage.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-600">
                      <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>

                {/* Cards List Mobile */}
                <div className="space-y-3 pt-1">
                  {currentPersons.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-white/50">
                      Nenhuma pessoa nesta etapa da jornada.
                    </div>
                  ) : (
                    currentPersons.map((p) => renderCard(p, currentStage.status))
                  )}
                </div>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          DESKTOP VIEW: FULL 3-COLUMN KANBAN (Drag and Drop + Smooth Motion)
          ========================================================================= */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12">Carregando quadro da jornada...</p>
      ) : (
        <div className="hidden md:grid grid-cols-3 gap-6 items-start">
          {stages.map((stage) => {
            const stagePersons = persons.filter((p) => p.status === stage.status)
            const isTarget = dragOverStage === stage.status

            return (
              <div
                key={stage.status}
                onDragOver={(e) => handleDragOver(e, stage.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.status)}
                className={`rounded-3xl border ${stage.color} p-4 sm:p-5 min-h-[580px] flex flex-col justify-between transition-all duration-200 shadow-soft ${
                  isTarget ? stage.activeBorder : ''
                }`}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 mb-3">
                    <div>
                      <h3 className="font-serif-sacred font-bold text-slate-800 text-base">
                        {stage.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">{stage.subtitle}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs font-bold ${stage.badgeColor}`}>
                      {stagePersons.length}
                    </Badge>
                  </div>

                  {/* Requirements hint */}
                  <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60 mb-3 text-[11px] space-y-1">
                    <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                      Requisitos desta etapa:
                    </p>
                    {stage.requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-600">
                        <Check className="w-3 h-3 text-[#D4AF37] flex-shrink-0" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cards List */}
                  <div className="space-y-3">
                    {stagePersons.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-white/40">
                        Nenhuma pessoa nesta etapa.
                        {canAccessAll && <p className="text-[10px] mt-1">Arraste cards para cá.</p>}
                      </div>
                    ) : (
                      <AnimatePresence>
                        {stagePersons.map((person) => renderCard(person, stage.status))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-auto text-center">
                  <p className="text-[10px] text-slate-400">
                    Arraste para mover entre colunas ou use o botão de avanço rápido.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageTransition>
  )
}
