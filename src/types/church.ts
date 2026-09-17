import type { RecordModel } from 'pocketbase'

export type PersonStage = 'visitante' | 'frequentador' | 'membro' | 'desligado'
export type UserRole = 'secretary' | 'pastor' | 'leader' | 'member' | 'visitor'
export type PersonStatus = 'visitor' | 'attender' | 'member' | 'leader' | 'pastor'
export type FamilyRole = 'head' | 'spouse' | 'child' | 'other'

export interface FamilyRecord extends RecordModel {
  name: string
  address?: string
  notes?: string
  expand?: {
    'persons(family)'?: PersonRecord[]
  }
}

export interface PersonRecord extends RecordModel {
  name: string
  phone?: string
  whatsapp?: string
  email?: string
  birth_date?: string
  stage?: PersonStage
  status: PersonStatus
  family?: string
  family_role?: FamilyRole
  user?: string
  address?: string
  how_found?: string
  how_met?: string
  contact_authorized?: boolean
  contact_auth_date?: string
  contact_auth_by?: string
  no_contact?: boolean
  refuses_contact?: boolean
  baptism_date?: string
  baptism_location?: 'defesa_da_fe' | 'outra_igreja'
  baptism_church_name?: string
  ingress_date?: string
  ingress_form?: 'batismo' | 'profissao_de_fe' | 'transferencia' | 'aclamacao' | 'jurisdicao'
  provisional_number?: string
  rol_number?: string
  card_photo_status?: 'sem_foto' | 'pendente' | 'aprovada' | 'nova_foto'
  card_photo_url?: string
  exit_reason?: 'mudanca' | 'transferencia' | 'falecimento' | 'pedido_proprio' | 'outro'
  anonymized?: boolean
  notes?: string
  checklist_welcome_class?: boolean
  checklist_baptized?: boolean
  checklist_small_group?: boolean
  checklist_ministry?: boolean
  // D12, D14, Divergências & Familiares
  is_possible_relative?: boolean
  relative_phone_owner?: string
  device_token?: string
  full_form_completed?: boolean
  full_form_date?: string
  contact_preference?: 'whatsapp' | 'ligacao' | 'nenhum'
  expand?: {
    family?: FamilyRecord
    user?: {
      id: string
      email: string
      name: string
    }
    assignments?: AssignmentRecord[]
  }
}

export interface StageHistoryRecord extends RecordModel {
  person: string
  from_stage?: string
  to_stage: PersonStage
  date: string
  author_name?: string
  reason?: string
  expand?: {
    person?: PersonRecord
  }
}

export type UnitType = 'departamento' | 'subdepartamento' | 'supervisao'
export type UnitStatus = 'ativo' | 'arquivado'

export interface DepartmentRecord extends RecordModel {
  name: string
  code: string
  description?: string
  unit_type?: UnitType
  parent_unit?: string
  status?: UnitStatus
  order_index?: number
  expand?: {
    parent_unit?: DepartmentRecord
    subdepartments?: DepartmentRecord[]
  }
}

export interface RoleRequirement {
  id: string
  title: string
  description?: string
}

export interface DepartmentRoleRecord extends RecordModel {
  department: string
  name: string
  level: 'voluntario' | 'lider'
  permissions?: string
  description?: string
  status?: 'ativo' | 'arquivado'
  requirements?: RoleRequirement[]
  expand?: {
    department?: DepartmentRecord
  }
}

export interface RequirementChecklistItem {
  requirement_id: string
  title: string
  confirmed_by: string
  confirmed_at: string
}

export interface AssignmentRecord extends RecordModel {
  person: string
  role: string
  start_date: string
  end_date?: string
  status: 'ativa' | 'encerrada' | 'pausada'
  notes?: string
  leadership_level?: 'voluntario' | 'lider' | 'vice_lider' | 'lideranca_adicional'
  requirements_checklist?: RequirementChecklistItem[]
  department?: string
  expand?: {
    person?: PersonRecord
    role?: DepartmentRoleRecord
    department?: DepartmentRecord
  }
}

export interface OverlapRuleRecord extends RecordModel {
  name: string
  description?: string
  role_a?: string
  department_a?: string
  role_b?: string
  department_b?: string
  rule_type: 'bloqueado' | 'permitido' | 'aviso'
  reason: string
  created_by_name?: string
  expand?: {
    role_a?: DepartmentRoleRecord
    role_b?: DepartmentRoleRecord
    department_a?: DepartmentRecord
    department_b?: DepartmentRecord
  }
}

export interface CultoRecord extends RecordModel {
  name: string
  date_time: string
  end_time?: string
  tolerance_minutes_before?: number
  tolerance_minutes_after?: number
  is_regular?: boolean
  status: 'aberto' | 'arquivado'
  anonymous_count?: number
  notes?: string
}

export type PresenceOrigin = 'qr_code' | 'boas_vindas' | 'autoatendimento' | 'secretaria'

export interface PresenceRecord extends RecordModel {
  culto: string
  person: string
  modality: 'presencial' | 'online'
  presence_type: 'primeira_visita' | 'retorno' | 'membro_regular'
  registered_by_name?: string
  notes?: string
  origin?: PresenceOrigin
  device_token?: string
  expand?: {
    culto?: CultoRecord
    person?: PersonRecord
  }
}

export interface RegistrationDivergenceRecord extends RecordModel {
  person: string
  phone: string
  field_name: string
  current_value?: string
  submitted_value: string
  divergence_type: 'email_diferente' | 'nome_variacao' | 'nome_possivel_familiar' | 'outro'
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'resolvida'
  notes?: string
  resolved_by?: string
  resolved_at?: string
  expand?: {
    person?: PersonRecord
  }
}

export interface FollowUpTaskRecord extends RecordModel {
  person: string
  responsible_person?: string
  responsible_name?: string
  due_date: string
  status: 'aberta' | 'concluida' | 'cancelada'
  result?: 'pendente' | 'mensagem_enviada' | 'conversou' | 'sem_resposta' | 'nao_quer_contato'
  completed_at?: string
  notes?: string
  expand?: {
    person?: PersonRecord
    responsible_person?: PersonRecord
  }
}

export interface ChurchSettingRecord extends RecordModel {
  key: string
  value: string
  description?: string
}

export interface InviteRecord extends RecordModel {
  token: string
  email?: string
  whatsapp?: string
  role?: 'secretary' | 'pastor' | 'leader' | 'member'
  person?: string
  used?: boolean
  expires?: string
  expand?: {
    person?: PersonRecord
  }
}

export interface ActivityRecord extends RecordModel {
  title: string
  description?: string
  type:
    | 'visitor_signup'
    | 'journey_change'
    | 'invite_created'
    | 'invite_accepted'
    | 'meeting_report'
  person?: string
  expand?: {
    person?: PersonRecord
  }
}

// User active permissions derived from active assignments and stage
export interface UserPermissions {
  isSuperAdmin: boolean
  isSecretaria: boolean
  isPastor: boolean
  isBoasVindasLider: boolean
  isBoasVindasVoluntario: boolean
  isMember: boolean
  activeAssignments: AssignmentRecord[]
  canEditOfficialFields: boolean // Only secretaria
  canChangeStage: boolean // Only secretaria
  canConfirmFrequentador: boolean // Líder Boas-Vindas or Secretaria
  canManageAssignments: boolean // Secretaria + Líder em seus departamentos
  canRegisterPresence: boolean // Boas-Vindas voluntario/lider, Secretaria
  canViewAll: boolean // Pastor, Secretaria
  canOnlySeeVisitorsAndAttenders: boolean // Boas-Vindas
  // Estrutura permissions
  canManageDepartments: boolean // Secretaria cria/edita/arquiva/reorganiza
  canManageRoles: boolean // Secretaria em tudo, Líder na sua unidade
  canManageOverlaps: boolean // Secretaria global, Líder na sua unidade
}
