import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  Plus,
  LogOut,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Trash2,
  Shield,
  UserX,
  History,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  departmentsService,
  assignmentsService,
  stageHistoryService,
} from '@/services/church'
import type {
  PersonRecord,
  DepartmentRecord,
  DepartmentRoleRecord,
  AssignmentRecord,
  StageHistoryRecord,
} from '@/types/church'
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

export default function DepartamentosAtuacoes() {
  const { user, permissions } = useAuth()

  const [activeTab, setActiveTab] = useState<'assignments' | 'saida'>('assignments')

  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [roles, setRoles] = useState<DepartmentRoleRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [members, setMembers] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // New Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false)

  // End Assignment Modal
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [assignmentToEnd, setAssignmentToEnd] = useState<AssignmentRecord | null>(null)
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  // Saída de Membro Modal (J9 & R9)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [memberToExit, setMemberToExit] = useState<PersonRecord | null>(null)
  const [exitReason, setExitReason] = useState<
    'mudanca' | 'transferencia' | 'falecimento' | 'pedido_proprio' | 'outro'
  >('mudanca')
  const [exitNotes, setExitNotes] = useState('')
  const [isAnonymizing, setIsAnonymizing] = useState(false)

  const loadAll = async () => {
    try {
      setLoading(true)
      const [deptsList, rolesList, asgList, membersList] = await Promise.all([
        departmentsService.list(),
        departmentsService.listRoles(),
        assignmentsService.listActive(),
        personsService.list('stage = "membro" || status = "member"'),
      ])
      setDepartments(deptsList)
      setRoles(rolesList)
      setAssignments(asgList)
      setMembers(membersList)
    } catch {
      toast.error('Erro ao carregar atuações e departamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Handle New Assignment with Rule R8
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId || !selectedRoleId) {
      toast.error('Selecione o membro e a função.')
      return
    }

    try {
      setIsSubmittingAssign(true)
      // Check R8 directly
      const target = members.find((m) => m.id === selectedMemberId)
      const stage = target?.stage || (target?.status === 'member' ? 'membro' : 'visitante')

      if (stage !== 'membro') {
        toast.error('Bloqueio Regra R8: Só membros podem receber atuações em departamentos.')
        return
      }

      await assignmentsService.create({
        person: selectedMemberId,
        role: selectedRoleId,
        start_date: new Date(startDate).toISOString(),
        notes: notes.trim() || undefined,
      })

      toast.success('Atuação vinculada com sucesso!')
      setAssignModalOpen(false)
      setSelectedMemberId('')
      setSelectedRoleId('')
      setNotes('')
      loadAll()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar atuação.'
      toast.error(msg)
    } finally {
      setIsSubmittingAssign(false)
    }
  }

  // End individual assignment
  const handleEndAssignment = async () => {
    if (!assignmentToEnd) return
    try {
      await assignmentsService.endAssignment(assignmentToEnd.id, new Date(endDate).toISOString())
      toast.success('Atuação encerrada e arquivada no histórico.')
      setEndModalOpen(false)
      setAssignmentToEnd(null)
      loadAll()
    } catch {
      toast.error('Erro ao encerrar atuação.')
    }
  }

  // Handle Saída de Membro (J9 & R9: Auto-encerramento de atuações e perda de acessos)
  const handleExitMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberToExit) return

    try {
      const reasonLabel = {
        mudanca: 'Mudança de cidade/endereço',
        transferencia: 'Transferência para outra igreja',
        falecimento: 'Falecimento',
        pedido_proprio: 'A pedido do próprio membro',
        outro: 'Outro motivo administrativo',
      }[exitReason]

      // 1. End ALL active assignments for this person (Regra R9)
      await assignmentsService.endAllForPerson(memberToExit.id, reasonLabel)

      // 2. Change stage to 'desligado'
      await personsService.update(memberToExit.id, {
        stage: 'desligado',
        status: 'visitor',
        exit_reason: exitReason,
        notes: exitNotes ? `${memberToExit.notes || ''} [Saída: ${exitNotes}]` : memberToExit.notes,
      })

      // 3. Record stage history
      await stageHistoryService.recordChange({
        person: memberToExit.id,
        from_stage: 'membro',
        to_stage: 'desligado',
        author_name: user?.name || 'Secretaria',
        reason: `Saída da membresia: ${reasonLabel}. Regra R9 aplicada: atuações encerradas e acessos revogados.`,
      })

      // 4. LGPD Anonymization if requested
      if (isAnonymizing) {
        await personsService.anonymize(memberToExit.id)
        toast.success(
          `${memberToExit.name} foi desligado(a) e os dados foram anonimizados conforme LGPD.`,
        )
      } else {
        toast.success(
          `${memberToExit.name} foi desligado(a). Todas as atuações foram encerradas e a carteirinha foi invalidada (R9).`,
        )
      }

      setExitModalOpen(false)
      setMemberToExit(null)
      setExitNotes('')
      setIsAnonymizing(false)
      loadAll()
    } catch {
      toast.error('Erro ao processar saída da membresia.')
    }
  }

  // Group active assignments by person
  const groupedByPerson = assignments.reduce(
    (acc, asg) => {
      const pId = asg.person
      if (!acc[pId]) {
        acc[pId] = {
          person: asg.expand?.person,
          items: [],
        }
      }
      acc[pId].items.push(asg)
      return acc
    },
    {} as Record<string, { person?: PersonRecord; items: AssignmentRecord[] }>,
  )

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J9</span>
            <span className="text-gray-300">/</span>
            <span>Atuações Acumuláveis & Saída (R8 & R9)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Departamentos & Atuações
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Um membro pode acumular múltiplas atuações (ex: Música, Mídia e Coral).{' '}
            <strong>Regra R8:</strong> apenas membros servem. <strong>Regra R9:</strong> na saída da
            igreja, todas as atuações são encerradas e acessos removidos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {permissions.canManageAssignments && (
            <Button
              onClick={() => setAssignModalOpen(true)}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
              Vincular Nova Atuação
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setActiveTab('assignments')}
          className={`h-9 rounded-full text-xs font-bold transition-all ${
            activeTab === 'assignments'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Atuações Ativas ({assignments.length})
        </Button>
        <Button
          size="sm"
          onClick={() => setActiveTab('saida')}
          className={`h-9 rounded-full text-xs font-bold transition-all ${
            activeTab === 'saida'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Processo de Saída (Regra R9)
        </Button>
      </div>

      {/* TAB 1: ATUAÇÕES ATIVAS */}
      {activeTab === 'assignments' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#191919]">Membros e Funções Acumuladas</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Funções ativas que concedem permissões ministeriais no sistema
              </p>
            </div>
            <span className="text-xs font-bold text-[#820AD1] bg-[#F7EEFD] px-3 py-1 rounded-full">
              {Object.keys(groupedByPerson).length} voluntários / líderes
            </span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {loading ? (
              <p className="text-center py-10 text-gray-400">Carregando atuações...</p>
            ) : Object.keys(groupedByPerson).length === 0 ? (
              <p className="text-center py-10 text-gray-400">Nenhuma atuação ativa no momento.</p>
            ) : (
              Object.values(groupedByPerson).map(({ person, items }) => (
                <div
                  key={person?.id || Math.random()}
                  className="py-4 px-2 space-y-3 hover:bg-[#F8F9FB] rounded-2xl transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#820AD1] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {person?.name ? person.name.slice(0, 2).toUpperCase() : 'MB'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#191919] text-sm">
                            {person?.name || 'Membro'}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-[#820AD1]">
                            {items.length} atuação(ões) acumulada(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Matrícula: {person?.provisional_number || 'Provisória'} &bull; Contato:{' '}
                          {person?.phone || person?.whatsapp || 'Sem telefone'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* List of active roles for this person */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 pl-12">
                    {items.map((asg) => {
                      const role = asg.expand?.role
                      const dept = role?.expand?.department

                      return (
                        <div
                          key={asg.id}
                          className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#191919] text-xs">
                                {role?.name || 'Função'}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                  role?.level === 'lider'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {role?.level || 'voluntário'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              Dept: <strong>{dept?.name || 'Geral'}</strong> &bull; Desde:{' '}
                              {new Date(asg.start_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>

                          {permissions.canManageAssignments && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAssignmentToEnd(asg)
                                setEndModalOpen(true)
                              }}
                              className="text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 px-2"
                              title="Encerrar esta atuação"
                            >
                              Encerrar
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 2: SAÍDA DE MEMBRO (J9 & R9) */}
      {activeTab === 'saida' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#191919]">
                Processo de Desligamento de Membro (R9)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ao registrar a saída, todas as atuações são encerradas automaticamente e a
                carteirinha torna-se inválida.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {members.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhum membro ativo.</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FB] rounded-2xl"
                >
                  <div>
                    <span className="font-bold text-[#191919] text-sm">{m.name}</span>
                    <p className="text-[11px] text-gray-500">
                      Matrícula: {m.provisional_number || 'Sem número'} &bull; Ingresso:{' '}
                      {m.ingress_date
                        ? new Date(m.ingress_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!permissions.canManageAssignments}
                    onClick={() => {
                      setMemberToExit(m)
                      setExitModalOpen(true)
                    }}
                    className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-full h-8 self-end sm:self-auto"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Registrar Saída (R9)
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* MODAL VINCULAR ATUAÇÃO (R8) */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Nova Atuação em Departamento
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-[#820AD1] font-semibold">
              Regra R8: Somente membros podem servir em departamentos da igreja.
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Membro *</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.provisional_number || 'Membro'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Função / Papel *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.expand?.department?.name || 'Dept'} ({r.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Data de Início *</Label>
              <Input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Observações / Detalhes</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Escala de domingos pela manhã..."
                className="rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmittingAssign}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
            >
              {isSubmittingAssign ? 'Vinculando...' : 'Ativar Atuação'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ENCERRAR ATUAÇÃO */}
      <Dialog open={endModalOpen} onOpenChange={setEndModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">Encerrar Atuação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <p className="text-gray-600">
              Deseja encerrar a atuação de <strong>{assignmentToEnd?.expand?.role?.name}</strong>? A
              função ficará registrada no histórico do membro.
            </p>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Data de Término</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            <Button
              onClick={handleEndAssignment}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-10 rounded-full font-bold shadow-md"
            >
              Confirmar Encerramento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL SAÍDA DE MEMBRO (J9 & R9) */}
      <Dialog open={exitModalOpen} onOpenChange={setExitModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Registrar Saída da Membresia (R9)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExitMember} className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-800">
              <strong>Regra R9:</strong> Ao sair do estágio de membro, todas as atuações ativas
              serão automaticamente encerradas, os acessos concedidos revogados e a carteirinha
              digital invalidada.
            </div>

            <p className="font-bold text-gray-800">Membro: {memberToExit?.name}</p>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Motivo da Saída *</Label>
              <Select
                value={exitReason}
                onValueChange={(val) =>
                  setExitReason(
                    val as 'mudanca' | 'transferencia' | 'falecimento' | 'pedido_proprio' | 'outro',
                  )
                }
              >
                <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl">
                  <SelectItem value="mudanca">Mudança de cidade / endereço</SelectItem>
                  <SelectItem value="transferencia">Carta de transferência</SelectItem>
                  <SelectItem value="falecimento">Falecimento</SelectItem>
                  <SelectItem value="pedido_proprio">A pedido da própria pessoa</SelectItem>
                  <SelectItem value="outro">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Detalhes / Justificativa</Label>
              <Textarea
                rows={2}
                value={exitNotes}
                onChange={(e) => setExitNotes(e.target.value)}
                placeholder="Ex: Solicitou carta para a Igreja de Curitiba..."
                className="rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            {/* LGPD ANONYMIZATION CHECKBOX */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymizing}
                  onChange={(e) => setIsAnonymizing(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-600"
                />
                <span className="font-semibold text-gray-900">
                  Pedido de exclusão total por LGPD (Anonimizar)
                </span>
              </label>
              <p className="text-[10px] text-gray-500 pl-6">
                Remove nome, telefone e endereço do banco, preservando contagens estatísticas da
                igreja.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-10 rounded-full font-bold shadow-md active:scale-95 transition-all"
            >
              Oficializar Saída e Aplicar Regra R9
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
