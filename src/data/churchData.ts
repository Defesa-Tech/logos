// Constantes institucionais da Igreja Defesa da Fé
// Editável, reutilizável e centralizado para telas de Igreja, Quem Somos e Página Pública.

export interface RecurrentService {
  dayOfWeekShort: string
  dayOfWeekFull: string
  name: string
  time: string
  description?: string
}

export interface ChurchPillar {
  number: number
  title: string
  description: string
}

export interface ChurchLeader {
  name: string
  role: string
  avatarInitials: string
}

export interface ChurchFAQItem {
  question: string
  answer: string
}

export const CHURCH_PROFILE = {
  name: 'Igreja Defesa da Fé',
  shortName: 'Defesa da Fé',
  campus: 'Templo Sede',
  city: 'Natal',
  state: 'RN',
  cityState: 'Natal/RN',
  fullAddress: 'Rua da Paz, 100 — Candelária, Natal/RN',
  streetAndNumber: 'Rua da Paz, 100',
  neighborhood: 'Candelária',
  cep: '59065-000',
  googleMapsUrl: 'https://maps.google.com/?q=Igreja+Defesa+da+Fe+Natal+RN',

  // Secretaria e contato
  secretariaHours: 'Seg a sex, 14h às 18h',
  secretariaPhone: '(84) 3200-1000',
  secretariaWhatsapp: '(84) 98800-0000',
  secretariaEmail: 'secretaria@defesadafe.org.br',

  // Contribuição financeira
  pixKey: 'contato@defesadafe.org.br',
  pixType: 'E-mail / Chave PIX',
  bankInfo: 'Banco Cora (403) · Agência 0001 · C/C 1234567-8',

  // Identidade institucional (Quem somos / Em que cremos)
  tagline: 'Uma comunidade centrada no Evangelho, na verdade das Escrituras e no amor ao próximo.',
  heroHeadline: 'Uma igreja bíblica, acolhedora e comprometida com o Evangelho.',
  heroDescription:
    'Adoramos ao Senhor com reverência, pregamos a Palavra com fidelidade expositiva e caminhamos como família em Cristo.',

  // Base doutrinária
  doctrineBase:
    'Somos uma igreja cristã fundamentada nas Sagradas Escrituras como nossa única e suficiente regra de fé e prática. Proclamamos a salvação exclusivamente pela graça mediante a fé em Jesus Cristo, promovendo comunhão fraterna, adoração bíblica e engajamento social ativo.',

  // Visão
  vision:
    'Ser uma igreja viva e fiel, que glorifica a Deus gerando discípulos maduros e servindo a nossa cidade.',

  // Pilares institucionais
  pillars: [
    {
      number: 1,
      title: 'Fidelidade às Escrituras',
      description:
        'Ensino bíblico expositivo consistente que transforma corações e orienta todas as decisões da igreja.',
    },
    {
      number: 2,
      title: 'Comunhão & Discipulado',
      description:
        'Vida compartilhada em pequenos grupos e ministérios onde ninguém caminha sozinho na fé.',
    },
    {
      number: 3,
      title: 'Serviço com Propósito',
      description:
        'Cada membro descobre seus dons e serve com zelo na adoração, no cuidado infantil e na ação social.',
    },
  ] as ChurchPillar[],

  // Horários recorrentes dos cultos semanais
  services: [
    {
      dayOfWeekShort: 'Dom',
      dayOfWeekFull: 'Domingo',
      name: 'Culto da Manhã',
      time: '09h00',
      description: 'Adoração matutina e comunhão da família.',
    },
    {
      dayOfWeekShort: 'Dom',
      dayOfWeekFull: 'Domingo',
      name: 'Culto de Celebração',
      time: '18h00',
      description: 'Celebração da Palavra e Ceia do Senhor.',
    },
    {
      dayOfWeekShort: 'Qua',
      dayOfWeekFull: 'Quarta-feira',
      name: 'Culto de Oração & Doutrina',
      time: '19h30',
      description: 'Intercessão comunitária e aprofundamento bíblico.',
    },
    {
      dayOfWeekShort: 'Sáb',
      dayOfWeekFull: 'Sábado',
      name: 'Estudo Bíblico & Encontros',
      time: '16h00',
      description: 'Estudos temáticos, juventude e ensaios ministeriais.',
    },
  ] as RecurrentService[],

  // Informações para novos visitantes (Página Pública)
  firstVisitInfo: [
    {
      question: 'Quanto tempo dura?',
      answer:
        'Aproximadamente 1h30 com louvor congregacional, oração e pregação bíblica expositiva.',
    },
    {
      question: 'E as crianças?',
      answer:
        'Temos espaço infantil seguro com equipe treinada e atividades bíblicas durante todos os cultos de domingo.',
    },
    {
      question: 'Estacionamento',
      answer:
        'Estacionamento próprio no local, com orientadores e vagas preferenciais para idosos e gestantes.',
    },
  ] as ChurchFAQItem[],

  // Liderança Pastoral de referência
  leaders: [
    {
      name: 'Pr. Marcos Andrade',
      role: 'Pastor Presidente',
      avatarInitials: 'MA',
    },
    {
      name: 'Clériston Lima',
      role: 'Líder Geral de Ministérios',
      avatarInitials: 'CL',
    },
    {
      name: 'Rafael Lima',
      role: 'Líder de Música & Adoração',
      avatarInitials: 'RL',
    },
    {
      name: 'Ana Rocha',
      role: 'Secretaria & Acolhimento',
      avatarInitials: 'AR',
    },
  ] as ChurchLeader[],
}
