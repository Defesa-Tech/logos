import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  Users,
  Search,
  Calendar,
  ShieldCheck,
  Send,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  presencesService,
  cultosService,
  churchSettingsService,
  followUpService,
} from '@/services/church'
import type { PersonRecord, CultoRecord, PresenceRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

interface AbsentRecord {
  person: PersonRecord
  lastPresenceDate?: string
  weeksAbsent: number
}

export default function AtencaoAusencia() {
  const { user, permissions } = useAuth()

  const [absents, setAbsents] = useState<AbsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [absenceWeeksLimit, setAbsenceWeeksLimit] = useState(8)

  const loadData = async () => {
    try {
      setLoading(true)
      const settingsMap = await churchSettingsService.getMap()
      const limit = parseInt(settingsMap.r10_absence_attention_weeks || '8', 10)
      setAbsenceWeeksLimit(limit)

      // Get frequentadores and members (excluding desligados per R10)
      const people = await personsService.list(
        'stage = "frequentador" || stage = "membro" || status = "attender" || status = "member"',
      )

      const cutoffMs = limit * 7 * 24 * 60 * 60 * 1000
      const now = Date.now()

      const list: AbsentRecord[] = []

      for (const p of people) {
        const pres = await presencesService.listByPerson(p.id)
        if (pres.length === 0) {
          // Never attended or no presences recorded recently
          list.push({
            person: p,
            lastPresenceDate: undefined,
            weeksAbsent: limit + 1,
          })
        } else {
          // Latest presence
          const latest = pres[0]
          const lastDate = new Date(latest.created).getTime()
          const diffMs = now - lastDate
          if (diffMs > cutoffMs) {
            const weeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
            list.push({
              person: p,
              lastPresenceDate: latest.created,
              weeksAbsent: weeks,
            })
          }
        }
      }

      list.sort((a, b) => b.weeksAbsent - a.weeksAbsent)
      setAbsents(list)
    } catch {
      toast.error('Erro ao verificar lista de ausência.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Create pastoral care / follow-up task
  const handleCreatePastoralTask = async (item: AbsentRecord) => {
    try {
      const due = new Date()
      due.setHours(due.getHours() + 48)

      await followUpService.create({
        person: item.person.id,
        responsible_name: user?.name || 'Cuidado Pastoral',
        due_date: due.toISOString(),
        status: 'aberta',
        result: 'pendente',
        notes: `Contato de cuidado pastoral por ausência de ${item.weeksAbsent} semanas.`,
      })

      toast.success(`Tarefa de contato pastoral criada para ${item.person.name}!`)
    } catch {
      toast.error('Erro ao criar tarefa pastoral.')
    }
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Regra R10</span>
            <span className="text-gray-300">/</span>
            <span>Cuidado Pastoral & Retenção</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Lista de Atenção por Ausência
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Frequentadores ou membros sem presença registrada há mais de{' '}
            <strong>{absenceWeeksLimit} semanas</strong> aparecem nesta lista de alerta. O sistema{' '}
            <strong>não muda de estágio sozinho</strong>, servindo como suporte pastoral.
          </p>
        </div>

        <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-2xl text-xs font-bold self-start sm:self-auto flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>{absents.length} pessoa(s) em alerta</span>
        </div>
      </div>

      {/* List */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#191919]">
              Irmãos sem Presença Recente (&gt; {absenceWeeksLimit} semanas)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Acione uma visita, mensagem ou ligação pastoral de acolhimento
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {loading ? (
            <p className="text-center py-10 text-gray-400">Verificando histórico de presenças...</p>
          ) : absents.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Glória a Deus! Nenhum membro ou frequentador ausente há mais de {absenceWeeksLimit}{' '}
              semanas.
            </div>
          ) : (
            absents.map((item) => (
              <div
                key={item.person.id}
                className="py-4 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F9FB] rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {item.person.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191919] text-sm">{item.person.name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-[#820AD1]">
                        {item.person.stage || item.person.status}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        {item.weeksAbsent} semanas ausente
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Telefone: {item.person.phone || item.person.whatsapp || 'Sem telefone'} &bull;{' '}
                      Última presença:{' '}
                      {item.lastPresenceDate
                        ? new Date(item.lastPresenceDate).toLocaleDateString('pt-BR')
                        : 'Sem presenças registradas no app'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <Button
                    size="sm"
                    onClick={() => handleCreatePastoralTask(item)}
                    className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Gerar Cuidado Pastoral
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </PageTransition>
  )
}
