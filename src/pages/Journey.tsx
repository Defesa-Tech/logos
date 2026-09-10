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
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Fluxo Pastoral</span>
            <span className="text-gray-300">/</span>
            <span>Pipeline de Integração</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Jornada Logos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Acompanhamento do acolhimento: do primeiro contato como visitante à maturidade e
            liderança comunitária.
          </p>
        </div>
      </div>

      {/* PIPELINE KANBAN COLUMNS — Nubank Kanban Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((col) => {
          const colPersons = persons.filter((p) =>
            col.id === 'leader'
              ? p.status === 'leader' || p.status === 'pastor'
              : p.status === col.id,
          )

          return (
            <div
              key={col.id}
              className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 space-y-3.5 min-h-[500px] flex flex-col shadow-sm"
            >
              {/* Column Header */}
              <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-[#191919]">{col.label}</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">{col.desc}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#F7EEFD] text-[#820AD1] tabular-nums">
                  {colPersons.length}
                </span>
              </div>

              {/* Cards in this column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {loading ? (
                  <p className="text-xs text-gray-400 text-center py-8">Carregando...</p>
                ) : colPersons.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                    Nenhum integrante
                  </div>
                ) : (
                  colPersons.map((p) => (
                    <div
                      key={p.id}
                      className="bg-[#F8F9FB] hover:bg-[#F7EEFD] border border-gray-100 rounded-2xl p-4 space-y-3 transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white text-[#820AD1] font-bold text-xs flex items-center justify-center flex-shrink-0 border border-purple-100">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-[#191919] truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            {p.whatsapp || p.email || 'Sem contato'}
                          </p>
                        </div>
                      </div>

                      {/* Checklist micro toggles */}
                      <div className="pt-2 border-t border-gray-200/60 space-y-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_welcome_class')}
                          className="w-full flex items-center justify-between text-left hover:bg-white p-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <span className="text-gray-600 font-medium">Classe Boas-Vindas</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              p.checklist_welcome_class ? 'bg-[#820AD1]' : 'bg-gray-300'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_baptized')}
                          className="w-full flex items-center justify-between text-left hover:bg-white p-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <span className="text-gray-600 font-medium">Batismo</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              p.checklist_baptized ? 'bg-[#820AD1]' : 'bg-gray-300'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_small_group')}
                          className="w-full flex items-center justify-between text-left hover:bg-white p-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <span className="text-gray-600 font-medium">Pequeno Grupo</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              p.checklist_small_group ? 'bg-[#820AD1]' : 'bg-gray-300'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklist(p, 'checklist_ministry')}
                          className="w-full flex items-center justify-between text-left hover:bg-white p-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <span className="text-gray-600 font-medium">Ministério</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              p.checklist_ministry ? 'bg-[#820AD1]' : 'bg-gray-300'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Advance Stage button */}
                      {col.next && canAccessAll && (
                        <div className="pt-2 border-t border-gray-200/60">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdvanceStatus(p, col.next!)}
                            className="w-full h-8 text-[11px] border-gray-200 text-[#820AD1] hover:bg-white rounded-full justify-between font-bold cursor-pointer active:scale-95 transition-all"
                          >
                            <span>Avançar estágio</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#820AD1]" />
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
