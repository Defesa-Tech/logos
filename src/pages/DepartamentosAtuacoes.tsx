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
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  departmentsService,
  assignmentsService,
  personsService,
  overlapRulesService,
  activitiesService,
  churchRequirementsService,
  requirementWaiversService,
  coursesService,
} from '@/services/church'
import type {
  DepartmentRecord,
  DepartmentRoleRecord,
  AssignmentRecord,
  PersonRecord,
  OverlapRuleRecord,
  RoleRequirement,
  UnitType,
  ChurchRequirementRecord,
  RequirementWaiverRecord,
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
  const [churchRequirements, setChurchRequirements] = useState<ChurchRequirementRecord[]>([])
  const [waivers, setWaivers] = useState<RequirementWaiverRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Feature 1: Layered requirements state for selected assignment
  const [personC1Status, setPersonC1Status] = useState<{
    completed: boolean
    isWaived: boolean
    hasC1OrWaiver: boolean
    waiverRecord?: RequirementWaiverRecord
  }>({
    completed: false,
    isWaived: false,
    hasC1OrWaiver: false,
  })

  // Navigation tab: 'equipe' | 'unidades' | 'funcoes' | 'requisitos_igreja' | 'sobreposicoes'
  const [activeTab, setActiveTab] = useState<
    'equipe' | 'unidades' | 'funcoes' | 'requisitos_igreja' | 'sobreposicoes'
  >('equipe')
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

  // Feature 1: Modal de Dispensa da Secretaria
  const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false)
  const [waiverForm, setWaiverForm] = useState<{
    person: string
    requirement_type: 'igreja' | 'departamento' | 'funcao'
    requirement_id: string
    requirement_title: string
    reason: string
  }>({
    person: '',
    requirement_type: 'igreja',
    requirement_id: '',
    requirement_title: '',
    reason: '',
  })

  // Feature 1: Modal de Requisito de Unidade/Departamento
  const [isDeptReqModalOpen, setIsDeptReqModalOpen] = useState(false)
  const [deptReqForm, setDeptReqForm] = useState<{
    deptId: string
    title: string
    description: string
  }>({
    deptId: '',
    title: '',
    description: '',
  })

  // Feature 1: Modal de Requisito de Igreja (Secretaria)
  const [isChurchReqModalOpen, setIsChurchReqModalOpen] = useState(false)
  const [churchReqForm, setChurchReqForm] = useState<{
    id?: string
    title: string
    code: string
    description: string
    is_default: boolean
  }>({
    title: '',
    code: '',
    description: '',
    is_default: false,
  })

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
      const [allDepts, allRoles, allAssigns, allPersons, allOverlaps, allChurchReqs, allWaivers] =
        await Promise.all([
          departmentsService.list(),
          departmentsService.listRoles(),
          assignmentsService.listActive(),
          personsService.list('stage = "membro" || status = "member"'),
          overlapRulesService.list(),
          churchRequirementsService.list(),
          requirementWaiversService.list(),
        ])

      setDepartments(allDepts)
      setRoles(allRoles)
      setAssignments(allAssigns)
      setMembers(allPersons)
      setOverlapRules(allOverlaps)
      setChurchRequirements(allChurchReqs)
      setWaivers(allWaivers)
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
  const checkPersonC1 = async (personId: string) => {
    if (!personId) {
      setPersonC1Status({ completed: false, isWaived: false, hasC1OrWaiver: false })
      return
    }
    const c1Info = await coursesService.checkC1Status(personId)
    setPersonC1Status(c1Info)
  }

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
    await checkPersonC1(personId)

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
    const dept = departments.find((d) => d.id === selectedRole?.department)

    // Feature 1: Requisitos em 3 camadas que se somam
    // 1. Igreja: C1 Concluído (ou dispensado)
    if (!personC1Status.hasC1OrWaiver) {
      toast.error(
        'Requisito Igreja não cumprido: Esta função exige C1 concluído ou dispensa registrada pela Secretaria.',
      )
      return
    }

    // 2. Departamento
    const deptReqs = dept?.requirements || []
    const missingDeptReqs = deptReqs.filter((r) => !assignForm.requirementsChecklist[r.id])
    if (missingDeptReqs.length > 0) {
      toast.error(
        `Requisito do Departamento pendente: "${missingDeptReqs[0].title}". Marque o cumprimento antes de confirmar.`,
      )
      return
    }

    // 3. Função
    const roleReqs = selectedRole?.requirements || []
    const missingRoleReqs = roleReqs.filter((r) => !assignForm.requirementsChecklist[r.id])
    if (missingRoleReqs.length > 0) {
      toast.error(
        `Requisito da Função pendente: "${missingRoleReqs[0].title}". Marque o cumprimento antes de confirmar.`,
      )
      return
    }

    // Build requirement checklist audit log somando as 3 camadas
    const auditChecklist: any[] = [
      {
        requirement_id: 'c1_concluido',
        title: personC1Status.isWaived
          ? `C1 Dispensado pela Secretaria (${personC1Status.waiverRecord?.reason || 'Dispensa ministerial'})`
          : 'C1 Concluído (Padrão Igreja)',
        layer: 'igreja',
        waived: personC1Status.isWaived,
        confirmed_by: personC1Status.isWaived
          ? personC1Status.waiverRecord?.granted_by || 'Secretaria'
          : currentPerson?.name || 'Sistema/Secretaria',
        confirmed_at: new Date().toISOString(),
      },
      ...deptReqs.map((r) => ({
        requirement_id: r.id,
        title: r.title,
        layer: 'departamento',
        confirmed_by: currentPerson?.name || 'Líder/Secretaria',
        confirmed_at: new Date().toISOString(),
      })),
      ...roleReqs.map((r) => ({
        requirement_id: r.id,
        title: r.title,
        layer: 'funcao',
        confirmed_by: currentPerson?.name || 'Líder/Secretaria',
        confirmed_at: new Date().toISOString(),
      })),
    ]

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

  // Feature 1: Handlers para Requisitos da Secretaria e Dispensas
  const handleSaveChurchRequirement = async () => {
    if (!permissions.isSecretaria) {
      toast.error('Apenas a Secretaria define ou altera requisitos de nível Igreja.')
      return
    }
    if (!churchReqForm.title.trim()) {
      toast.error('Informe o título do requisito.')
      return
    }
    try {
      if (churchReqForm.id) {
        await churchRequirementsService.update(churchReqForm.id, {
          title: churchReqForm.title.trim(),
          description: churchReqForm.description,
        })
        toast.success('Requisito de Igreja atualizado.')
      } else {
        await churchRequirementsService.create({
          title: churchReqForm.title.trim(),
          code: churchReqForm.code.trim() || churchReqForm.title.toLowerCase().replace(/\s+/g, '_'),
          description: churchReqForm.description,
          is_active: true,
          is_default: churchReqForm.is_default,
        })
        toast.success('Requisito de nível Igreja criado com sucesso.')
      }
      setIsChurchReqModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar requisito de igreja.')
    }
  }

  const handleCreateWaiver = async () => {
    if (!permissions.isSecretaria) {
      toast.error(
        'Apenas a Secretaria pode registrar dispensas de requisitos (política da igreja).',
      )
      return
    }
    if (!waiverForm.person) {
      toast.error('Selecione a pessoa a receber a dispensa.')
      return
    }
    if (!waiverForm.reason.trim()) {
      toast.error('A justificativa é obrigatória (ex.: formação equivalente em outra igreja).')
      return
    }
    try {
      await requirementWaiversService.create({
        person: waiverForm.person,
        requirement_type: waiverForm.requirement_type,
        requirement_id: waiverForm.requirement_id || 'c1_concluido',
        requirement_title: waiverForm.requirement_title || 'C1 Concluído',
        reason: waiverForm.reason.trim(),
        granted_by: currentPerson?.name ? `${currentPerson.name} (Secretaria)` : 'Secretaria Logos',
      })
      toast.success('Dispensa registrada formalmente com justificativa pela Secretaria.')
      setIsWaiverModalOpen(false)
      setWaiverForm({
        person: '',
        requirement_type: 'igreja',
        requirement_id: '',
        requirement_title: '',
        reason: '',
      })
      loadData()
      if (assignForm.person) {
        await checkPersonC1(assignForm.person)
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar dispensa.')
    }
  }

  const handleAddDeptRequirement = async () => {
    if (!deptReqForm.deptId || !deptReqForm.title.trim()) {
      toast.error('Selecione a unidade e informe o requisito do departamento.')
      return
    }
    const targetDept = departments.find((d) => d.id === deptReqForm.deptId)
    if (!targetDept) return

    const currentReqs = targetDept.requirements || []
    const updated = [
      ...currentReqs,
      {
        id: `dept_req_${Date.now()}`,
        title: deptReqForm.title.trim(),
        description: deptReqForm.description.trim(),
      },
    ]

    try {
      await departmentsService.update(deptReqForm.deptId, {
        requirements: updated,
      })
      toast.success('Requisito do Departamento adicionado.')
      setIsDeptReqModalOpen(false)
      setDeptReqForm({ deptId: '', title: '', description: '' })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar requisito de departamento.')
    }
  }

  const handleRemoveDeptRequirement = async (deptId: string, reqId: string) => {
    const targetDept = departments.find((d) => d.id === deptId)
    if (!targetDept) return
    const updated = (targetDept.requirements || []).filter((r) => r.id !== reqId)
    try {
      await departmentsService.update(deptId, { requirements: updated })
      toast.success('Requisito de departamento removido.')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover requisito.')
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
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3A31CE] mb-1">
            <Layers className="w-4 h-4" />
            <span>Estrutura Departamental &bull; Logos Igreja</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161D] font-heading">
            Departamentos, Funções &amp; Equipes
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6072] mt-1 max-w-2xl">
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-5 rounded-full shadow-md shadow-[#3A31CE]/20"
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-5 rounded-full"
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-5 rounded-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Função
            </Button>
          )}

          {activeTab === 'requisitos_igreja' && (
            <div className="flex items-center gap-2">
              {permissions.isSecretaria && (
                <>
                  <Button
                    onClick={() => {
                      setWaiverForm({
                        person: members[0]?.id || '',
                        requirement_type: 'igreja',
                        requirement_id: 'c1_concluido',
                        requirement_title: 'C1 Concluído',
                        reason: '',
                      })
                      setIsWaiverModalOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-full shadow-sm"
                  >
                    <ShieldAlert className="w-4 h-4 mr-1.5" />
                    Registrar Dispensa (Secretaria)
                  </Button>
                  <Button
                    onClick={() => {
                      setChurchReqForm({
                        title: '',
                        code: '',
                        description: '',
                        is_default: false,
                      })
                      setIsChurchReqModalOpen(true)
                    }}
                    className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-4 rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Novo Requisito Igreja
                  </Button>
                </>
              )}
            </div>
          )}

          {activeTab === 'sobreposicoes' && permissions.canManageOverlaps && (
            <Button
              onClick={() => setIsOverlapModalOpen(true)}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-5 rounded-full"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Regra de Sobreposição
            </Button>
          )}
        </div>
      </section>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#E8EAF0] pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('equipe')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'equipe'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Equipes &amp; Atuações ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('unidades')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'unidades'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Unidades &amp; Subdepartamentos ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('funcoes')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'funcoes'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Funções &amp; Requisitos ({roles.length})
        </button>

        <button
          onClick={() => setActiveTab('requisitos_igreja')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'requisitos_igreja'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Requisitos em Camadas &amp; Dispensas ({churchRequirements.length + waivers.length})
        </button>

        <button
          onClick={() => setActiveTab('sobreposicoes')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'sobreposicoes'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
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
                      <div className="w-8 h-8 rounded-xl bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
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
                            className="h-7 text-[11px] rounded-full border-[#DAD7F3] text-[#3A31CE] font-bold hover:bg-[#F2F1FB]"
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
          TAB: REQUISITOS EM CAMADAS (3 NÍVEIS) & DISPENSAS DA SECRETARIA
          ===================================================================== */}
      {activeTab === 'requisitos_igreja' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-6">
          {/* Header Banner com a regra do usuário */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3A31CE]" />
                <h3 className="font-extrabold text-[#191919] text-sm sm:text-base">
                  Requisitos em 3 Camadas Que Se Somam
                </h3>
              </div>
              <p className="text-xs text-gray-600 max-w-3xl">
                Para qualquer função, o voluntário precisa cumprir cumulativamente:
                <br />
                <strong>1. Nível Igreja (Padrão):</strong> C1 concluído (definido pela Secretaria;
                líder não pode remover).
                <br />
                <strong>2. Nível Departamento:</strong> Ex.: Entrevista com líder da Música
                (definido por líder ou secretaria).
                <br />
                <strong>3. Nível Função:</strong> Ex.: Treinamento de mesa de som (definido por
                líder ou secretaria).
              </p>
            </div>
            <div className="shrink-0 p-3 bg-white rounded-xl border border-purple-200 text-xs">
              <p className="font-bold text-[#3A31CE] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Dispensa Exclusiva
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs">
                Apenas a Secretaria registra dispensas com justificativa oficial auditada. O líder
                vê, mas não pode criar nem remover.
              </p>
            </div>
          </div>

          {/* Camada 1: Nível Igreja */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#191919] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-[10px] uppercase font-bold">
                    Nível 1 &bull; Igreja
                  </span>
                  <span>Requisitos Padrão da Igreja Defesa da Fé</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Gerenciados exclusivamente pela Secretaria. Exigidos para qualquer função em todos
                  os departamentos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {churchRequirements.map((cr) => (
                <div
                  key={cr.id}
                  className="p-4 rounded-2xl border border-purple-200 bg-[#FBF9FE] flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-[#191919]">{cr.title}</h5>
                      {cr.is_default && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3A31CE] text-white">
                          Padrão Universal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{cr.description}</p>
                    <p className="text-[11px] text-[#3A31CE] font-semibold">
                      Código: {cr.code} &bull; Definido por: Secretaria Geral
                    </p>
                  </div>
                  {cr.is_default && (
                    <div
                      className="p-2 bg-[#F2F1FB] rounded-xl text-[#3A31CE] shrink-0"
                      title="Requisito não removível por líderes"
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Camada 2: Nível Departamento */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-[#191919] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] uppercase font-bold">
                    Nível 2 &bull; Departamento
                  </span>
                  <span>Requisitos por Unidade / Departamento</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Ex.: Entrevista com o líder da Música. Válidos para todas as funções daquela
                  unidade.
                </p>
              </div>
              {(permissions.isSecretaria || permissions.canManageRoles) && (
                <Button
                  onClick={() => {
                    setDeptReqForm({
                      deptId: departments[0]?.id || '',
                      title: '',
                      description: '',
                    })
                    setIsDeptReqModalOpen(true)
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs border-purple-200 text-purple-700 hover:bg-purple-50 h-8 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Requisito do Departamento
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {departments
                .filter((d) => (d.requirements?.length || 0) > 0)
                .map((dept) => (
                  <div
                    key={dept.id}
                    className="p-4 rounded-2xl border border-gray-200 bg-[#F8F9FB] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#3A31CE] uppercase tracking-wide">
                        {dept.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 rounded-full text-gray-700">
                        {dept.requirements?.length} requisito(s)
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {dept.requirements?.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100 text-xs"
                        >
                          <div>
                            <p className="font-bold text-gray-800">{req.title}</p>
                            {req.description && (
                              <p className="text-[11px] text-gray-500">{req.description}</p>
                            )}
                          </div>
                          {(permissions.isSecretaria || permissions.canManageRoles) && (
                            <button
                              onClick={() => handleRemoveDeptRequirement(dept.id, req.id)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              title="Remover requisito"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {departments.filter((d) => (d.requirements?.length || 0) > 0).length === 0 && (
                <div className="col-span-2 py-6 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-2xl">
                  Nenhum departamento cadastrou requisitos específicos de unidade ainda.
                </div>
              )}
            </div>
          </div>

          {/* Camada 3: Dispensas da Secretaria (Auditoria de Exceções) */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-[#191919] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold">
                    Dispensas Auditadas &bull; Secretaria
                  </span>
                  <span>Exceções Pastorais &amp; Formações Equivalentes</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Líderes visualizam o registro completo, mas não podem conceder nem remover
                  dispensas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {waivers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-2xl">
                  Nenhuma dispensa concedida. Todos os membros seguem os requisitos integrais.
                </div>
              ) : (
                waivers.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#191919] text-sm">
                          {w.expand?.person?.name || 'Membro'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Dispensa: {w.requirement_title}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Nível {w.requirement_type}
                        </span>
                      </div>
                      <p className="text-gray-700 italic">&ldquo;{w.reason}&rdquo;</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5 flex-wrap">
                        <span>
                          Concedido por: <strong>{w.granted_by}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Data:{' '}
                          {w.granted_at ? new Date(w.granted_at).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>

                    {permissions.isSecretaria && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (
                            confirm(`Deseja revogar esta dispensa de ${w.expand?.person?.name}?`)
                          ) {
                            await requirementWaiversService.delete(w.id)
                            toast.success('Dispensa revogada.')
                            loadData()
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full h-8 font-bold self-end sm:self-auto"
                      >
                        Revogar Dispensa
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
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

            {/* FEATURE 1: CHECKLIST COMPLETO SOMANDO OS 3 NÍVEIS + REGRA R8 */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[#3A31CE]">
                  <ListCheck className="w-4 h-4" />
                  <span>Checklist Cumulativo em 3 Camadas</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                  Soma dos 3 Níveis
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                O sistema exige simultaneamente a regra de membro (R8), o requisito universal da
                Igreja (C1), os requisitos da unidade e os da função específica.
              </p>

              {/* NÍVEL 1: IGREJA (C1) */}
              <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-purple-700">
                    1. Nível Igreja (Padrão Universal)
                  </span>
                  <span className="text-[10px] text-gray-400">Política da Igreja</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {personC1Status.hasC1OrWaiver ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-xs text-gray-800">C1 Concluído</p>
                      <p className="text-[11px] text-gray-500">
                        {personC1Status.completed
                          ? 'Concluído na turma do curso C1'
                          : personC1Status.isWaived
                            ? `Dispensado pela Secretaria: "${personC1Status.waiverRecord?.reason}"`
                            : 'Pendente — Exige conclusão de turma ou dispensa da Secretaria'}
                      </p>
                    </div>
                  </div>

                  {personC1Status.hasC1OrWaiver ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {personC1Status.isWaived ? 'Dispensado' : 'Apto'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Bloqueante
                    </span>
                  )}
                </div>

                {!personC1Status.hasC1OrWaiver && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                    O C1 é obrigatório para qualquer função. Líderes não podem dispensar este
                    requisito. Se houver caso excepcional de transferência, solicite a dispensa à
                    Secretaria.
                  </div>
                )}
              </div>

              {/* NÍVEL 2: DEPARTAMENTO */}
              {(() => {
                const targetDept = departments.find((d) => d.id === selectedRoleRecord?.department)
                const deptReqs = targetDept?.requirements || []
                return (
                  <div className="p-3 bg-white rounded-xl border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-blue-700">
                        2. Nível Departamento ({targetDept?.name || 'Unidade'})
                      </span>
                      <span className="text-[10px] text-gray-400">Líder ou Secretaria</span>
                    </div>

                    {deptReqs.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">
                        Nenhum requisito adicional específico desta unidade.
                      </p>
                    ) : (
                      deptReqs.map((req) => (
                        <label
                          key={req.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-blue-50/40 cursor-pointer"
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
                            className="rounded text-blue-600 focus:ring-blue-600"
                          />
                          <div>
                            <span className="font-medium text-gray-800">{req.title}</span>
                            {req.description && (
                              <p className="text-[10px] text-gray-400">{req.description}</p>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )
              })()}

              {/* NÍVEL 3: FUNÇÃO */}
              <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#3A31CE]">
                    3. Nível Função ({selectedRoleRecord?.name || 'Função'})
                  </span>
                  <span className="text-[10px] text-gray-400">Líder ou Secretaria</span>
                </div>

                {(selectedRoleRecord?.requirements || []).length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">
                    Nenhum treinamento ou requisito específico desta função.
                  </p>
                ) : (
                  selectedRoleRecord?.requirements?.map((req) => (
                    <label
                      key={req.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-purple-50/40 cursor-pointer"
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
                        className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                      />
                      <span className="font-medium text-gray-800">{req.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Atuação
            </Button>{' '}
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
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
                <span className="font-bold text-[#3A31CE]">
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
                  className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-9 rounded-xl font-bold px-3 shrink-0"
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Função
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: REGISTRAR DISPENSA (EXCLUSIVA DA SECRETARIA)
          ===================================================================== */}
      <Dialog open={isWaiverModalOpen} onOpenChange={setIsWaiverModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              <span>Registrar Dispensa de Requisito</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px]">
              <strong>Regra de Governança:</strong> O líder departamental não pode remover o
              requisito padrão (C1 é política da igreja). Somente a Secretaria registra uma dispensa
              com justificativa formal arquivada.
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Membro a ser dispensado</label>
              <Select
                value={waiverForm.person}
                onValueChange={(val) => setWaiverForm((prev) => ({ ...prev, person: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o membro..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Requisito a dispensar</label>
              <Select
                value={waiverForm.requirement_title}
                onValueChange={(val) =>
                  setWaiverForm((prev) => ({
                    ...prev,
                    requirement_title: val,
                    requirement_id: val === 'C1 Concluído' ? 'c1_concluido' : val,
                  }))
                }
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o requisito..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C1 Concluído">C1 Concluído (Nível Igreja)</SelectItem>
                  <SelectItem value="Entrevista de Liderança">Entrevista com o Líder</SelectItem>
                  <SelectItem value="Treinamento Técnico">Treinamento Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">
                Justificativa Formal Obrigatória (Secretaria)
              </label>
              <Textarea
                placeholder="Ex.: Membro vindo por transferência da Igreja Batista Esperança, com certificado teológico de discipulado e formação equivalente comprovada."
                value={waiverForm.reason}
                onChange={(e) => setWaiverForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsWaiverModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateWaiver}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full px-5"
            >
              Confirmar Dispensa Oficial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: REQUISITO DO DEPARTAMENTO (LÍDER & SECRETARIA)
          ===================================================================== */}
      <Dialog open={isDeptReqModalOpen} onOpenChange={setIsDeptReqModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Novo Requisito de Departamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Departamento / Unidade</label>
              <Select
                value={deptReqForm.deptId}
                onValueChange={(val) => setDeptReqForm((prev) => ({ ...prev, deptId: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione a unidade..." />
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
              <label className="font-bold text-gray-700">Título do Requisito</label>
              <Input
                placeholder="Ex.: Entrevista com o líder da Música"
                value={deptReqForm.title}
                onChange={(e) => setDeptReqForm((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Descrição / Critério</label>
              <Input
                placeholder="Ex.: Alinhamento de testemunho e testemunho pastoral"
                value={deptReqForm.description}
                onChange={(e) =>
                  setDeptReqForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDeptReqModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddDeptRequirement}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Requisito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: REQUISITO DE NÍVEL IGREJA (SECRETARIA)
          ===================================================================== */}
      <Dialog open={isChurchReqModalOpen} onOpenChange={setIsChurchReqModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Requisito Institucional de Nível Igreja
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Título</label>
              <Input
                placeholder="Ex.: C1 Concluído"
                value={churchReqForm.title}
                onChange={(e) => setChurchReqForm((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Código interno</label>
              <Input
                placeholder="Ex.: c1_concluido"
                value={churchReqForm.code}
                onChange={(e) => setChurchReqForm((prev) => ({ ...prev, code: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Descrição e Fundamento</label>
              <Textarea
                placeholder="Explique o propósito deste requisito universal..."
                value={churchReqForm.description}
                onChange={(e) =>
                  setChurchReqForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsChurchReqModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveChurchRequirement}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Regra
            </Button>{' '}
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
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Parâmetros
            </Button>{' '}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
export default DepartamentosAtuacoes
