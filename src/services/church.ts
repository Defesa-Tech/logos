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

  // Find currently active culto within tolerance window (D11)
  async getActiveCultoNow(): Promise<CultoRecord | null> {
    try {
      const openCultos = await pb.collection('cultos').getFullList<CultoRecord>({
        filter: 'status = "aberto"',
        sort: '-date_time',
      })
      if (openCultos.length === 0) return null

      const now = new Date().getTime()

      // Check which open culto has the current time inside [start - tolerance, end + tolerance]
      for (const c of openCultos) {
        const start = new Date(c.date_time).getTime()
        const tolBefore = (c.tolerance_minutes_before ?? 60) * 60000
        const tolAfter = (c.tolerance_minutes_after ?? 60) * 60000

        let end = c.end_time ? new Date(c.end_time).getTime() : start + 2 * 3600000 // default 2 hours

        if (now >= start - tolBefore && now <= end + tolAfter) {
          return c
        }
      }

      // If only one open culto exists and was created today, return it as fallback
      if (openCultos.length === 1) {
        return openCultos[0]
      }

      return openCultos[0] || null
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
