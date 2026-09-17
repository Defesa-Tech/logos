import React, { useState, useEffect } from 'react'
import {
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Bell,
  Users,
  Briefcase,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  volunteerProfilesService,
  coursesService,
  departmentsService,
  personsService,
} from '@/services/church'
import type {
  VolunteerProfileRecord,
  CourseClassRecord,
  DepartmentRecord,
  PersonRecord,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

const SKILL_SUGGESTIONS = [
  'Música (Instrumento)',
  'Canto / Vocal',
  'Técnica de Som',
  'Mídia / Projeção / Transmissão',
  'Recepção / Boas-Vindas',
  'Acolhimento de Visitantes',
  'Ministério Infantil',
  'Organização / Logística',
  'Comunicação & Redes',
  'Oração & Intercessão',
]

export function QueroServir() {
  const { currentPerson, permissions } = useAuth()

  // State
  const [profile, setProfile] = useState<VolunteerProfileRecord | null>(null)
  const [openClasses, setOpenClasses] = useState<CourseClassRecord[]>([])
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [c1Status, setC1Status] = useState<{
    completed: boolean
    isEnrolled: boolean
    activeEnrollment?: any
    isWaived: boolean
    hasC1OrWaiver: boolean
    waiverRecord?: any
  }>({
    completed: false,
    isEnrolled: false,
    isWaived: false,
    hasC1OrWaiver: false,
  })

  // Selected person (membro logado ou seleção para visualização)
  const [activePerson, setActivePerson] = useState<PersonRecord | null>(null)
  const [allMembers, setAllMembers] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Form states for Perfil de Serviço
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [notes, setNotes] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Leader candidates view state
  const [allCandidateProfiles, setAllCandidateProfiles] = useState<VolunteerProfileRecord[]>([])
  const [candidatesC1Map, setCandidatesC1Map] = useState<Record<string, any>>({})
  const [viewMode, setViewMode] = useState<'jornada' | 'candidatos_lider'>('jornada')

  const loadData = async (personToLoad?: PersonRecord) => {
    try {
      setLoading(true)
      const target = personToLoad || currentPerson
      setActivePerson(target || null)

      const [allDepts, cClasses, membersList, candidateProfiles] = await Promise.all([
        departmentsService.list(),
        coursesService.getOpenClasses(),
        personsService.list(''),
        volunteerProfilesService.list(),
      ])

      setDepartments(allDepts)
      setOpenClasses(cClasses)
      setAllMembers(membersList)
      setAllCandidateProfiles(candidateProfiles)

      // Se temos uma pessoa ativa, carrega o perfil e o status do C1
      if (target?.id) {
        const [userProf, c1] = await Promise.all([
          volunteerProfilesService.getByPerson(target.id),
          coursesService.checkC1Status(target.id),
        ])
        setProfile(userProf)
        setC1Status(c1)
        if (userProf) {
          setSelectedSkills(userProf.skills || [])
          setSelectedDepts(userProf.interested_departments || [])
          setAvailability(userProf.availability || '')
          setNotes(userProf.notes || '')
        }
      }

      // Carrega status de C1 para todos os candidatos (visão do líder)
      const c1Map: Record<string, any> = {}
      await Promise.all(
        candidateProfiles.map(async (cp) => {
          const st = await coursesService.checkC1Status(cp.person)
          c1Map[cp.person] = st
        }),
      )
      setCandidatesC1Map(c1Map)
    } catch {
      toast.error('Erro ao carregar dados da jornada de serviço.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentPerson) {
      loadData(currentPerson)
    } else {
      // Se não autenticado diretamente, pega o primeiro membro como demonstração
      personsService.list('').then((list) => {
        if (list.length > 0) {
          loadData(list[0])
        }
      })
    }
  }, [currentPerson])

  // Handlers
  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const handleAddCustomSkill = () => {
    if (!customSkill.trim()) return
    if (!selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()])
    }
    setCustomSkill('')
  }

  const handleToggleDept = (deptName: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName],
    )
  }

  const handleSaveProfile = async () => {
    if (!activePerson?.id) {
      toast.error('Nenhuma pessoa selecionada.')
      return
    }
    if (selectedSkills.length === 0 && selectedDepts.length === 0) {
      toast.error('Selecione pelo menos uma habilidade ou departamento de interesse.')
      return
    }
    try {
      setSavingProfile(true)
      const updated = await volunteerProfilesService.upsert({
        person: activePerson.id,
        skills: selectedSkills,
        interested_departments: selectedDepts,
        availability,
        notes,
      })
      setProfile(updated)
      toast.success('Perfil de serviço salvo com sucesso! O caminho foi atualizado.')
      loadData(activePerson)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar perfil de serviço.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleEnrollC1Quick = async (courseClassId: string) => {
    if (!activePerson?.id) {
      toast.error('Selecione uma pessoa.')
      return
    }
    try {
      await coursesService.enrollPerson({
        course_class: courseClassId,
        person: activePerson.id,
        notes: 'Inscrição em 1 toque pela jornada Quero Servir',
      })
      toast.success('Inscrição confirmada na turma do C1 com sucesso!')
      loadData(activePerson)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao realizar inscrição no C1.')
    }
  }

  const handleNotifyMeC1 = async () => {
    if (!activePerson?.id) return
    try {
      await volunteerProfilesService.upsert({
        person: activePerson.id,
        skills: selectedSkills,
        interested_departments: selectedDepts,
        availability,
        notes,
        notify_when_c1_opens: true,
      })
      toast.success('Perfeito! Avisaremos você assim que abrirmos a próxima turma do C1.')
      loadData(activePerson)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar notificação.')
    }
  }

  // Definição das 4 etapas da jornada conforme especificado pelo usuário:
  // 1. Perfil de serviço
  // 2. C1 (Curso de Fundamentos & Serviço)
  // 3. Conversa com o líder
  // 4. Início na função
  const step1Completed = !!profile && (profile.skills?.length || 0) > 0
  const step2Completed = c1Status.hasC1OrWaiver
  const step2Enrolled = c1Status.isEnrolled
  const step3Completed = step1Completed && step2Completed // apto para conversa e alocação
  const step4Completed = false // ativado quando tiver atuação ativa

  const isLeaderOrSecretary = permissions.isSecretaria || permissions.canManageAssignments

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header com estilo Nubank */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <HeartHandshake className="w-4 h-4" />
            <span>Jornada do Voluntário &bull; Igreja Defesa da Fé</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Quero Servir
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Descubra o caminho claro para exercer seus dons e servir nos ministérios da igreja.
            Preencha seus interesses, cumpra o C1 e conecte-se com a liderança.
          </p>
        </div>

        {/* Alternador de Visão para Líderes / Secretaria */}
        <div className="flex items-center gap-2">
          {isLeaderOrSecretary && (
            <div className="flex bg-[#F8F9FB] p-1 rounded-full border border-gray-200 text-xs">
              <button
                onClick={() => setViewMode('jornada')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'jornada'
                    ? 'bg-[#820AD1] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Minha Jornada
              </button>
              <button
                onClick={() => setViewMode('candidatos_lider')}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'candidatos_lider'
                    ? 'bg-[#820AD1] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Candidatos a Voluntário ({allCandidateProfiles.length})
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Seletor de pessoa para simulação se for Secretaria */}
      {permissions.isSecretaria && (
        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs flex-wrap">
          <span className="font-semibold text-purple-900">
            Visualizando jornada para:{' '}
            <strong>{activePerson?.name || 'Selecione um membro'}</strong> (
            {activePerson?.stage || 'frequentador'})
          </span>
          <select
            value={activePerson?.id || ''}
            onChange={(e) => {
              const p = allMembers.find((m) => m.id === e.target.value)
              if (p) loadData(p)
            }}
            className="rounded-xl border border-purple-200 bg-white text-xs h-8 px-2 font-medium"
          >
            {allMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.stage || 'frequentador'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* =====================================================================
          VISÃO 1: JORNADA DO MEMBRO ("O PONTO DE UX MAIS IMPORTANTE: MOSTRAR O CAMINHO INTEIRO LOGO NO INÍCIO")
          ===================================================================== */}
      {viewMode === 'jornada' && (
        <div className="space-y-6">
          {/* MAPA DA JORNADA COMPLETA (VISUAL NUBANK) */}
          <section className="bg-gradient-to-br from-[#820AD1] to-[#5A0792] p-6 sm:p-7 rounded-3xl text-white shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Caminho do Voluntariado
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5">
                  Seu Caminho Para Servir
                </h2>
                <p className="text-xs text-purple-100 mt-1 max-w-xl">
                  Cada etapa foi pensada com carinho para preparar você ministerialmente e
                  teologicamente. Veja abaixo o seu progresso atual:
                </p>
              </div>

              {/* Status Badge Principal */}
              <div className="self-start sm:self-auto bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs">
                <span className="text-purple-200 block text-[10px] uppercase font-bold">
                  Status Atual
                </span>
                <span className="font-extrabold text-white text-sm">
                  {step2Completed
                    ? 'Apto & Pronto para Atuar'
                    : step2Enrolled
                      ? 'Inscrito no C1 (Em Andamento)'
                      : step1Completed
                        ? 'Aguardando Inscrição no C1'
                        : 'Preenchendo Perfil de Serviço'}
                </span>
              </div>
            </div>

            {/* Stepper horizontal das 4 etapas */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              {/* Etapa 1 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  step1Completed
                    ? 'bg-white/15 border-emerald-400/80 text-white'
                    : 'bg-white/5 border-white/20 text-purple-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20">
                    Etapa 1
                  </span>
                  {step1Completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-purple-300" />
                  )}
                </div>
                <p className="font-bold text-xs text-white">Perfil de Serviço</p>
                <p className="text-[11px] text-purple-200 mt-0.5 leading-snug">
                  Habilidades, dons e departamentos de interesse.
                </p>
              </div>

              {/* Etapa 2 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  step2Completed
                    ? 'bg-white/15 border-emerald-400/80 text-white'
                    : step2Enrolled
                      ? 'bg-white/20 border-amber-300 text-white'
                      : 'bg-white/5 border-white/20 text-purple-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20">
                    Etapa 2
                  </span>
                  {step2Completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : step2Enrolled ? (
                    <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                  ) : (
                    <span className="text-[10px] text-purple-300 font-bold">Obrigatório</span>
                  )}
                </div>
                <p className="font-bold text-xs text-white">Curso C1</p>
                <p className="text-[11px] text-purple-200 mt-0.5 leading-snug">
                  {step2Completed
                    ? c1Status.isWaived
                      ? 'C1 Dispensado pela Secretaria'
                      : 'C1 Concluído com Sucesso'
                    : step2Enrolled
                      ? 'Inscrito na turma atual'
                      : 'Fundamentos e visão bíblica do serviço.'}
                </p>
              </div>

              {/* Etapa 3 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  step3Completed
                    ? 'bg-white/15 border-white/40 text-white'
                    : 'bg-white/5 border-white/20 text-purple-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20">
                    Etapa 3
                  </span>
                  {step3Completed && <Sparkles className="w-4 h-4 text-purple-200" />}
                </div>
                <p className="font-bold text-xs text-white">Conversa com Líder</p>
                <p className="text-[11px] text-purple-200 mt-0.5 leading-snug">
                  Alinhamento de chamado e requisitos do departamento.
                </p>
              </div>

              {/* Etapa 4 */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  step4Completed
                    ? 'bg-white/15 border-emerald-400 text-white'
                    : 'bg-white/5 border-white/20 text-purple-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/20">
                    Etapa 4
                  </span>
                  <Briefcase className="w-4 h-4 text-purple-300" />
                </div>
                <p className="font-bold text-xs text-white">Início na Função</p>
                <p className="text-[11px] text-purple-200 mt-0.5 leading-snug">
                  Atuação oficial com mentoria e escala de serviço.
                </p>
              </div>
            </div>
          </section>

          {/* BLOCO ETAPA 2: C1 (STATUS & INSCRIÇÃO EM UM TOQUE) */}
          <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#820AD1] flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-extrabold text-[#191919] text-base">
                    C1 — Curso de Fundamentos &amp; Serviço
                  </h3>
                  <p className="text-xs text-gray-500">
                    Política padrão da Igreja: o C1 é requisito universal para qualquer função
                    ministerial.
                  </p>
                </div>
              </div>

              {c1Status.hasC1OrWaiver && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {c1Status.isWaived ? 'Dispensado pela Secretaria' : 'C1 Concluído'}
                </span>
              )}
            </div>

            {/* Cenário A: Já concluiu ou tem dispensa */}
            {c1Status.hasC1OrWaiver ? (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Parabéns! Sua etapa do C1 está cumprida.</p>
                  <p className="mt-0.5 text-emerald-800">
                    {c1Status.isWaived
                      ? `Você possui uma dispensa oficial registrada pela Secretaria: "${c1Status.waiverRecord?.reason}". Você está apto para alocação ministerial pelos líderes.`
                      : 'Você concluiu o curso com sucesso e está plenamente apto para atuar nos departamentos de seu interesse.'}
                  </p>
                </div>
              </div>
            ) : c1Status.isEnrolled ? (
              /* Cenário B: Inscrito em turma e aguardando conclusão */
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">
                    Você já está inscrito na turma:{' '}
                    <span className="underline">
                      {c1Status.activeEnrollment?.expand?.course_class?.name || 'Turma do C1'}
                    </span>
                  </p>
                  <p className="text-amber-800">
                    Aproveite as aulas! Assim que as aulas forem finalizadas e a Secretaria
                    registrar a conclusão, os líderes dos departamentos de interesse serão avisados
                    e você poderá começar a atuar.
                  </p>
                </div>
              </div>
            ) : openClasses.length > 0 ? (
              /* Cenário C: Turma aberta com inscrição em 1 toque */
              <div className="p-5 rounded-2xl bg-[#F8F9FB] border border-gray-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      Próxima Turma Aberta
                    </span>
                    <h4 className="font-bold text-[#191919] text-sm mt-1">{openClasses[0].name}</h4>
                    <p className="text-xs text-gray-500">
                      Início em {new Date(openClasses[0].start_date).toLocaleDateString('pt-BR')}{' '}
                      &bull; {openClasses[0].schedule_info || 'Aos domingos'}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleEnrollC1Quick(openClasses[0].id)}
                    className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-5 rounded-full shadow-md shadow-[#820AD1]/20 self-start sm:self-auto"
                  >
                    Inscrever-me em 1 Toque
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>

                <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-1 border-t border-gray-200">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    Aberto a membros e frequentadores. O frequentador ganha tempo e fica pronto para
                    servir logo após o batismo.
                  </span>
                </div>
              </div>
            ) : (
              /* Cenário D: Nenhuma turma aberta no momento ("Me avise quando abrir") */
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-[#191919] text-sm">
                    Nenhuma turma aberta neste instante
                  </h4>
                  <p className="text-gray-500 mt-0.5">
                    Não se preocupe! Cadastre seu perfil abaixo e clique no botão para ser avisado
                    em primeira mão assim que a Secretaria abrir vagas.
                  </p>
                </div>

                <Button
                  onClick={handleNotifyMeC1}
                  variant="outline"
                  className="rounded-full text-xs font-bold border-purple-300 text-[#820AD1] hover:bg-purple-100 self-start sm:self-auto"
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  Me avise quando abrir turma
                </Button>
              </div>
            )}
          </section>

          {/* BLOCO ETAPA 1: PERFIL DE SERVIÇO (HABILIDADES, INTERESSES, DISPONIBILIDADE) */}
          <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#820AD1] flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-extrabold text-[#191919] text-base">Seu Perfil de Serviço</h3>
                <p className="text-xs text-gray-500">
                  É preenchido mesmo sem C1, porque seu interesse já é valioso para a igreja.
                </p>
              </div>
            </div>

            {/* Habilidades & Dons */}
            <div className="space-y-2.5">
              <label className="font-bold text-xs text-gray-700 block">
                Suas Habilidades &amp; Dons (Selecione as que você se identifica)
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#820AD1] text-white border-[#820AD1] shadow-xs'
                          : 'bg-[#F8F9FB] text-gray-700 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />}
                      {skill}
                    </button>
                  )
                })}
              </div>

              {/* Adicionar habilidade customizada */}
              <div className="flex gap-2 pt-2 max-w-sm">
                <Input
                  placeholder="Outra habilidade (ex.: Fotografia, Libras)..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomSkill()
                    }
                  }}
                  className="rounded-xl text-xs h-9"
                />
                <Button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="rounded-xl text-xs h-9 bg-purple-100 text-[#820AD1] hover:bg-purple-200 font-bold px-3 shrink-0"
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Departamentos de Interesse */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <label className="font-bold text-xs text-gray-700 block">
                Departamentos Onde Gostaria de Servir
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {departments.map((dept) => {
                  const isSelected = selectedDepts.includes(dept.name)
                  return (
                    <div
                      key={dept.id}
                      onClick={() => handleToggleDept(dept.name)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50/70 border-[#820AD1] text-[#820AD1]'
                          : 'bg-[#F8F9FB] border-gray-200 text-gray-700 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{dept.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#820AD1]" />}
                      </div>
                      {dept.description && (
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                          {dept.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Disponibilidade */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="font-bold text-xs text-gray-700 block">
                Disponibilidade de Dias e Horários
              </label>
              <Input
                placeholder="Ex.: Domingos pela manhã, cultos de quarta-feira, sábados à tarde..."
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs text-gray-700 block">
                Algo mais que a liderança pastoral deveria saber? (opcional)
              </label>
              <Textarea
                placeholder="Compartilhe seu testemunho, experiências anteriores em outras igrejas, ou preferências..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 px-6 rounded-full shadow-md shadow-[#820AD1]/20"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Perfil de Serviço'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          VISÃO 2: LÍDERES — CANDIDATOS A VOLUNTÁRIOS ("AGUARDANDO C1" VS "APTO")
          ===================================================================== */}
      {viewMode === 'candidatos_lider' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
            <Users className="w-4 h-4 text-[#820AD1] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Visão da Liderança Ministerial — Banco de Voluntários:</p>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Você pode conhecer as pessoas interessadas com a etiqueta{' '}
                <strong>&ldquo;Aguardando C1&rdquo;</strong> e planejar suas escalas. O sistema
                permite ativar a atuação formal somente após a conclusão do C1 (ou dispensa da
                Secretaria), garantindo a regra da igreja.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {allCandidateProfiles.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                Nenhum membro cadastrou perfil de serviço na jornada ainda.
              </div>
            ) : (
              allCandidateProfiles.map((cp) => {
                const person = cp.expand?.person
                const c1Info = candidatesC1Map[cp.person] || {
                  completed: false,
                  hasC1OrWaiver: false,
                  isEnrolled: false,
                }
                const isReady = c1Info.hasC1OrWaiver

                return (
                  <div
                    key={cp.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-[#F8F9FB] px-3 rounded-2xl transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#191919] text-sm">
                          {person?.name || 'Membro'}
                        </span>

                        {/* Etiqueta Solicitada pelo usuário: "Aguardando C1" vs "Apto para Ativação" */}
                        {isReady ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Apto para Ativação (C1 OK)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aguardando C1
                          </span>
                        )}

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {person?.stage || 'frequentador'}
                        </span>
                      </div>

                      {/* Habilidades */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-500">
                          Habilidades:
                        </span>
                        {cp.skills && cp.skills.length > 0 ? (
                          cp.skills.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Não informado</span>
                        )}
                      </div>

                      {/* Departamentos de interesse */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-purple-700">
                          Interesse nos Departamentos:
                        </span>
                        {cp.interested_departments && cp.interested_departments.length > 0 ? (
                          cp.interested_departments.map((d, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#820AD1]"
                            >
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Geral</span>
                        )}
                      </div>

                      {cp.availability && (
                        <p className="text-[11px] text-gray-500">
                          <strong>Disponibilidade:</strong> {cp.availability}
                        </p>
                      )}
                    </div>

                    {/* Botão de Ativação do Líder (Bloqueado se C1 não concluído) */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <Button
                        disabled={!isReady}
                        onClick={() => {
                          toast.info(
                            `Para alocar ${person?.name}, acesse a aba 'Equipes & Atuações' em Departamentos e selecione a função.`,
                          )
                        }}
                        className={`rounded-full text-xs font-bold h-9 px-4 ${
                          isReady
                            ? 'bg-[#820AD1] hover:bg-[#7008B7] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                      >
                        {isReady ? 'Alocar em Função' : 'Ativação Bloqueada (C1 Pendente)'}
                      </Button>
                      {!isReady && (
                        <span className="text-[10px] text-amber-700 font-medium text-right max-w-[200px]">
                          Líder pode planejar, mas a atuação só é ativada após C1 concluído.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}
    </PageTransition>
  )
}
