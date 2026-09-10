import React, { useState, useEffect } from 'react'
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  Clock,
  Phone,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
import type { PersonRecord, PersonStatus } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

type Stage = 'visitor' | 'attender' | 'member'

interface StageColumn {
  id: Stage
  title: string
  subtitle: string
  description: string
}

const STAGES: StageColumn[] = [
  {
    id: 'visitor',
    title: '1. Acolhimento Inicial',
    subtitle: 'Novos Visitantes',
    description: 'Primeiro contato dominical. Acolhimento e convite para a classe de integração.',
  },
  {
    id: 'attender',
    title: '2. Discipulado nos Lares',
    subtitle: 'Frequentadores Ativos',
    description: 'Participação em pequenos grupos, classe bíblica de membros e batismo.',
  },
  {
    id: 'member',
    title: '3. Comunhão Plena',
    subtitle: 'Membros em Ministério',
    description: 'Irmãos integrados ao corpo, com aliança bíblica e serviço ativo.',
  },
]

export default function Journey() {
  const { canAccessAll } = useAuth()
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Mobile selected stage tab
  const [selectedMobileStage, setSelectedMobileStage] = useState<Stage>('visitor')

  // Realtime hook
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
      const list = await personsService.list()
      setPersons(list)
    } catch {
      toast.error('Erro ao carregar pipeline da jornada.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Transition stage forward
  const handleAdvanceStage = async (person: PersonRecord, targetStage: Stage) => {
    try {
      const updated = await personsService.update(person.id, {
        status: targetStage,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

      await activitiesService.create({
        title: `Avanço na Jornada: ${person.name}`,
        description: `Promovido para o estágio de ${targetStage === 'attender' ? 'Frequentador' : 'Membro Pleno'}.`,
        type: 'journey_change',
        person: person.id,
      })

      toast.success(
        `${person.name} avançou para ${targetStage === 'attender' ? 'Frequentador' : 'Membro'}!`,
      )
    } catch {
      toast.error('Erro ao atualizar estágio do irmão.')
    }
  }

  // Toggle checklist item
  const handleToggleChecklist = async (
    person: PersonRecord,
    field:
      | 'checklist_welcome_class'
      | 'checklist_baptized'
      | 'checklist_small_group'
      | 'checklist_ministry',
    val: boolean,
  ) => {
    try {
      const updated = await personsService.update(person.id, {
        [field]: val,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Marcos da jornada atualizados.')
    } catch {
      toast.error('Erro ao salvar marco.')
    }
  }

  // Filter persons per stage
  const getPersonsInStage = (stage: Stage) => {
    return persons.filter((p) => {
      if (stage === 'visitor') return p.status === 'visitor'
      if (stage === 'attender') return p.status === 'attender'
      if (stage === 'member')
        return p.status === 'member' || p.status === 'leader' || p.status === 'pastor'
      return false
    })
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
            <span>Pipeline Pastoral</span>
            <span className="text-slate-300">/</span>
            <span>Fluxo de Discipulado</span>
          </div>
          <h1 className="font-serif-sacred text-3xl sm:text-4xl font-bold tracking-tight text-[#141B22]">
            Jornada Logos de Maturidade
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal">
            Acompanhe o caminho de cada pessoa desde o primeiro aperto de mão no domingo até a
            integração plena nos lares e no ministério eclesial.
          </p>
        </div>
      </div>

      {/* MOBILE STAGE TABS */}
      <div className="md:hidden flex border-b border-[#E6E2D8]">
        {STAGES.map((st) => {
          const count = getPersonsInStage(st.id).length
          const active = selectedMobileStage === st.id
          return (
            <button
              key={st.id}
              onClick={() => setSelectedMobileStage(st.id)}
              className={`flex-1 py-3 text-center text-xs font-mono transition-colors relative ${
                active ? 'text-[#141B22] font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{st.subtitle}</span>
              <span className="ml-1 text-[10px] text-slate-400">({count})</span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A046]" />}
            </button>
          )
        })}
      </div>

      {/* THREE-COLUMN EDITORIAL PIPELINE (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-6 items-start">
        {STAGES.map((col) => {
          const list = getPersonsInStage(col.id)
          return (
            <div
              key={col.id}
              className="bg-white border border-[#E6E2D8] rounded p-5 flex flex-col min-h-[550px]"
            >
              {/* Column Header */}
              <div className="pb-4 border-b border-[#E6E2D8] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A046]">
                    {col.title}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border border-[#E6E2D8] bg-[#FAF9F6] text-[#141B22]">
                    {list.length}
                  </span>
                </div>
                <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
                  {col.subtitle}
                </h3>
                <p className="text-[11px] text-slate-500 leading-snug">{col.description}</p>
              </div>

              {/* People Cards in this stage */}
              <div className="space-y-3 pt-4 flex-1">
                {loading ? (
                  <p className="text-center text-xs text-slate-400 font-mono py-8">Carregando...</p>
                ) : list.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 font-mono py-8 italic">
                    Nenhum irmão nesta etapa.
                  </p>
                ) : (
                  list.map((person) => (
                    <div
                      key={person.id}
                      className="p-3.5 bg-[#FAF9F6] border border-[#E6E2D8] rounded space-y-3 hover:border-slate-400 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold text-xs text-[#141B22] truncate">
                          {person.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                          {new Date(person.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      {/* Contact row */}
                      {person.whatsapp && (
                        <p className="text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#C5A046]" strokeWidth={1.75} />
                          <span>{person.whatsapp}</span>
                        </p>
                      )}

                      {/* Checklist for this stage */}
                      <div className="space-y-1.5 pt-1 border-t border-[#E6E2D8] text-[11px]">
                        {col.id === 'visitor' && (
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <Checkbox
                              checked={!!person.checklist_welcome_class}
                              disabled={!canAccessAll}
                              onCheckedChange={(checked) =>
                                handleToggleChecklist(
                                  person,
                                  'checklist_welcome_class',
                                  Boolean(checked),
                                )
                              }
                              className="rounded border-[#C5A046] data-[state=checked]:bg-[#141B22]"
                            />
                            <span>Classe de Boas-Vindas</span>
                          </label>
                        )}

                        {col.id === 'attender' && (
                          <>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                              <Checkbox
                                checked={!!person.checklist_small_group}
                                disabled={!canAccessAll}
                                onCheckedChange={(checked) =>
                                  handleToggleChecklist(
                                    person,
                                    'checklist_small_group',
                                    Boolean(checked),
                                  )
                                }
                                className="rounded border-[#C5A046] data-[state=checked]:bg-[#141B22]"
                              />
                              <span>Pequeno Grupo no Lar</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                              <Checkbox
                                checked={!!person.checklist_baptized}
                                disabled={!canAccessAll}
                                onCheckedChange={(checked) =>
                                  handleToggleChecklist(
                                    person,
                                    'checklist_baptized',
                                    Boolean(checked),
                                  )
                                }
                                className="rounded border-[#C5A046] data-[state=checked]:bg-[#141B22]"
                              />
                              <span>Batismo Bíblico</span>
                            </label>
                          </>
                        )}

                        {col.id === 'member' && (
                          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                            <Checkbox
                              checked={!!person.checklist_ministry}
                              disabled={!canAccessAll}
                              onCheckedChange={(checked) =>
                                handleToggleChecklist(
                                  person,
                                  'checklist_ministry',
                                  Boolean(checked),
                                )
                              }
                              className="rounded border-[#C5A046] data-[state=checked]:bg-[#141B22]"
                            />
                            <span>Ministério Ativo</span>
                          </label>
                        )}
                      </div>

                      {/* Action forward */}
                      {canAccessAll && col.id !== 'member' && (
                        <div className="pt-2 border-t border-[#E6E2D8] flex justify-end">
                          <button
                            onClick={() =>
                              handleAdvanceStage(
                                person,
                                col.id === 'visitor' ? 'attender' : 'member',
                              )
                            }
                            className="text-[11px] font-mono text-[#141B22] hover:text-[#C5A046] flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>
                              Promover a {col.id === 'visitor' ? 'Frequentador' : 'Membro'}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MOBILE SINGLE-COLUMN DISPLAY */}
      <div className="md:hidden bg-white border border-[#E6E2D8] rounded p-4 space-y-4">
        {(() => {
          const activeCol = STAGES.find((s) => s.id === selectedMobileStage)!
          const list = getPersonsInStage(selectedMobileStage)

          return (
            <>
              <div className="pb-3 border-b border-[#E6E2D8]">
                <h3 className="font-serif-sacred text-base font-bold text-[#141B22]">
                  {activeCol.title}
                </h3>
                <p className="text-[11px] text-slate-500">{activeCol.description}</p>
              </div>

              <div className="space-y-3">
                {list.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6 font-mono">
                    Nenhum irmão nesta etapa.
                  </p>
                ) : (
                  list.map((person) => (
                    <div
                      key={person.id}
                      className="p-3 bg-[#FAF9F6] border border-[#E6E2D8] rounded space-y-2 text-xs"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-bold text-[#141B22]">{person.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(person.created).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {person.whatsapp && (
                        <p className="text-[11px] font-mono text-slate-600">{person.whatsapp}</p>
                      )}
                      {canAccessAll && selectedMobileStage !== 'member' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAdvanceStage(
                              person,
                              selectedMobileStage === 'visitor' ? 'attender' : 'member',
                            )
                          }
                          className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-[11px] h-8 rounded font-mono"
                        >
                          Avançar para{' '}
                          {selectedMobileStage === 'visitor' ? 'Frequentador' : 'Membro'} &rarr;
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )
        })()}
      </div>
    </PageTransition>
  )
}
