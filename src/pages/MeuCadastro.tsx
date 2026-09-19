import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User,
  Users,
  Sparkles,
  Church,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Lock,
  Edit3,
  CreditCard,
  Plus,
  Check,
  ChevronRight,
  LogOut,
  AlertCircle,
  Clock,
  Briefcase,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  Baby,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  personsService,
  familiesService,
  volunteerProfilesService,
  assignmentsService,
} from '@/services/church'
import type {
  PersonRecord,
  FamilyRecord,
  VolunteerProfileRecord,
  AssignmentRecord,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

type TabType = 'dados' | 'vinculos' | 'talentos' | 'vida'

export default function MeuCadastro() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, currentPerson, refreshProfile, permissions, logout } = useAuth()

  // Tab ativa: da query (?aba=...) ou 'dados'
  const initialTab = (searchParams.get('aba') as TabType) || 'dados'
  const [activeTab, setActiveTab] = useState<TabType>(
    ['dados', 'vinculos', 'talentos', 'vida'].includes(initialTab) ? initialTab : 'dados',
  )

  // Atualiza query param ao mudar tab
  const setTab = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams({ aba: tab })
  }

  // Switch de pessoa para testes da Secretaria/Pastor
  const [allPersons, setAllPersons] = useState<PersonRecord[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')

  // Pessoa ativa
  const [person, setPerson] = useState<PersonRecord | null>(currentPerson)

  // Dados Pessoais (Editáveis)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [maritalStatus, setMaritalStatus] = useState<string>('casado')
  const [loading, setLoading] = useState(false)
  const [isEditingDados, setIsEditingDados] = useState(false)

  // Validação OTP por SMS/WhatsApp quando troca telefone (Regra R3 / J8)
  const [phoneCodeModalOpen, setPhoneCodeModalOpen] = useState(false)
  const [targetPhone, setTargetPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')

  // Vínculos Familiares
  const [family, setFamily] = useState<FamilyRecord | null>(null)
  const [familyMembers, setFamilyMembers] = useState<PersonRecord[]>([])
  const [addVinculoModalOpen, setAddVinculoModalOpen] = useState(false)
  const [newVinculoName, setNewVinculoName] = useState('')
  const [newVinculoRole, setNewVinculoRole] = useState<'spouse' | 'child' | 'other'>('spouse')
  const [newVinculoBirthDate, setNewVinculoBirthDate] = useState('')

  // Talentos
  const [volunteerProfile, setVolunteerProfile] = useState<VolunteerProfileRecord | null>(null)
  const [skillsList, setSkillsList] = useState<string[]>([])
  const [addTalentoModalOpen, setAddTalentoModalOpen] = useState(false)
  const [newTalentCategory, setNewTalentCategory] = useState<'musica' | 'tecnica' | 'outros'>(
    'musica',
  )
  const [newTalentName, setNewTalentName] = useState('')

  // Minha Vida na Igreja: Atuações / Escalas
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  // Datas comemorativas celebradas pela igreja
  const [comemorarAniversario, setComemorarAniversario] = useState(true)
  const [comemorarCasamento, setComemorarCasamento] = useState(true)
  const [comemorarBatismo, setComemorarBatismo] = useState(true)
  const [comemorarMembresia, setComemorarMembresia] = useState(false)

  // Carrega lista para secretaria/pastor
  useEffect(() => {
    if (permissions.canManageAssignments || permissions.isPastor) {
      personsService.list().then((list) => {
        setAllPersons(list)
        if (!selectedPersonId && list.length > 0) {
          setSelectedPersonId(currentPerson?.id || list[0].id)
        }
      })
    }
  }, [permissions, currentPerson])

  // Sincroniza pessoa ativa e carrega vínculos, talentos e atuações
  useEffect(() => {
    const active = allPersons.find((p) => p.id === selectedPersonId) || currentPerson || null
    setPerson(active)
    if (active) {
      setName(active.name || '')
      setPhone(active.phone || active.whatsapp || '')
      setEmail(active.email || user?.email || '')
      setAddress(active.address || '')
      setBirthDate(active.birth_date ? active.birth_date.slice(0, 10) : '')
      setMaritalStatus(active.marital_status || 'casado')

      // 1. Carrega dados de Família/Vínculos
      if (active.family) {
        familiesService
          .getById(active.family)
          .then((f) => {
            setFamily(f)
            // Carrega parentes no mesmo núcleo familiar
            personsService
              .list(`family = "${active.family}" && id != "${active.id}"`)
              .then((pList) => setFamilyMembers(pList))
          })
          .catch(() => {
            setFamily(null)
            setFamilyMembers([])
          })
      } else {
        setFamily(null)
        setFamilyMembers([])
      }

      // 2. Carrega Perfil de Talentos / Voluntariado
      volunteerProfilesService
        .getByPerson(active.id)
        .then((profile) => {
          setVolunteerProfile(profile)
          if (profile && profile.skills && profile.skills.length > 0) {
            setSkillsList(profile.skills)
          } else {
            setSkillsList([])
          }
        })
        .catch(() => {
          setVolunteerProfile(null)
          setSkillsList([])
        })

      // 3. Carrega Atuações em Departamentos (Onde eu sirvo)
      assignmentsService
        .listByPerson(active.id)
        .then((list) => {
          setAssignments(list.filter((a) => a.status === 'ativa'))
        })
        .catch(() => setAssignments([]))
    }
  }, [selectedPersonId, currentPerson, allPersons, user])

  // Salvar alterações nos dados pessoais
  const handleSaveDados = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return

    const oldPhone = (person.phone || person.whatsapp || '').replace(/\D/g, '')
    const newPhoneClean = phone.replace(/\D/g, '')

    // Se mudou o telefone, exige confirmação por código OTP (Regra R3 / J8)
    if (newPhoneClean && oldPhone && newPhoneClean !== oldPhone) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(code)
      setTargetPhone(phone)
      setPhoneCodeModalOpen(true)
      toast.info(`Código de validação SMS/WhatsApp simulado: ${code}`)
      return
    }

    try {
      setLoading(true)
      await personsService.update(person.id, {
        name,
        email,
        address,
        marital_status: maritalStatus as any,
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      })
      toast.success('Seus dados pessoais foram atualizados!')
      setIsEditingDados(false)
      await refreshProfile()
    } catch {
      toast.error('Erro ao atualizar dados.')
    } finally {
      setLoading(false)
    }
  }

  // Confirmação do OTP de telefone
  const handleConfirmPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode !== generatedOtp) {
      toast.error('Código de confirmação incorreto! Tente novamente.')
      return
    }
    if (!person) return

    try {
      await personsService.update(person.id, {
        name,
        email,
        phone: targetPhone,
        whatsapp: targetPhone,
        address,
        marital_status: maritalStatus as any,
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      })
      toast.success('Telefone confirmado e cadastro atualizado!')
      setPhoneCodeModalOpen(false)
      setIsEditingDados(false)
      setOtpCode('')
      await refreshProfile()
    } catch {
      toast.error('Erro ao salvar novo telefone.')
    }
  }

  // Adicionar talento real
  const handleAddTalent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person || !newTalentName.trim()) return

    const formattedTalent = `${newTalentCategory}:${newTalentName.trim()}`
    const updatedSkills = [...skillsList, formattedTalent]

    try {
      await volunteerProfilesService.upsert({
        person: person.id,
        skills: updatedSkills,
        interested_departments: volunteerProfile?.interested_departments || [],
        availability: volunteerProfile?.availability || 'finais_de_semana',
      })
      setSkillsList(updatedSkills)
      toast.success(`Talento "${newTalentName.trim()}" adicionado!`)
      setNewTalentName('')
      setAddTalentoModalOpen(false)
    } catch {
      toast.error('Erro ao salvar talento.')
    }
  }

  // Adicionar familiar / vínculo real
  const handleAddVinculo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person || !newVinculoName.trim()) return

    try {
      // Cria ou vincula família existente
      let familyId = person.family
      if (!familyId) {
        const newFam = await familiesService.create({
          name: `Família ${person.name.split(' ').slice(-1)[0] || 'Logos'}`,
          address: person.address,
        })
        familyId = newFam.id
        await personsService.update(person.id, {
          family: familyId,
          family_role: 'head',
        })
        setFamily(newFam)
      }

      // Cria a pessoa vinculada (familiar / criança sem cadastro próprio)
      const createdRelative = await personsService.create({
        name: newVinculoName.trim(),
        family: familyId,
        family_role: newVinculoRole,
        birth_date: newVinculoBirthDate ? new Date(newVinculoBirthDate).toISOString() : undefined,
        status: newVinculoRole === 'child' ? 'visitor' : 'attender',
        stage: 'visitante',
        is_possible_relative: true,
        relative_phone_owner: person.phone || person.whatsapp,
      })

      setFamilyMembers((prev) => [...prev, createdRelative])
      toast.success(`Familiar "${newVinculoName.trim()}" vinculado com sucesso!`)
      setNewVinculoName('')
      setNewVinculoBirthDate('')
      setAddVinculoModalOpen(false)
      await refreshProfile()
    } catch {
      toast.error('Erro ao adicionar familiar.')
    }
  }

  // Nome e iniciais do usuário
  const displayName = person?.name || user?.name || 'Ana Beatriz Rocha'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'AB'

  const matricula =
    person?.rol_number ||
    person?.provisional_number ||
    (person?.id ? `Nº ${person.id.slice(0, 5).toUpperCase()}` : 'Nº 0142')

  const anoMembro = person?.ingress_date
    ? new Date(person.ingress_date).getFullYear()
    : person?.created
      ? new Date(person.created).getFullYear()
      : '2019'

  // Formata data por extenso
  const formatDateExtenso = (iso?: string) => {
    if (!iso) return 'Não informada'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Não informada'
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Separa talentos por categoria
  const musicSkills = skillsList
    .filter((s) => s.startsWith('musica:') || !s.includes(':'))
    .map((s) => s.replace('musica:', ''))
  const techSkills = skillsList
    .filter((s) => s.startsWith('tecnica:'))
    .map((s) => s.replace('tecnica:', ''))
  const otherSkills = skillsList
    .filter((s) => s.startsWith('outros:'))
    .map((s) => s.replace('outros:', ''))

  const temTalentos = skillsList.length > 0

  return (
    <PageTransition className="space-y-6 max-w-5xl mx-auto pb-12 font-sans text-[#14161D]">
      {/* =========================================================================
          CABEÇALHO DA PÁGINA (Desktop e Celular)
          ========================================================================= */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3.5">
          <Link
            to="/"
            aria-label="Voltar para a página inicial"
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-white border-[1.5px] border-[#E1E3EB] rounded-[14px] text-[#3C4255] hover:bg-[#F2F1FB] hover:text-[#3A31CE] transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-[#14161D]">
              Meu perfil
            </h1>
            <p className="text-xs text-[#5A6072] hidden sm:block">
              Gerencie suas informações cadastrais, vínculos e histórico congregacional
            </p>
          </div>
        </div>

        {/* Alternador de pessoa para teste de secretaria/pastor */}
        {(permissions.canManageAssignments || permissions.isPastor) && allPersons.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="text-xs font-bold rounded-[14px] bg-white border border-[#E8EAF0] px-3 py-2 text-[#14161D] shadow-xs max-w-[180px] truncate"
            >
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stage || p.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* =========================================================================
          CARD DESTAQUE / BANNER DO PERFIL (ÍNDIGO #3A31CE)
          Mobile: Card clicável direto para Carteirinha (07_Meu_perfil_Celular.html)
          Desktop: Banner amplo com foto, dados oficiais e botões (08_Meu_perfil_Desktop.html)
          ========================================================================= */}
      {/* VERSÃO MOBILE: Card azul escuro que abre a Carteirinha */}
      <div className="block md:hidden">
        <Link
          to="/carteirinha"
          className="bg-[#3A31CE] hover:bg-[#2A23A6] rounded-[22px] p-5 flex items-center gap-4 text-white shadow-lg shadow-[#3A31CE]/20 transition-all select-none group"
        >
          <div className="w-16 h-16 flex-shrink-0 rounded-[18px] bg-white flex items-end justify-center overflow-hidden shadow-inner">
            {person?.card_photo_url ? (
              <img
                src={person.card_photo_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                width="52"
                height="52"
                viewBox="0 0 76 76"
                fill="none"
                aria-hidden="true"
                className="text-[#C2C7D6]"
              >
                <circle cx="38" cy="29" r="14" fill="currentColor" />
                <path d="M10 76 C12 58 23 48 38 48 C53 48 64 58 66 76 Z" fill="currentColor" />
              </svg>
            )}
          </div>
          <div className="flex-grow min-w-0 flex flex-col gap-1">
            <span className="text-[10.5px] font-bold tracking-[0.13em] uppercase opacity-80">
              Carteirinha de membro
            </span>
            <span className="font-heading text-lg font-semibold tracking-[-0.02em] leading-tight truncate">
              {displayName}
            </span>
            <span className="text-xs font-semibold opacity-85">
              Matrícula {matricula} &bull; desde {anoMembro}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* VERSÃO DESKTOP: Banner horizontal rico (08_Meu_perfil_Desktop.html) */}
      <div className="hidden md:flex items-center gap-6 p-6 bg-white border-[1.5px] border-[#E8EAF0] rounded-[22px] shadow-xs">
        <div className="w-20 h-20 flex-shrink-0 rounded-[22px] bg-[#F1F2F7] flex items-end justify-center overflow-hidden border border-[#E8EAF0]">
          {person?.card_photo_url ? (
            <img
              src={person.card_photo_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              width="68"
              height="68"
              viewBox="0 0 76 76"
              fill="none"
              aria-hidden="true"
              className="text-[#C2C7D6]"
            >
              <circle cx="38" cy="29" r="14" fill="currentColor" />
              <path d="M10 76 C12 58 23 48 38 48 C53 48 64 58 66 76 Z" fill="currentColor" />
            </svg>
          )}
        </div>
        <div className="flex-grow min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-2xl font-semibold tracking-[-0.025em] leading-tight text-[#14161D]">
              {displayName}
            </span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
              {person?.stage || person?.status || 'Membro'}
            </span>
          </div>
          <span className="text-sm font-semibold text-[#5A6072]">
            Membro &bull; Igreja Defesa da Fé
          </span>
          <span className="text-xs text-[#6B7183]">
            Matrícula {matricula} &bull; desde {anoMembro}
          </span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTab('dados')
              setIsEditingDados(true)
            }}
            className="h-12 px-5 rounded-[15px] bg-white border-[1.5px] border-[#D9DCE6] hover:bg-[#F2F1FB] text-[#3A31CE] font-sans text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar dados</span>
          </button>
          <Link
            to="/carteirinha"
            className="h-12 px-5 rounded-[15px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>Abrir carteirinha</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE ABAS / BOTÕES DE SELEÇÃO
          Desktop: Barra lateral esquerda ou tabs elegantes
          Mobile: Grid 2x2 com cards de navegação conforme HTML 07
          ========================================================================= */}
      {/* MOBILE GRID DE NAVEGAÇÃO "O que você quer ver" (07_Meu_perfil_Celular.html) */}
      <div className="block md:hidden space-y-3">
        <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183] block">
          O que você quer ver
        </span>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTab('dados')}
            className={`flex flex-col gap-3 p-4 rounded-[20px] border-[1.5px] text-left transition-all ${
              activeTab === 'dados'
                ? 'bg-[#F2F1FB] border-[#3A31CE] shadow-xs'
                : 'bg-white border-[#E8EAF0]'
            }`}
          >
            <div className="w-11 h-11 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14161D]">Dados pessoais</span>
              <span className="text-[12px] text-[#5A6072] leading-tight">Nome, contato</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab('vinculos')}
            className={`flex flex-col gap-3 p-4 rounded-[20px] border-[1.5px] text-left transition-all ${
              activeTab === 'vinculos'
                ? 'bg-[#F2F1FB] border-[#3A31CE] shadow-xs'
                : 'bg-white border-[#E8EAF0]'
            }`}
          >
            <div className="w-11 h-11 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14161D]">Vínculos</span>
              <span className="text-[12px] text-[#5A6072] leading-tight">
                {familyMembers.length} pessoas ligadas
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab('talentos')}
            className={`flex flex-col gap-3 p-4 rounded-[20px] border-[1.5px] text-left transition-all ${
              activeTab === 'talentos'
                ? 'bg-[#F2F1FB] border-[#3A31CE] shadow-xs'
                : 'bg-white border-[#E8EAF0]'
            }`}
          >
            <div className="w-11 h-11 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14161D]">Talentos</span>
              <span className="text-[12px] text-[#5A6072] leading-tight">
                {skillsList.length} cadastrados
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab('vida')}
            className={`flex flex-col gap-3 p-4 rounded-[20px] border-[1.5px] text-left transition-all ${
              activeTab === 'vida'
                ? 'bg-[#F2F1FB] border-[#3A31CE] shadow-xs'
                : 'bg-white border-[#E8EAF0]'
            }`}
          >
            <div className="w-11 h-11 rounded-[14px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
              <Church className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#14161D]">Vida na igreja</span>
              <span className="text-[12px] text-[#5A6072] leading-tight">Membresia e datas</span>
            </div>
          </button>
        </div>
      </div>

      {/* =========================================================================
          LAYOUT DESKTOP: Menu Lateral de Abas + Conteúdo Central (08_Meu_perfil_Desktop)
          ========================================================================= */}
      <div className="flex flex-col md:flex-row items-start gap-7">
        {/* SIDEBAR DE ABAS (DESKTOP) */}
        <div className="hidden md:flex flex-col gap-1 w-60 flex-shrink-0 bg-white p-2.5 rounded-[20px] border-[1.5px] border-[#E8EAF0] shadow-xs">
          <button
            type="button"
            onClick={() => setTab('dados')}
            className={`w-full h-12 px-3.5 rounded-[13px] flex items-center gap-3 text-sm font-sans transition-all cursor-pointer ${
              activeTab === 'dados'
                ? 'bg-[#F2F1FB] text-[#3A31CE] font-bold'
                : 'text-[#3C4255] hover:bg-[#FBFBFD] font-semibold'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados pessoais</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('vinculos')}
            className={`w-full h-12 px-3.5 rounded-[13px] flex items-center gap-3 text-sm font-sans transition-all cursor-pointer ${
              activeTab === 'vinculos'
                ? 'bg-[#F2F1FB] text-[#3A31CE] font-bold'
                : 'text-[#3C4255] hover:bg-[#FBFBFD] font-semibold'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Vínculos</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('talentos')}
            className={`w-full h-12 px-3.5 rounded-[13px] flex items-center gap-3 text-sm font-sans transition-all cursor-pointer ${
              activeTab === 'talentos'
                ? 'bg-[#F2F1FB] text-[#3A31CE] font-bold'
                : 'text-[#3C4255] hover:bg-[#FBFBFD] font-semibold'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Talentos</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('vida')}
            className={`w-full h-12 px-3.5 rounded-[13px] flex items-center gap-3 text-sm font-sans transition-all cursor-pointer ${
              activeTab === 'vida'
                ? 'bg-[#F2F1FB] text-[#3A31CE] font-bold'
                : 'text-[#3C4255] hover:bg-[#FBFBFD] font-semibold'
            }`}
          >
            <Church className="w-4 h-4" />
            <span>Vida na igreja</span>
          </button>

          <div className="h-[1px] my-2 bg-[#E8EAF0]" />

          <button
            type="button"
            onClick={logout}
            className="w-full h-12 px-3.5 rounded-[13px] flex items-center gap-3 text-sm font-sans text-red-600 hover:bg-red-50 font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>

        {/* =====================================================================
            CONTEÚDO DA ABA SELECIONADA
            ===================================================================== */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {/* ===================================================================
              ABA 1: DADOS PESSOAIS (10_Perfil_Dados_pessoais.html)
              =================================================================== */}
          {activeTab === 'dados' && (
            <div className="space-y-6">
              {/* Header da Seção */}
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-semibold text-[#14161D]">
                    Dados pessoais
                  </h2>
                  <p className="text-xs text-[#5A6072]">
                    Suas informações de identificação e contato registradas no Logos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDados(!isEditingDados)}
                  className="h-10 px-4 rounded-[14px] bg-white border-[1.5px] border-[#E1E3EB] text-[#3A31CE] font-bold text-xs flex items-center gap-1.5 hover:bg-[#F2F1FB] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingDados ? 'Cancelar edição' : 'Editar dados'}</span>
                </button>
              </div>

              {isEditingDados ? (
                /* FORMULÁRIO DE EDIÇÃO */
                <form
                  onSubmit={handleSaveDados}
                  className="bg-white rounded-[22px] p-6 border-[1.5px] border-[#E8EAF0] shadow-xs space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Nome Completo</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">
                        Telefone / WhatsApp (Identificador R3)
                      </Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(84) 98800-0000"
                        className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
                      />
                      <p className="text-[10.5px] text-[#6B7183]">
                        Mudança de número requer confirmação via SMS/WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">E-mail</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Estado Civil</Label>
                      <select
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        className="w-full h-10 rounded-[14px] bg-[#FBFBFD] border border-[#E8EAF0] px-3 font-medium text-[#14161D]"
                      >
                        <option value="solteiro">Solteiro(a)</option>
                        <option value="casado">Casado(a)</option>
                        <option value="viuvo">Viúvo(a)</option>
                        <option value="divorciado">Divorciado(a)</option>
                        <option value="uniao_estavel">União Estável</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Endereço Completo</Label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Rua, número, bairro, cidade/UF"
                        className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingDados(false)}
                      className="h-10 rounded-[14px] border-[#E8EAF0]"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-10 px-6 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold"
                    >
                      {loading ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* EXIBIÇÃO NO ESTILO FIEL AO HTML 10 */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bloco Identificação */}
                  <div className="space-y-2">
                    <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                      Identificação
                    </span>
                    <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          Nome completo
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D]">
                          {displayName}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          Data de nascimento
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D]">
                          {formatDateExtenso(person?.birth_date)}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          Estado civil
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D] capitalize">
                          {maritalStatus || 'Casada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Contato */}
                  <div className="space-y-2">
                    <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                      Contato
                    </span>
                    <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          Telefone / WhatsApp
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D]">
                          {phone || '(84) 98800-0000'}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          E-mail
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D]">
                          {email || user?.email || 'ana.rocha@exemplo.com'}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                          Endereço
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D] leading-snug">
                          {address || 'Rua das Acácias, 120 — Candelária, Natal/RN'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================
              ABA 2: VÍNCULOS FAMILIARES (11_Perfil_Vínculos.html)
              =================================================================== */}
          {activeTab === 'vinculos' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-semibold text-[#14161D]">
                    Vínculos
                  </h2>
                  <p className="text-xs text-[#5A6072]">
                    Familiares e dependentes associados ao seu núcleo na igreja
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddVinculoModalOpen(true)}
                  className="h-10 px-4 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar familiar</span>
                </button>
              </div>

              {/* LISTA DE VÍNCULOS NO VISUAL DE 11_Perfil_Vínculos.html */}
              {familyMembers.length > 0 ? (
                <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                  {familyMembers.map((m) => {
                    const mInitials =
                      m.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((x) => x[0].toUpperCase())
                        .join('') || 'FM'

                    const roleLabel =
                      m.family_role === 'spouse'
                        ? 'Cônjuge'
                        : m.family_role === 'child'
                          ? 'Filho(a)'
                          : 'Familiar'

                    return (
                      <div key={m.id} className="flex items-center gap-3.5 p-4 sm:px-5">
                        <span className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[#F2F1FB] font-heading text-xs font-bold text-[#3A31CE]">
                          {mInitials}
                        </span>
                        <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                          <span className="text-[15.5px] font-bold text-[#14161D] leading-tight truncate">
                            {m.name}
                          </span>
                          <span className="text-xs text-[#5A6072]">
                            {roleLabel} &bull; {m.stage || m.status || 'Sem cadastro próprio'}
                          </span>
                        </div>
                        <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F2F1FB] text-[#3A31CE]">
                          {m.stage === 'membro' ? 'Confirmado' : 'Vinculado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Estado com vínculos sugeridos/vazio conforme HTML 11 */
                <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                  <div className="flex items-center gap-3.5 p-4 sm:px-5">
                    <span className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[#F2F1FB] font-heading text-xs font-bold text-[#3A31CE]">
                      MV
                    </span>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15.5px] font-bold text-[#14161D] leading-tight">
                        Marcos Vinícius Alves
                      </span>
                      <span className="text-xs text-[#5A6072]">
                        Cônjuge desde 14/06/2014 &bull; Membro
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Confirmado
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 sm:px-5">
                    <span className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[#F3F4F9] font-heading text-xs font-bold text-[#5A6072]">
                      SA
                    </span>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15.5px] font-bold text-[#14161D] leading-tight">
                        Sofia Rocha Alves
                      </span>
                      <span className="text-xs text-[#5A6072]">
                        Filha &bull; 8 anos &bull; sem cadastro próprio
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6B7183] bg-gray-100 px-2.5 py-1 rounded-full">
                      Dependente
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 sm:px-5">
                    <span className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[#F3F4F9] font-heading text-xs font-bold text-[#5A6072]">
                      NR
                    </span>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15.5px] font-bold text-[#14161D] leading-tight">
                        Neusa Rocha
                      </span>
                      <span className="text-xs text-[#5A6072]">Mãe &bull; Frequentadora</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#FDF3E2] text-[#8A5300] text-[11px] font-bold">
                      Aguardando
                    </span>
                  </div>
                </div>
              )}

              {/* Botão de Adicionar Familiar (fiel a 11_Perfil_Vínculos.html) */}
              <button
                type="button"
                onClick={() => setAddVinculoModalOpen(true)}
                className="w-full h-[50px] flex items-center justify-center gap-2 bg-white border-[1.5px] border-[#D9DCE6] hover:border-[#3A31CE] rounded-[16px] text-[#3A31CE] font-sans text-sm font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar familiar</span>
              </button>

              <p className="text-xs text-[#5A6072] leading-relaxed">
                Vínculos com quem tem cadastro no Logos precisam de confirmação da outra pessoa.
                Crianças sem cadastro próprio existem apenas ligadas a você.
              </p>
            </div>
          )}

          {/* ===================================================================
              ABA 3: TALENTOS (12_Perfil_Talentos.html)
              =================================================================== */}
          {activeTab === 'talentos' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-semibold text-[#14161D]">
                    Talentos
                  </h2>
                  <p className="text-xs text-[#5A6072]">
                    Habilidades e dons que você disponibiliza para servir na obra
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddTalentoModalOpen(true)}
                  className="h-10 px-4 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar talento</span>
                </button>
              </div>

              {temTalentos ? (
                /* CARDS DE TALENTOS PREENCHIDOS (12_Perfil_Talentos.html) */
                <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
                  {/* Música */}
                  {musicSkills.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#6B7183]">
                        Música
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {musicSkills.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-3.5 py-2 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-xs font-bold"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Técnica */}
                  {techSkills.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#6B7183]">
                        Técnica
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {techSkills.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-3.5 py-2 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-xs font-bold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outros */}
                  {otherSkills.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[11px] font-bold tracking-[0.11em] uppercase text-[#6B7183]">
                        Outros
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {otherSkills.map((o, idx) => (
                          <span
                            key={idx}
                            className="px-3.5 py-2 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-xs font-bold"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ESTADO VAZIO EXATO CONFORME HTML 12 */
                <div className="bg-white border-[1.5px] border-dashed border-[#D9DCE6] rounded-[18px] p-8 sm:p-10 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#14161D] max-w-sm">
                    A igreja ainda não sabe o que você faz bem
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6072] max-w-md leading-relaxed">
                    Conte suas habilidades — instrumentos, idiomas, profissão, o que você gosta de
                    fazer. É assim que um líder sabe quem chamar quando a igreja precisa.
                  </p>
                </div>
              )}

              {/* Botão de Adicionar Talento no estilo institucional */}
              <button
                type="button"
                onClick={() => setAddTalentoModalOpen(true)}
                className="w-full h-[50px] flex items-center justify-center gap-2 bg-[#3A31CE] hover:bg-[#2A23A6] rounded-[16px] text-white font-sans text-sm font-bold shadow-md shadow-[#3A31CE]/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar talento</span>
              </button>

              <p className="text-xs text-[#5A6072]">
                Seus talentos são visíveis para a liderança dos departamentos, não para os outros
                membros.
              </p>
            </div>
          )}

          {/* ===================================================================
              ABA 4: MINHA VIDA NA IGREJA (13_Perfil_Minha_vida_na_igreja.html)
              =================================================================== */}
          {activeTab === 'vida' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-semibold text-[#14161D]">
                  Minha vida na igreja
                </h2>
                <p className="text-xs text-[#5A6072]">
                  Histórico oficial de membresia, batismo, datas festivas e atuação
                </p>
              </div>

              {/* BLOCO 1: REGISTROS DA IGREJA (13_Perfil_Minha_vida_na_igreja.html) */}
              <div className="space-y-2">
                <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                  Registros da igreja
                </span>
                <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                        Situação
                      </span>
                      <span className="text-[15.5px] font-semibold text-[#14161D]">
                        {person?.stage || person?.status || 'Membro'}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-xs font-bold">
                      Ativa
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-0.5">
                    <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                      Membro desde
                    </span>
                    <span className="text-[15.5px] font-semibold text-[#14161D]">
                      {person?.ingress_date
                        ? formatDateExtenso(person.ingress_date)
                        : `12 de outubro de ${anoMembro}`}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-0.5">
                    <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                      Forma de ingresso
                    </span>
                    <span className="text-[15.5px] font-semibold text-[#14161D] capitalize">
                      {person?.ingress_form
                        ? person.ingress_form.replace('_', ' ')
                        : 'Batismo nesta igreja'}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col gap-0.5">
                    <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#6B7183]">
                      Batismo
                    </span>
                    <span className="text-[15.5px] font-semibold text-[#14161D]">
                      {person?.baptism_date
                        ? formatDateExtenso(person.baptism_date)
                        : `12 de outubro de ${anoMembro}`}
                    </span>
                    <span className="text-xs text-[#5A6072]">
                      {person?.baptism_church_name || 'Igreja Defesa da Fé · Natal/RN'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#5A6072]">
                  São atos registrados pela igreja.{' '}
                  <Link to="/secretaria" className="text-[#3A31CE] font-bold hover:underline">
                    Pedir correção à Secretaria
                  </Link>
                </p>
              </div>

              {/* BLOCO 2: MINHAS DATAS / COMEMORAR (13_Perfil_Minha_vida_na_igreja.html) */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                    Minhas datas
                  </span>
                  <span className="text-[11.5px] font-bold text-[#6B7183]">Comemorar</span>
                </div>

                <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                  {/* Aniversário */}
                  <div className="p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[13px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-[#14161D]">Aniversário</span>
                      <span className="text-xs text-[#5A6072]">
                        {person?.birth_date ? formatDateExtenso(person.birth_date) : '14 de março'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={comemorarAniversario}
                      onChange={(e) => setComemorarAniversario(e.target.checked)}
                      aria-label="Comemorar meu aniversário"
                      className="w-5 h-5 rounded border-gray-300 text-[#3A31CE] focus:ring-[#3A31CE] accent-[#3A31CE] cursor-pointer"
                    />
                  </div>

                  {/* Casamento */}
                  <div className="p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[13px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-[#14161D]">Casamento</span>
                      <span className="text-xs text-[#5A6072]">
                        14 de junho &bull; Bodas na igreja
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={comemorarCasamento}
                      onChange={(e) => setComemorarCasamento(e.target.checked)}
                      aria-label="Comemorar aniversário de casamento"
                      className="w-5 h-5 rounded border-gray-300 text-[#3A31CE] focus:ring-[#3A31CE] accent-[#3A31CE] cursor-pointer"
                    />
                  </div>

                  {/* Batismo */}
                  <div className="p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[13px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                      <Baby className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-[#14161D]">Batismo</span>
                      <span className="text-xs text-[#5A6072]">
                        12 de outubro &bull; Comemoração espiritual
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={comemorarBatismo}
                      onChange={(e) => setComemorarBatismo(e.target.checked)}
                      aria-label="Comemorar aniversário de batismo"
                      className="w-5 h-5 rounded border-gray-300 text-[#3A31CE] focus:ring-[#3A31CE] accent-[#3A31CE] cursor-pointer"
                    />
                  </div>

                  {/* Membresia */}
                  <div className="p-4 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-[13px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-[#14161D]">Membresia</span>
                      <span className="text-xs text-[#5A6072]">
                        12 de outubro &bull; Aniversário congregacional
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={comemorarMembresia}
                      onChange={(e) => setComemorarMembresia(e.target.checked)}
                      aria-label="Comemorar aniversário de membresia"
                      className="w-5 h-5 rounded border-gray-300 text-[#3A31CE] focus:ring-[#3A31CE] accent-[#3A31CE] cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-xs text-[#5A6072]">
                  A igreja só comemora as datas marcadas. Aniversário e casamento vêm do seu
                  cadastro e dos seus vínculos.
                </p>
              </div>

              {/* BLOCO 3: ONDE EU SIRVO (13_Perfil_Minha_vida_na_igreja.html) */}
              <div className="space-y-2">
                <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
                  Onde eu sirvo
                </span>

                {assignments.length > 0 ? (
                  <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                    {assignments.map((asg) => (
                      <Link
                        key={asg.id}
                        to="/departamentos"
                        className="flex items-center justify-between p-4 hover:bg-[#F2F1FB] transition-colors group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#3A31CE]">
                            {asg.expand?.role?.expand?.department?.name || 'Departamento'}
                          </span>
                          <span className="text-[15.5px] font-semibold text-[#14161D] group-hover:text-[#3A31CE] transition-colors">
                            {asg.expand?.role?.name || 'Voluntário'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  /* Demonstração visual com link para Quero Servir */
                  <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[18px] divide-y divide-[#F0F1F5] shadow-xs">
                    <Link
                      to="/departamentos"
                      className="flex items-center justify-between p-4 hover:bg-[#F2F1FB] transition-colors group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#3A31CE]">
                          Música
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D] group-hover:text-[#3A31CE] transition-colors">
                          Baterista
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <Link
                      to="/departamentos"
                      className="flex items-center justify-between p-4 hover:bg-[#F2F1FB] transition-colors group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-[#3A31CE]">
                          Mídia
                        </span>
                        <span className="text-[15.5px] font-semibold text-[#14161D] group-hover:text-[#3A31CE] transition-colors">
                          Técnica de áudio
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9AA0B2] group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[#5A6072]">Deseja atuar em outro departamento?</span>
                  <Link to="/quero-servir" className="font-bold text-[#3A31CE] hover:underline">
                    Ver jornada Quero Servir &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: OTP TROCA DE TELEFONE (Regra R3 / J8)
          ========================================================================= */}
      <Dialog open={phoneCodeModalOpen} onOpenChange={setPhoneCodeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 border-[#E8EAF0] shadow-2xl">
          <DialogHeader className="border-b border-[#E8EAF0] pb-3">
            <DialogTitle className="font-heading text-lg font-semibold text-[#14161D]">
              Confirmação de Novo Telefone
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmPhoneChange} className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 bg-[#F2F1FB] border border-[#DAD7F3] rounded-[16px] text-xs text-[#3A31CE] space-y-1">
              <span className="font-bold block">Segurança do Cadastro (Regra R3)</span>
              <span className="text-[#5A6072]">
                Como o telefone é o identificador único da pessoa na presença dos cultos, digite o
                código de 6 dígitos enviado para <strong>{targetPhone}</strong>:
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Código de 6 Dígitos</Label>
              <Input
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Ex: 123456"
                className="h-12 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0] text-center text-lg font-bold tracking-widest text-[#3A31CE]"
              />
              <p className="text-[11px] text-emerald-700 text-center font-semibold pt-1">
                (Código simulado para teste: <strong>{generatedOtp}</strong>)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold"
            >
              Validar código e salvar telefone
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: ADICIONAR FAMILIAR / VÍNCULO
          ========================================================================= */}
      <Dialog open={addVinculoModalOpen} onOpenChange={setAddVinculoModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 border-[#E8EAF0] shadow-2xl">
          <DialogHeader className="border-b border-[#E8EAF0] pb-3">
            <DialogTitle className="font-heading text-lg font-semibold text-[#14161D]">
              Adicionar Familiar ao Vínculo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddVinculo} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Nome Completo do Familiar</Label>
              <Input
                required
                value={newVinculoName}
                onChange={(e) => setNewVinculoName(e.target.value)}
                placeholder="Ex: Sofia Rocha Alves"
                className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Grau de Parentesco</Label>
              <select
                value={newVinculoRole}
                onChange={(e) => setNewVinculoRole(e.target.value as any)}
                className="w-full h-10 rounded-[14px] bg-[#FBFBFD] border border-[#E8EAF0] px-3 font-medium text-[#14161D]"
              >
                <option value="spouse">Cônjuge</option>
                <option value="child">Filho(a) / Dependente</option>
                <option value="other">Pai, Mãe ou Outro Parente</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Data de Nascimento (opcional)</Label>
              <Input
                type="date"
                value={newVinculoBirthDate}
                onChange={(e) => setNewVinculoBirthDate(e.target.value)}
                className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
              />
            </div>

            <p className="text-[11.5px] text-[#5A6072] leading-relaxed">
              Crianças e dependentes sem cadastro próprio ficam vinculados diretamente ao seu núcleo
              familiar.
            </p>

            <Button
              type="submit"
              className="w-full h-11 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold"
            >
              Adicionar familiar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: ADICIONAR TALENTO
          ========================================================================= */}
      <Dialog open={addTalentoModalOpen} onOpenChange={setAddTalentoModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 border-[#E8EAF0] shadow-2xl">
          <DialogHeader className="border-b border-[#E8EAF0] pb-3">
            <DialogTitle className="font-heading text-lg font-semibold text-[#14161D]">
              Adicionar Habilidade ou Talento
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddTalent} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Categoria</Label>
              <select
                value={newTalentCategory}
                onChange={(e) => setNewTalentCategory(e.target.value as any)}
                className="w-full h-10 rounded-[14px] bg-[#FBFBFD] border border-[#E8EAF0] px-3 font-medium text-[#14161D]"
              >
                <option value="musica">Música (instrumentos, vocal)</option>
                <option value="tecnica">Técnica (mesa de som, projeção, vídeo)</option>
                <option value="outros">Outros (idiomas, primeiros socorros, etc.)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-[#14161D]">Nome da Habilidade</Label>
              <Input
                required
                value={newTalentName}
                onChange={(e) => setNewTalentName(e.target.value)}
                placeholder="Ex: Bateria, Mesa de som, Espanhol..."
                className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0]"
              />
            </div>

            <p className="text-[11.5px] text-[#5A6072] leading-relaxed">
              Esses talentos serão disponibilizados para a liderança de departamentos nos processos
              de voluntariado e escalas.
            </p>

            <Button
              type="submit"
              className="w-full h-11 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold"
            >
              Salvar talento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
