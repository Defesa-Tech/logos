import React, { useState, useEffect } from 'react'
import {
  Home as HomeIcon,
  Plus,
  Users,
  MapPin,
  UserPlus,
  Search,
  ChevronRight,
  Shield,
  Heart,
  Phone,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { familiesService, personsService } from '@/services/church'
import type { FamilyRecord, PersonRecord, FamilyRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

export default function Families() {
  const { canAccessAll, isLeader, currentPerson } = useAuth()

  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Create Family Dialog
  const [createFamOpen, setCreateFamOpen] = useState(false)
  const [famName, setFamName] = useState('')
  const [famAddress, setFamAddress] = useState('')
  const [famNotes, setFamNotes] = useState('')
  const [isSubmittingFam, setIsSubmittingFam] = useState(false)

  // Add Member to Family Dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [targetFamilyId, setTargetFamilyId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('new')
  const [memberRole, setMemberRole] = useState<FamilyRole>('other')

  // New person fields inside add member modal
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonWhatsapp, setNewPersonWhatsapp] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Realtime
  useRealtime<FamilyRecord>('families', (e) => {
    if (e.action === 'create') {
      setFamilies((prev) => [...prev, e.record])
    } else if (e.action === 'update') {
      setFamilies((prev) => prev.map((f) => (f.id === e.record.id ? e.record : f)))
    } else if (e.action === 'delete') {
      setFamilies((prev) => prev.filter((f) => f.id !== e.record.id))
    }
  })

  useRealtime<PersonRecord>('persons', (e) => {
    if (e.action === 'create') {
      setPersons((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setPersons((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
    } else if (e.action === 'delete') {
      setPersons((prev) => prev.filter((p) => p.id !== e.record.id))
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [fList, pList] = await Promise.all([familiesService.list(), personsService.list()])
      setFamilies(fList)
      setPersons(pList)
    } catch {
      toast.error('Erro ao listar famílias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!famName.trim()) {
      toast.error('Informe o sobrenome ou nome da família.')
      return
    }

    try {
      setIsSubmittingFam(true)
      const created = await familiesService.create({
        name: famName.trim(),
        address: famAddress.trim() || undefined,
        notes: famNotes.trim() || undefined,
      })
      setFamilies((prev) => [...prev, created])
      toast.success('Família criada com sucesso!')
      setCreateFamOpen(false)
      setFamName('')
      setFamAddress('')
      setFamNotes('')
    } catch {
      toast.error('Erro ao criar família.')
    } finally {
      setIsSubmittingFam(false)
    }
  }

  const handleAddMemberToFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetFamilyId) return

    try {
      setIsAddingMember(true)

      if (selectedPersonId === 'new') {
        if (!newPersonName.trim()) {
          toast.error('Informe o nome do novo integrante.')
          return
        }
        const createdPerson = await personsService.create({
          name: newPersonName.trim(),
          whatsapp: newPersonWhatsapp.trim() || undefined,
          status: 'visitor',
          family: targetFamilyId,
          family_role: memberRole,
        })
        setPersons((prev) => [createdPerson, ...prev])
        toast.success(`${createdPerson.name} adicionado à família!`)
      } else {
        const updated = await personsService.update(selectedPersonId, {
          family: targetFamilyId,
          family_role: memberRole,
        })
        setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        toast.success(`${updated.name} vinculado à família com sucesso!`)
      }

      setAddMemberOpen(false)
      setNewPersonName('')
      setNewPersonWhatsapp('')
      setSelectedPersonId('new')
    } catch {
      toast.error('Erro ao adicionar integrante à família.')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveFromFamily = async (personId: string) => {
    if (!confirm('Deseja desvincular esta pessoa deste núcleo familiar?')) return
    try {
      const updated = await personsService.update(personId, {
        family: undefined,
        family_role: undefined,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Pessoa desvinculada da família.')
    } catch {
      toast.error('Erro ao desvincular pessoa.')
    }
  }

  const familyRoleLabels: Record<FamilyRole, string> = {
    head: 'Responsável / Cabeça',
    spouse: 'Cônjuge',
    child: 'Filho(a)',
    other: 'Outro membro',
  }

  // Filter families based on permissions and search
  const filteredFamilies = families.filter((f) => {
    if (!canAccessAll && isLeader && currentPerson?.family) {
      if (f.id !== currentPerson.family) return false
    }
    if (searchQuery.trim()) {
      return (
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  // Unlinked persons for the add-member dropdown
  const unlinkedPersons = persons.filter((p) => !p.family)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
            <HomeIcon className="w-6 h-6 text-[#D4AF37]" />
            Núcleos Familiares (Casas)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mapeamento dos lares cristãos, agregando chefes de família, cônjuges, filhos e parentes.
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={() => setCreateFamOpen(true)}
            className="bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs font-semibold h-10 px-4 rounded-xl shadow-md self-start sm:self-auto active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Família
          </Button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar família por sobrenome ou endereço..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-8 text-xs h-10 rounded-2xl bg-white border-slate-200/90 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Families Grid (Responsive 1 col mobile, 2 col tablet, 3 col desktop) */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-12">Carregando famílias...</p>
      ) : filteredFamilies.length === 0 ? (
        <Card className="border-slate-200 p-8 text-center bg-white rounded-2xl shadow-sm">
          <HomeIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Nenhum núcleo familiar encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre um novo lar para organizar pessoas do mesmo convívio.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredFamilies.map((fam) => {
            const familyMembers = persons.filter((p) => p.family === fam.id)

            return (
              <Card
                key={fam.id}
                className="border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#D4AF37] flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <HomeIcon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-base font-serif-sacred text-[#2C3E50] truncate">
                          {fam.name}
                        </CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold bg-white text-slate-700 rounded-full px-2.5 py-0.5 flex-shrink-0"
                      >
                        {familyMembers.length} {familyMembers.length === 1 ? 'membro' : 'membros'}
                      </Badge>
                    </div>

                    {fam.address && (
                      <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{fam.address}</span>
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {familyMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center">
                        Nenhum integrante vinculado a esta casa ainda.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {familyMembers.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 rounded-xl bg-slate-50/90 hover:bg-slate-100/80 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 truncate">{member.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-semibold text-[#2C3E50]">
                                  {familyRoleLabels[member.family_role || 'other']}
                                </span>
                                <span>&bull;</span>
                                <span className="capitalize">{member.status}</span>
                              </div>
                            </div>

                            {canAccessAll && (
                              <button
                                onClick={() => handleRemoveFromFamily(member.id)}
                                title="Desvincular da família"
                                className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {fam.notes && (
                      <p className="text-[11px] text-slate-500 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 leading-relaxed">
                        {fam.notes}
                      </p>
                    )}
                  </CardContent>
                </div>

                {canAccessAll && (
                  <div className="p-3 bg-slate-50/60 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetFamilyId(fam.id)
                        setAddMemberOpen(true)
                      }}
                      className="w-full text-xs text-[#2C3E50] hover:bg-white h-9 rounded-xl font-semibold border-slate-200"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                      Adicionar Membro ao Lar
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* CREATE FAMILY DIALOG */}
      <Dialog open={createFamOpen} onOpenChange={setCreateFamOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              Cadastrar Novo Núcleo Familiar
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFamily} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="fam-name">Sobrenome / Nome da Família *</Label>
              <Input
                id="fam-name"
                required
                value={famName}
                onChange={(e) => setFamName(e.target.value)}
                placeholder="Ex: Família Souza"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fam-address">Endereço do Lar</Label>
              <Input
                id="fam-address"
                value={famAddress}
                onChange={(e) => setFamAddress(e.target.value)}
                placeholder="Rua, número, complemento e bairro"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fam-notes">Observações do Lar</Label>
              <Input
                id="fam-notes"
                value={famNotes}
                onChange={(e) => setFamNotes(e.target.value)}
                placeholder="Ex: Anfitriões do pequeno grupo às quartas-feiras"
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmittingFam}
              className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs h-10 rounded-xl font-semibold shadow-md"
            >
              {isSubmittingFam ? 'Criando lar...' : 'Cadastrar Família'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD MEMBER TO FAMILY DIALOG */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              Adicionar Integrante ao Lar
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMemberToFamily} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="sel-type">Origem do Integrante</Label>
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger id="sel-type" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="new">+ Cadastrar Novo Membro Agora</SelectItem>
                  {unlinkedPersons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPersonId === 'new' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <Label htmlFor="np-name">Nome do Integrante *</Label>
                  <Input
                    id="np-name"
                    required
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Ex: Maria Souza"
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="np-phone">WhatsApp</Label>
                  <Input
                    id="np-phone"
                    value={newPersonWhatsapp}
                    onChange={(e) => setNewPersonWhatsapp(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="h-10 rounded-xl bg-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="fam-role">Papel no Núcleo Familiar *</Label>
              <Select value={memberRole} onValueChange={(val) => setMemberRole(val as FamilyRole)}>
                <SelectTrigger id="fam-role" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="head">Cabeça / Responsável</SelectItem>
                  <SelectItem value="spouse">Cônjuge</SelectItem>
                  <SelectItem value="child">Filho(a)</SelectItem>
                  <SelectItem value="other">Outro (avô, sogra, irmão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={isAddingMember}
              className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs h-10 rounded-xl font-semibold shadow-md"
            >
              {isAddingMember ? 'Vinculando...' : 'Confirmar Vínculo à Família'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
