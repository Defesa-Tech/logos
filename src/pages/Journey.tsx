import React, { useState, useEffect } from 'react'
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Phone,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService } from '@/services/church'
import type { PersonRecord, PersonStatus } from '@/types/church'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

export default function Journey() {
  const { canAccessAll } = useAuth()
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  const loadPersons = async () => {
    try {
      setLoading(true)
      const data = await personsService.list()
      setPersons(data)
    } catch {
      toast.error('Erro ao listar pessoas no pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPersons()
  }, [])

  const handleAdvanceStatus = async (person: PersonRecord, nextStatus: PersonStatus) => {
    try {
      const updated = await personsService.update(person.id, {
        status: nextStatus,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success(`${person.name} avançou para ${nextStatus.toUpperCase()}`)
    } catch {
      toast.error('Erro ao atualizar estágio da pessoa.')
    }
  }

  const handleToggleChecklist = async (
    person: PersonRecord,
    field:
      | 'checklist_welcome_class'
      | 'checklist_baptized'
      | 'checklist_small_group'
      | 'checklist_ministry',
  ) => {
    try {
      const updated = await personsService.update(person.id, {
        [field]: !person[field],
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Marco bíblico atualizado!')
    } catch {
      toast.error('Erro ao atualizar marco.')
    }
  }

  // Pipeline stages
  const columns: { id: PersonStatus; label: string; desc: string; next?: PersonStatus }[] = [
    {
      id: 'visitor',
      label: '1. Visitantes',
      desc: 'Primeiro contato no culto',
      next: 'attender',
    },
    {
      id: 'attender',
      label: '2. Frequentadores',
      desc: 'Em processo de integração',
      next: 'member',
    },
    {
      id: 'member',
      label: '3. Membros Ativos',
      desc: 'Integrados e batizados',
      next: 'leader',
    },
    {
      id: 'leader',
      label: '4. Líderes & Pastores',
      desc: 'Discipulado e ministério',
    },
  ]

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>Fluxo Pastoral</span>
            <span className="text-zinc-300">/</span>
            <span>Pipeline Linear de Integração</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Jornada Logos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl font-normal">
            Acompanhamento do acolhimento: do primeiro contato como visitante à maturidade e
            liderança comunitária.
          </p>
        </div>
      </div>

      {/* PIPELINE KANBAN COLUMNS — Modern SaaS Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colPersons = persons.filter((p) =>
            col.id === 'leader'
              ? p.status === 'leader' || p.status === 'pastor'
              : p.status === col.id,
          )

          return (
            <div
              key={col.id}
              className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-3 sm:p-4 space-y-3 min-h-[500px] flex flex-col"
            >
              {/* Column Header */}
              <div className="pb-2 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-900">{col.label}</h2>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{col.desc}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700 tabular-nums shadow-xs">
                  {colPersons.length}
                </span>
              </div>

              {/* Cards in this column */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {loading ? (
                  <p className="text-xs text-zinc-400 text-center py-8">Carregando...</p>
                ) : colPersons.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                    Nenhum integrante
                  </div>
                ) : (
                  colPersons.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 hover:border-zinc-300 shadow-xs transition-all"
                    >
                      <div>
                        <p className="font-semibold text-xs text-zinc-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {p.whatsapp || p.email || 'Sem contato'}
                        </p>
                      </div>

                      {/* Checklist micro toggles */}
                      <div className="pt-2 border-t border-zinc-100 space-y-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_welcome_class')}
                          className="w-full flex items-center justify-between text-left hover:bg-zinc-50 p-1 rounded transition-colors cursor-pointer"
                        >
                          <span className="text-zinc-600">Classe Boas-Vindas</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.checklist_welcome_class ? 'bg-zinc-900' : 'bg-zinc-200'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_baptized')}
                          className="w-full flex items-center justify-between text-left hover:bg-zinc-50 p-1 rounded transition-colors cursor-pointer"
                        >
                          <span className="text-zinc-600">Batismo</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.checklist_baptized ? 'bg-zinc-900' : 'bg-zinc-200'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_small_group')}
                          className="w-full flex items-center justify-between text-left hover:bg-zinc-50 p-1 rounded transition-colors cursor-pointer"
                        >
                          <span className="text-zinc-600">Pequeno Grupo</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.checklist_small_group ? 'bg-zinc-900' : 'bg-zinc-200'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_ministry')}
                          className="w-full flex items-center justify-between text-left hover:bg-zinc-50 p-1 rounded transition-colors cursor-pointer"
                        >
                          <span className="text-zinc-600">Ministério</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.checklist_ministry ? 'bg-zinc-900' : 'bg-zinc-200'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Advance Stage button */}
                      {col.next && canAccessAll && (
                        <div className="pt-2 border-t border-zinc-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdvanceStatus(p, col.next!)}
                            className="w-full h-7 text-[11px] border-zinc-200 text-zinc-800 hover:bg-zinc-50 rounded-lg justify-between font-medium cursor-pointer"
                          >
                            <span>Avançar estágio</span>
                            <ArrowRight className="w-3 h-3 text-zinc-400" />
                          </Button>
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
    </PageTransition>
  )
}
