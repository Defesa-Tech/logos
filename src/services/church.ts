import pb from '@/lib/pocketbase/client'
import type {
  PersonRecord,
  FamilyRecord,
  InviteRecord,
  ActivityRecord,
  CultoRecord,
  PresenceRecord,
  FollowUpTaskRecord,
  StageHistoryRecord,
  DepartmentRecord,
  DepartmentRoleRecord,
  AssignmentRecord,
  OverlapRuleRecord,
  RegistrationDivergenceRecord,
  ChurchSettingRecord,
  PersonStage,
  ChurchRequirementRecord,
  RequirementWaiverRecord,
  CourseRecord,
  CourseClassRecord,
  CourseEnrollmentRecord,
  VolunteerProfileRecord,
} from '@/types/church'

export const personsService = {
  async list(filter?: string, expand: string = 'family,user') {
    return pb.collection('persons').getFullList<PersonRecord>({
      filter: filter || '',
      sort: '-created',
      expand,
    })
  },

  async getById(id: string, expand: string = 'family,user') {
    return pb.collection('persons').getOne<PersonRecord>(id, { expand })
  },

  async findByPhone(phone: string) {
    if (!phone) return null
    const clean = phone.replace(/\D/g, '')
    if (!clean) return null
    try {
      const records = await pb.collection('persons').getFullList<PersonRecord>({
        filter: `phone ~ "${clean}" || whatsapp ~ "${clean}"`,
      })
      return records[0] || null
    } catch {
      return null
    }
  },

  async findByDeviceToken(token: string) {
    if (!token) return null
    try {
      const records = await pb.collection('persons').getFullList<PersonRecord>({
        filter: `device_token = "${token}"`,
      })
      return records[0] || null
    } catch {
      return null
    }
  },

  async create(data: Partial<PersonRecord>) {
    return pb.collection('persons').create<PersonRecord>(data)
  },

  async update(id: string, data: Partial<PersonRecord>) {
    return pb.collection('persons').update<PersonRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('persons').delete(id)
  },

  // LGPD Anonymize person per spec
  async anonymize(id: string) {
    return pb.collection('persons').update<PersonRecord>(id, {
      name: 'Pessoa Anonimizada (LGPD)',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      notes: 'Cadastro anonimizado a pedido do titular em conformidade com a LGPD.',
      contact_authorized: false,
      refuses_contact: true,
      card_photo_url: '',
      anonymized: true,
    })
  },
}

export const stageHistoryService = {
  async listByPerson(personId: string) {
    return pb.collection('stage_history').getFullList<StageHistoryRecord>({
      filter: `person = "${personId}"`,
      sort: '-created',
    })
  },

  async recordChange(data: {
    person: string
    from_stage?: string
    to_stage: PersonStage
    author_name?: string
    reason?: string
  }) {
    return pb.collection('stage_history').create<StageHistoryRecord>({
      person: data.person,
      from_stage: data.from_stage || 'inicio',
      to_stage: data.to_stage,
      date: new Date().toISOString(),
      author_name: data.author_name || 'Secretaria',
      reason: data.reason || 'Alteração de estágio',
    })
  },
}

export const cultosService = {
  async list() {
    return pb.collection('cultos').getFullList<CultoRecord>({
      sort: '-date_time',
    })
  },

  async getOpenCultos() {
    return pb.collection('cultos').getFullList<CultoRecord>({
      filter: 'status = "aberto"',
      sort: '-date_time',
    })
  },

  // Find all active events/cultos within tolerance window (D11 general agenda)
  async getActiveEventsNow(): Promise<CultoRecord[]> {
    try {
      const openEvents = await pb.collection('cultos').getFullList<CultoRecord>({
        filter: 'status = "aberto"',
        sort: 'date_time',
      })
      if (openEvents.length === 0) return []

      const now = new Date().getTime()
      const matchingEvents: CultoRecord[] = []

      for (const c of openEvents) {
        const start = new Date(c.date_time).getTime()
        const tolBefore = (c.tolerance_minutes_before ?? 60) * 60000
        const tolAfter = (c.tolerance_minutes_after ?? 60) * 60000
        const end = c.end_time ? new Date(c.end_time).getTime() : start + 2 * 3600000

        if (now >= start - tolBefore && now <= end + tolAfter) {
          matchingEvents.push(c)
        }
      }

      return matchingEvents
    } catch {
      return []
    }
  },

  // Find currently active culto within tolerance window (D11) - backwards-compatible helper
  async getActiveCultoNow(): Promise<CultoRecord | null> {
    try {
      const activeEvents = await this.getActiveEventsNow()
      if (activeEvents.length > 0) {
        return activeEvents[0]
      }
      return null
    } catch {
      return null
    }
  },

  async getById(id: string) {
    return pb.collection('cultos').getOne<CultoRecord>(id)
  },

  async create(data: Partial<CultoRecord>) {
    return pb.collection('cultos').create<CultoRecord>(data)
  },

  async update(id: string, data: Partial<CultoRecord>) {
    return pb.collection('cultos').update<CultoRecord>(id, data)
  },

  async archive(id: string) {
    return pb.collection('cultos').update<CultoRecord>(id, { status: 'arquivado' })
  },
}

export const presencesService = {
  async listByCulto(cultoId: string) {
    return pb.collection('presences').getFullList<PresenceRecord>({
      filter: `culto = "${cultoId}"`,
      sort: '-created',
      expand: 'person,culto',
    })
  },

  async listByPerson(personId: string) {
    return pb.collection('presences').getFullList<PresenceRecord>({
      filter: `person = "${personId}"`,
      sort: '-created',
      expand: 'culto',
    })
  },

  async create(data: Partial<PresenceRecord>) {
    return pb.collection('presences').create<PresenceRecord>(data)
  },

  async moveToCulto(presenceId: string, newCultoId: string) {
    return pb.collection('presences').update<PresenceRecord>(presenceId, {
      culto: newCultoId,
    })
  },

  async delete(id: string) {
    return pb.collection('presences').delete(id)
  },
}

export const followUpService = {
  async list(filter?: string) {
    return pb.collection('follow_up_tasks').getFullList<FollowUpTaskRecord>({
      filter: filter || '',
      sort: 'due_date',
      expand: 'person,responsible_person',
    })
  },

  async create(data: Partial<FollowUpTaskRecord>) {
    const due = new Date()
    due.setHours(due.getHours() + 48)
    return pb.collection('follow_up_tasks').create<FollowUpTaskRecord>({
      due_date: data.due_date || due.toISOString(),
      status: data.status || 'aberta',
      result: data.result || 'pendente',
      ...data,
    })
  },

  async update(id: string, data: Partial<FollowUpTaskRecord>) {
    return pb.collection('follow_up_tasks').update<FollowUpTaskRecord>(id, data)
  },

  async complete(
    id: string,
    result: 'mensagem_enviada' | 'conversou' | 'sem_resposta' | 'nao_quer_contato',
    notes?: string,
  ) {
    return pb.collection('follow_up_tasks').update<FollowUpTaskRecord>(id, {
      status: 'concluida',
      result,
      completed_at: new Date().toISOString(),
      notes,
    })
  },

  async reassign(id: string, responsibleName: string, responsiblePersonId?: string) {
    return pb.collection('follow_up_tasks').update<FollowUpTaskRecord>(id, {
      responsible_name: responsibleName,
      responsible_person: responsiblePersonId || undefined,
    })
  },
}

export const departmentsService = {
  async list(filter?: string) {
    return pb.collection('departments').getFullList<DepartmentRecord>({
      filter: filter || '',
      sort: 'unit_type,order_index,name',
      expand: 'parent_unit',
    })
  },

  async getById(id: string) {
    return pb.collection('departments').getOne<DepartmentRecord>(id, {
      expand: 'parent_unit',
    })
  },

  async create(data: Partial<DepartmentRecord>) {
    return pb.collection('departments').create<DepartmentRecord>({
      unit_type: data.unit_type || 'departamento',
      status: data.status || 'ativo',
      ...data,
    })
  },

  async update(id: string, data: Partial<DepartmentRecord>) {
    return pb.collection('departments').update<DepartmentRecord>(id, data)
  },

  async archive(id: string) {
    // Check if there are active assignments
    const activeAssignments = await pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: `(role.department = "${id}" || department = "${id}") && status = "ativa"`,
      expand: 'role',
    })
    if (activeAssignments.length > 0) {
      throw new Error(
        `Não é possível arquivar a unidade. Existem ${activeAssignments.length} atuação(ões) ativa(s) vinculadas. Encerre-as primeiro.`,
      )
    }
    return pb.collection('departments').update<DepartmentRecord>(id, { status: 'arquivado' })
  },

  // Roles (Funções)
  async listRoles(departmentId?: string) {
    const filter = departmentId ? `department = "${departmentId}"` : ''
    return pb.collection('department_roles').getFullList<DepartmentRoleRecord>({
      filter,
      sort: 'name',
      expand: 'department,department.parent_unit',
    })
  },

  async getRoleById(id: string) {
    return pb.collection('department_roles').getOne<DepartmentRoleRecord>(id, {
      expand: 'department',
    })
  },

  async createRole(data: Partial<DepartmentRoleRecord>) {
    return pb.collection('department_roles').create<DepartmentRoleRecord>({
      status: 'ativo',
      level: data.level || 'voluntario',
      ...data,
    })
  },

  async updateRole(id: string, data: Partial<DepartmentRoleRecord>) {
    return pb.collection('department_roles').update<DepartmentRoleRecord>(id, data)
  },

  async archiveRole(id: string) {
    const activeAssignments = await pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: `role = "${id}" && status = "ativa"`,
    })
    if (activeAssignments.length > 0) {
      throw new Error(
        `Não é possível arquivar a função. Existem ${activeAssignments.length} atuação(ões) ativa(s) vinculadas.`,
      )
    }
    return pb
      .collection('department_roles')
      .update<DepartmentRoleRecord>(id, { status: 'arquivado' })
  },
}

export const overlapRulesService = {
  async list() {
    return pb.collection('overlap_rules').getFullList<OverlapRuleRecord>({
      sort: 'name',
      expand: 'role_a,role_b,department_a,department_b',
    })
  },

  async create(data: Partial<OverlapRuleRecord>) {
    return pb.collection('overlap_rules').create<OverlapRuleRecord>(data)
  },

  async update(id: string, data: Partial<OverlapRuleRecord>) {
    return pb.collection('overlap_rules').update<OverlapRuleRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('overlap_rules').delete(id)
  },

  // Check if assigning person to targetRoleId violates any overlap rules
  async validateOverlap(
    personId: string,
    targetRoleId: string,
  ): Promise<{ allowed: boolean; blockingRule?: OverlapRuleRecord; warning?: string }> {
    try {
      const activeAssignments = await pb.collection('assignments').getFullList<AssignmentRecord>({
        filter: `person = "${personId}" && status = "ativa"`,
        expand: 'role,role.department',
      })

      if (activeAssignments.length === 0) {
        return { allowed: true }
      }

      const allRules = await pb.collection('overlap_rules').getFullList<OverlapRuleRecord>({
        expand: 'role_a,role_b,department_a,department_b',
      })

      const targetRole = await departmentsService.getRoleById(targetRoleId)
      const targetDeptId = targetRole.department

      for (const asg of activeAssignments) {
        const existingRoleId = asg.role
        const existingDeptId = asg.expand?.role?.department

        for (const rule of allRules) {
          // Check role-to-role match
          const matchesRoleA = rule.role_a === targetRoleId || rule.role_a === existingRoleId
          const matchesRoleB = rule.role_b === targetRoleId || rule.role_b === existingRoleId
          const directRoleMatch = matchesRoleA && matchesRoleB && rule.role_a && rule.role_b

          // Check dept-to-dept match
          const matchesDeptA =
            rule.department_a === targetDeptId || rule.department_a === existingDeptId
          const matchesDeptB =
            rule.department_b === targetDeptId || rule.department_b === existingDeptId
          const deptMatch =
            rule.department_a &&
            rule.department_b &&
            ((rule.department_a === targetDeptId && rule.department_b === existingDeptId) ||
              (rule.department_b === targetDeptId && rule.department_a === existingDeptId))

          // Check mixed match (e.g. role in dept A + role in dept B)
          if (directRoleMatch || deptMatch) {
            if (rule.rule_type === 'bloqueado') {
              return {
                allowed: false,
                blockingRule: rule,
              }
            }
          }
        }
      }

      return { allowed: true }
    } catch {
      return { allowed: true }
    }
  },
}

export const divergencesService = {
  async list(filter?: string) {
    return pb.collection('registration_divergences').getFullList<RegistrationDivergenceRecord>({
      filter: filter || '',
      sort: '-created',
      expand: 'person',
    })
  },

  async create(data: Partial<RegistrationDivergenceRecord>) {
    return pb.collection('registration_divergences').create<RegistrationDivergenceRecord>(data)
  },

  async resolve(
    id: string,
    status: 'aprovada' | 'rejeitada' | 'resolvida',
    resolvedBy: string,
    notes?: string,
  ) {
    return pb.collection('registration_divergences').update<RegistrationDivergenceRecord>(id, {
      status,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      notes,
    })
  },
}

export const assignmentsService = {
  async listByPerson(personId: string) {
    return pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: `person = "${personId}"`,
      sort: '-start_date',
      expand: 'role,role.department,department',
    })
  },

  async listActive(filter?: string) {
    const baseFilter = 'status = "ativa"'
    const finalFilter = filter ? `${baseFilter} && (${filter})` : baseFilter
    return pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: finalFilter,
      sort: '-start_date',
      expand: 'person,role,role.department,department',
    })
  },

  async create(data: {
    person: string
    role: string
    department?: string
    start_date: string
    end_date?: string
    notes?: string
    leadership_level?: 'voluntario' | 'lider' | 'vice_lider' | 'lideranca_adicional'
    requirements_checklist?: any[]
  }) {
    // R8 enforcement: Check if person is 'membro'
    const person = await personsService.getById(data.person)
    const currentStage = person.stage || (person.status === 'member' ? 'membro' : 'visitante')
    if (currentStage !== 'membro') {
      throw new Error('Regra R8: Só membros podem receber atuações em departamentos.')
    }

    // C1 Check: Atuação ativa só é válida se o C1 estiver concluído ou dispensado
    const c1Status = await coursesService.checkC1Status(data.person)
    if (!c1Status.hasC1OrWaiver) {
      throw new Error(
        'Requisito Igreja C1 obrigatório: A pessoa precisa ter o C1 concluído ou dispensa registrada pela Secretaria.',
      )
    }

    // Overlap validation (D19)
    const check = await overlapRulesService.validateOverlap(data.person, data.role)
    if (!check.allowed && check.blockingRule) {
      throw new Error(
        `Regra de sobreposição impeditiva (${check.blockingRule.name}): ${check.blockingRule.reason}`,
      )
    }

    return pb.collection('assignments').create<AssignmentRecord>({
      person: data.person,
      role: data.role,
      department: data.department || undefined,
      start_date: data.start_date,
      end_date: data.end_date || undefined,
      status: 'ativa',
      notes: data.notes,
      leadership_level: data.leadership_level || 'voluntario',
      requirements_checklist: data.requirements_checklist || [],
    })
  },

  async endAssignment(id: string, endDate?: string) {
    return pb.collection('assignments').update<AssignmentRecord>(id, {
      status: 'encerrada',
      end_date: endDate || new Date().toISOString(),
    })
  },

  // R9 enforcement: End all active assignments for a person when leaving membership
  async endAllForPerson(personId: string, reason: string) {
    const list = await pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: `person = "${personId}" && status = "ativa"`,
    })
    const now = new Date().toISOString()
    for (const asg of list) {
      await pb.collection('assignments').update(asg.id, {
        status: 'encerrada',
        end_date: now,
        notes: `Encerrada por saída de membresia: ${reason}`,
      })
    }
  },
}

export const churchSettingsService = {
  async list() {
    return pb.collection('church_settings').getFullList<ChurchSettingRecord>()
  },

  async getMap(): Promise<Record<string, string>> {
    const list = await pb.collection('church_settings').getFullList<ChurchSettingRecord>()
    const map: Record<string, string> = {
      r2_form_presence: '2',
      r4_frequentador_weeks_required: '3',
      r4_frequentador_window_weeks: '8',
      r10_absence_attention_weeks: '8',
    }
    for (const item of list) {
      map[item.key] = item.value
    }
    return map
  },

  async set(key: string, value: string) {
    try {
      const existing = await pb
        .collection('church_settings')
        .getFirstListItem<ChurchSettingRecord>(`key="${key}"`)
      return pb.collection('church_settings').update(existing.id, { value })
    } catch {
      return pb.collection('church_settings').create<ChurchSettingRecord>({ key, value })
    }
  },
}

export const familiesService = {
  async list(filter?: string) {
    return pb.collection('families').getFullList<FamilyRecord>({
      filter: filter || '',
      sort: 'name',
    })
  },

  async getById(id: string) {
    return pb.collection('families').getOne<FamilyRecord>(id)
  },

  async create(data: Partial<FamilyRecord>) {
    return pb.collection('families').create<FamilyRecord>(data)
  },

  async update(id: string, data: Partial<FamilyRecord>) {
    return pb.collection('families').update<FamilyRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('families').delete(id)
  },
}

export const invitesService = {
  async list(filter?: string) {
    return pb.collection('invites').getFullList<InviteRecord>({
      filter: filter || '',
      sort: '-created',
      expand: 'person',
    })
  },

  async getByToken(token: string) {
    return pb.collection('invites').getFirstListItem<InviteRecord>(`token="${token}"`, {
      expand: 'person',
    })
  },

  async create(data: Partial<InviteRecord>) {
    const token =
      data.token ||
      Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8)
    const now = new Date()
    now.setDate(now.getDate() + 7)
    return pb.collection('invites').create<InviteRecord>({
      token,
      email: data.email,
      whatsapp: data.whatsapp,
      role: data.role || 'member',
      person: data.person || undefined,
      used: false,
      expires: data.expires || now.toISOString(),
    })
  },

  async delete(id: string) {
    return pb.collection('invites').delete(id)
  },

  async claim(data: { token: string; password: string; name?: string; email: string }) {
    return pb.send('/backend/v1/invites/claim', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export const activitiesService = {
  async list(limit: number = 20) {
    return pb.collection('activities').getList<ActivityRecord>(1, limit, {
      sort: '-created',
      expand: 'person',
    })
  },

  async create(data: Partial<ActivityRecord>) {
    return pb.collection('activities').create<ActivityRecord>(data)
  },
}

// -------------------------------------------------------------
// FEATURE 1: REQUISITOS EM CAMADAS & DISPENSAS
// -------------------------------------------------------------
export const churchRequirementsService = {
  async list(filter?: string) {
    return pb.collection('church_requirements').getFullList<ChurchRequirementRecord>({
      filter: filter || '',
      sort: 'code',
      expand: 'course_linked',
    })
  },

  async getById(id: string) {
    return pb.collection('church_requirements').getOne<ChurchRequirementRecord>(id, {
      expand: 'course_linked',
    })
  },

  async create(data: Partial<ChurchRequirementRecord>) {
    return pb.collection('church_requirements').create<ChurchRequirementRecord>({
      is_active: data.is_active ?? true,
      is_default: data.is_default ?? false,
      ...data,
    })
  },

  async update(id: string, data: Partial<ChurchRequirementRecord>) {
    return pb.collection('church_requirements').update<ChurchRequirementRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('church_requirements').delete(id)
  },
}

export const requirementWaiversService = {
  async listByPerson(personId: string) {
    return pb.collection('requirement_waivers').getFullList<RequirementWaiverRecord>({
      filter: `person = "${personId}"`,
      sort: '-granted_at',
      expand: 'person',
    })
  },

  async list(filter?: string) {
    return pb.collection('requirement_waivers').getFullList<RequirementWaiverRecord>({
      filter: filter || '',
      sort: '-granted_at',
      expand: 'person',
    })
  },

  async create(data: {
    person: string
    requirement_type: 'igreja' | 'departamento' | 'funcao'
    requirement_id: string
    requirement_title: string
    reason: string
    granted_by: string
  }) {
    if (!data.reason.trim()) {
      throw new Error(
        'A dispensa de requisito exige justificativa detalhada registrada pela Secretaria.',
      )
    }
    return pb.collection('requirement_waivers').create<RequirementWaiverRecord>({
      ...data,
      granted_at: new Date().toISOString(),
    })
  },

  async delete(id: string) {
    return pb.collection('requirement_waivers').delete(id)
  },
}

// -------------------------------------------------------------
// FEATURE 3: MÓDULO MÍNIMO DE CURSOS
// -------------------------------------------------------------
export const coursesService = {
  async list(filter?: string) {
    return pb.collection('courses').getFullList<CourseRecord>({
      filter: filter || '',
      sort: 'name',
    })
  },

  async getById(id: string) {
    return pb.collection('courses').getOne<CourseRecord>(id)
  },

  async getByCode(code: string) {
    try {
      return await pb.collection('courses').getFirstListItem<CourseRecord>(`code = "${code}"`)
    } catch {
      return null
    }
  },

  async create(data: Partial<CourseRecord>) {
    return pb.collection('courses').create<CourseRecord>({
      is_active: data.is_active ?? true,
      ...data,
    })
  },

  async update(id: string, data: Partial<CourseRecord>) {
    return pb.collection('courses').update<CourseRecord>(id, data)
  },

  // Classes (Turmas)
  async listClasses(courseId?: string) {
    const filter = courseId ? `course = "${courseId}"` : ''
    return pb.collection('course_classes').getFullList<CourseClassRecord>({
      filter,
      sort: '-start_date',
      expand: 'course',
    })
  },

  async getOpenClasses(courseId?: string) {
    const base = 'status = "aberta"'
    const filter = courseId ? `${base} && course = "${courseId}"` : base
    return pb.collection('course_classes').getFullList<CourseClassRecord>({
      filter,
      sort: 'start_date',
      expand: 'course',
    })
  },

  async getClassById(id: string) {
    return pb.collection('course_classes').getOne<CourseClassRecord>(id, {
      expand: 'course',
    })
  },

  async createClass(data: Partial<CourseClassRecord>) {
    return pb.collection('course_classes').create<CourseClassRecord>({
      status: data.status || 'aberta',
      ...data,
    })
  },

  async updateClass(id: string, data: Partial<CourseClassRecord>) {
    return pb.collection('course_classes').update<CourseClassRecord>(id, data)
  },

  // Enrollments (Inscrições)
  async listEnrollments(classId?: string) {
    const filter = classId ? `course_class = "${classId}"` : ''
    return pb.collection('course_enrollments').getFullList<CourseEnrollmentRecord>({
      filter,
      sort: '-created',
      expand: 'person,course_class,course',
    })
  },

  async listEnrollmentsByPerson(personId: string) {
    return pb.collection('course_enrollments').getFullList<CourseEnrollmentRecord>({
      filter: `person = "${personId}"`,
      sort: '-created',
      expand: 'course_class,course,course_class.course',
    })
  },

  async enrollPerson(data: {
    course_class: string
    course?: string
    person: string
    notes?: string
  }) {
    // Check if already enrolled in this class
    const existing = await pb.collection('course_enrollments').getFullList<CourseEnrollmentRecord>({
      filter: `course_class = "${data.course_class}" && person = "${data.person}"`,
    })
    if (existing.length > 0) {
      if (existing[0].status === 'inscrito') {
        throw new Error('Pessoa já está inscrita nesta turma.')
      }
      if (existing[0].status === 'concluido') {
        throw new Error('Pessoa já concluiu este curso nesta turma.')
      }
      // Se estava desistente, reativa inscrição
      return pb.collection('course_enrollments').update<CourseEnrollmentRecord>(existing[0].id, {
        status: 'inscrito',
        enrollment_date: new Date().toISOString(),
      })
    }

    return pb.collection('course_enrollments').create<CourseEnrollmentRecord>({
      course_class: data.course_class,
      course: data.course,
      person: data.person,
      status: 'inscrito',
      enrollment_date: new Date().toISOString(),
      notes: data.notes || '',
    })
  },

  async markEnrollmentCompleted(id: string, completedByName: string, notes?: string) {
    return pb.collection('course_enrollments').update<CourseEnrollmentRecord>(id, {
      status: 'concluido',
      completion_date: new Date().toISOString(),
      completed_by: completedByName || 'Secretaria',
      notes,
    })
  },

  async markEnrollmentDropped(id: string, notes?: string) {
    return pb.collection('course_enrollments').update<CourseEnrollmentRecord>(id, {
      status: 'desistente',
      notes,
    })
  },

  // Helper: Verifica status do C1 para uma pessoa (concluído via turma ou dispensado pela secretaria)
  async checkC1Status(personId: string): Promise<{
    completed: boolean
    completionDate?: string
    completedRecord?: CourseEnrollmentRecord
    isEnrolled: boolean
    activeEnrollment?: CourseEnrollmentRecord
    isWaived: boolean
    waiverRecord?: RequirementWaiverRecord
    hasC1OrWaiver: boolean
  }> {
    try {
      const enrollments = await pb
        .collection('course_enrollments')
        .getFullList<CourseEnrollmentRecord>({
          filter: `person = "${personId}"`,
          sort: '-created',
          expand: 'course_class,course',
        })

      const completed = enrollments.find(
        (e) =>
          e.status === 'concluido' &&
          (e.course === 'c1' ||
            e.expand?.course?.code === 'c1' ||
            /c1/i.test(e.expand?.course?.name || '') ||
            /c1/i.test(e.expand?.course_class?.name || '')),
      )

      const activeEnr = enrollments.find(
        (e) =>
          e.status === 'inscrito' &&
          (e.course === 'c1' ||
            e.expand?.course?.code === 'c1' ||
            /c1/i.test(e.expand?.course?.name || '') ||
            /c1/i.test(e.expand?.course_class?.name || '')),
      )

      const waivers = await pb
        .collection('requirement_waivers')
        .getFullList<RequirementWaiverRecord>({
          filter: `person = "${personId}"`,
        })

      const c1Waiver = waivers.find(
        (w) =>
          w.requirement_id === 'c1_concluido' ||
          /c1/i.test(w.requirement_title) ||
          /c1/i.test(w.reason),
      )

      const isCompleted = !!completed
      const isWaived = !!c1Waiver
      const hasC1OrWaiver = isCompleted || isWaived

      return {
        completed: isCompleted,
        completionDate: completed?.completion_date,
        completedRecord: completed,
        isEnrolled: !!activeEnr,
        activeEnrollment: activeEnr,
        isWaived,
        waiverRecord: c1Waiver,
        hasC1OrWaiver,
      }
    } catch {
      return {
        completed: false,
        isEnrolled: false,
        isWaived: false,
        hasC1OrWaiver: false,
      }
    }
  },
}

// -------------------------------------------------------------
// FEATURE 2: JORNADA "QUERO SERVIR" & PERFIL DE SERVIÇO
// -------------------------------------------------------------
export const volunteerProfilesService = {
  async getByPerson(personId: string) {
    try {
      return await pb
        .collection('volunteer_profiles')
        .getFirstListItem<VolunteerProfileRecord>(`person = "${personId}"`, {
          expand: 'person',
        })
    } catch {
      return null
    }
  },

  async list(filter?: string) {
    return pb.collection('volunteer_profiles').getFullList<VolunteerProfileRecord>({
      filter: filter || '',
      sort: '-created',
      expand: 'person',
    })
  },

  async upsert(data: {
    person: string
    skills: string[]
    interested_departments: string[]
    availability: string
    notes?: string
    notify_when_c1_opens?: boolean
  }) {
    const existing = await this.getByPerson(data.person)
    if (existing) {
      return pb.collection('volunteer_profiles').update<VolunteerProfileRecord>(existing.id, {
        skills: data.skills,
        interested_departments: data.interested_departments,
        availability: data.availability,
        notes: data.notes,
        notify_when_c1_opens: data.notify_when_c1_opens ?? false,
      })
    } else {
      return pb.collection('volunteer_profiles').create<VolunteerProfileRecord>({
        person: data.person,
        skills: data.skills,
        interested_departments: data.interested_departments,
        availability: data.availability,
        notes: data.notes,
        notify_when_c1_opens: data.notify_when_c1_opens ?? false,
      })
    }
  },
}
