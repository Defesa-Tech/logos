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
import { personsService, familiesService, stageHistoryService } from '@/services/church'
import type {
  PersonRecord,
  FamilyRecord,
  PersonStatus,
  FamilyRole,
  StageHistoryRecord,
} from '@/types/church'
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
  const [stageHistoryList, setStageHistoryList] = useState<StageHistoryRecord[]>([])

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
    visitor: 'bg-purple-50 text-[#820AD1] border-purple-100',
    attender: 'bg-blue-50 text-blue-700 border-blue-100',
    member: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    leader: 'bg-[#F7EEFD] text-[#820AD1] font-bold border-purple-200',
    pastor: 'bg-[#190326] text-white border-transparent',
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
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* =========================================================================
          TOP HEADER — Nubank Style Header
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Membros & Visitantes</span>
            <span className="text-gray-300">/</span>
            <span>{visiblePersons.length} cadastros</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Pessoas & Membresia
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
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
            className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-5 rounded-full font-bold shadow-md shadow-[#820AD1]/20 self-start sm:self-auto cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
            Cadastrar Pessoa
          </Button>
        )}
      </div>

      {/* =========================================================================
          FILTER TOOLBAR — Nubank Rounded Search and Pill Filters
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            strokeWidth={2}
          />
          <Input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs h-10 rounded-full bg-white border-gray-200 focus:border-[#820AD1] focus:ring-1 focus:ring-[#820AD1] placeholder:text-gray-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Status Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
                className={`text-xs px-3.5 py-1.5 font-bold whitespace-nowrap transition-all cursor-pointer rounded-full active:scale-95 ${
                  active
                    ? 'bg-[#820AD1] text-white shadow-sm shadow-[#820AD1]/25'
                    : 'bg-white text-gray-600 hover:text-[#820AD1] hover:bg-[#F7EEFD] border border-gray-200'
                }`}
              >
                {st.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          NUBANK DESKTOP LIST / TABLE (Rounded 3xl Container, Circular Avatars)
          ========================================================================= */}
      <div className="hidden md:block bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8F9FB] border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3.5 px-5">Pessoa</th>
              <th className="py-3.5 px-4">Papel / Estágio</th>
              <th className="py-3.5 px-4">Contato</th>
              <th className="py-3.5 px-4">Núcleo Familiar</th>
              <th className="py-3.5 px-4">Marcos na Igreja</th>
              <th className="py-3.5 px-5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Carregando registros...
                </td>
              </tr>
            ) : visiblePersons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  Nenhum registro encontrado com os critérios selecionados.
                </td>
              </tr>
            ) : (
              visiblePersons.map((person) => {
                const fam = families.find((f) => f.id === person.family) || person.expand?.family

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-[#F8F9FB] transition-colors cursor-pointer group"
                    onClick={async () => {
                      setSelectedPerson(person)
                      setSheetOpen(true)
                      try {
                        const hist = await stageHistoryService.listByPerson(person.id)
                        setStageHistoryList(hist)
                      } catch {
                        setStageHistoryList([])
                      }
                    }}
                  >
                    {/* Name + Avatar */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#F7EEFD] text-[#820AD1] font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          {person.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#191919] group-hover:text-[#820AD1] transition-colors">
                            {person.name}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Desde {new Date(person.created).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          statusBadgeStyle[person.status] ||
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {statusLabel[person.status] || person.status}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-gray-600 text-[11px]">
                      {person.whatsapp ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenWhatsApp(person.whatsapp)
                          }}
                          className="text-[#820AD1] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <Phone className="w-3 h-3 text-[#820AD1]" strokeWidth={2} />
                          <span>{person.whatsapp}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sem telefone</span>
                      )}
                      {person.email && (
                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">
                          {person.email}
                        </p>
                      )}
                    </td>

                    {/* Family */}
                    <td className="py-3.5 px-4">
                      {fam ? (
                        <div className="flex items-baseline gap-1 text-gray-700">
                          <span className="font-semibold text-[#191919]">{fam.name}</span>
                          {person.family_role && (
                            <span className="text-[11px] text-gray-400">
                              ({familyRoleLabels[person.family_role] || person.family_role})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Journey Checklist Status */}
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          title="Classe Boas-Vindas"
                          className={`w-2.5 h-2.5 rounded-full ${
                            person.checklist_welcome_class ? 'bg-[#820AD1]' : 'bg-gray-200'
                          }`}
                        />
                        <span
                          title="Batismo"
                          className={`w-2.5 h-2.5 rounded-full ${
                            person.checklist_baptized ? 'bg-[#820AD1]' : 'bg-gray-200'
                          }`}
                        />
                        <span
                          title="Pequeno Grupo"
                          className={`w-2.5 h-2.5 rounded-full ${
                            person.checklist_small_group ? 'bg-[#820AD1]' : 'bg-gray-200'
                          }`}
                        />
                        <span
                          title="Ministério"
                          className={`w-2.5 h-2.5 rounded-full ${
                            person.checklist_ministry ? 'bg-[#820AD1]' : 'bg-gray-200'
                          }`}
                        />
                        <span className="text-[11px] font-bold text-[#820AD1] ml-1">
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
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            setSelectedPerson(person)
                            setSheetOpen(true)
                            try {
                              const hist = await stageHistoryService.listByPerson(person.id)
                              setStageHistoryList(hist)
                            } catch {
                              setStageHistoryList([])
                            }
                          }}
                          className="h-8 px-3 rounded-full text-xs text-[#820AD1] hover:bg-[#F7EEFD] font-bold"
                        >
                          Ver perfil &rarr;
                        </Button>
                        {canAccessAll && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(person)}
                            className="h-8 w-8 rounded-full p-0 text-gray-400 hover:text-[#820AD1] hover:bg-[#F7EEFD]"
                          >
                            <Edit className="w-3.5 h-3.5" strokeWidth={2} />
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
          MOBILE VIEW: NUBANK EXTRATO LIST
          ========================================================================= */}
      <div className="md:hidden bg-white rounded-3xl divide-y divide-gray-100 shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-8">Carregando...</p>
        ) : visiblePersons.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Nenhuma pessoa cadastrada com os filtros vigentes.
          </div>
        ) : (
          visiblePersons.map((p) => {
            const fam = families.find((f) => f.id === p.family) || p.expand?.family

            return (
              <div
                key={p.id}
                onClick={async () => {
                  setSelectedPerson(p)
                  setSheetOpen(true)
                  try {
                    const hist = await stageHistoryService.listByPerson(p.id)
                    setStageHistoryList(hist)
                  } catch {
                    setStageHistoryList([])
                  }
                }}
                className="nu-list-item"
              >
                {/* Nubank Avatar Circle */}
                <div className="w-10 h-10 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-xs text-[#191919] truncate">{p.name}</h3>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                        statusBadgeStyle[p.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {p.whatsapp || p.email || 'Sem contato'} {fam ? `• ${fam.name}` : ''}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            )
          })
        )}
      </div>

      {/* =========================================================================
          PERSON PROFILE SHEET — Nubank Style Drawer
          ========================================================================= */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 sm:p-7 overflow-y-auto space-y-5 border-l border-gray-100 rounded-l-3xl">
          {selectedPerson && (
            <>
              <SheetHeader className="border-b border-gray-100 pb-4 text-left">
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-full bg-[#820AD1] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-[#820AD1]/20">
                    {selectedPerson.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-[#191919]">
                      {selectedPerson.name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                          statusBadgeStyle[selectedPerson.status]
                        }`}
                      >
                        {statusLabel[selectedPerson.status]}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        ID: {selectedPerson.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Action Buttons Row */}
              {selectedPerson.whatsapp && (
                <Button
                  onClick={() => handleOpenWhatsApp(selectedPerson.whatsapp)}
                  className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-10 rounded-full shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
                >
                  <MessageSquare className="w-4 h-4 mr-2" strokeWidth={2} />
                  Conversar no WhatsApp
                </Button>
              )}

              {/* Data Section */}
              <div className="space-y-4 text-xs">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Dados de Contato
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-[#F8F9FB] p-4 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      WhatsApp
                    </span>
                    <span className="font-bold text-[#191919] mt-1 block">
                      {selectedPerson.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      E-mail
                    </span>
                    <span className="font-bold text-[#191919] mt-1 block truncate">
                      {selectedPerson.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Nascimento
                    </span>
                    <span className="font-bold text-[#191919] mt-1 block">
                      {selectedPerson.birth_date
                        ? new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Origem
                    </span>
                    <span className="font-bold text-[#191919] mt-1 block truncate">
                      {selectedPerson.how_met || 'Culto de Domingo'}
                    </span>
                  </div>
                </div>

                {/* Family Relationship */}
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-1">
                  Núcleo Familiar
                </h4>
                <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100">
                  {selectedPerson.family ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#191919]">
                          {families.find((f) => f.id === selectedPerson.family)?.name ||
                            selectedPerson.expand?.family?.name ||
                            'Família Cadastrada'}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                          {familyRoleLabels[selectedPerson.family_role || 'other']}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {families.find((f) => f.id === selectedPerson.family)?.address ||
                          'Endereço não cadastrado'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs italic">
                      Nenhum núcleo familiar associado ainda.
                    </p>
                  )}
                </div>

                {/* Journey Checklist */}
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-1">
                  Jornada Logos (Marcos Bíblicos)
                </h4>
                <div className="space-y-2.5 bg-[#F8F9FB] p-4 rounded-2xl border border-gray-100 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="font-semibold text-gray-800">Classe de Boas-Vindas</span>
                    <span>
                      {selectedPerson.checklist_welcome_class ? (
                        <span className="text-emerald-600 font-bold">● Concluído</span>
                      ) : (
                        <span className="text-gray-400 font-medium">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="font-semibold text-gray-800">Batismo Bíblico</span>
                    <span>
                      {selectedPerson.checklist_baptized ? (
                        <span className="text-emerald-600 font-bold">● Concluído</span>
                      ) : (
                        <span className="text-gray-400 font-medium">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <span className="font-semibold text-gray-800">Pequeno Grupo nos Lares</span>
                    <span>
                      {selectedPerson.checklist_small_group ? (
                        <span className="text-emerald-600 font-bold">● Concluído</span>
                      ) : (
                        <span className="text-gray-400 font-medium">○ Pendente</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-gray-800">Ministério Ativo</span>
                    <span>
                      {selectedPerson.checklist_ministry ? (
                        <span className="text-emerald-600 font-bold">● Concluído</span>
                      ) : (
                        <span className="text-gray-400 font-medium">○ Pendente</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedPerson.notes && (
                  <>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-1">
                      Anotações Pastorais
                    </h4>
                    <p className="p-3.5 bg-[#F8F9FB] border border-gray-100 rounded-2xl text-gray-700 text-xs leading-relaxed">
                      {selectedPerson.notes}
                    </p>
                  </>
                )}

                {/* Stage History */}
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-1">
                  Histórico de Mudança de Estágio (Data, Autor, Motivo)
                </h4>
                {stageHistoryList.length === 0 ? (
                  <p className="p-3 bg-[#F8F9FB] rounded-2xl text-gray-400 text-[11px]">
                    Nenhuma mudança de estágio registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-2 bg-[#F8F9FB] p-3 rounded-2xl border border-gray-100">
                    {stageHistoryList.map((h) => (
                      <div
                        key={h.id}
                        className="text-[11px] border-b border-gray-200/50 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between font-bold text-[#820AD1]">
                          <span>
                            {h.from_stage || 'Início'} &rarr; {h.to_stage}
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {new Date(h.date || h.created).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-0.5">
                          Autor: <strong>{h.author_name || 'Sistema'}</strong>
                        </p>
                        {h.reason && (
                          <p className="text-gray-500 italic mt-0.5">Motivo: {h.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin actions */}
                {canAccessAll && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedPerson)}
                      className="text-xs h-9 rounded-full border-gray-200 text-gray-800 font-bold"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                      Editar Registro
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="text-xs h-9 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
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
          CREATE / EDIT DIALOG — Nubank Modal
          ========================================================================= */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl border-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-bold mb-1">
              L
            </div>
            <DialogTitle className="text-xl font-bold text-[#191919]">
              {editingPersonId ? 'Editar Cadastro' : 'Novo Cadastro de Pessoa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePerson} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="p-name" className="font-semibold text-gray-700">
                Nome Completo *
              </Label>
              <Input
                id="p-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Gabriel Martins"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-whatsapp" className="font-semibold text-gray-700">
                  WhatsApp com DDD
                </Label>
                <Input
                  id="p-whatsapp"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-birth" className="font-semibold text-gray-700">
                  Data de Nascimento
                </Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-email" className="font-semibold text-gray-700">
                  E-mail
                </Label>
                <Input
                  id="p-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="gabriel@exemplo.com"
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status" className="font-semibold text-gray-700">
                  Estágio na Jornada
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as PersonStatus)}
                >
                  <SelectTrigger
                    id="p-status"
                    className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <Label htmlFor="p-family" className="font-semibold text-gray-700">
                  Núcleo Familiar
                </Label>
                <Select value={formFamily} onValueChange={setFormFamily}>
                  <SelectTrigger
                    id="p-family"
                    className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                  >
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100">
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
                <Label htmlFor="p-role" className="font-semibold text-gray-700">
                  Papel no Lar
                </Label>
                <Select
                  value={formFamilyRole}
                  onValueChange={(val) => setFormFamilyRole(val as FamilyRole)}
                  disabled={formFamily === 'none'}
                >
                  <SelectTrigger
                    id="p-role"
                    className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100">
                    <SelectItem value="head">Cabeça / Responsável</SelectItem>
                    <SelectItem value="spouse">Cônjuge</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="other">Outro parente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-notes" className="font-semibold text-gray-700">
                Histórico & Observações
              </Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Conheceu a igreja pelo culto de domingo, deseja participar da próxima classe..."
                className="rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
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
