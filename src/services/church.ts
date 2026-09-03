import pb from '@/lib/pocketbase/client'
import type { PersonRecord, FamilyRecord, InviteRecord, ActivityRecord } from '@/types/church'

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

  async create(data: Partial<PersonRecord>) {
    return pb.collection('persons').create<PersonRecord>(data)
  },

  async update(id: string, data: Partial<PersonRecord>) {
    return pb.collection('persons').update<PersonRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('persons').delete(id)
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

  async generate(data: { personId?: string; email?: string; whatsapp?: string; role?: string }) {
    // Call server endpoint or fallback to client create
    try {
      const res = await pb.send<{ success: boolean; token: string; inviteId: string }>(
        '/backend/v1/invites/create',
        {
          method: 'POST',
          body: data,
        },
      )
      return res
    } catch {
      // Fallback in case endpoint is blocked or direct record creation is used
      const token =
        Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8)
      const now = new Date()
      now.setDate(now.getDate() + 7)
      const inv = await pb.collection('invites').create<InviteRecord>({
        token,
        email: data.email,
        whatsapp: data.whatsapp,
        role: (data.role as 'member') || 'member',
        person: data.personId || undefined,
        used: false,
        expires: now.toISOString(),
      })
      return { success: true, token: inv.token, inviteId: inv.id }
    }
  },

  async claim(data: { token: string; password: string; name?: string; email?: string }) {
    try {
      const res = await pb.send<{ success: boolean; message: string; email: string }>(
        '/backend/v1/invites/claim',
        {
          method: 'POST',
          body: data,
        },
      )
      return res
    } catch (err: unknown) {
      // If endpoint error, throw formatted message
      const msg = (err as { data?: { error?: string } })?.data?.error || 'Erro ao resgatar convite'
      throw new Error(msg)
    }
  },

  async delete(id: string) {
    return pb.collection('invites').delete(id)
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
