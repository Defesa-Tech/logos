import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Home as HomeIcon,
  CheckCircle2,
  Calendar,
  Sparkles,
  Shield,
  Trash2,
  Edit,
  ChevronRight,
  UserCheck,
  Check,
  MessageSquare,
  X,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, familiesService } from '@/services/church'
import type { PersonRecord, FamilyRecord, PersonStatus, FamilyRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

export default function People() {
  const { role, currentPerson, canAccessAll, isLeader } = useAuth()
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
        // Líderes veem apenas integrantes do seu grupo/família
        if (currentPerson?.family) {
          list = list.filter((p) => p.family === currentPerson.family)
        } else {
          list = list.filter((p) => p.status === 'member' || p.status === 'attender')
        }
      } else {
        // Membro / Visitante: visão mais restrita
        if (currentPerson) {
          list = list.filter(
            (p) => p.id === currentPerson.id || (p.family && p.family === currentPerson.family),
          )
        } else {
          list = list.slice(0, 3)
        }
      }
    }

    // Apply UI Filters
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

  const statusBadgeInfo: Record<PersonStatus, { label: string; color: string; dotColor: string }> =
    {
      visitor: {
        label: 'Visitante',
        color: 'bg-amber-50 text-amber-900 border-amber-300',
        dotColor: 'bg-amber-400',
      },
      attender: {
        label: 'Frequentador',
        color: 'bg-blue-50 text-blue-900 border-blue-300',
        dotColor: 'bg-blue-500',
      },
      member: {
        label: 'Membro',
        color: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        dotColor: 'bg-emerald-500',
      },
      leader: {
        label: 'Líder',
        color: 'bg-indigo-50 text-indigo-900 border-indigo-300',
        dotColor: 'bg-indigo-500',
      },
      pastor: {
        label: 'Pastor',
        color: 'bg-purple-50 text-purple-900 border-purple-300',
        dotColor: 'bg-purple-500',
      },
    }

  const familyRoleLabels: Record<FamilyRole, string> = {
    head: 'Cabeça / Responsável',
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
    <div className="space-y-6">
      {/* =========================================================================
          TOP HEADER
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#1F2D3A] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D4AF37]" />
            Gestão de Pessoas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {canAccessAll
              ? 'Acesso pastoral pleno: visualização e gestão de todos os cadastros e visitantes.'
              : isLeader
                ? 'Acesso restrito ao grupo: visualização das pessoas sob seu cuidado direto.'
                : 'Acesso restrito ao seu perfil e familiares.'}
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={openCreateDialog}
            className="bg-[#1F2D3A] hover:bg-[#15202B] text-white text-xs font-semibold h-10 px-4 rounded-xl shadow-md self-start sm:self-auto active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar Pessoa
          </Button>
        )}
      </div>

      {/* =========================================================================
          FILTER TOOLBAR (Fast Touch-Friendly Filter Chips)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, fone ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-10 rounded-2xl bg-white border-slate-200/90 shadow-soft focus:ring-2 focus:ring-[#D4AF37]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Horizontal Scroll Filter Chips (Mobile-First touch scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'visitor', label: 'Visitantes' },
            { id: 'attender', label: 'Frequentadores' },
            { id: 'member', label: 'Membros' },
            { id: 'leader', label: 'Líderes' },
            { id: 'pastor', label: 'Pastores' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#1F2D3A] text-[#D4AF37] shadow-sm font-bold ring-2 ring-[#D4AF37]/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-soft'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          MOBILE VIEW: TOUCH-FIRST CARDS (Visible only on < md)
          ========================================================================= */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-10">Carregando pessoas...</p>
        ) : visiblePersons.length === 0 ? (
          <Card className="border-slate-200 p-8 text-center bg-white rounded-2xl shadow-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma pessoa encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              Tente ajustar a busca ou o filtro de status.
            </p>
          </Card>
        ) : (
          visiblePersons.map((p) => {
            const statusInfo = statusBadgeInfo[p.status] || statusBadgeInfo.visitor
            const fam = families.find((f) => f.id === p.family) || p.expand?.family

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPerson(p)
                  setSheetOpen(true)
                }}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-soft hover:shadow-elevated transition-all active:scale-[0.99] cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 text-[#2C3E50] font-bold text-sm flex items-center justify-center border border-slate-200 flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-800 truncate leading-snug">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {p.birth_date
                          ? `Nasc: ${new Date(p.birth_date).toLocaleDateString('pt-BR')}`
                          : 'Data de nasc. não inf.'}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full flex-shrink-0 ${statusInfo.color}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dotColor}`} />
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Subinfo: Contact & Family */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  {p.whatsapp ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenWhatsApp(p.whatsapp)
                      }}
                      className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{p.whatsapp}</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Sem fone</span>
                  )}

                  {fam && (
                    <div className="flex items-center gap-1 text-slate-700 text-[11px] bg-slate-50 px-2 py-1 rounded-lg">
                      <HomeIcon className="w-3 h-3 text-[#D4AF37]" />
                      <span className="truncate">{fam.name}</span>
                    </div>
                  )}

                  {/* Checklist indicators */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span
                      title="Boas-Vindas"
                      className={`w-2 h-2 rounded-full ${p.checklist_welcome_class ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    />
                    <span
                      title="Batismo"
                      className={`w-2 h-2 rounded-full ${p.checklist_baptized ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    />
                    <span
                      title="Pequeno Grupo"
                      className={`w-2 h-2 rounded-full ${p.checklist_small_group ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    />
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* =========================================================================
          DESKTOP VIEW: RICH MANAGEMENT TABLE (Visible on >= md)
          ========================================================================= */}
      <Card className="hidden md:block border-slate-200/90 bg-white shadow-soft rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nome da Pessoa</th>
                <th className="py-3.5 px-4">Status / Papel</th>
                <th className="py-3.5 px-4">Contato Direto</th>
                <th className="py-3.5 px-4">Núcleo Familiar</th>
                <th className="py-3.5 px-4">Jornada Logos</th>
                <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Carregando cadastros...
                  </td>
                </tr>
              ) : visiblePersons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhuma pessoa encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                visiblePersons.map((person) => {
                  const statusInfo = statusBadgeInfo[person.status] || statusBadgeInfo.visitor
                  const fam = families.find((f) => f.id === person.family) || person.expand?.family

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedPerson(person)
                        setSheetOpen(true)
                      }}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#2C3E50] font-bold text-xs flex items-center justify-center border border-slate-200 group-hover:border-[#D4AF37] transition-colors flex-shrink-0">
                            {person.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 group-hover:text-[#2C3E50] transition-colors">
                              {person.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Cadastrado em {new Date(person.created).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${statusInfo.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusInfo.dotColor}`}
                          />
                          {statusInfo.label}
                        </Badge>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600">
                        {person.whatsapp ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenWhatsApp(person.whatsapp)
                            }}
                            className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:underline cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{person.whatsapp}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sem telefone</span>
                        )}
                        {person.email && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {person.email}
                          </p>
                        )}
                      </td>

                      {/* Family */}
                      <td className="py-3 px-4">
                        {fam ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <HomeIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span className="font-medium">{fam.name}</span>
                            {person.family_role && (
                              <span className="text-[10px] text-slate-400">
                                ({familyRoleLabels[person.family_role] || person.family_role})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem família</span>
                        )}
                      </td>

                      {/* Journey Checklist Pills */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            title="Classe de Boas-Vindas"
                            className={`w-2.5 h-2.5 rounded-full ${
                              person.checklist_welcome_class ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                          <span
                            title="Batismo"
                            className={`w-2.5 h-2.5 rounded-full ${
                              person.checklist_baptized ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                          <span
                            title="Pequeno Grupo"
                            className={`w-2.5 h-2.5 rounded-full ${
                              person.checklist_small_group ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                          <span
                            title="Ministério"
                            className={`w-2.5 h-2.5 rounded-full ${
                              person.checklist_ministry ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                          <span className="text-[11px] text-slate-500 ml-1 capitalize font-medium">
                            {person.status}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPerson(person)
                              setSheetOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs text-slate-600 hover:text-[#2C3E50] font-medium"
                          >
                            Ver Perfil
                          </Button>
                          {canAccessAll && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(person)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800"
                            >
                              <Edit className="w-3.5 h-3.5" />
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
      </Card>

      {/* =========================================================================
          PERSON FULL PROFILE SHEET (Drawer com visual moderno)
          ========================================================================= */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white p-5 sm:p-6 overflow-y-auto space-y-6">
          {selectedPerson && (
            <>
              {/* Drawer Header */}
              <SheetHeader className="border-b border-slate-100 pb-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#1F2D3A] text-[#D4AF37] font-bold text-xl flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-[#D4AF37]/15">
                    {selectedPerson.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle className="font-serif-sacred text-xl text-[#1F2D3A]">
                      {selectedPerson.name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          statusBadgeInfo[selectedPerson.status]?.color
                        }`}
                      >
                        {statusBadgeInfo[selectedPerson.status]?.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-xl shadow-md"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Conversar no WhatsApp Oficial
                </Button>
              )}

              {/* Contact Data */}
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Informações de Contato
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      WhatsApp:
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {selectedPerson.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      E-mail:
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1 truncate">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      {selectedPerson.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Nascimento:
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {selectedPerson.birth_date
                        ? new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Origem:
                    </span>
                    <span className="font-semibold text-slate-800 mt-1 block truncate">
                      {selectedPerson.how_met || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Family Relationship */}
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                  Núcleo Familiar (Lar)
                </h4>
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70">
                  {selectedPerson.family ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HomeIcon className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-bold text-slate-800 text-sm">
                            {families.find((f) => f.id === selectedPerson.family)?.name ||
                              selectedPerson.expand?.family?.name ||
                              'Família Associada'}
                          </span>
                        </div>
                        <Badge className="bg-[#2C3E50] text-[#D4AF37] text-[10px] font-bold rounded-full">
                          {familyRoleLabels[selectedPerson.family_role || 'other']}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {families.find((f) => f.id === selectedPerson.family)?.address ||
                          selectedPerson.expand?.family?.address ||
                          'Endereço registrado na sede.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Nenhum núcleo familiar associado ainda.</p>
                  )}
                </div>

                {/* Journey Checklist */}
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                  Etapas da Jornada Logos
                </h4>
                <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Classe de Boas-Vindas</span>
                    <Badge variant={selectedPerson.checklist_welcome_class ? 'default' : 'outline'}>
                      {selectedPerson.checklist_welcome_class ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Batismo Bíblico</span>
                    <Badge variant={selectedPerson.checklist_baptized ? 'default' : 'outline'}>
                      {selectedPerson.checklist_baptized ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Pequeno Grupo (Comunhão)</span>
                    <Badge variant={selectedPerson.checklist_small_group ? 'default' : 'outline'}>
                      {selectedPerson.checklist_small_group ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Envolvimento Ministerial</span>
                    <Badge variant={selectedPerson.checklist_ministry ? 'default' : 'outline'}>
                      {selectedPerson.checklist_ministry ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                {/* Pastoral Notes */}
                {selectedPerson.notes && (
                  <>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                      Observações & Acompanhamento
                    </h4>
                    <p className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 leading-relaxed text-xs">
                      {selectedPerson.notes}
                    </p>
                  </>
                )}

                {/* Action Buttons for Admins */}
                {canAccessAll && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedPerson)}
                      className="text-xs h-9 rounded-xl"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Editar Cadastro
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="text-xs h-9 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
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
          CREATE / EDIT DIALOG
          ========================================================================= */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              {editingPersonId ? 'Editar Cadastro' : 'Novo Cadastro de Pessoa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePerson} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="p-name">Nome Completo *</Label>
              <Input
                id="p-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Gabriel Martins"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-whatsapp">WhatsApp (com DDD)</Label>
                <Input
                  id="p-whatsapp"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-birth">Data de Nascimento</Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-email">E-mail</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="gabriel@exemplo.com"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status">Status / Jornada</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as PersonStatus)}
                >
                  <SelectTrigger id="p-status" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label htmlFor="p-family">Família (Lar)</Label>
                <Select value={formFamily} onValueChange={setFormFamily}>
                  <SelectTrigger id="p-family" className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione a família" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="none">Nenhuma família vinculada</SelectItem>
                    {families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-role">Papel no Lar</Label>
                <Select
                  value={formFamilyRole}
                  onValueChange={(val) => setFormFamilyRole(val as FamilyRole)}
                  disabled={formFamily === 'none'}
                >
                  <SelectTrigger id="p-role" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="head">Cabeça / Responsável</SelectItem>
                    <SelectItem value="spouse">Cônjuge</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="other">Outro parente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-notes">Histórico Pastoral / Observações</Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Veio convidado pela família Silva, deseja participar de pequeno grupo..."
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs h-11 rounded-xl font-semibold shadow-md"
            >
              {isSubmitting
                ? 'Salvando...'
                : editingPersonId
                  ? 'Salvar Alterações'
                  : 'Confirmar Cadastro'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
