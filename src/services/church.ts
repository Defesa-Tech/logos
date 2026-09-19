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
  MonthlyAvailabilityRecord,
  BlockedPeriodRecord,
  ScaleRecord,
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

// Tolerâncias padrão configuráveis por tipo de evento (D11 refinado)
export const DEFAULT_TOLERANCES_BY_TYPE: Record<
  string,
  { before: number; after: number; defaultDurationHours: number }
> = {
  culto_domingo: { before: 60, after: 0, defaultDurationHours: 2 },
  culto_quarta: { before: 60, after: 0, defaultDurationHours: 1.5 },
  estudo_biblico: { before: 45, after: 0, defaultDurationHours: 1.5 },
  conferencia: { before: 90, after: 0, defaultDurationHours: 8 },
  vigilia: { before: 60, after: 0, defaultDurationHours: 5 },
  congresso: { before: 90, after: 0, defaultDurationHours: 10 },
  outro: { before: 60, after: 0, defaultDurationHours: 2 },
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

  // Obtém tolerâncias efetivas considerando o tipo de evento e customizações
  getEventTolerances(event: Partial<CultoRecord>) {
    const typeDef =
      DEFAULT_TOLERANCES_BY_TYPE[event.event_type || 'outro'] || DEFAULT_TOLERANCES_BY_TYPE.outro
    const tolBefore =
      event.tolerance_minutes_before !== undefined && event.tolerance_minutes_before !== null
        ? event.tolerance_minutes_before
        : typeDef.before
    const tolAfter =
      event.tolerance_minutes_after !== undefined && event.tolerance_minutes_after !== null
        ? event.tolerance_minutes_after
        : typeDef.after
    return { tolBefore, tolAfter, defaultDurationHours: typeDef.defaultDurationHours }
  },

  // Calcula se um evento pontual ou recorrente está ativo agora no momento 'targetDate'
  isEventActiveAt(
    c: CultoRecord,
    targetDate: Date = new Date(),
  ): { isActive: boolean; effectiveStartTime: Date; effectiveEndTime: Date } {
    const { tolBefore, tolAfter, defaultDurationHours } = this.getEventTolerances(c)
    const nowTime = targetDate.getTime()

    // 1. Caso Recorrente
    if (
      c.is_recurrent &&
      c.recurrence_days &&
      c.recurrence_days.length > 0 &&
      c.recurrence_start_time
    ) {
      const currentDay = targetDate.getDay() // 0=Dom, 1=Seg, ..., 6=Sab
      if (c.recurrence_days.includes(currentDay)) {
        const [startH, startM] = c.recurrence_start_time.split(':').map(Number)
        const effectiveStart = new Date(targetDate)
        effectiveStart.setHours(startH || 0, startM || 0, 0, 0)

        let effectiveEnd: Date
        if (c.recurrence_end_time) {
          const [endH, endM] = c.recurrence_end_time.split(':').map(Number)
          effectiveEnd = new Date(targetDate)
          effectiveEnd.setHours(endH || 0, endM || 0, 0, 0)
        } else {
          effectiveEnd = new Date(effectiveStart.getTime() + defaultDurationHours * 3600000)
        }

        const windowStart = effectiveStart.getTime() - tolBefore * 60000
        const windowEnd = effectiveEnd.getTime() + tolAfter * 60000

        if (nowTime >= windowStart && nowTime <= windowEnd) {
          return {
            isActive: true,
            effectiveStartTime: effectiveStart,
            effectiveEndTime: effectiveEnd,
          }
        }
      }
    }

    // 2. Caso Evento Específico por Data (ou base de data_time)
    if (c.date_time) {
      const start = new Date(c.date_time)
      const end = c.end_time
        ? new Date(c.end_time)
        : new Date(start.getTime() + defaultDurationHours * 3600000)
      const windowStart = start.getTime() - tolBefore * 60000
      const windowEnd = end.getTime() + tolAfter * 60000

      if (nowTime >= windowStart && nowTime <= windowEnd) {
        return { isActive: true, effectiveStartTime: start, effectiveEndTime: end }
      }
    }

    return {
      isActive: false,
      effectiveStartTime: new Date(c.date_time || targetDate),
      effectiveEndTime: new Date(c.end_time || targetDate),
    }
  },

  // Retorna todos os eventos em andamento na agenda agora (pontuais e recorrentes)
  async getActiveEventsNow(
    targetDate: Date = new Date(),
  ): Promise<Array<CultoRecord & { effectiveStartTime: Date; effectiveEndTime: Date }>> {
    try {
      const openEvents = await pb.collection('cultos').getFullList<CultoRecord>({
        filter: 'status = "aberto"',
        sort: 'date_time',
      })
      if (openEvents.length === 0) return []

      const active: Array<CultoRecord & { effectiveStartTime: Date; effectiveEndTime: Date }> = []

      for (const c of openEvents) {
        const check = this.isEventActiveAt(c, targetDate)
        if (check.isActive) {
          active.push({
            ...c,
            effectiveStartTime: check.effectiveStartTime,
            effectiveEndTime: check.effectiveEndTime,
          })
        }
      }

      return active
    } catch {
      return []
    }
  },

  // Regra de Desambiguação Automática (D11):
  // Quando múltiplos eventos tiverem janelas coincidentes, escolhe automaticamente
  // o evento cujo horário de início é o mais próximo do momento do registro.
  // Empates/ambiguidades restantes podem ser corrigidos depois pela Secretaria na lista.
  async resolveTargetEventAuto(targetDate: Date = new Date()): Promise<CultoRecord | null> {
    try {
      const activeEvents = await this.getActiveEventsNow(targetDate)
      if (activeEvents.length === 0) {
        return null
      }
      if (activeEvents.length === 1) {
        return activeEvents[0]
      }

      // Desambiguação automática: ordenar pela menor distância absoluta entre início e o momento do registro
      const targetTime = targetDate.getTime()
      activeEvents.sort((a, b) => {
        const diffA = Math.abs(a.effectiveStartTime.getTime() - targetTime)
        const diffB = Math.abs(b.effectiveStartTime.getTime() - targetTime)
        return diffA - diffB
      })

      return activeEvents[0]
    } catch {
      return null
    }
  },

  // Helper de compatibilidade
  async getActiveCultoNow(): Promise<CultoRecord | null> {
    return this.resolveTargetEventAuto()
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

  // Lista presenças sem evento (órfãs) para revisão e conciliação da secretaria
  async listOrphans() {
    return pb.collection('presences').getFullList<PresenceRecord>({
      filter: 'culto = "" || is_orphan = true',
      sort: '-created',
      expand: 'person,culto',
    })
  },

  async create(data: Partial<PresenceRecord>) {
    const isOrphan = !data.culto || data.culto.trim() === ''
    return pb.collection('presences').create<PresenceRecord>({
      ...data,
      is_orphan: isOrphan || !!data.is_orphan,
      culto: isOrphan ? '' : data.culto,
    })
  },

  // Vincula manualmente uma presença órfã a um evento da agenda (inclusive passado)
  async linkToCulto(presenceId: string, targetCultoId: string) {
    return pb.collection('presences').update<PresenceRecord>(presenceId, {
      culto: targetCultoId,
      is_orphan: false,
    })
  },

  // Mover presença de um culto para outro
  async moveToCulto(presenceId: string, newCultoId: string) {
    return pb.collection('presences').update<PresenceRecord>(presenceId, {
      culto: newCultoId,
      is_orphan: false,
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

// -------------------------------------------------------------
// GRUPO 3: ESCALAS & AGENDA SERVICE
// -------------------------------------------------------------
export const scalesService = {
  async listByPerson(personId: string) {
    return pb.collection('scales').getFullList<ScaleRecord>({
      filter: `person = "${personId}"`,
      sort: 'date_time',
      expand: 'culto,department,role',
    })
  },

  async listAll(filter?: string) {
    return pb.collection('scales').getFullList<ScaleRecord>({
      filter: filter || '',
      sort: 'date_time',
      expand: 'culto,person,department,role',
    })
  },

  async getNextByPerson(personId: string): Promise<ScaleRecord | null> {
    try {
      const nowIso = new Date().toISOString()
      const list = await pb.collection('scales').getList<ScaleRecord>(1, 1, {
        filter: `person = "${personId}" && date_time >= "${nowIso}"`,
        sort: 'date_time',
        expand: 'culto,department,role',
      })
      if (list.items.length > 0) return list.items[0]
      // Fallback: última escala se não houver futura
      const fallbackList = await pb.collection('scales').getList<ScaleRecord>(1, 1, {
        filter: `person = "${personId}"`,
        sort: '-date_time',
        expand: 'culto,department,role',
      })
      return fallbackList.items[0] || null
    } catch {
      return null
    }
  },

  async confirmPresence(id: string) {
    return pb.collection('scales').update<ScaleRecord>(id, {
      status: 'confirmado',
      confirmed_at: new Date().toISOString(),
    })
  },

  async create(data: Partial<ScaleRecord>) {
    return pb.collection('scales').create<ScaleRecord>({
      status: 'pendente',
      ...data,
    })
  },
}

// -------------------------------------------------------------
// GRUPO 3: DISPONIBILIDADE MENSAL & BLOQUEIO DE PERÍODOS
// -------------------------------------------------------------
export const availabilityService = {
  async getByPersonAndMonth(personId: string, yearMonth: string) {
    try {
      return await pb
        .collection('monthly_availabilities')
        .getFirstListItem<MonthlyAvailabilityRecord>(
          `person = "${personId}" && year_month = "${yearMonth}"`,
        )
    } catch {
      return null
    }
  },

  async saveMonthly(data: {
    person: string
    year_month: string
    mode: 'nao' | 'sim'
    marked_days: number[]
    reason_id?: string
    details?: string
  }) {
    const existing = await this.getByPersonAndMonth(data.person, data.year_month)
    if (existing) {
      return pb
        .collection('monthly_availabilities')
        .update<MonthlyAvailabilityRecord>(existing.id, {
          mode: data.mode,
          marked_days: data.marked_days,
          reason_id: data.reason_id,
          details: data.details,
        })
    } else {
      return pb.collection('monthly_availabilities').create<MonthlyAvailabilityRecord>({
        person: data.person,
        year_month: data.year_month,
        mode: data.mode,
        marked_days: data.marked_days,
        reason_id: data.reason_id,
        details: data.details,
      })
    }
  },

  // Períodos Bloqueados
  async listBlockedPeriods(personId: string) {
    return pb.collection('blocked_periods').getFullList<BlockedPeriodRecord>({
      filter: `person = "${personId}"`,
      sort: 'start_date',
      expand: 'person',
    })
  },

  async createBlockedPeriod(data: {
    person: string
    start_date: string
    end_date: string
    reason: 'ferias' | 'viagem' | 'trabalho' | 'estudos' | 'outro'
    description?: string
  }) {
    return pb.collection('blocked_periods').create<BlockedPeriodRecord>(data)
  },

  async deleteBlockedPeriod(id: string) {
    return pb.collection('blocked_periods').delete(id)
  },
}
