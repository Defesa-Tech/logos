import React, { useState, useEffect } from 'react'
import {
  GraduationCap,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  BookOpen,
  UserCheck,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { coursesService, personsService } from '@/services/church'
import type {
  CourseRecord,
  CourseClassRecord,
  CourseEnrollmentRecord,
  PersonRecord,
  CourseClassStatus,
  EnrollmentStatus,
} from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export function Courses() {
  const { permissions, currentPerson } = useAuth()

  const [courses, setCourses] = useState<CourseRecord[]>([])
  const [classes, setClasses] = useState<CourseClassRecord[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollmentRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'turmas' | 'cursos' | 'conclusoes'>('turmas')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all')
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [courseForm, setCourseForm] = useState<{
    name: string
    code: string
    description: string
  }>({
    name: '',
    code: '',
    description: '',
  })

  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [classForm, setClassForm] = useState<{
    course: string
    name: string
    start_date: string
    end_date: string
    capacity: number
    status: CourseClassStatus
    schedule_info: string
    location: string
  }>({
    course: '',
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    capacity: 30,
    status: 'aberta',
    schedule_info: '',
    location: '',
  })

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState<{
    course_class: string
    person: string
    notes: string
  }>({
    course_class: '',
    person: '',
    notes: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [allCourses, allClasses, allEnrollments, allPersons] = await Promise.all([
        coursesService.list(),
        coursesService.listClasses(),
        coursesService.listEnrollments(),
        // Membros e frequentadores podem se inscrever no C1
        personsService.list(''),
      ])

      setCourses(allCourses)
      setClasses(allClasses)
      setEnrollments(allEnrollments)
      setPersons(allPersons)
    } catch {
      toast.error('Erro ao carregar dados dos cursos e turmas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handlers
  const handleCreateCourse = async () => {
    if (!permissions.isSecretaria) {
      toast.error('Apenas a Secretaria pode criar novos cursos.')
      return
    }
    if (!courseForm.name.trim()) {
      toast.error('Informe o nome do curso.')
      return
    }
    try {
      await coursesService.create({
        name: courseForm.name.trim(),
        code: courseForm.code.trim() || courseForm.name.toLowerCase().replace(/\s+/g, '_'),
        description: courseForm.description,
        is_active: true,
      })
      toast.success('Curso cadastrado com sucesso.')
      setIsCourseModalOpen(false)
      setCourseForm({ name: '', code: '', description: '' })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar curso.')
    }
  }

  const handleCreateClass = async () => {
    if (!permissions.isSecretaria) {
      toast.error('Apenas a Secretaria pode abrir turmas.')
      return
    }
    if (!classForm.course || !classForm.name.trim()) {
      toast.error('Selecione o curso e informe o nome da turma.')
      return
    }
    try {
      await coursesService.createClass({
        course: classForm.course,
        name: classForm.name.trim(),
        start_date: new Date(classForm.start_date).toISOString(),
        end_date: new Date(classForm.end_date).toISOString(),
        capacity: Number(classForm.capacity) || 30,
        status: classForm.status,
        schedule_info: classForm.schedule_info,
        location: classForm.location,
      })
      toast.success('Turma criada com sucesso.')
      setIsClassModalOpen(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar turma.')
    }
  }

  const handleEnrollPerson = async () => {
    if (!enrollForm.course_class || !enrollForm.person) {
      toast.error('Selecione a turma e o aluno.')
      return
    }
    const targetClass = classes.find((c) => c.id === enrollForm.course_class)
    try {
      await coursesService.enrollPerson({
        course_class: enrollForm.course_class,
        course: targetClass?.course,
        person: enrollForm.person,
        notes: enrollForm.notes,
      })
      toast.success('Inscrição confirmada na turma.')
      setIsEnrollModalOpen(false)
      setEnrollForm({ course_class: '', person: '', notes: '' })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao inscrever pessoa.')
    }
  }

  const handleMarkCompleted = async (enrollment: CourseEnrollmentRecord) => {
    if (!permissions.isSecretaria) {
      toast.error('Apenas a Secretaria pode registrar a conclusão de alunos.')
      return
    }
    const studentName = enrollment.expand?.person?.name || 'Aluno'
    if (
      !confirm(
        `Confirmar a conclusão oficial do curso para ${studentName}? Isto liberará a aptidão para voluntariado no C1.`,
      )
    ) {
      return
    }
    try {
      await coursesService.markEnrollmentCompleted(
        enrollment.id,
        currentPerson?.name ? `${currentPerson.name} (Secretaria)` : 'Secretaria Logos',
      )
      toast.success(`Conclusão registrada com sucesso para ${studentName}.`)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar conclusão.')
    }
  }

  const handleMarkDropped = async (enrollment: CourseEnrollmentRecord) => {
    if (!permissions.isSecretaria) return
    if (!confirm('Deseja marcar este aluno como desistente?')) return
    try {
      await coursesService.markEnrollmentDropped(enrollment.id, 'Registrado pela secretaria')
      toast.success('Status atualizado para desistente.')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar.')
    }
  }

  // Filtered lists
  const filteredClasses = classes.filter((c) => {
    if (selectedCourseId !== 'all' && c.course !== selectedCourseId) return false
    return true
  })

  const filteredEnrollments = enrollments.filter((e) => {
    if (selectedClassId !== 'all' && e.course_class !== selectedClassId) return false
    if (selectedCourseId !== 'all' && e.course !== selectedCourseId) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const name = e.expand?.person?.name?.toLowerCase() || ''
      const email = e.expand?.person?.email?.toLowerCase() || ''
      return name.includes(term) || email.includes(term)
    }
    return true
  })

  const completedCount = enrollments.filter((e) => e.status === 'concluido').length
  const enrolledCount = enrollments.filter((e) => e.status === 'inscrito').length

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Visual Nubank */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3A31CE] mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Módulo Enxuto de Cursos &bull; C1 Padrão</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14161D] font-heading">
            Cursos &amp; Turmas
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6072] mt-1 max-w-2xl">
            Gestão do C1 e outros cursos. Abertura de turmas com datas, controle de vagas e registro
            de conclusão pela Secretaria para liberação de voluntários.
          </p>
        </div>

        {/* Action Buttons (Secretaria) */}
        {permissions.isSecretaria && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                setEnrollForm({
                  course_class: classes.find((c) => c.status === 'aberta')?.id || '',
                  person: '',
                  notes: '',
                })
                setIsEnrollModalOpen(true)
              }}
              variant="outline"
              className="rounded-full text-xs border-[#DAD7F3] text-[#3A31CE] font-bold h-10 px-4 hover:bg-[#F2F1FB]"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Inscrever Aluno
            </Button>

            <Button
              onClick={() => {
                setClassForm({
                  course: courses[0]?.id || '',
                  name: `Turma C1 — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                  start_date: new Date().toISOString().split('T')[0],
                  end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  capacity: 35,
                  status: 'aberta',
                  schedule_info: 'Domingos, às 08h30',
                  location: 'Sala 01 / Anexo Logos',
                })
                setIsClassModalOpen(true)
              }}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-10 px-5 rounded-full shadow-md shadow-[#3A31CE]/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Turma
            </Button>
          </div>
        )}
      </section>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[22px] bg-white border border-[#E8EAF0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#6B7183]">Turmas Ativas</p>
            <p className="text-2xl font-extrabold text-[#14161D] font-heading">
              {classes.filter((c) => c.status === 'aberta').length}
            </p>
            <p className="text-[11px] text-[#3A31CE] font-medium">Com inscrições abertas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[22px] bg-white border border-[#E8EAF0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#6B7183]">Alunos em Andamento</p>
            <p className="text-2xl font-extrabold text-[#14161D] font-heading">{enrolledCount}</p>
            <p className="text-[11px] text-amber-600 font-medium">Aguardando conclusão</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[22px] bg-white border border-[#E8EAF0] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#6B7183]">Conclusões Registradas</p>
            <p className="text-2xl font-extrabold text-emerald-600 font-heading">
              {completedCount}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium">Aptos para voluntariado</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8EAF0] pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('turmas')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'turmas'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Turmas do C1 &amp; Cursos ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('conclusoes')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'conclusoes'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Inscrições &amp; Conclusão da Secretaria ({enrollments.length})
        </button>

        <button
          onClick={() => setActiveTab('cursos')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeTab === 'cursos'
              ? 'bg-[#3A31CE] text-white shadow-sm'
              : 'text-[#5A6072] hover:bg-[#F2F1FB] hover:text-[#3A31CE]'
          }`}
        >
          Catálogo de Cursos ({courses.length})
        </button>
      </div>

      {/* =====================================================================
          TAB 1: TURMAS DO C1 (ABERTAS / CONCLUÍDAS)
          ===================================================================== */}
      {activeTab === 'turmas' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#14161D] font-heading">
                Turmas Cadastradas
              </h2>
              <p className="text-xs text-[#5A6072]">
                Datas de início e fim, horário, capacidade de vagas e status da turma.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="text-xs h-9 rounded-full">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cursos</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClasses.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-gray-400 text-xs">
                Nenhuma turma cadastrada. Clique em &ldquo;Nova Turma&rdquo; para abrir a próxima
                turma do C1.
              </div>
            ) : (
              filteredClasses.map((cls) => {
                const classEnrollments = enrollments.filter((e) => e.course_class === cls.id)
                const isFull = cls.capacity ? classEnrollments.length >= cls.capacity : false

                return (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl border border-gray-200 bg-[#F8F9FB] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[#191919] text-sm">{cls.name}</h3>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              cls.status === 'aberta'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cls.status === 'concluida'
                                  ? 'bg-[#F2F1FB] text-[#3A31CE]'
                                  : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {cls.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3A31CE] font-semibold mt-0.5">
                          {cls.expand?.course?.name || 'C1 — Curso de Fundamentos & Serviço'}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-[#5A6072] space-y-1 bg-white p-3 rounded-xl border border-[#E8EAF0]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#6B7183]">Período:</span>
                        <span className="font-bold text-[#14161D]">
                          {new Date(cls.start_date).toLocaleDateString('pt-BR')} até{' '}
                          {new Date(cls.end_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {cls.schedule_info && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#6B7183]">Horário:</span>
                          <span className="font-medium text-[#14161D]">{cls.schedule_info}</span>
                        </div>
                      )}
                      {cls.location && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#6B7183]">Local:</span>
                          <span className="font-medium text-[#14161D]">{cls.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E8EAF0]">
                        <span className="text-[#6B7183]">Inscritos / Vagas:</span>
                        <span className="font-bold text-[#3A31CE]">
                          {classEnrollments.length} / {cls.capacity || 'Ilimitadas'}{' '}
                          {isFull && <span className="text-red-500">(Lotada)</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#6B7183]">
                        {classEnrollments.filter((e) => e.status === 'concluido').length} alunos já
                        concluíram
                      </span>

                      {permissions.isSecretaria && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClassId(cls.id)
                            setActiveTab('conclusoes')
                          }}
                          className="rounded-full text-xs h-8 border-[#DAD7F3] text-[#3A31CE] hover:bg-[#F2F1FB]"
                        >
                          Ver Inscrições <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: INSCRIÇÕES & CONCLUSÃO PELA SECRETARIA (MVP CORE)
          ===================================================================== */}
      {activeTab === 'conclusoes' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="p-4 rounded-2xl bg-[#F2F1FB] border border-[#DAD7F3] text-xs text-[#14161D] flex items-start gap-2.5">
            <UserCheck className="w-4 h-4 text-[#3A31CE] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#3A31CE]">
                Módulo Mínimo de Cursos — Conclusão Oficial no MVP:
              </p>
              <p className="text-[11px] text-[#5A6072] mt-0.5">
                No MVP, a Secretaria marca quem concluiu cada turma em um clique. Ao marcar
                &ldquo;Concluído&rdquo;, o sistema atualiza automaticamente o C1 do voluntário para
                cumprir o requisito universal de Igreja.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar aluno por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 rounded-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="text-xs h-9 rounded-full w-full sm:w-60">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Turmas</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {filteredEnrollments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                Nenhuma inscrição encontrada para os filtros selecionados.
              </div>
            ) : (
              filteredEnrollments.map((enr) => {
                const person = enr.expand?.person
                const cls = enr.expand?.course_class

                return (
                  <div
                    key={enr.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FB] px-3 rounded-2xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#191919] text-sm">
                          {person?.name || 'Aluno'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            enr.status === 'concluido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : enr.status === 'inscrito'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {enr.status}
                        </span>
                        {person?.stage && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                            Estágio: {person.stage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-gray-500 text-[11px] flex-wrap">
                        <span>
                          Turma: <strong>{cls?.name || 'Turma'}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Inscrito em:{' '}
                          {enr.enrollment_date
                            ? new Date(enr.enrollment_date).toLocaleDateString('pt-BR')
                            : '-'}
                        </span>
                        {enr.completion_date && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-700 font-medium">
                              Concluído em:{' '}
                              {new Date(enr.completion_date).toLocaleDateString('pt-BR')} por{' '}
                              {enr.completed_by || 'Secretaria'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Ações da Secretaria */}
                    {permissions.isSecretaria && (
                      <div className="flex items-center gap-2">
                        {enr.status === 'inscrito' && (
                          <>
                            <Button
                              onClick={() => handleMarkCompleted(enr)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-full"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Marcar Concluído
                            </Button>
                            <Button
                              onClick={() => handleMarkDropped(enr)}
                              variant="ghost"
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 rounded-full"
                            >
                              Desistente
                            </Button>
                          </>
                        )}

                        {enr.status === 'concluido' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Apto para Serviço
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: CATÁLOGO DE CURSOS (C1 & OUTROS)
          ===================================================================== */}
      {activeTab === 'cursos' && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-[#14161D] font-heading">
                Catálogo de Cursos da Igreja
              </h2>
              <p className="text-xs text-[#5A6072]">
                C1 é o curso padrão preparatório para o voluntariado. Novos cursos podem ser
                adicionados no futuro.
              </p>
            </div>
            {permissions.isSecretaria && (
              <Button
                onClick={() => {
                  setCourseForm({ name: '', code: '', description: '' })
                  setIsCourseModalOpen(true)
                }}
                className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs h-9 px-4 rounded-full"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Curso
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-[#E8EAF0] bg-[#F8F9FB] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-[#14161D] text-sm">{course.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                    Código: {course.code}
                  </span>
                </div>
                {course.description && (
                  <p className="text-xs text-gray-600">{course.description}</p>
                )}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    {classes.filter((c) => c.course === course.id).length} turma(s) vinculada(s)
                  </span>
                  <span className="text-emerald-700 font-semibold">Ativo na Igreja</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL: NOVA TURMA (SECRETARIA)
          ===================================================================== */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Nova Turma de Curso
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Curso</label>
              <Select
                value={classForm.course}
                onValueChange={(val) => setClassForm((prev) => ({ ...prev, course: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o curso..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Nome da Turma</label>
              <Input
                placeholder="Ex.: Turma C1 — Abril/Maio 2026"
                value={classForm.name}
                onChange={(e) => setClassForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Data de Início</label>
                <Input
                  type="date"
                  value={classForm.start_date}
                  onChange={(e) =>
                    setClassForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Data de Fim</label>
                <Input
                  type="date"
                  value={classForm.end_date}
                  onChange={(e) => setClassForm((prev) => ({ ...prev, end_date: e.target.value }))}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Capacidade de Vagas</label>
                <Input
                  type="number"
                  placeholder="Ex.: 35"
                  value={classForm.capacity}
                  onChange={(e) =>
                    setClassForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))
                  }
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Status</label>
                <Select
                  value={classForm.status}
                  onValueChange={(val: any) => setClassForm((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta (Aceita inscrições)</SelectItem>
                    <SelectItem value="fechada">Fechada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Horário das Aulas</label>
              <Input
                placeholder="Ex.: Domingos, às 08h30"
                value={classForm.schedule_info}
                onChange={(e) =>
                  setClassForm((prev) => ({ ...prev, schedule_info: e.target.value }))
                }
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Local / Sala</label>
              <Input
                placeholder="Ex.: Sala 01 / Anexo Logos"
                value={classForm.location}
                onChange={(e) => setClassForm((prev) => ({ ...prev, location: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsClassModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateClass}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Turma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: INSCREVER ALUNO (SECRETARIA)
          ===================================================================== */}
      <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">Inscrever Aluno</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 bg-[#F2F1FB] rounded-xl border border-[#DAD7F3] text-[#3A31CE] text-[11px]">
              <strong>Decisão aprovada:</strong> A inscrição no C1 é aberta a membros e
              frequentadores (o frequentador ganha tempo e se prepara para servir assim que virar
              membro).
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Turma</label>
              <Select
                value={enrollForm.course_class}
                onValueChange={(val) => setEnrollForm((prev) => ({ ...prev, course_class: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione a turma..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Aluno (Membro ou Frequentador)</label>
              <Select
                value={enrollForm.person}
                onValueChange={(val) => setEnrollForm((prev) => ({ ...prev, person: val }))}
              >
                <SelectTrigger className="rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Selecione o aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stage || 'frequentador'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Observações</label>
              <Input
                placeholder="Ex.: Inscrição realizada presencialmente"
                value={enrollForm.notes}
                onChange={(e) => setEnrollForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsEnrollModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnrollPerson}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Confirmar Inscrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: NOVO CURSO (SECRETARIA)
          ===================================================================== */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#191919]">Novo Curso</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">Nome do Curso</label>
              <Input
                placeholder="Ex.: C2 — Liderança & Discipulado"
                value={courseForm.name}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Código</label>
              <Input
                placeholder="Ex.: c2"
                value={courseForm.code}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, code: e.target.value }))}
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Descrição</label>
              <Textarea
                placeholder="Objetivo e fundamentação teológica do curso..."
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsCourseModalOpen(false)}
              className="rounded-full text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCourse}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs rounded-full px-5"
            >
              Salvar Curso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
