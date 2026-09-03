import React, { useState, useEffect } from 'react'
import {
  GitFork,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Users,
  Compass,
  Sparkles,
  Phone,
  Home as HomeIcon,
  Check,
  UserPlus,
  ArrowUpRight,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
import type { PersonRecord, PersonStatus } from '@/types/church'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

export default function Journey() {
  const { canAccessAll } = useAuth()
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: PersonStatus) => {
    e.preventDefault()
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
      color: 'bg-amber-50/50 border-amber-200/80',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      activeBorder: 'border-[#D4AF37]',
      requirements: ['Cartão de Boas-Vindas preenchido', 'Primeiro contato pastoral'],
    },
    {
      status: 'attender',
      number: 2,
      title: '2. Frequentadores',
      shortTitle: 'Frequentadores',
      subtitle: 'Retorno assíduo & Pequenos Grupos',
      color: 'bg-blue-50/50 border-blue-200/80',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      activeBorder: 'border-blue-500',
      requirements: ['Classe de Boas-Vindas concluída', 'Inserido em Pequeno Grupo'],
    },
    {
      status: 'member',
      number: 3,
      title: '3. Membros Efetivos',
      shortTitle: 'Membros',
      subtitle: 'Aliança, Batismo & Compromisso',
      color: 'bg-emerald-50/50 border-emerald-200/80',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      activeBorder: 'border-emerald-500',
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
      <div
        key={person.id}
        draggable={canAccessAll}
        onDragStart={(e) => handleDragStart(e, person.id)}
        className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-xs text-slate-800 truncate">{person.name}</h4>
            {person.whatsapp && (
              <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {person.whatsapp}
              </p>
            )}
          </div>
          <div className="w-7 h-7 rounded-xl bg-slate-100 text-[#2C3E50] text-[10px] font-bold flex items-center justify-center flex-shrink-0 border border-slate-200">
            {person.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Family tag */}
        {person.expand?.family && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg">
            <HomeIcon className="w-3 h-3 text-[#D4AF37]" />
            <span className="truncate">{person.expand.family.name}</span>
          </div>
        )}

        {/* Interactive Checklist */}
        <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
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
                  : 'font-medium'
              }
            >
              Classe Boas-Vindas
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
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
                  : 'font-medium'
              }
            >
              Pequeno Grupo
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
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
                  : 'font-medium'
              }
            >
              Batismo Bíblico
            </span>
          </label>
        </div>

        {/* Mobile / Fast Promotion Action */}
        {canAccessAll && (
          <div className="pt-2 flex justify-end border-t border-slate-50">
            {stageStatus === 'visitor' && (
              <Button
                size="sm"
                onClick={() => handlePromote(person, 'attender')}
                className="text-[10px] h-7 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold"
              >
                Promover a Frequentador &rarr;
              </Button>
            )}
            {stageStatus === 'attender' && (
              <Button
                size="sm"
                onClick={() => handlePromote(person, 'member')}
                className="text-[10px] h-7 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold"
              >
                Promover a Membro &rarr;
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
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
          className="text-xs bg-white text-slate-700 rounded-full px-3 py-1 self-start sm:self-auto shadow-sm"
        >
          {persons.length} Pessoas na Comunidade
        </Badge>
      </div>

      {/* Progress Path Steps Banner */}
      <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm text-xs">
        <div className="flex items-center gap-2 text-amber-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs flex-shrink-0">
            1
          </div>
          <span className="truncate">Visitante</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto hidden sm:block" />
        </div>
        <div className="flex items-center gap-2 text-blue-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs flex-shrink-0">
            2
          </div>
          <span className="truncate">Frequentador</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto hidden sm:block" />
        </div>
        <div className="flex items-center gap-2 text-emerald-900 font-bold p-1">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs flex-shrink-0">
            3
          </div>
          <span className="truncate">Membro Efetivo</span>
        </div>
      </div>

      {/* =========================================================================
          MOBILE VIEW: TABS SWITCHER (Responsive touch experience for small screens)
          ========================================================================= */}
      <div className="md:hidden space-y-4">
        {/* Mobile Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-2xl">
          {stages.map((st) => {
            const count = persons.filter((p) => p.status === st.status).length
            const active = activeMobileStage === st.status
            return (
              <button
                key={st.status}
                onClick={() => setActiveMobileStage(st.status)}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex flex-col items-center justify-center ${
                  active
                    ? 'bg-white text-[#2C3E50] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{st.shortTitle}</span>
                <span className="text-[10px] text-slate-400 font-normal">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Mobile Active Column Content */}
        {(() => {
          const currentStage = stages.find((s) => s.status === activeMobileStage)!
          const currentPersons = persons.filter((p) => p.status === currentStage.status)

          return (
            <div className={`rounded-2xl border ${currentStage.color} p-4 space-y-3`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div>
                  <h3 className="font-serif-sacred font-bold text-slate-800 text-base">
                    {currentStage.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">{currentStage.subtitle}</p>
                </div>
                <Badge variant="outline" className={`text-xs font-bold ${currentStage.badgeColor}`}>
                  {currentPersons.length}
                </Badge>
              </div>

              {/* Requirements hint */}
              <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 text-[11px] space-y-1">
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
            </div>
          )
        })()}
      </div>

      {/* =========================================================================
          DESKTOP VIEW: FULL 3-COLUMN KANBAN (Drag and Drop enabled)
          ========================================================================= */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12">Carregando quadro da jornada...</p>
      ) : (
        <div className="hidden md:grid grid-cols-3 gap-6 items-start">
          {stages.map((stage) => {
            const stagePersons = persons.filter((p) => p.status === stage.status)

            return (
              <div
                key={stage.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.status)}
                className={`rounded-3xl border ${stage.color} p-4 sm:p-5 min-h-[580px] flex flex-col justify-between transition-all`}
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
                      stagePersons.map((person) => renderCard(person, stage.status))
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
    </div>
  )
}
