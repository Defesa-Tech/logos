import React, { useState, useEffect } from 'react'
import {
  Home as HomeIcon,
  Plus,
  Users,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  ChevronRight,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { familiesService, personsService } from '@/services/church'
import type { FamilyRecord, PersonRecord, FamilyRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { PageTransition } from '@/components/MotionKit'

export default function Families() {
  const { canAccessAll, isLeader, currentPerson } = useAuth()

  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false)
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null)
  const [familyName, setFamilyName] = useState('')
  const [familyAddress, setFamilyAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Associate member modal
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [targetFamilyId, setTargetFamilyId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('child')

  useRealtime<FamilyRecord>('families', (e) => {
    if (e.action === 'create') {
      setFamilies((prev) => [e.record, ...prev])
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
      const [fData, pData] = await Promise.all([familiesService.list(), personsService.list()])
      setFamilies(fData)
      setPersons(pData)
    } catch {
      toast.error('Erro ao listar famílias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter based on role
  const visibleFamilies = families.filter((f) => {
    if (canAccessAll) return true
    if (isLeader) {
      if (currentPerson?.family) return f.id === currentPerson.family
      return true
    }
    if (currentPerson?.family) return f.id === currentPerson.family
    return true
  })

  const openCreateDialog = () => {
    setEditingFamilyId(null)
    setFamilyName('')
    setFamilyAddress('')
    setFamilyDialogOpen(true)
  }

  const openEditDialog = (fam: FamilyRecord) => {
    setEditingFamilyId(fam.id)
    setFamilyName(fam.name)
    setFamilyAddress(fam.address || '')
    setFamilyDialogOpen(true)
  }

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) {
      toast.error('Informe o nome da família')
      return
    }

    try {
      setIsSubmitting(true)
      if (editingFamilyId) {
        const updated = await familiesService.update(editingFamilyId, {
          name: familyName.trim(),
          address: familyAddress.trim() || undefined,
        })
        setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
        toast.success('Núcleo familiar atualizado com sucesso!')
      } else {
        const created = await familiesService.create({
          name: familyName.trim(),
          address: familyAddress.trim() || undefined,
        })
        setFamilies((prev) => [created, ...prev])
        toast.success('Núcleo familiar cadastrado com sucesso!')
      }
      setFamilyDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar família.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFamily = async (id: string) => {
    if (!confirm('Deseja realmente remover este núcleo familiar?')) return
    try {
      await familiesService.delete(id)
      setFamilies((prev) => prev.filter((f) => f.id !== id))
      toast.success('Família removida do registro.')
    } catch {
      toast.error('Erro ao remover família.')
    }
  }

  const handleOpenAddMember = (familyId: string) => {
    setTargetFamilyId(familyId)
    setSelectedPersonId('')
    setSelectedRole('child')
    setMemberDialogOpen(true)
  }

  const handleAssignPersonToFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetFamilyId || !selectedPersonId) {
      toast.error('Selecione uma pessoa para associar.')
      return
    }

    try {
      setIsSubmitting(true)
      const updated = await personsService.update(selectedPersonId, {
        family: targetFamilyId,
        family_role: selectedRole,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Pessoa vinculada à família com sucesso!')
      setMemberDialogOpen(false)
    } catch {
      toast.error('Erro ao associar pessoa à família.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemovePersonFromFamily = async (personId: string) => {
    try {
      const updated = await personsService.update(personId, {
        family: null as any,
        family_role: null as any,
      })
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      toast.success('Pessoa desvinculada do núcleo familiar.')
    } catch {
      toast.error('Erro ao desvincular pessoa.')
    }
  }

  const roleLabel: Record<FamilyRole, string> = {
    head: 'Cabeça do Lar',
    spouse: 'Cônjuge',
    child: 'Filho(a)',
    other: 'Outro membro',
  }

  const unassignedPersons = persons.filter((p) => !p.family)

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
            <span>Estrutura Eclesial</span>
            <span className="text-slate-300">/</span>
            <span>{visibleFamilies.length} lares organizados</span>
          </div>
          <h1 className="font-serif-sacred text-3xl sm:text-4xl font-bold tracking-tight text-[#141B22]">
            Núcleos Familiares e Casas
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal">
            Mapeamento dos lares cristãos, chefes de família, cônjuges e filhos para acompanhamento
            pastoral integrado.
          </p>
        </div>

        {canAccessAll && (
          <Button
            onClick={openCreateDialog}
            className="bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 px-4 rounded font-mono shadow-none cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-[#C5A046]" strokeWidth={1.75} />
            Novo Núcleo Familiar
          </Button>
        )}
      </div>

      {/* Grid of Families — Editorial Architectural Register */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400 font-mono">
          Carregando núcleos familiares...
        </div>
      ) : visibleFamilies.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white border border-[#E6E2D8] rounded font-mono">
          Nenhum núcleo familiar cadastrado no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {visibleFamilies.map((fam) => {
            const familyMembers = persons.filter((p) => p.family === fam.id)
            const headOfHouse = familyMembers.find((p) => p.family_role === 'head')
            const otherMembers = familyMembers.filter((p) => p.family_role !== 'head')

            return (
              <div
                key={fam.id}
                className="bg-white border border-[#E6E2D8] rounded p-6 space-y-4 hover:border-slate-400 transition-colors"
              >
                {/* Family Title Bar */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6E2D8]">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A046] block">
                      Núcleo Familiar
                    </span>
                    <h2 className="font-serif-sacred text-2xl font-bold text-[#141B22] truncate mt-0.5">
                      {fam.name}
                    </h2>
                    {fam.address ? (
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{fam.address}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic font-mono mt-1">
                        Endereço não cadastrado
                      </p>
                    )}
                  </div>

                  {canAccessAll && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(fam)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFamily(fam.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Head of household highlight */}
                {headOfHouse ? (
                  <div className="p-3 bg-[#FAF9F6] border border-[#E6E2D8] rounded text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block">
                        Responsável pelo Lar
                      </span>
                      <p className="font-semibold text-[#141B22] mt-0.5">{headOfHouse.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">
                        {headOfHouse.whatsapp || headOfHouse.email || 'Sem contato'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-700 bg-white">
                      Cabeça
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-[#FAF9F6] border border-dashed border-[#E6E2D8] rounded text-xs text-slate-400 italic font-mono">
                    Responsável pelo lar ainda não definido.
                  </div>
                )}

                {/* Other members dense list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Membros da Casa ({familyMembers.length})
                    </span>
                    {canAccessAll && (
                      <button
                        onClick={() => handleOpenAddMember(fam.id)}
                        className="text-[11px] font-mono text-[#141B22] hover:text-[#C5A046] flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Vincular pessoa
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-[#F0EDE4] border-t border-[#E6E2D8] text-xs">
                    {familyMembers.length === 0 ? (
                      <p className="text-slate-400 text-xs py-3 italic">
                        Nenhum integrante associado a este lar.
                      </p>
                    ) : (
                      familyMembers.map((mem) => (
                        <div
                          key={mem.id}
                          className="py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[#141B22] truncate">{mem.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {roleLabel[mem.family_role || 'child']} &bull; {mem.status}
                            </p>
                          </div>
                          {canAccessAll && (
                            <button
                              onClick={() => handleRemovePersonFromFamily(mem.id)}
                              className="text-[10px] font-mono text-slate-400 hover:text-red-700 px-1 py-0.5 cursor-pointer"
                              title="Desvincular da família"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE / EDIT FAMILY DIALOG */}
      <Dialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded border-[#E6E2D8]">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif-sacred text-2xl text-[#141B22]">
              {editingFamilyId ? 'Editar Núcleo Familiar' : 'Novo Núcleo Familiar'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFamily} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label
                htmlFor="fam-name"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Sobrenome / Nome do Lar *
              </Label>
              <Input
                id="fam-name"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ex: Família Souza Lima"
                className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="fam-addr"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Endereço Completo
              </Label>
              <Input
                id="fam-addr"
                value={familyAddress}
                onChange={(e) => setFamilyAddress(e.target.value)}
                placeholder="Rua das Palmeiras, 120 - Apto 32"
                className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
            >
              {isSubmitting
                ? 'Gravando...'
                : editingFamilyId
                  ? 'Salvar Alterações'
                  : 'Criar Núcleo Familiar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ASSIGN PERSON TO FAMILY DIALOG */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded border-[#E6E2D8]">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif-sacred text-2xl text-[#141B22]">
              Vincular Pessoa ao Lar
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignPersonToFamily} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label
                htmlFor="select-person"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Selecionar Pessoa
              </Label>
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger
                  id="select-person"
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                >
                  <SelectValue placeholder="Escolha um cadastro sem família..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded max-h-56">
                  {unassignedPersons.length === 0 ? (
                    <SelectItem value="none_found" disabled>
                      Nenhuma pessoa sem família encontrada
                    </SelectItem>
                  ) : (
                    unassignedPersons.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="select-role"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Papel no Lar
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => setSelectedRole(val as FamilyRole)}
              >
                <SelectTrigger
                  id="select-role"
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded">
                  <SelectItem value="head">Cabeça / Responsável</SelectItem>
                  <SelectItem value="spouse">Cônjuge</SelectItem>
                  <SelectItem value="child">Filho(a)</SelectItem>
                  <SelectItem value="other">Outro familiar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !selectedPersonId}
              className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
            >
              {isSubmitting ? 'Vinculando...' : 'Confirmar Vínculo Familiar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
