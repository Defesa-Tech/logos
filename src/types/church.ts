import type { RecordModel } from 'pocketbase'

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
  whatsapp?: string
  email?: string
  birth_date?: string
  status: PersonStatus
  family?: string
  family_role?: FamilyRole
  user?: string
  how_met?: string
  notes?: string
  checklist_welcome_class?: boolean
  checklist_baptized?: boolean
  checklist_small_group?: boolean
  checklist_ministry?: boolean
  expand?: {
    family?: FamilyRecord
    user?: {
      id: string
      email: string
      name: string
    }
  }
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
