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
    try {
      const records = await pb.collection('persons').getFullList<PersonRecord>({
        filter: `phone ~ "${clean}" || whatsapp ~ "${clean}"`,
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
  async list() {
    return pb.collection('departments').getFullList<DepartmentRecord>({
      sort: 'name',
    })
  },

  async listRoles(departmentId?: string) {
    const filter = departmentId ? `department = "${departmentId}"` : ''
    return pb.collection('department_roles').getFullList<DepartmentRoleRecord>({
      filter,
      sort: 'name',
      expand: 'department',
    })
  },
}

export const assignmentsService = {
  async listByPerson(personId: string) {
    return pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: `person = "${personId}"`,
      sort: '-start_date',
      expand: 'role,role.department',
    })
  },

  async listActive(filter?: string) {
    const baseFilter = 'status = "ativa"'
    const finalFilter = filter ? `${baseFilter} && (${filter})` : baseFilter
    return pb.collection('assignments').getFullList<AssignmentRecord>({
      filter: finalFilter,
      sort: '-start_date',
      expand: 'person,role,role.department',
    })
  },

  async create(data: {
    person: string
    role: string
    start_date: string
    end_date?: string
    notes?: string
  }) {
    // R8 enforcement: Check if person is 'membro'
    const person = await personsService.getById(data.person)
    const currentStage = person.stage || (person.status === 'member' ? 'membro' : 'visitante')
    if (currentStage !== 'membro') {
      throw new Error('Regra R8: Só membros podem receber atuações em departamentos.')
    }

    return pb.collection('assignments').create<AssignmentRecord>({
      person: data.person,
      role: data.role,
      start_date: data.start_date,
      end_date: data.end_date || undefined,
      status: 'ativa',
      notes: data.notes,
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
