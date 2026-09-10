import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Home as HomeIcon,
  Calendar,
  Trash2,
  Edit,
  ChevronRight,
  MessageSquare,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, familiesService } from '@/services/church'
import type { PersonRecord, FamilyRecord, PersonStatus, FamilyRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

export default function People() {
  const { currentPerson, canAccessAll, isLeader } = useAuth()
  const [searchParams] = useSearchParams()

  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selected person sheet
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Create / Edit person dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formWhatsapp, setFormWhatsapp] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formBirthDate, setFormBirthDate] = useState('')
  const [formStatus, setFormStatus] = useState<PersonStatus>('visitor')
  const [formFamily, setFormFamily] = useState<string>('none')
  const [formFamilyRole, setFormFamilyRole] = useState<FamilyRole>('head')
  const [formNotes, setFormNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Realtime hook
  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
      if (selectedPerson?.id === e.record.id) {
        setSelectedPerson(e.record)
      }
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
      if (selectedPerson?.id === e.record.id) {
        setSheetOpen(false)
      }
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [personsList, familiesList] = await Promise.all([
        personsService.list(),
        familiesService.list(),
      ])
      setPersons(personsList)
      setFamilies(familiesList)

      // Direct URL deep-link: /pessoas?id=xxx
      const paramId = searchParams.get('id')
      if (paramId) {
        const found = personsList.find((p) => p.id === paramId)
        if (found) {
          setSelectedPerson(found)
          setSheetOpen(true)
        }
      }
    } catch {
      toast.error('Erro ao listar pessoas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Visibility Filter (Role-Based Context)
  const visiblePersons = useMemo(() => {
    let list = persons

    if (!canAccessAll) {
      if (isLeader) {
        if (currentPerson?.family) {
          list = list.filter((p) => p.family === currentPerson.family)
        } else {
          list = list.filter((p) => p.status === 'member' || p.status === 'attender')
        }
      } else {
        if (currentPerson) {
          list = list.filter(
            (p) => p.id === currentPerson.id || (p.family && p.family === currentPerson.family),
          )
        } else {
          list = list.slice(0, 3)
        }
      }
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.whatsapp?.includes(q) ||
          p.email?.toLowerCase().includes(q),
      )
    }

    return list
  }, [persons, canAccessAll, isLeader, currentPerson, statusFilter, searchQuery])

  const openCreateDialog = () => {
    setEditingPersonId(null)
    setFormName('')
    setFormWhatsapp('')
    setFormEmail('')
    setFormBirthDate('')
    setFormStatus('visitor')
    setFormFamily('none')
    setFormFamilyRole('head')
    setFormNotes('')
    setFormDialogOpen(true)
  }

  const openEditDialog = (p: PersonRecord) => {
    setEditingPersonId(p.id)
    setFormName(p.name)
    setFormWhatsapp(p.whatsapp || '')
    setFormEmail(p.email || '')
    setFormBirthDate(p.birth_date ? p.birth_date.split(' ')[0] : '')
    setFormStatus(p.status)
    setFormFamily(p.family || 'none')
    setFormFamilyRole(p.family_role || 'head')
    setFormNotes(p.notes || '')
    setFormDialogOpen(true)
  }

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('Informe o nome da pessoa')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: Partial<PersonRecord> = {
        name: formName.trim(),
        whatsapp: formWhatsapp.trim() || undefined,
        email: formEmail.trim() || undefined,
        birth_date: formBirthDate || undefined,
        status: formStatus,
        family: formFamily !== 'none' ? formFamily : undefined,
        family_role: formFamily !== 'none' ? formFamilyRole : undefined,
        notes: formNotes.trim() || undefined,
      }

      if (editingPersonId) {
        const updated = await personsService.update(editingPersonId, payload)
        setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        if (selectedPerson?.id === updated.id) {
          setSelectedPerson(updated)
        }
        toast.success('Cadastro atualizado com sucesso!')
      } else {
        const created = await personsService.create(payload)
        setPersons((prev) => [created, ...prev])
        toast.success('Pessoa cadastrada com sucesso!')
      }

      setFormDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar cadastro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePerson = async (id: string) => {
    if (!confirm('Deseja realmente remover esta pessoa do sistema?')) return
    try {
      await personsService.delete(id)
      setPersons((prev) => prev.filter((p) => p.id !== id))
      if (selectedPerson?.id === id) {
        setSheetOpen(false)
      }
      toast.success('Registro removido com sucesso.')
    } catch {
      toast.error('Erro ao excluir pessoa.')
    }
  }

  const statusLabel: Record<PersonStatus, string> = {
    visitor: 'Visitante',
    attender: 'Frequentador',
    member: 'Membro',
    leader: 'Líder',
    pastor: 'Pastor',
  }

  const statusBadgeStyle: Record<PersonStatus, string> = {
    visitor: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    attender: 'bg-blue-50 text-blue-700 border-blue-200',
    member: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    leader: 'bg-purple-50 text-purple-700 border-purple-200',
    pastor: 'bg-zinc-900 text-white border-zinc-900',
  }

  const familyRoleLabels: Record<FamilyRole, string> = {
    head: 'Responsável',
    spouse: 'Cônjuge',
    child: 'Filho(a)',
    other: 'Outro vínculo',
  }

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) return
    const clean = phone.replace(/\D/g, '')
    window.open(`https://wa.me/55${clean}`, '_blank')
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* =========================================================================
          TOP HEADER — Modern SaaS Style
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>Membros & Visitantes</span>
            <span className="text-zinc-300">/</span>
            <span>{visiblePersons.length} cadastros</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Pessoas & Membresia
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl font-normal">
            {canAccessAll
              ? 'Diretório completo de membros, líderes, frequentadores e novos visitantes acolhidos.'
              : isLeader
                ? 'Lista restrita aos integrantes sob acompanhamento direto do seu pequeno grupo.'
                : 'Acesso pessoal aos seus dados cadastrais e do seu núcleo familiar.'}
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={openCreateDialog}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-4 rounded-lg font-medium shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
            Cadastrar Pessoa
          </Button>
        )}
      </div>

      {/* =========================================================================
          FILTER TOOLBAR — Modern Linear / Notion search and pill filters
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.75}
          />
          <Input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 text-xs h-9 rounded-lg bg-white border-zinc-200 focus:border-zinc-900 focus:ring-0 placeholder:text-zinc-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Status Filter Underline Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b sm:border-b-0 border-zinc-200">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'visitor', label: 'Visitantes' },
            { id: 'attender', label: 'Frequentadores' },
            { id: 'member', label: 'Membros' },
            { id: 'leader', label: 'Líderes' },
            { id: 'pastor', label: 'Pastores' },
          ].map((st) => {
            const active = statusFilter === st.id
            return (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`text-xs px-3 py-1.5 font-medium whitespace-nowrap transition-colors cursor-pointer rounded-lg ${
                  active
                    ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {st.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          MODERN SAAS TABLE (Desktop & Tablet)
          Linear-style: 11px uppercase header, subtle hover row, rounded-xl container
          ========================================================================= */}
      <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">Nome Completo</th>
              <th className="py-3 px-4">Papel / Estágio</th>
              <th className="py-3 px-4">Contato</th>
              <th className="py-3 px-4">Núcleo Familiar</th>
              <th className="py-3 px-4">Jornada Logos</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-zinc-400">
                  Carregando registros...
                </td>
              </tr>
            ) : visiblePersons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-400">
                  Nenhum registro encontrado com os critérios selecionados.
                </td>
              </tr>
            ) : (
              visiblePersons.map((person) => {
                const fam = families.find((f) => f.id === person.family) || person.expand?.family

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedPerson(person)
                      setSheetOpen(true)
                    }}
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Cadastrado em {new Date(person.created).toLocaleDateString('pt-BR')}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          statusBadgeStyle[person.status] ||
                          'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {statusLabel[person.status] || person.status}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-zinc-600 text-[11px]">
                      {person.whatsapp ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenWhatsApp(person.whatsapp)
                          }}
                          className="text-zinc-900 hover:underline cursor-pointer flex items-center gap-1 font-medium"
                        >
                          <Phone className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
                          <span>{person.whatsapp}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Sem telefone</span>
                      )}
                      {person.email && (
                        <p className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                          {person.email}
                        </p>
                      )}
                    </td>

                    {/* Family */}
                    <td className="py-3 px-4">
                      {fam ? (
                        <div className="flex items-baseline gap-1 text-zinc-700">
                          <span className="font-medium text-zinc-900">{fam.name}</span>
                          {person.family_role && (
                            <span className="text-[11px] text-zinc-400">
                              ({familyRoleLabels[person.family_role] || person.family_role})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Journey Checklist Status */}
                    <td className="py-3 px-4 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          title="Classe Boas-Vindas"
                          className={`w-2 h-2 rounded-full ${
                            person.checklist_welcome_class ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`}
                        />
                        <span
                          title="Batismo"
                          className={`w-2 h-2 rounded-full ${
                            person.checklist_baptized ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`}
                        />
                        <span
                          title="Pequeno Grupo"
                          className={`w-2 h-2 rounded-full ${
                            person.checklist_small_group ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`}
                        />
                        <span
                          title="Ministério"
                          className={`w-2 h-2 rounded-full ${
                            person.checklist_ministry ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`}
                        />
                        <span className="text-[11px] text-zinc-400 ml-1">
                          {
                            [
                              person.checklist_welcome_class,
                              person.checklist_baptized,
                              person.checklist_small_group,
                              person.checklist_ministry,
                            ].filter(Boolean).length
                          }
                          /4
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPerson(person)
                            setSheetOpen(true)
                          }}
                          className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                        >
                          Ver perfil &rarr;
                        </Button>
                        {canAccessAll && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(person)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-900"
                          >
                            <Edit className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          MOBILE VIEW: CLEAN SAAS LIST
          ========================================================================= */}
      <div className="md:hidden bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 shadow-xs overflow-hidden">
        {loading ? (
          <p className="text-xs text-zinc-400 text-center py-8">Carregando...</p>
        ) : visiblePersons.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            Nenhuma pessoa cadastrada com os filtros vigentes.
          </div>
        ) : (
          visiblePersons.map((p) => {
            const fam = families.find((f) => f.id === p.family) || p.expand?.family

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPerson(p)
                  setSheetOpen(true)
                }}
                className="p-3.5 space-y-1.5 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-zinc-900 truncate">{p.name}</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {p.birth_date
                        ? `Nasc: ${new Date(p.birth_date).toLocaleDateString('pt-BR')}`
                        : 'Nascimento não inf.'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border flex-shrink-0 ${
                      statusBadgeStyle[p.status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {statusLabel[p.status]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 pt-0.5">
                  {p.whatsapp ? (
                    <span className="text-zinc-800 font-medium">{p.whatsapp}</span>
                  ) : (
                    <span className="text-zinc-400 text-[11px]">Sem telefone</span>
                  )}
                  {fam && <span className="text-zinc-500 text-[11px]">{fam.name}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 ml-auto" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* =========================================================================
          PERSON PROFILE SHEET — Clean SaaS Drawer
          ========================================================================= */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 overflow-y-auto space-y-5 border-l border-zinc-200">
          {selectedPerson && (
            <>
              <SheetHeader className="border-b border-zinc-100 pb-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                    Prontuário Comunitário
                  </span>
                  <SheetTitle className="text-xl font-semibold text-zinc-900">
                    {selectedPerson.name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 pt-1 text-xs text-zinc-600">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                        statusBadgeStyle[selectedPerson.status]
                      }`}
                    >
                      {statusLabel[selectedPerson.status]}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ID: {selectedPerson.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              {/* Action Buttons Row */}
              {selectedPerson.whatsapp && (
                <Button
                  onClick={() => handleOpenWhatsApp(selectedPerson.whatsapp)}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs h-9 rounded-lg shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2 text-zinc-300" strokeWidth={1.75} />
                  Conversar no WhatsApp
                </Button>
              )}

              {/* Data Section */}
              <div className="space-y-4 text-xs">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Dados de Contato
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200/80">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-medium">
                      WhatsApp
                    </span>
                    <span className="font-medium text-zinc-900 mt-1 block">
                      {selectedPerson.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-medium">
                      E-mail
                    </span>
                    <span className="font-medium text-zinc-900 mt-1 block truncate">
                      {selectedPerson.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-medium">
                      Nascimento
                    </span>
                    <span className="font-medium text-zinc-900 mt-1 block">
                      {selectedPerson.birth_date
                        ? new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-medium">
                      Origem
                    </span>
                    <span className="font-medium text-zinc-900 mt-1 block truncate">
                      {selectedPerson.how_met || 'Culto de Domingo'}
                    </span>
                  </div>
                </div>

                {/* Family Relationship */}
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pt-1">
                  Núcleo Familiar
                </h4>
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  {selectedPerson.family ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900">
                          {families.find((f) => f.id === selectedPerson.family)?.name ||
                            selectedPerson.expand?.family?.name ||
                            'Família Cadastrada'}
                        </span>
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border border-zinc-200 bg-white text-zinc-600">
                          {familyRoleLabels[selectedPerson.family_role || 'other']}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {families.find((f) => f.id === selectedPerson.family)?.address ||
                          'Endereço não cadastrado'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-zinc-400 text-xs italic">
                      Nenhum núcleo familiar associado ainda.
                    </p>
                  )}
                </div>

                {/* Journey Checklist */}
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pt-1">
                  Jornada Logos (Marcos Bíblicos)
                </h4>
                <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-zinc-200/60">
                    <span className="font-medium text-zinc-800">Classe de Boas-Vindas</span>
                    <span className="text-[11px] font-medium">
                      {selectedPerson.checklist_welcome_class ? (
                        <span className="text-emerald-600 font-semibold">● Concluído</span>
                      ) : (
                        <span className="text-zinc-400">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-200/60">
                    <span className="font-medium text-zinc-800">Batismo Bíblico</span>
                    <span className="text-[11px] font-medium">
                      {selectedPerson.checklist_baptized ? (
                        <span className="text-emerald-600 font-semibold">● Concluído</span>
                      ) : (
                        <span className="text-zinc-400">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-zinc-200/60">
                    <span className="font-medium text-zinc-800">Pequeno Grupo nos Lares</span>
                    <span className="text-[11px] font-medium">
                      {selectedPerson.checklist_small_group ? (
                        <span className="text-emerald-600 font-semibold">● Concluído</span>
                      ) : (
                        <span className="text-zinc-400">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium text-zinc-800">Ministério Ativo</span>
                    <span className="text-[11px] font-medium">
                      {selectedPerson.checklist_ministry ? (
                        <span className="text-emerald-600 font-semibold">● Concluído</span>
                      ) : (
                        <span className="text-zinc-400">○ Pendente</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedPerson.notes && (
                  <>
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pt-1">
                      Anotações Pastorais
                    </h4>
                    <p className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl text-zinc-700 text-xs leading-relaxed">
                      {selectedPerson.notes}
                    </p>
                  </>
                )}

                {/* Admin actions */}
                {canAccessAll && (
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedPerson)}
                      className="text-xs h-8 rounded-lg border-zinc-200 text-zinc-800 font-medium"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                      Editar Registro
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          CREATE / EDIT DIALOG — Clean SaaS Modal
          ========================================================================= */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-xl border-zinc-200 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-100 pb-3">
            <DialogTitle className="text-xl font-semibold text-zinc-900">
              {editingPersonId ? 'Editar Cadastro' : 'Novo Cadastro de Pessoa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePerson} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="p-name" className="font-medium text-zinc-700">
                Nome Completo *
              </Label>
              <Input
                id="p-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Gabriel Martins"
                className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-whatsapp" className="font-medium text-zinc-700">
                  WhatsApp com DDD
                </Label>
                <Input
                  id="p-whatsapp"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-birth" className="font-medium text-zinc-700">
                  Data de Nascimento
                </Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-email" className="font-medium text-zinc-700">
                  E-mail
                </Label>
                <Input
                  id="p-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="gabriel@exemplo.com"
                  className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status" className="font-medium text-zinc-700">
                  Estágio na Jornada
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as PersonStatus)}
                >
                  <SelectTrigger
                    id="p-status"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-lg">
                    <SelectItem value="visitor">Visitante</SelectItem>
                    <SelectItem value="attender">Frequentador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Family Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
              <div className="space-y-1">
                <Label htmlFor="p-family" className="font-medium text-zinc-700">
                  Núcleo Familiar
                </Label>
                <Select value={formFamily} onValueChange={setFormFamily}>
                  <SelectTrigger
                    id="p-family"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  >
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-lg">
                    <SelectItem value="none">Nenhum vínculo familiar</SelectItem>
                    {families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-role" className="font-medium text-zinc-700">
                  Papel no Lar
                </Label>
                <Select
                  value={formFamilyRole}
                  onValueChange={(val) => setFormFamilyRole(val as FamilyRole)}
                  disabled={formFamily === 'none'}
                >
                  <SelectTrigger
                    id="p-role"
                    className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-lg">
                    <SelectItem value="head">Cabeça / Responsável</SelectItem>
                    <SelectItem value="spouse">Cônjuge</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="other">Outro parente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-notes" className="font-medium text-zinc-700">
                Histórico & Observações
              </Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Conheceu a igreja pelo culto de domingo, deseja participar da próxima classe..."
                className="rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs"
            >
              {isSubmitting
                ? 'Gravando...'
                : editingPersonId
                  ? 'Salvar Alterações'
                  : 'Confirmar Cadastro'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
