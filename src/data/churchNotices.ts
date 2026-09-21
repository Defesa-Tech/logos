// Dados e serviço centralizado de Avisos da Igreja Logos
// Fiel às telas 24 (Avisos Celular) e 25 (Avisos Desktop) do design original.
// Reutilizável na Home (Index.tsx) e na nova rota (/avisos).

export type NoticeCategory =
  | 'escalas' // Escalas e confirmações (ícone calendário)
  | 'igreja' // Comunicados e campanhas da secretaria (ícone megafone/anúncio)
  | 'departamento' // Atividades e ensaios ministeriais (ícone alarme/informação)
  | 'cadastro' // Alterações cadastrais e dados do usuário (ícone perfil/info)

export type NoticePeriod = 'hoje' | 'esta_semana' | 'anteriores'

export interface ChurchNoticeItem {
  id: string
  title: string
  description: string
  timeAgo: string
  period: NoticePeriod
  category: NoticeCategory
  read: boolean
  actionLabel?: string
  actionLink?: string
  // Estilo visual de ícone no design original:
  // 'white' = fundo branco com cor #3A31CE
  // 'amber' = fundo #FDF3E2 com cor #8A5300
  // 'gray' = fundo #F1F2F7 com cor #5A6072
  iconVariant?: 'accent' | 'amber' | 'gray'
  publishedAt?: string
}

export interface UserNoticePreferences {
  escalas: boolean
  igreja: boolean
  departamento: boolean
  cadastro: boolean
}

export const DEFAULT_NOTICE_PREFERENCES: UserNoticePreferences = {
  escalas: true,
  igreja: true, // Avisos da igreja não podem ser desligados por completo
  departamento: true,
  cadastro: false,
}

// 7 avisos fiéis às telas 24 e 25 do design original
export const INITIAL_CHURCH_NOTICES: ChurchNoticeItem[] = [
  {
    id: 'aviso-1',
    title: 'Escala de outubro publicada',
    description: 'Você está em 2 cultos. Confira e confirme sua presença.',
    timeAgo: 'há 2 horas',
    period: 'hoje',
    category: 'escalas',
    read: false,
    actionLabel: 'Ver minha escala',
    actionLink: '/agenda',
    iconVariant: 'accent',
  },
  {
    id: 'aviso-2',
    title: 'Campanha do agasalho',
    description: 'Entregue suas doações na secretaria até 30/09.',
    timeAgo: 'há 5 horas',
    period: 'hoje',
    category: 'igreja',
    read: false,
    iconVariant: 'amber',
  },
  {
    id: 'aviso-3',
    title: 'Confirme sua presença',
    description: 'Bateria · Culto da Manhã, domingo 20/09 às 09h00.',
    timeAgo: 'quinta, 17/09',
    period: 'esta_semana',
    category: 'escalas',
    read: false,
    actionLabel: 'Confirmar presença',
    actionLink: '/agenda',
    iconVariant: 'accent',
  },
  {
    id: 'aviso-4',
    title: 'Ensaio de sábado mudou de horário',
    description: 'O ensaio da Música passou de 19h00 para 19h30. Aviso do Rafael Lima.',
    timeAgo: 'quarta, 16/09',
    period: 'esta_semana',
    category: 'departamento',
    read: true,
    iconVariant: 'amber',
  },
  {
    id: 'aviso-5',
    title: 'Seus dados de contato foram atualizados',
    description: 'Telefone alterado por você em 15/09.',
    timeAgo: 'terça, 15/09',
    period: 'esta_semana',
    category: 'cadastro',
    read: true,
    actionLabel: 'Revisar cadastro',
    actionLink: '/meu-cadastro',
    iconVariant: 'gray',
  },
  {
    id: 'aviso-6',
    title: 'Santa Ceia em 27 de setembro',
    description: 'No Culto de Celebração, às 18h00.',
    timeAgo: '12/09',
    period: 'anteriores',
    category: 'igreja',
    read: true,
    iconVariant: 'amber',
  },
  {
    id: 'aviso-7',
    title: 'Você entrou no departamento de Mídia',
    description: 'Função: Técnica de áudio.',
    timeAgo: '02/09',
    period: 'anteriores',
    category: 'departamento',
    read: true,
    iconVariant: 'gray',
  },
]

const STORAGE_KEY_NOTICES = 'logos_church_notices_v1'
const STORAGE_KEY_PREFS = 'logos_notice_prefs_v1'

export const churchNoticesService = {
  getAll(): ChurchNoticeItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTICES)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_CHURCH_NOTICES
  },

  saveAll(items: ChurchNoticeItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(items))
    } catch {
      // ignore
    }
  },

  markAsRead(id: string): ChurchNoticeItem[] {
    const list = this.getAll().map((item) => (item.id === id ? { ...item, read: true } : item))
    this.saveAll(list)
    return list
  },

  markAllAsRead(): ChurchNoticeItem[] {
    const list = this.getAll().map((item) => ({ ...item, read: true }))
    this.saveAll(list)
    return list
  },

  getUnreadCount(): number {
    return this.getAll().filter((item) => !item.read).length
  },

  getPreferences(): UserNoticePreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFS)
      if (raw) {
        return { ...DEFAULT_NOTICE_PREFERENCES, ...JSON.parse(raw), igreja: true }
      }
    } catch {
      // fallback
    }
    return DEFAULT_NOTICE_PREFERENCES
  },

  savePreferences(prefs: UserNoticePreferences): UserNoticePreferences {
    const safe = { ...prefs, igreja: true } // Avisos da igreja não podem ser desligados por completo
    try {
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(safe))
    } catch {
      // ignore
    }
    return safe
  },
}
