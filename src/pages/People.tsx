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
          TOP HEADER — Editorial Style
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
            <span>Livro Pastoral</span>
            <span className="text-slate-300">/</span>
            <span>{visiblePersons.length} cadastros</span>
          </div>
          <h1 className="font-serif-sacred text-3xl sm:text-4xl font-bold tracking-tight text-[#141B22]">
            Livro de Pessoas & Membresia
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal">
            {canAccessAll
              ? 'Registro oficial e confidencial de todos os membros, frequentadores e novos visitantes acolhidos.'
              : isLeader
                ? 'Lista restrita aos irmãos sob acompanhamento direto do seu pequeno grupo.'
                : 'Acesso pessoal aos dados cadastrais e do seu núcleo familiar.'}
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={openCreateDialog}
            className="bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 px-4 rounded font-mono shadow-none self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-[#C5A046]" strokeWidth={1.75} />
            Cadastrar Pessoa
          </Button>
        )}
      </div>

      {/* =========================================================================
          FILTER TOOLBAR — Clean Editorial Filter Row
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
          />
          <Input
            type="text"
            placeholder="Filtrar por nome, telefone ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 text-xs h-9 rounded bg-white border-[#E6E2D8] focus:border-[#141B22] focus:ring-0 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Status Filter Underline Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b sm:border-b-0 border-[#E6E2D8]">
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
                className={`text-xs px-3 py-1.5 font-mono whitespace-nowrap transition-colors cursor-pointer rounded ${
                  active
                    ? 'bg-[#141B22] text-[#FAF9F6] font-semibold'
                    : 'text-slate-600 hover:text-[#141B22] hover:bg-white/80'
                }`}
              >
                {st.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* =========================================================================
          EDITORIAL DENSE TABLE (Desktop & Tablet)
          Hairline dividers, high typography hierarchy, zero IA rounded card clutter
          ========================================================================= */}
      <div className="hidden md:block bg-white border border-[#E6E2D8] rounded overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF9F6] border-b border-[#E6E2D8] text-slate-500 font-mono uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4 font-semibold">Nome Completo</th>
              <th className="py-3 px-4 font-semibold">Papel / Estágio</th>
              <th className="py-3 px-4 font-semibold">Contato</th>
              <th className="py-3 px-4 font-semibold">Núcleo Familiar</th>
              <th className="py-3 px-4 font-semibold">Jornada Logos</th>
              <th className="py-3 px-4 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EDE4]">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 font-mono">
                  Carregando registros pastorais...
                </td>
              </tr>
            ) : visiblePersons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  Nenhum registro encontrado com os critérios selecionados.
                </td>
              </tr>
            ) : (
              visiblePersons.map((person) => {
                const fam = families.find((f) => f.id === person.family) || person.expand?.family

                return (
                  <tr
                    key={person.id}
                    className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedPerson(person)
                      setSheetOpen(true)
                    }}
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#141B22] group-hover:text-[#C5A046] transition-colors">
                        {person.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Cadastrado em {new Date(person.created).toLocaleDateString('pt-BR')}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-700">
                        {statusLabel[person.status] || person.status}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {person.whatsapp ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenWhatsApp(person.whatsapp)
                          }}
                          className="text-[#141B22] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                        >
                          <Phone className="w-3 h-3 text-[#C5A046]" strokeWidth={1.75} />
                          <span>{person.whatsapp}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Sem telefone</span>
                      )}
                      {person.email && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px] font-sans">
                          {person.email}
                        </p>
                      )}
                    </td>

                    {/* Family */}
                    <td className="py-3 px-4">
                      {fam ? (
                        <div className="flex items-baseline gap-1.5 text-slate-700">
                          <span className="font-medium text-[#141B22]">{fam.name}</span>
                          {person.family_role && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({familyRoleLabels[person.family_role] || person.family_role})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Journey Checklist Status */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          title="Classe Boas-Vindas"
                          className={`w-1.5 h-1.5 rounded-full ${
                            person.checklist_welcome_class ? 'bg-[#141B22]' : 'bg-slate-300'
                          }`}
                        />
                        <span
                          title="Batismo"
                          className={`w-1.5 h-1.5 rounded-full ${
                            person.checklist_baptized ? 'bg-[#141B22]' : 'bg-slate-300'
                          }`}
                        />
                        <span
                          title="Pequeno Grupo"
                          className={`w-1.5 h-1.5 rounded-full ${
                            person.checklist_small_group ? 'bg-[#141B22]' : 'bg-slate-300'
                          }`}
                        />
                        <span
                          title="Ministério"
                          className={`w-1.5 h-1.5 rounded-full ${
                            person.checklist_ministry ? 'bg-[#141B22]' : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500 ml-1">
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
                          className="h-7 px-2 text-xs font-mono text-slate-700 hover:text-[#141B22]"
                        >
                          Ver perfil &rarr;
                        </Button>
                        {canAccessAll && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(person)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
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
          MOBILE VIEW: EDITORIAL LINE REGISTER (No round IA cards)
          ========================================================================= */}
      <div className="md:hidden bg-white border border-[#E6E2D8] rounded divide-y divide-[#F0EDE4]">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-8 font-mono">Carregando...</p>
        ) : visiblePersons.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
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
                className="p-4 space-y-2 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-[#141B22] truncate">{p.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {p.birth_date
                        ? `Nasc: ${new Date(p.birth_date).toLocaleDateString('pt-BR')}`
                        : 'Nascimento não inf.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-700 flex-shrink-0">
                    {statusLabel[p.status]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 font-mono pt-1">
                  {p.whatsapp ? (
                    <span className="text-[#141B22]">{p.whatsapp}</span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Sem telefone</span>
                  )}
                  {fam && <span className="text-slate-500 font-sans text-[11px]">{fam.name}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* =========================================================================
          PERSON PROFILE SHEET — Editorial Register Drawer
          ========================================================================= */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-[#FAF9F6] p-6 overflow-y-auto space-y-6 border-l border-[#E6E2D8]">
          {selectedPerson && (
            <>
              <SheetHeader className="border-b border-[#E6E2D8] pb-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A046]">
                    Prontuário Comunitário
                  </span>
                  <SheetTitle className="font-serif-sacred text-2xl text-[#141B22]">
                    {selectedPerson.name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 pt-1 font-mono text-xs text-slate-600">
                    <span className="px-2 py-0.5 rounded border border-[#E6E2D8] bg-white text-[11px]">
                      {statusLabel[selectedPerson.status]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ID: {selectedPerson.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </SheetHeader>

              {/* Action Buttons Row */}
              {selectedPerson.whatsapp && (
                <Button
                  onClick={() => handleOpenWhatsApp(selectedPerson.whatsapp)}
                  className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white font-mono text-xs h-9 rounded"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2 text-[#C5A046]" strokeWidth={1.75} />
                  Conversar no WhatsApp
                </Button>
              )}

              {/* Data Section */}
              <div className="space-y-4 text-xs">
                <h4 className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Dados de Contato
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded border border-[#E6E2D8] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">WhatsApp</span>
                    <span className="font-medium text-[#141B22] mt-1 block">
                      {selectedPerson.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">E-mail</span>
                    <span className="font-medium text-[#141B22] mt-1 block truncate">
                      {selectedPerson.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Nascimento</span>
                    <span className="font-medium text-[#141B22] mt-1 block">
                      {selectedPerson.birth_date
                        ? new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Origem</span>
                    <span className="font-medium text-[#141B22] mt-1 block truncate">
                      {selectedPerson.how_met || 'Culto de Domingo'}
                    </span>
                  </div>
                </div>

                {/* Family Relationship */}
                <h4 className="font-mono text-[10px] uppercase tracking-wider text-slate-400 pt-2">
                  Núcleo Familiar
                </h4>
                <div className="p-4 bg-white rounded border border-[#E6E2D8]">
                  {selectedPerson.family ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#141B22]">
                          {families.find((f) => f.id === selectedPerson.family)?.name ||
                            selectedPerson.expand?.family?.name ||
                            'Família Cadastrada'}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-600">
                          {familyRoleLabels[selectedPerson.family_role || 'other']}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {families.find((f) => f.id === selectedPerson.family)?.address ||
                          'Endereço não cadastrado'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic">
                      Nenhum núcleo familiar associado ainda.
                    </p>
                  )}
                </div>

                {/* Journey Checklist */}
                <h4 className="font-mono text-[10px] uppercase tracking-wider text-slate-400 pt-2">
                  Jornada Logos (Marcos Bíblicos)
                </h4>
                <div className="space-y-2 bg-white p-4 rounded border border-[#E6E2D8] text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#F0EDE4]">
                    <span className="font-medium text-[#141B22]">Classe de Boas-Vindas</span>
                    <span className="font-mono text-[11px]">
                      {selectedPerson.checklist_welcome_class ? '● Concluído' : '○ Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F0EDE4]">
                    <span className="font-medium text-[#141B22]">Batismo Bíblico</span>
                    <span className="font-mono text-[11px]">
                      {selectedPerson.checklist_baptized ? '● Concluído' : '○ Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#F0EDE4]">
                    <span className="font-medium text-[#141B22]">Pequeno Grupo nos Lares</span>
                    <span className="font-mono text-[11px]">
                      {selectedPerson.checklist_small_group ? '● Concluído' : '○ Pendente'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium text-[#141B22]">Ministério Ativo</span>
                    <span className="font-mono text-[11px]">
                      {selectedPerson.checklist_ministry ? '● Concluído' : '○ Pendente'}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedPerson.notes && (
                  <>
                    <h4 className="font-mono text-[10px] uppercase tracking-wider text-slate-400 pt-2">
                      Anotações Pastorais
                    </h4>
                    <p className="p-3 bg-white border border-[#E6E2D8] rounded text-slate-700 text-xs leading-relaxed">
                      {selectedPerson.notes}
                    </p>
                  </>
                )}

                {/* Admin actions */}
                {canAccessAll && (
                  <div className="flex items-center justify-between pt-4 border-t border-[#E6E2D8]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedPerson)}
                      className="text-xs h-8 rounded border-[#E6E2D8] font-mono"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                      Editar Registro
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="text-xs h-8 text-red-700 hover:text-red-900 font-mono"
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
          CREATE / EDIT DIALOG — Sharp Editorial Modal
          ========================================================================= */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded border-[#E6E2D8] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif-sacred text-2xl text-[#141B22]">
              {editingPersonId ? 'Editar Cadastro Pastoral' : 'Novo Cadastro no Livro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePerson} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="p-name" className="font-mono uppercase tracking-wider text-slate-600">
                Nome Completo *
              </Label>
              <Input
                id="p-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Gabriel Martins"
                className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="p-whatsapp"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  WhatsApp com DDD
                </Label>
                <Input
                  id="p-whatsapp"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-birth"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Data de Nascimento
                </Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="p-email"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  E-mail
                </Label>
                <Input
                  id="p-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="gabriel@exemplo.com"
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-status"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Estágio na Jornada
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as PersonStatus)}
                >
                  <SelectTrigger
                    id="p-status"
                    className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E6E2D8]">
              <div className="space-y-1">
                <Label
                  htmlFor="p-family"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Núcleo Familiar
                </Label>
                <Select value={formFamily} onValueChange={setFormFamily}>
                  <SelectTrigger
                    id="p-family"
                    className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                  >
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded">
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
                <Label
                  htmlFor="p-role"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Papel no Lar
                </Label>
                <Select
                  value={formFamilyRole}
                  onValueChange={(val) => setFormFamilyRole(val as FamilyRole)}
                  disabled={formFamily === 'none'}
                >
                  <SelectTrigger id="p-role" className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded">
                    <SelectItem value="head">Cabeça / Responsável</SelectItem>
                    <SelectItem value="spouse">Cônjuge</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="other">Outro parente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="p-notes"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Histórico Pastoral
              </Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Conheceu a igreja pelo culto de domingo, deseja participar da próxima classe..."
                className="rounded bg-[#FAF9F6] border-[#E6E2D8]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
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
