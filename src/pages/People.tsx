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

      // Check if URL has ?id=xxx to open sheet directly
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

  // Visibility Filter (Restrito ao Contexto para Líderes e Membros)
  const visiblePersons = useMemo(() => {
    let list = persons

    if (!canAccessAll) {
      if (isLeader) {
        // Líderes veem apenas pessoas do seu grupo/família
        if (currentPerson?.family) {
          list = list.filter((p) => p.family === currentPerson.family)
        } else {
          list = list.filter((p) => p.status === 'member' || p.status === 'attender')
        }
      } else {
        // Membro / Visitante: visão mais restrita (dados próprios ou família)
        if (currentPerson) {
          list = list.filter(
            (p) => p.id === currentPerson.id || (p.family && p.family === currentPerson.family),
          )
        } else {
          list = list.slice(0, 3) // preview restrito
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

  const statusBadgeInfo: Record<PersonStatus, { label: string; color: string }> = {
    visitor: { label: 'Visitante', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    attender: { label: 'Frequentador', color: 'bg-blue-100 text-blue-900 border-blue-300' },
    member: { label: 'Membro', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    leader: { label: 'Líder', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
    pastor: { label: 'Pastor', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  }

  const familyRoleLabels: Record<FamilyRole, string> = {
    head: 'Cabeça / Responsável',
    spouse: 'Cônjuge',
    child: 'Filho(a)',
    other: 'Outro vínculo',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D4AF37]" />
            Gestão de Pessoas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {canAccessAll
              ? 'Acesso total: visualização completa de todos os visitantes, membros e líderes.'
              : isLeader
                ? 'Acesso restrito ao contexto: você visualiza apenas integrantes sob seu cuidado pastoral.'
                : 'Acesso restrito ao seu núcleo familiar e perfil pessoal.'}
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={openCreateDialog}
            className="bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Cadastrar Pessoa
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nome, WhatsApp ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium whitespace-nowrap">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'visitor', label: 'Visitante' },
                { id: 'attender', label: 'Frequentador' },
                { id: 'member', label: 'Membro' },
                { id: 'leader', label: 'Líder' },
                { id: 'pastor', label: 'Pastor' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-[#2C3E50] text-[#D4AF37] font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People Table */}
      <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Nome da Pessoa</th>
                <th className="py-3 px-4">Status / Papel</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4">Família / Casa</th>
                <th className="py-3 px-4">Jornada Logos</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Carregando cadastros...
                  </td>
                </tr>
              ) : visiblePersons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-[#2C3E50] font-bold text-xs flex items-center justify-center border border-slate-200 group-hover:border-[#D4AF37] transition-colors">
                            {person.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{person.name}</p>
                            <p className="text-[11px] text-slate-400">
                              Cadastrado em {new Date(person.created).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {person.whatsapp ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{person.whatsapp}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sem telefone</span>
                        )}
                        {person.email && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {person.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
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
                          <span className="text-slate-400 italic">Sem família vinculada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
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
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            {person.status === 'member'
                              ? 'Membro Ativo'
                              : person.status === 'attender'
                                ? 'Frequentador'
                                : 'Visitante'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPerson(person)
                              setSheetOpen(true)
                            }}
                            className="h-7 text-xs text-slate-600 hover:text-[#2C3E50]"
                          >
                            Ver Perfil
                          </Button>
                          {canAccessAll && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(person)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
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

      {/* PERSON FULL PROFILE SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg bg-white p-6 overflow-y-auto space-y-6">
          {selectedPerson && (
            <>
              <SheetHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#2C3E50] text-[#D4AF37] font-bold text-lg flex items-center justify-center shadow-md">
                      {selectedPerson.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <SheetTitle className="font-serif-sacred text-xl text-[#2C3E50]">
                        {selectedPerson.name}
                      </SheetTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold mt-1 ${
                          statusBadgeInfo[selectedPerson.status]?.color
                        }`}
                      >
                        {statusBadgeInfo[selectedPerson.status]?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Personal Data */}
              <div className="space-y-4 text-xs">
                <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                  Dados de Contato e Pessoais
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block text-[10px]">WhatsApp:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {selectedPerson.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">E-mail:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3 h-3 text-blue-600" />
                      {selectedPerson.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nascimento:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#D4AF37]" />
                      {selectedPerson.birth_date
                        ? new Date(selectedPerson.birth_date).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Como conheceu:</span>
                    <span className="font-medium text-slate-700 mt-0.5 block truncate">
                      {selectedPerson.how_met || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Family Relationship */}
                <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                  Vínculo Familiar
                </h4>
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                  {selectedPerson.family ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HomeIcon className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-bold text-slate-800">
                            {families.find((f) => f.id === selectedPerson.family)?.name ||
                              selectedPerson.expand?.family?.name ||
                              'Família Associada'}
                          </span>
                        </div>
                        <Badge className="bg-[#2C3E50] text-[#D4AF37] text-[10px]">
                          {familyRoleLabels[selectedPerson.family_role || 'other']}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {families.find((f) => f.id === selectedPerson.family)?.address ||
                          selectedPerson.expand?.family?.address ||
                          'Endereço do núcleo familiar registrado na igreja.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Nenhum núcleo familiar associado ainda.</p>
                  )}
                </div>

                {/* Growth Journey Checklist */}
                <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                  Etapa da Jornada Logos
                </h4>
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Classe de Boas-Vindas</span>
                    <Badge variant={selectedPerson.checklist_welcome_class ? 'default' : 'outline'}>
                      {selectedPerson.checklist_welcome_class ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Batismo</span>
                    <Badge variant={selectedPerson.checklist_baptized ? 'default' : 'outline'}>
                      {selectedPerson.checklist_baptized ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Integração em Pequeno Grupo</span>
                    <Badge variant={selectedPerson.checklist_small_group ? 'default' : 'outline'}>
                      {selectedPerson.checklist_small_group ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">Envolvimento Ministerial</span>
                    <Badge variant={selectedPerson.checklist_ministry ? 'default' : 'outline'}>
                      {selectedPerson.checklist_ministry ? 'Concluído' : 'Pendente'}
                    </Badge>
                  </div>
                </div>

                {/* Pastoral Notes */}
                {selectedPerson.notes && (
                  <>
                    <h4 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] pt-2">
                      Observações Pastorais
                    </h4>
                    <p className="p-3 rounded-xl bg-slate-100 text-slate-700 leading-relaxed">
                      {selectedPerson.notes}
                    </p>
                  </>
                )}

                {/* Actions */}
                {canAccessAll && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(selectedPerson)}
                      className="text-xs"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar Perfil
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Excluir Cadastro
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* CREATE / EDIT PERSON DIALOG */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              {editingPersonId ? 'Editar Pessoa' : 'Novo Cadastro de Pessoa'}
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
                placeholder="Ex: João da Silva"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-whatsapp">WhatsApp</Label>
                <Input
                  id="p-whatsapp"
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-birth">Data de Nascimento</Label>
                <Input
                  id="p-birth"
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-email">E-mail</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="joao@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status">Status / Jornada</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as PersonStatus)}
                >
                  <SelectTrigger id="p-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="visitor">Visitante</SelectItem>
                    <SelectItem value="attender">Frequentador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                    <SelectItem value="pastor">Pastor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Family selection */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label htmlFor="p-family">Família (Núcleo/Casa)</Label>
                <Select value={formFamily} onValueChange={setFormFamily}>
                  <SelectTrigger id="p-family">
                    <SelectValue placeholder="Selecione ou deixe sem" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
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
                <Label htmlFor="p-role">Papel na Família</Label>
                <Select
                  value={formFamilyRole}
                  onValueChange={(val) => setFormFamilyRole(val as FamilyRole)}
                  disabled={formFamily === 'none'}
                >
                  <SelectTrigger id="p-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="head">Cabeça / Responsável</SelectItem>
                    <SelectItem value="spouse">Cônjuge</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="other">Outro (avó, sogra, primo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-notes">Notas / Histórico Pastoral</Label>
              <Textarea
                id="p-notes"
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ex: Chegou no culto especial de Páscoa, pediu oração pela saúde..."
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#2C3E50] text-white text-xs font-semibold"
            >
              {isSubmitting
                ? 'Salvando...'
                : editingPersonId
                  ? 'Atualizar Cadastro'
                  : 'Salvar Pessoa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
