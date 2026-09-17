import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  Users,
  Plus,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Archive,
  ChevronRight,
  Info,
  Sliders,
  Calendar,
  X,
  ListCheck,
  Check,
  Ban,
  ArrowRight,
  Search,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  departmentsService,
  assignmentsService,
  personsService,
  overlapRulesService,
  activitiesService,
} from '@/services/church'
import type {
  DepartmentRecord,
  DepartmentRoleRecord,
  AssignmentRecord,
  PersonRecord,
  OverlapRuleRecord,
  RoleRequirement,
  UnitType,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export function DepartamentosAtuacoes() {
  const { permissions, currentPerson } = useAuth()

  // Main collections state
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [roles, setRoles] = useState<DepartmentRoleRecord[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [members, setMembers] = useState<PersonRecord[]>([])
  const [overlapRules, setOverlapRules] = useState<OverlapRuleRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation tab: 'equipe' | 'unidades' | 'funcoes' | 'sobreposicoes'
  const [activeTab, setActiveTab] = useState<'equipe' | 'unidades' | 'funcoes' | 'sobreposicoes'>(
    'equipe',
  )
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all')

  // Modals state
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [unitForm, setUnitForm] = useState<{
    id?: string
    name: string
    code: string
    description: string
    unit_type: UnitType
    parent_unit?: string
  }>({
    name: '',
    code: '',
    description: '',
    unit_type: 'departamento',
    parent_unit: undefined,
  })

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [roleForm, setRoleForm] = useState<{
    id?: string
    name: string
    department: string
    level: 'voluntario' | 'lider'
    description: string
    requirements: RoleRequirement[]
  }>({
    name: '',
    department: '',
    level: 'voluntario',
    description: '',
    requirements: [],
  })
  const [newReqTitle, setNewReqTitle] = useState('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assignForm, setAssignForm] = useState<{
    person: string
    role: string
    start_date: string
    notes: string
    leadership_level: 'voluntario' | 'lider' | 'vice_lider' | 'lideranca_adicional'
    requirementsChecklist: Record<string, boolean>
  }>({
    person: '',
    role: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    leadership_level: 'voluntario',
    requirementsChecklist: {},
  })
  const [blockingOverlapError, setBlockingOverlapError] = useState<string | null>(null)

  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState(false)
  const [overlapForm, setOverlapForm] = useState<{
    name: string
    description: string
    department_a?: string
    role_a?: string
    department_b?: string
    role_b?: string
    rule_type: 'bloqueado' | 'permitido' | 'aviso'
    reason: string
  }>({
    name: '',
    description: '',
    rule_type: 'bloqueado',
    reason: '',
  })

  // Load everything
  const loadData = async () => {
    try {
      setLoading(true)
      const [allDepts, allRoles, allAssigns, allPersons, allOverlaps] = await Promise.all([
        departmentsService.list(),
        departmentsService.listRoles(),
        assignmentsService.listActive(),
        personsService.list('stage = "membro" || status = "member"'),
        overlapRulesService.list(),
      ])

      setDepartments(allDepts)
      setRoles(allRoles)
      setAssignments(allAssigns)
      setMembers(allPersons)
      setOverlapRules(allOverlaps)
    } catch {
      toast.error('Erro ao carregar dados da estrutura.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtered lists
  const rootDepartments = departments.filter(
    (d) => d.unit_type === 'departamento' || !d.unit_type || !d.parent_unit,
  )
  const subDepartments = departments.filter(
    (d) => d.unit_type === 'subdepartamento' && d.parent_unit,
  )

  const filteredRoles =
    selectedDeptId === 'all' ? roles : roles.filter((r) => r.department === selectedDeptId)

  const filteredAssignments =
    selectedDeptId === 'all'
      ? assignments
      : assignments.filter((a) => {
          const dId = a.department || a.expand?.role?.department
          return dId === selectedDeptId
        })

  // -------------------------------------------------------------
  // HANDLERS: UNIDADES (SECRETARIA)
  // -------------------------------------------------------------
  const handleSaveUnit = async () => {
    if (!permissions.canManageDepartments) {
      toast.error('Apenas a Secretaria pode criar ou alterar unidades e subdepartamentos (D3/D4).')
      return
    }
    if (!unitForm.name.trim()) {
      toast.error('Informe o nome da unidade.')
      return
    }
    try {
      const payload: Partial<DepartmentRecord> = {
        name: unitForm.name.trim(),
        code: unitForm.code.trim() || unitForm.name.toLowerCase().replace(/\s+/g, '_'),
        description: unitForm.description,
        unit_type: unitForm.unit_type,
        parent_unit: unitForm.unit_type === 'subdepartamento' ? unitForm.parent_unit : undefined,
        status: 'ativo',
      }
      if (unitForm.id) {
        await departmentsService.update(unitForm.id, payload)
        toast.success('Unidade atualizada com sucesso.')
      } else {
        await departmentsService.create(payload)
        toast.success(
          unitForm.unit_type === 'subdepartamento'
            ? 'Subdepartamento criado com sucesso.'
            : 'Departamento criado com sucesso.',
        )
      }
      setIsUnitModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar unidade.')
    }
  }

  const handleArchiveUnit = async (unit: DepartmentRecord) => {
    if (!permissions.canManageDepartments) {
      toast.error('Apenas a Secretaria pode arquivar unidades.')
      return
    }
    if (
      !confirm(
        `Deseja arquivar a unidade "${unit.name}"? Não poderá ser desarquivada se houver histórico pendente.`,
      )
    ) {
      return
    }
    try {
      await departmentsService.archive(unit.id)
      toast.success('Unidade arquivada com sucesso.')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao arquivar unidade.')
    }
  }

  // -------------------------------------------------------------
  // HANDLERS: FUNÇÕES & REQUISITOS (LÍDER & SECRETARIA)
  // -------------------------------------------------------------
  const handleAddRequirement = () => {
    if (!newReqTitle.trim()) return
    const newReq: RoleRequirement = {
      id: `req_${Date.now()}`,
      title: newReqTitle.trim(),
    }
    setRoleForm((prev) => ({
      ...prev,
      requirements: [...prev.requirements, newReq],
    }))
    setNewReqTitle('')
  }

  const handleRemoveRequirement = (id: string) => {
    setRoleForm((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((r) => r.id !== id),
    }))
  }

  const handleSaveRole = async () => {
    if (!permissions.canManageRoles) {
      toast.error('Você não tem permissão para criar funções.')
      return
    }
    if (!roleForm.name.trim() || !roleForm.department) {
      toast.error('Preencha o nome da função e selecione a unidade.')
      return
    }

    // Security note: Líder can only create 'voluntario' roles and cannot define access permissions
    const isSec = permissions.isSecretaria
    const finalLevel = isSec ? roleForm.level : 'voluntario'

    try {
      const payload: Partial<DepartmentRoleRecord> = {
        name: roleForm.name.trim(),
        department: roleForm.department,
        level: finalLevel,
        description: roleForm.description,
        requirements: roleForm.requirements,
        status: 'ativo',
      }
      if (roleForm.id) {
        await departmentsService.updateRole(roleForm.id, payload)
        toast.success('Função atualizada com sucesso.')
      } else {
        await departmentsService.createRole(payload)
        toast.success('Função criada com sucesso.')
      }
      setIsRoleModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar função.')
    }
  }

  const handleArchiveRole = async (role: DepartmentRoleRecord) => {
    if (!permissions.canManageRoles) {
      toast.error('Sem permissão para arquivar funções.')
      return
    }
    if (!confirm(`Deseja arquivar a função "${role.name}"?`)) return
    try {
      await departmentsService.archiveRole(role.id)
      toast.success('Função arquivada com sucesso.')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao arquivar função.')
    }
  }

  // -------------------------------------------------------------
  // HANDLERS: ATRIBUIÇÃO DE EQUIPE (LÍDER & SECRETARIA)
  // -------------------------------------------------------------
  const handleRoleChangeInAssign = async (roleId: string) => {
    setAssignForm((prev) => ({
      ...prev,
      role: roleId,
      requirementsChecklist: {},
    }))
    setBlockingOverlapError(null)

    if (assignForm.person && roleId) {
      const check = await overlapRulesService.validateOverlap(assignForm.person, roleId)
      if (!check.allowed && check.blockingRule) {
        setBlockingOverlapError(
          `Bloqueado pela regra: "${check.blockingRule.name}". Motivo: ${check.blockingRule.reason}`,
        )
      }
    }
  }

  const handlePersonChangeInAssign = async (personId: string) => {
    setAssignForm((prev) => ({ ...prev, person: personId }))
    setBlockingOverlapError(null)

    if (personId && assignForm.role) {
      const check = await overlapRulesService.validateOverlap(personId, assignForm.role)
      if (!check.allowed && check.blockingRule) {
        setBlockingOverlapError(
          `Bloqueado pela regra: "${check.blockingRule.name}". Motivo: ${check.blockingRule.reason}`,
        )
      }
    }
  }

  const handleCreateAssignment = async () => {
    if (!assignForm.person || !assignForm.role) {
      toast.error('Selecione a pessoa e a função desejada.')
      return
    }

    const selectedRole = roles.find((r) => r.id === assignForm.role)
    const reqs = selectedRole?.requirements || []

    // Verify if all requirements are checked
    const missingReqs = reqs.filter((r) => !assignForm.requirementsChecklist[r.id])
    if (missingReqs.length > 0) {
      toast.error(
        `Preencha todos os requisitos obrigatórios antes de confirmar (${missingReqs[0].title}).`,
      )
      return
    }

    // Build requirement checklist audit log
    const auditChecklist = reqs.map((r) => ({
      requirement_id: r.id,
      title: r.title,
      confirmed_by: currentPerson?.name || 'Secretaria',
      confirmed_at: new Date().toISOString(),
    }))

    try {
      await assignmentsService.create({
        person: assignForm.person,
        role: assignForm.role,
        department: selectedRole?.department,
        start_date: assignForm.start_date || new Date().toISOString().split('T')[0],
        notes: assignForm.notes,
        leadership_level: assignForm.leadership_level,
        requirements_checklist: auditChecklist,
      })
      toast.success('Pessoa alocada na função com sucesso.')
      setIsAssignModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alocar pessoa.')
    }
  }

  const handleEndAssignment = async (assignment: AssignmentRecord) => {
    if (
      !confirm(
        `Deseja encerrar a atuação de ${assignment.expand?.person?.name || 'membro'} nesta função?`,
      )
    ) {
      return
    }
    try {
      await assignmentsService.endAssignment(assignment.id)
      toast.success('Atuação encerrada.')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao encerrar atuação.')
    }
  }

  // -------------------------------------------------------------
  // HANDLERS: REGRAS DE SOBREPOSIÇÃO (LÍDER & SECRETARIA)
  // -------------------------------------------------------------
  const handleSaveOverlapRule = async () => {
    if (!permissions.canManageOverlaps) {
      toast.error('Sem permissão para configurar regras de sobreposição.')
      return
    }
    if (!overlapForm.name.trim() || !overlapForm.reason.trim()) {
      toast.error('Preencha o nome da regra e o motivo.')
      return
    }
    try {
      await overlapRulesService.create({
        name: overlapForm.name.trim(),
        description: overlapForm.description,
        rule_type: overlapForm.rule_type,
        reason: overlapForm.reason,
        department_a: overlapForm.department_a || undefined,
        role_a: overlapForm.role_a || undefined,
        department_b: overlapForm.department_b || undefined,
        role_b: overlapForm.role_b || undefined,
        created_by_name: currentPerson?.name || 'Secretaria',
      })
      toast.success('Regra de sobreposição cadastrada.')
      setIsOverlapModalOpen(false)
      setOverlapForm({
        name: '',
        description: '',
        rule_type: 'bloqueado',
        reason: '',
      })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar regra de sobreposição.')
    }
  }

  const handleDeleteOverlapRule = async (id: string) => {
    if (!confirm('Deseja excluir esta regra de sobreposição?')) return
    try {
      await overlapRulesService.delete(id)
      toast.success('Regra removida.')
      loadData()
    } catch {
      toast.error('Erro ao remover regra.')
    }
  }

  const selectedRoleRecord = roles.find((r) => r.id === assignForm.role)

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <Layers className="w-4 h-4" />
            <span>Estrutura Departamental &bull; Igreja Defesa da Fé</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Departamentos, Funções &amp; Equipes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Gestão unificada de unidades (departamento e subdepartamento), funções com checklist de
            requisitos, regras de sobreposição e atuações ministeriais.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeTab === 'equipe' && permissions.canManageAssignments && (
            <Button
              onClick={() => {
                setAssignForm({
                  person: '',
                  role: '',
                  start_date: new Date().toISOString().split('T')[0],
                  notes: '',
                  leadership_level: 'voluntario',
                  requirementsChecklist: {},
                })
                setBlockingOverlapError(null)
                setIsAssignModalOpen(true)
              }}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-5 rounded-full shadow-md shadow-[#820AD1]/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Alocar Pessoa na Função
            </Button>
          )}

          {activeTab === 'unidades' && permissions.canManageDepartments && (
            <Button
              onClick={() => {
                setUnitForm({
                  name: '',
                  code: '',
                  description: '',
                  unit_type: 'departamento',
                  parent_unit: undefined,
                })
                setIsUnitModalOpen(true)
              }}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-5 rounded-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Unidade
            </Button>
          )}

          {activeTab === 'funcoes' && permissions.canManageRoles && (
            <Button
              onClick={() => {
                setRoleForm({
                  name: '',
                  department: departments[0]?.id || '',
                  level: 'voluntario',
                  description: '',
                  requirements: [],
                })
                setIsRoleModalOpen(true)
              }}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-5 rounded-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Função
            </Button>
          )}

          {activeTab === 'sobreposicoes' && permissions.canManageOverlaps && (
            <Button
              onClick={() => setIsOverlapModalOpen(true)}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-5 rounded-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Regra de Sobreposição
            </Button>
          )}
        </div>
      </section>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('equipe')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'equipe'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Equipes &amp; Atuações ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('unidades')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'unidades'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Unidades &amp; Subdepartamentos ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('funcoes')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'funcoes'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Funções &amp; Requisitos ({roles.length})
        </button>

        <button
          onClick={() => setActiveTab('sobreposicoes')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'sobreposicoes'
              ? 'bg-[#820AD1] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Regras de Sobreposição ({overlapRules.length})
        </button>
      </div>

      {/* =====================================================================
          TAB 1: EQUIPES & ATUAÇÕES (LÍDER & SECRETARIA)
          ===================================================================== */}
      {activeTab === 'equipe' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#191919]">Membros Atuando nas Funções</h2>
              <p className="text-xs text-gray-500">
                Pessoas ativas em cada departamento com checklist de requisitos e nível de
                liderança.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger className="text-xs h-9 rounded-full">
                  <SelectValue placeholder="Filtrar por unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.unit_type === 'subdepartamento' ? `↳ ${d.name}` : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {filteredAssignments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                Nenhuma atuação ativa encontrada para os filtros selecionados.
              </div>
            ) : (
              filteredAssignments.map((asg) => {
                const reqCount = asg.requirements_checklist?.length || 0
                return (
                  <div
                    key={asg.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FB] px-3 rounded-2xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#191919] text-sm">
                          {asg.expand?.person?.name || 'Membro'}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {asg.expand?.role?.name || 'Função'}
                        </span>
                        {asg.leadership_level && asg.leadership_level !== 'voluntario' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {asg.leadership_level === 'lider'
                              ? 'Líder'
                              : asg.leadership_level === 'vice_lider'
                                ? 'Vice-Líder'
                                : 'Liderança Adicional'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-gray-500 text-[11px] flex-wrap">
                        <span>
                          Unidade:{' '}
                          <strong>
                            {asg.expand?.role?.expand?.department?.name ||
                              asg.expand?.department?.name ||
                              'Geral'}
                          </strong>
                        </span>
                        <span>&bull;</span>
                        <span>Início: {new Date(asg.start_date).toLocaleDateString('pt-BR')}</span>
                        {reqCount > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {reqCount} requisito(s) auditado(s)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {permissions.canManageAssignments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEndAssignment(asg)}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full font-bold"
                        >
                          Encerrar Atuação
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: UNIDADES & SUBDEPARTAMENTOS (ÁRVORE)
          ===================================================================== */}
      {activeTab === 'unidades' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#191919]">
                Árvore Organizacional da Igreja
              </h2>
              <p className="text-xs text-gray-500">
                Departamentos e subdepartamentos configuráveis. Apenas a Secretaria cria ou
                reorganiza (D3/D4).
              </p>
            </div>
            {!permissions.canManageDepartments && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-medium border border-amber-200">
                Visualização somente leitura (permissão restrita à Secretaria)
              </span>
            )}
          </div>

          <div className="space-y-4">
            {rootDepartments.map((dept) => {
              const subs = subDepartments.filter((s) => s.parent_unit === dept.id)
              const deptRoles = roles.filter((r) => r.department === dept.id)

              return (
                <div
                  key={dept.id}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-[#F8F9FB] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#820AD1] flex items-center justify-center font-bold">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#191919] text-sm">{dept.name}</h3>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            Departamento
                          </span>
                          {dept.status === 'arquivado' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                              Arquivado
                            </span>
                          )}
                        </div>
                        {dept.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{dept.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {permissions.canManageDepartments && dept.status !== 'arquivado' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUnitForm({
                                name: '',
                                code: '',
                                description: '',
                                unit_type: 'subdepartamento',
                                parent_unit: dept.id,
                              })
                              setIsUnitModalOpen(true)
                            }}
                            className="h-7 text-[11px] rounded-full border-purple-200 text-purple-700 font-bold hover:bg-purple-50"
                          >
                            + Subdepartamento
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveUnit(dept)}
                            className="h-7 text-[11px] text-gray-500 hover:text-red-600 rounded-full"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subdepartamentos list */}
                  {subs.length > 0 && (
                    <div className="pl-6 pt-2 space-y-2 border-l-2 border-purple-200">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">
                        Subdepartamentos vinculados ({subs.length})
                      </span>
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-[#191919] text-xs flex items-center gap-1.5">
                              <span>↳</span> {sub.name}
                            </p>
                            {sub.description && (
                              <p className="text-[11px] text-gray-400">{sub.description}</p>
                            )}
                          </div>
                          {permissions.canManageDepartments && sub.status !== 'arquivado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveUnit(sub)}
                              className="h-7 text-[11px] text-gray-400 hover:text-red-600 rounded-full"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: FUNÇÕES & REQUISITOS (LÍDER & SECRETARIA)
          ===================================================================== */}
      {activeTab === 'funcoes' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#191919]">
                Funções Departamentais &amp; Requisitos
              </h2>
              <p className="text-xs text-gray-500">
                Cada departamento define suas funções e os requisitos necessários (D1, D2, D18).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => {
              const reqs = r.requirements || []
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl border border-gray-200 bg-[#F8F9FB] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#191919] text-sm">{r.name}</h3>
                      <p className="text-[11px] text-purple-700 font-semibold">
                        {r.expand?.department?.name || 'Unidade'}
                      </p>
                    </div>
                    {permissions.canManageRoles && r.status !== 'arquivado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveRole(r)}
                        className="h-7 text-xs text-gray-400 hover:text-red-600 rounded-full"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {r.description && <p className="text-xs text-gray-600">{r.description}</p>}

                  {/* Requirements List */}
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Requisitos Obrigatórios ({reqs.length})
                    </span>
                    {reqs.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">
                        Nenhum requisito configurado
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {reqs.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center gap-1.5 text-[11px] text-gray-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{req.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 4: REGRAS DE SOBREPOSIÇÃO (CONFIGURÁVEIS D19/D20)
          ===================================================================== */}
      {activeTab === 'sobreposicoes' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#191919]">
                Regras de Sobreposição de Funções
              </h2>
              <p className="text-xs text-gray-500">
                Regras dinâmicas que definem quais funções uma pessoa pode ou não acumular
                simultaneamente (D19).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {overlapRules.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                Nenhuma regra de sobreposição cadastrada. Qualquer combinação de funções está
                permitida.
              </div>
            ) : (
              overlapRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl border border-gray-200 bg-[#F8F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191919] text-sm">{rule.name}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          rule.rule_type === 'bloqueado'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {rule.rule_type === 'bloqueado' ? 'Bloqueado' : 'Permitido'}
                      </span>
                    </div>

                    <p className="text-gray-600">{rule.reason}</p>

                    <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-0.5">
                      <span>Criado por: {rule.created_by_name || 'Secretaria'}</span>
                    </div>
                  </div>

                  {permissions.canManageOverlaps && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOverlapRule(rule.id)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full h-8 font-bold"
                    >
                      Remover Regra
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL: ALOCAR PESSOA NA FUNÇÃO (COM CHECKLIST & OVERLAP CHECK)
          ===================================================================== */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Alocar Pessoa na Função
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Person selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Membro da Igreja</label>
              <Select value={assignForm.person} onValueChange={handlePersonChangeInAssign}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o membro..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.phone || 'Sem telefone'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Função &bull; Unidade</label>
              <Select value={assignForm.role} onValueChange={handleRoleChangeInAssign}>
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione a função..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} — {r.expand?.department?.name || 'Unidade'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leadership level (D16, D17) */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Nível da Atuação na Unidade</label>
              <Select
                value={assignForm.leadership_level}
                onValueChange={(val: any) =>
                  setAssignForm((prev) => ({ ...prev, leadership_level: val }))
                }
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Nível..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voluntario">Voluntário</SelectItem>
                  <SelectItem value="lider">Líder da Unidade</SelectItem>
                  <SelectItem value="vice_lider">Vice-Líder da Unidade</SelectItem>
                  {permissions.isSecretaria && (
                    <SelectItem value="lideranca_adicional">
                      Liderança Adicional (Secretaria)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Overlap blocking warning */}
            {blockingOverlapError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800">
                <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Atribuição Bloqueada por Regra de Sobreposição (D19)</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{blockingOverlapError}</p>
                </div>
              </div>
            )}

            {/* Requirements Checklist (D18) */}
            {selectedRoleRecord && (selectedRoleRecord.requirements?.length || 0) > 0 && (
              <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-[#820AD1]">
                  <ListCheck className="w-4 h-4" />
                  <span>Checklist Obrigatório de Requisitos</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Marque cada requisito cumprido. O sistema auditará formalmente seu nome e a data.
                </p>

                <div className="space-y-2 pt-1">
                  {selectedRoleRecord.requirements?.map((req) => (
                    <label
                      key={req.id}
                      className="flex items-center gap-2 p-2 bg-white rounded-xl border border-purple-100 cursor-pointer hover:bg-purple-50/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!assignForm.requirementsChecklist[req.id]}
                        onChange={(e) =>
                          setAssignForm((prev) => ({
                            ...prev,
                            requirementsChecklist: {
                              ...prev.requirementsChecklist,
                              [req.id]: e.target.checked,
                            },
                          }))
                        }
                        className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                      />
                      <span className="font-medium text-gray-800">{req.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700">Observações pastorais/operacionais</label>
              <Input
                placeholder="Ex.: Alocado após entrevista pastoral"
                value={assignForm.notes}
                onChange={(e) => setAssignForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={!!blockingOverlapError}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs rounded-full px-5"
            >
              Confirmar Alocação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: NOVA UNIDADE (SECRETARIA)
          ===================================================================== */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Nova Unidade Organizacional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Tipo da Unidade</label>
              <Select
                value={unitForm.unit_type}
                onValueChange={(val: any) => setUnitForm((prev) => ({ ...prev, unit_type: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departamento">Departamento (Nível Principal)</SelectItem>
                  <SelectItem value="subdepartamento">
                    Subdepartamento (Vinculado a outro)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {unitForm.unit_type === 'subdepartamento' && (
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Departamento Pai Obrigatório</label>
                <Select
                  value={unitForm.parent_unit || ''}
                  onValueChange={(val) => setUnitForm((prev) => ({ ...prev, parent_unit: val }))}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Selecione o departamento pai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rootDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Nome da Unidade</label>
              <Input
                placeholder="Ex.: Boas-Vindas, Música, Banda, Mídia"
                value={unitForm.name}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Descrição / Finalidade</label>
              <Textarea
                placeholder="Objetivo e escopo ministerial..."
                value={unitForm.description}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsUnitModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveUnit}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Unidade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: NOVA FUNÇÃO & REQUISITOS (LÍDER & SECRETARIA)
          ===================================================================== */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Configurar Função &amp; Requisitos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">
                Unidade (Departamento/Subdepartamento)
              </label>
              <Select
                value={roleForm.department}
                onValueChange={(val) => setRoleForm((prev) => ({ ...prev, department: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.unit_type === 'subdepartamento' ? `↳ ${d.name}` : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Nome da Função</label>
              <Input
                placeholder="Ex.: Baterista, Técnico de Áudio, Recepcionista"
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Descrição</label>
              <Input
                placeholder="Atribuições e responsabilidades da função"
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl text-xs h-9"
              />
            </div>

            {/* Requisitos Checklist Management */}
            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#820AD1]">
                  Requisitos para Exercer a Função (D18)
                </span>
                <span className="text-[10px] text-gray-500">
                  Configurável pelo Líder e Secretaria
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ex.: Treinamento na mesa de som concluído"
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddRequirement()
                    }
                  }}
                  className="rounded-xl text-xs h-9 bg-white"
                />
                <Button
                  type="button"
                  onClick={handleAddRequirement}
                  className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 rounded-xl font-bold px-3 shrink-0"
                >
                  Adicionar
                </Button>
              </div>

              <div className="space-y-1.5 pt-1">
                {roleForm.requirements.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Nenhum requisito exigido.</p>
                ) : (
                  roleForm.requirements.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 bg-white rounded-xl border border-purple-100 text-[11px]"
                    >
                      <span className="font-medium text-gray-800">{req.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(req.id)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsRoleModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRole}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Função
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: NOVA REGRA DE SOBREPOSIÇÃO (CONFIGURÁVEL D19)
          ===================================================================== */}
      <Dialog open={isOverlapModalOpen} onOpenChange={setIsOverlapModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Nova Regra de Sobreposição
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Nome / Título da Regra</label>
              <Input
                placeholder="Ex.: Música x Boas-Vindas"
                value={overlapForm.name}
                onChange={(e) => setOverlapForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Tipo de Validação</label>
              <Select
                value={overlapForm.rule_type}
                onValueChange={(val: any) =>
                  setOverlapForm((prev) => ({ ...prev, rule_type: val }))
                }
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bloqueado">Bloqueado (impede a atribuição)</SelectItem>
                  <SelectItem value="permitido">Permitido explicitamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Unidade A</label>
                <Select
                  value={overlapForm.department_a || ''}
                  onValueChange={(val) =>
                    setOverlapForm((prev) => ({ ...prev, department_a: val }))
                  }
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Unidade B</label>
                <Select
                  value={overlapForm.department_b || ''}
                  onValueChange={(val) =>
                    setOverlapForm((prev) => ({ ...prev, department_b: val }))
                  }
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Motivo / Justificativa</label>
              <Textarea
                placeholder="Ex.: Voluntário servindo na banda não tem como recepcionar nos mesmos cultos"
                value={overlapForm.reason}
                onChange={(e) => setOverlapForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsOverlapModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveOverlapRule}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs rounded-full px-5"
            >
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
export default DepartamentosAtuacoes
