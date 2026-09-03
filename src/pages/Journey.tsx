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

  // Drag and drop handlers
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

      // Log activity
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

      toast.success(`${person.name} promovido(a) a ${stageNames[targetStatus]}!`)
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

  // Quick promote button
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
        member: 'Membro',
      }

      await activitiesService.create({
        title: 'Avanço na Jornada Logos',
        description: `${person.name} avançou na jornada para ${stageLabels[targetStatus]}.`,
        type: 'journey_change',
        person: person.id,
      })

      toast.success(`${person.name} avançou para ${stageLabels[targetStatus]}!`)
    } catch {
      toast.error('Erro ao avançar estágio.')
    }
  }

  // Columns for the Kanban
  const stages: {
    status: PersonStatus
    title: string
    subtitle: string
    color: string
    badgeColor: string
    requirements: string[]
  }[] = [
    {
      status: 'visitor',
      title: '1. Visitantes',
      subtitle: 'Primeiro contato (QR Code / WhatsApp)',
      color: 'border-amber-300 bg-amber-50/40',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      requirements: ['Preencheu Cartão de Boas-Vindas', 'Contato pastoral inicial via WhatsApp'],
    },
    {
      status: 'attender',
      title: '2. Frequentadores',
      subtitle: 'Retorno frequente & Integração',
      color: 'border-blue-300 bg-blue-50/40',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
      requirements: ['Participou da Classe de Boas-Vindas', 'Inserido em um Pequeno Grupo'],
    },
    {
      status: 'member',
      title: '3. Membros Efetivos',
      subtitle: 'Aliança & Compromisso com o Corpo',
      color: 'border-emerald-300 bg-emerald-50/40',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      requirements: [
        'Batismo Bíblico confirmado',
        'Vínculo familiar registrado',
        'Envolvimento em ministério',
      ],
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
            <GitFork className="w-6 h-6 text-[#D4AF37]" />
            Jornada Logos (Pipeline de Integração)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe o caminho de cada pessoa: de novo visitante a membro discipulador.
            {canAccessAll ? ' Arraste os cards entre as colunas para atualizar.' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white text-slate-700">
            {persons.length} Pessoas na Comunidade
          </Badge>
        </div>
      </div>

      {/* Progress Path Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm text-xs">
        <div className="flex items-center gap-2 text-amber-800 font-semibold">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-xs">
            1
          </div>
          <span>Chegada: Visitante</span>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto hidden md:block" />
        </div>
        <div className="flex items-center gap-2 text-blue-800 font-semibold">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
            2
          </div>
          <span>Retorno Frequente: Frequentador</span>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto hidden md:block" />
        </div>
        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">
            3
          </div>
          <span>Decisão & Batismo: Membro</span>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12">Carregando quadro da jornada...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {stages.map((stage) => {
            const stagePersons = persons.filter((p) => p.status === stage.status)

            return (
              <div
                key={stage.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.status)}
                className={`rounded-2xl border ${stage.color} p-4 min-h-[550px] flex flex-col justify-between transition-colors`}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
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
                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60 mb-3 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-700 text-[10px] uppercase tracking-wider">
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
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white/40">
                        Nenhuma pessoa nesta etapa.
                        {canAccessAll && (
                          <p className="text-[10px] mt-1">Arraste alguém para cá.</p>
                        )}
                      </div>
                    ) : (
                      stagePersons.map((person) => {
                        return (
                          <div
                            key={person.id}
                            draggable={canAccessAll}
                            onDragStart={(e) => handleDragStart(e, person.id)}
                            className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-xs text-slate-800">
                                  {person.name}
                                </h4>
                                {person.whatsapp && (
                                  <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    {person.whatsapp}
                                  </p>
                                )}
                              </div>
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                {person.name.slice(0, 2).toUpperCase()}
                              </div>
                            </div>

                            {/* Family tag if linked */}
                            {person.expand?.family && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                                <HomeIcon className="w-3 h-3 text-[#D4AF37]" />
                                <span className="truncate">{person.expand.family.name}</span>
                              </div>
                            )}

                            {/* Requirements Checklist */}
                            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
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
                                  className="w-3.5 h-3.5"
                                />
                                <span
                                  className={
                                    person.checklist_welcome_class
                                      ? 'line-through text-slate-400'
                                      : ''
                                  }
                                >
                                  Classe de Boas-Vindas
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
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
                                  className="w-3.5 h-3.5"
                                />
                                <span
                                  className={
                                    person.checklist_small_group
                                      ? 'line-through text-slate-400'
                                      : ''
                                  }
                                >
                                  Pequeno Grupo
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                                <Checkbox
                                  checked={!!person.checklist_baptized}
                                  onCheckedChange={() =>
                                    handleToggleChecklist(
                                      person.id,
                                      'checklist_baptized',
                                      person.checklist_baptized,
                                    )
                                  }
                                  disabled={!canAccessAll}
                                  className="w-3.5 h-3.5"
                                />
                                <span
                                  className={
                                    person.checklist_baptized ? 'line-through text-slate-400' : ''
                                  }
                                >
                                  Batizado
                                </span>
                              </label>
                            </div>

                            {/* Quick Action Button to Advance */}
                            {canAccessAll && (
                              <div className="pt-2 flex justify-end">
                                {stage.status === 'visitor' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePromote(person, 'attender')}
                                    className="text-[10px] h-6 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                                  >
                                    Promover a Frequentador &rarr;
                                  </Button>
                                )}
                                {stage.status === 'attender' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePromote(person, 'member')}
                                    className="text-[10px] h-6 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  >
                                    Promover a Membro &rarr;
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-auto text-center">
                  <p className="text-[10px] text-slate-400">
                    Arraste para mover ou use os botões rápidos.
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
