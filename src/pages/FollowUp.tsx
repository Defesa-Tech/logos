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
  ExternalLink,
  Edit3,
  Copy,
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

  // WhatsApp Message Composer Modal (Modelo pronto e editável com link do app per D13)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false)
  const [taskForWhatsapp, setTaskForWhatsapp] = useState<FollowUpTaskRecord | null>(null)
  const [whatsappText, setWhatsappText] = useState('')

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

  // Gerar modelo de mensagem pré-configurado e caloroso (soando como convite, não marketing)
  const openWhatsappComposer = (task: FollowUpTaskRecord) => {
    setTaskForWhatsapp(task)
    const person = task.expand?.person
    const firstName = person?.name ? person.name.split(' ')[0] : 'amigo(a)'
    const volunteerName = user?.name ? user.name.split(' ')[0] : 'da equipe de Boas-Vindas'
    const appUrl = window.location.origin

    // Modelo acolhedor de acordo com a especificação do usuário
    const defaultTemplate = `Oi, ${firstName}! Aqui é o(a) ${volunteerName}, da Igreja Defesa da Fé. Foi muito bom ter você conosco no culto! Espero que tenha se sentido acolhido(a).

Se quiser acompanhar a programação da igreja e nossas atividades, nosso aplicativo web é este link:
${appUrl}

Qualquer dúvida ou se precisar de oração, estou por aqui!`

    setWhatsappText(defaultTemplate)
    setWhatsappDialogOpen(true)
  }

  // Enviar via link wa.me
  const handleSendViaWhatsApp = () => {
    if (!taskForWhatsapp) return
    const person = taskForWhatsapp.expand?.person
    const rawPhone = (person?.whatsapp || person?.phone || '').replace(/\D/g, '')

    if (!rawPhone) {
      toast.error('Pessoa sem telefone cadastrado.')
      return
    }

    // Prefixo Brasil 55 se não tiver
    const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone
    const encoded = encodeURIComponent(whatsappText)
    const waUrl = `https://wa.me/${fullPhone}?text=${encoded}`

    window.open(waUrl, '_blank')
    toast.success('Abrindo WhatsApp com a mensagem personalizada!')
    setWhatsappDialogOpen(false)

    // Abre modal para já registrar o resultado se desejar
    setSelectedTask(taskForWhatsapp)
    setTaskResult('mensagem_enviada')
    setActionDialogOpen(true)
  }

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
            No follow-up da 1ª visita, envie a mensagem pessoal acolhedora com o link do app da
            igreja (D13 revisada). Anote o que surgir espontaneamente na conversa, sem sensação de
            ficha.
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
            const hasPhone = !!(person?.whatsapp || person?.phone)

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
                      {person?.contact_preference && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Prefere: {person.contact_preference}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600">
                      Contato:{' '}
                      <strong className="text-[#191919]">
                        {person?.whatsapp || person?.phone || 'Sem telefone'}
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
                    <>
                      {/* WhatsApp Model Button (D13: Link do app enviado pelo Boas-Vindas via WhatsApp) */}
                      {hasPhone && (
                        <Button
                          size="sm"
                          onClick={() => openWhatsappComposer(task)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5 rounded-full font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp com Link do App</span>
                        </Button>
                      )}

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
                    </>
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

      {/* WHATSAPP MESSAGE COMPOSER MODAL (EDITÁVEL ANTES DE ENVIAR) */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Modelo Boas-Vindas &bull; WhatsApp
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Mensagem para {taskForWhatsapp?.expand?.person?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-[11px] text-[#820AD1]">
              <strong>Dica de Tom (CX Logos):</strong> Mensagem pessoal, calorosa e com tom de
              convite, nunca de marketing. O link do aplicativo da igreja é entregue de forma
              natural para quem deseja acompanhar a programação.
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-gray-700">
                  Texto da Mensagem (Você pode editar antes de enviar)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappText)
                    toast.success('Texto copiado para a área de transferência!')
                  }}
                  className="text-[11px] text-[#820AD1] font-bold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copiar
                </button>
              </div>

              <Textarea
                rows={8}
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                className="rounded-2xl bg-[#F0F1F5] border-transparent font-sans text-xs leading-relaxed focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={handleSendViaWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Abrir no WhatsApp Web/App (wa.me)</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWhatsappDialogOpen(false)}
                className="text-xs text-gray-500 rounded-full h-11 px-4 hover:bg-gray-100"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-gray-700">
                  Relato / Notas do Cuidado (Acolhimento)
                </Label>
                <span className="text-[10px] text-gray-400">Sem sensação de ficha</span>
              </div>
              <Textarea
                rows={4}
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Anote o que surgir espontaneamente na conversa (ex: quem convidou, se veio com família, pedidos de oração)..."
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
