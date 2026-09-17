import React, { useState, useEffect } from 'react'
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  UserX,
  Phone,
  RefreshCw,
  Search,
  Users,
  ChevronRight,
  Send,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { followUpService, personsService } from '@/services/church'
import type { FollowUpTaskRecord, PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export default function FollowUp() {
  const { user, permissions } = useAuth()

  const [tasks, setTasks] = useState<FollowUpTaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'aberta' | 'concluida'>('aberta')

  // Action Dialog (Register result)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<FollowUpTaskRecord | null>(null)
  const [taskResult, setTaskResult] = useState<
    'mensagem_enviada' | 'conversou' | 'sem_resposta' | 'nao_quer_contato'
  >('mensagem_enviada')
  const [taskNotes, setTaskNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redistribution Dialog (Líder Boas-Vindas)
  const [redistributeDialogOpen, setRedistributeDialogOpen] = useState(false)
  const [taskToReassign, setTaskToReassign] = useState<FollowUpTaskRecord | null>(null)
  const [newResponsibleName, setNewResponsibleName] = useState('')

  const loadTasks = async () => {
    try {
      setLoading(true)
      const list = await followUpService.list()
      setTasks(list)
    } catch {
      toast.error('Erro ao carregar tarefas de follow-up.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return

    try {
      setIsSubmitting(true)
      await followUpService.complete(selectedTask.id, taskResult, taskNotes)

      // If "nao_quer_contato", block future contacts per spec J3
      if (taskResult === 'nao_quer_contato') {
        const personId = selectedTask.person
        if (personId) {
          await personsService.update(personId, {
            refuses_contact: true,
            contact_authorized: false,
          })
          toast.info('Pessoa marcada como "Não quer contato". Novas tarefas foram bloqueadas.')
        }
      }

      toast.success('Resultado do follow-up registrado com sucesso!')
      setActionDialogOpen(false)
      setSelectedTask(null)
      setTaskNotes('')
      loadTasks()
    } catch {
      toast.error('Erro ao registrar resultado da tarefa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskToReassign || !newResponsibleName.trim()) return

    try {
      await followUpService.reassign(taskToReassign.id, newResponsibleName.trim())
      toast.success('Tarefa redistribuída com sucesso!')
      setRedistributeDialogOpen(false)
      setTaskToReassign(null)
      setNewResponsibleName('')
      loadTasks()
    } catch {
      toast.error('Erro ao redistribuir tarefa.')
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'aberta') return false
    return new Date(dueDate).getTime() < Date.now()
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true
    return t.status === statusFilter
  })

  const overdueCount = tasks.filter((t) => isOverdue(t.due_date, t.status)).length

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J3</span>
            <span className="text-gray-300">/</span>
            <span>Acompanhamento Pós-Culto</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Follow-up de Visitantes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Cada cadastro ou retorno gera tarefa com prazo de 48 horas. O voluntário registra o
            resultado e o Líder de Boas-Vindas redistribui tarefas pendentes.
          </p>
        </div>

        {/* Overdue alert indicator */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
            <span>{overdueCount} tarefa(s) vencida(s) no prazo de 48h!</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setStatusFilter('aberta')}
          className={`h-9 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'aberta'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Tarefas Pendentes ({tasks.filter((t) => t.status === 'aberta').length})
        </Button>
        <Button
          size="sm"
          onClick={() => setStatusFilter('concluida')}
          className={`h-9 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'concluida'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Concluídas ({tasks.filter((t) => t.status === 'concluida').length})
        </Button>
        <Button
          size="sm"
          onClick={() => setStatusFilter('all')}
          className={`h-9 rounded-full text-xs font-bold transition-all ${
            statusFilter === 'all'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Todas
        </Button>
      </div>

      {/* Task List (Nubank Extrato style) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-center py-12 text-xs text-gray-400">Carregando tarefas...</p>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            Nenhuma tarefa de follow-up encontrada neste filtro.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const person = task.expand?.person
            const overdue = isOverdue(task.due_date, task.status)

            return (
              <div
                key={task.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F9FB] transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      overdue
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : task.status === 'concluida'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-[#F7EEFD] text-[#820AD1]'
                    }`}
                  >
                    {person?.name ? person.name.slice(0, 2).toUpperCase() : 'FL'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#191919] text-sm">
                        {person?.name || 'Visitante'}
                      </span>
                      {overdue && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Vencida (48h)
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.status === 'concluida'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-purple-50 text-[#820AD1]'
                        }`}
                      >
                        {task.status === 'concluida' ? 'Concluída' : 'Aberta'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      Contato:{' '}
                      <strong className="text-[#191919]">
                        {person?.phone || person?.whatsapp || 'Sem telefone'}
                      </strong>{' '}
                      &bull; Responsável:{' '}
                      <strong className="text-[#820AD1]">
                        {task.responsible_name || 'Equipe Boas-Vindas'}
                      </strong>
                    </p>

                    <p className="text-[11px] text-gray-500 italic max-w-xl">
                      {task.notes || 'Sem anotações complementares.'}
                    </p>

                    {task.result && task.result !== 'pendente' && (
                      <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                        Resultado: {task.result.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  {task.status === 'aberta' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task)
                        setActionDialogOpen(true)
                      }}
                      className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Registrar Resultado
                    </Button>
                  )}

                  {/* Leader can redistribute overdue tasks */}
                  {(permissions.isBoasVindasLider || permissions.isSecretaria) &&
                    task.status === 'aberta' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTaskToReassign(task)
                          setRedistributeDialogOpen(true)
                        }}
                        className="text-xs h-9 rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
                      >
                        Redistribuir
                      </Button>
                    )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* REGISTER RESULT DIALOG */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Concluir Follow-up (J3)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCompleteTask} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Qual foi o desfecho do contato?</Label>
              <Select
                value={taskResult}
                onValueChange={(val) =>
                  setTaskResult(
                    val as 'mensagem_enviada' | 'conversou' | 'sem_resposta' | 'nao_quer_contato',
                  )
                }
              >
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  <SelectItem value="mensagem_enviada">Mensagem enviada (WhatsApp/SMS)</SelectItem>
                  <SelectItem value="conversou">
                    Conversou por telefone / ligação acolhedora
                  </SelectItem>
                  <SelectItem value="sem_resposta">Sem resposta / chamou e não atendeu</SelectItem>
                  <SelectItem value="nao_quer_contato">
                    Não quer contato (bloqueia futuras tarefas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Relato / Notas do Cuidado</Label>
              <Textarea
                rows={3}
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Ex: Visitante agradeceu o acolhimento e virá no próximo domingo com a família..."
                className="rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Salvando...' : 'Finalizar Tarefa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* REDISTRIBUTE TASK DIALOG */}
      <Dialog open={redistributeDialogOpen} onOpenChange={setRedistributeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Redistribuir Tarefa (Líder)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReassign} className="space-y-4 pt-2 text-xs">
            <p className="text-gray-500">
              Redirecione a tarefa vencida ou com voluntário ausente para outro integrante da
              equipe:
            </p>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Novo Responsável *</Label>
              <Input
                required
                value={newResponsibleName}
                onChange={(e) => setNewResponsibleName(e.target.value)}
                placeholder="Ex: Voluntário João Santos"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20"
            >
              Redistribuir Tarefa
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
