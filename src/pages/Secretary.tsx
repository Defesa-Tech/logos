import React, { useState, useEffect } from 'react'
import {
  Mail,
  Plus,
  Copy,
  Check,
  Send,
  Trash2,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { invitesService, personsService } from '@/services/church'
import type { InviteRecord, PersonRecord, UserRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'
import { PageTransition } from '@/components/MotionKit'

export default function Secretary() {
  const { canAccessAll } = useAuth()

  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Create invite modal
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'secretary' | 'pastor' | 'leader' | 'member'>(
    'member',
  )
  const [customEmail, setCustomEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Copied token state
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useRealtime<InviteRecord>('invites', (e) => {
    if (e.action === 'create') {
      setInvites((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setInvites((prev) => prev.map((i) => (i.id === e.record.id ? e.record : i)))
    } else if (e.action === 'delete') {
      setInvites((prev) => prev.filter((i) => i.id !== e.record.id))
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [invList, perList] = await Promise.all([invitesService.list(), personsService.list()])
      setInvites(invList)
      setPersons(perList)
    } catch {
      toast.error('Erro ao carregar dados da secretaria.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (!canAccessAll) {
    return (
      <div className="p-12 text-center space-y-4 bg-white border border-[#E6E2D8] rounded max-w-lg mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-amber-700 mx-auto" strokeWidth={1.5} />
        <h2 className="font-serif-sacred text-2xl font-bold text-[#141B22]">Acesso Restrito</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Esta área é reservada para a Secretaria da Igreja e Pastores com permissão de gestão de
          convites e credenciais de acesso.
        </p>
      </div>
    )
  }

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPersonId && !customEmail.trim()) {
      toast.error('Selecione uma pessoa ou informe um e-mail.')
      return
    }

    try {
      setIsSubmitting(true)

      let targetEmail = customEmail.trim()
      let personName = 'Novo Usuário'

      if (selectedPersonId) {
        const found = persons.find((p) => p.id === selectedPersonId)
        if (found) {
          personName = found.name
          if (found.email && !targetEmail) {
            targetEmail = found.email
          }
        }
      }

      if (!targetEmail) {
        targetEmail = `${personName.toLowerCase().replace(/\s+/g, '')}@logos.igreja`
      }

      const created = await invitesService.create({
        email: targetEmail,
        role: selectedRole,
        person: selectedPersonId || undefined,
      })

      setInvites((prev) => [created, ...prev])
      toast.success('Convite gerado com sucesso!')
      setDialogOpen(false)
      setSelectedPersonId('')
      setCustomEmail('')
    } catch {
      toast.error('Erro ao gerar convite.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/convite?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success('Link do convite copiado para a área de transferência!')
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Deseja realmente revogar e apagar este convite?')) return
    try {
      await invitesService.delete(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success('Convite revogado.')
    } catch {
      toast.error('Erro ao apagar convite.')
    }
  }

  const roleLabelMap: Record<UserRole, string> = {
    secretary: 'Secretaria',
    pastor: 'Pastor',
    leader: 'Líder',
    member: 'Membro',
    visitor: 'Visitante',
  }

  const pendingInvites = invites.filter((i) => !i.used)
  const claimedInvites = invites.filter((i) => i.used)

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E6E2D8] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
            <span>Gestão Institucional</span>
            <span className="text-slate-300">/</span>
            <span>Credenciais de Acesso</span>
          </div>
          <h1 className="font-serif-sacred text-3xl sm:text-4xl font-bold tracking-tight text-[#141B22]">
            Secretaria & Emissão de Convites
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-normal">
            Gere links mágicos seguros para que membros, líderes e obreiros resgatem seus acessos ao
            sistema Logos com seus devidos papéis.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 px-4 rounded font-mono shadow-none cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5 text-[#C5A046]" strokeWidth={1.75} />
          Gerar Novo Convite
        </Button>
      </div>

      {/* Stats summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E6E2D8] p-4 rounded space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Convites Pendentes
          </p>
          <p className="font-serif-sacred text-3xl font-bold text-[#141B22]">
            {pendingInvites.length}
          </p>
        </div>
        <div className="bg-white border border-[#E6E2D8] p-4 rounded space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Acessos Resgatados
          </p>
          <p className="font-serif-sacred text-3xl font-bold text-[#141B22]">
            {claimedInvites.length}
          </p>
        </div>
        <div className="bg-white border border-[#E6E2D8] p-4 rounded space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Emitido
          </p>
          <p className="font-serif-sacred text-3xl font-bold text-[#141B22]">{invites.length}</p>
        </div>
      </div>

      {/* Convites em Aberto (Editorial Table) */}
      <div className="bg-white border border-[#E6E2D8] rounded space-y-3 p-5">
        <div className="pb-3 border-b border-[#E6E2D8] flex items-center justify-between">
          <div>
            <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
              Convites Ativos & Aguardando Resgate
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Envie o link para o membro criar sua senha
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-600">
            {pendingInvites.length} aguardando
          </span>
        </div>

        {loading ? (
          <p className="text-center text-xs text-slate-400 font-mono py-8">Carregando...</p>
        ) : pendingInvites.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8 font-mono italic">
            Nenhum convite pendente no momento.
          </p>
        ) : (
          <div className="divide-y divide-[#F0EDE4] text-xs">
            {pendingInvites.map((inv) => {
              const person = persons.find((p) => p.id === inv.person)
              return (
                <div
                  key={inv.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] px-2 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#141B22] truncate">
                        {person?.name || inv.email}
                      </p>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-700 bg-white">
                        {roleLabelMap[inv.role]}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      Destinatário: {inv.email} &bull; Gerado em{' '}
                      {new Date(inv.created).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(inv.token)}
                      className="text-xs h-8 px-3 rounded font-mono bg-[#141B22] hover:bg-[#1E2732] text-white"
                    >
                      {copiedToken === inv.token ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-[#C5A046]" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1 text-[#C5A046]" />
                          Copiar Link
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInvite(inv.id)}
                      className="text-xs h-8 text-slate-400 hover:text-red-700 font-mono"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Convites já resgatados */}
      {claimedInvites.length > 0 && (
        <div className="bg-white border border-[#E6E2D8] rounded space-y-3 p-5">
          <div className="pb-3 border-b border-[#E6E2D8]">
            <h3 className="font-serif-sacred text-lg font-bold text-[#141B22]">
              Histórico de Convites Concluídos
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Usuários que já ativaram sua conta e definiram senha
            </p>
          </div>

          <div className="divide-y divide-[#F0EDE4] text-xs">
            {claimedInvites.map((inv) => (
              <div
                key={inv.id}
                className="py-2.5 flex items-center justify-between text-slate-600 px-2 font-mono text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{inv.email}</span>
                  <span className="text-[10px] text-slate-400">({roleLabelMap[inv.role]})</span>
                </div>
                <span className="text-slate-400">Ativado</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE INVITE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded border-[#E6E2D8]">
          <DialogHeader className="border-b border-[#E6E2D8] pb-3">
            <DialogTitle className="font-serif-sacred text-2xl text-[#141B22]">
              Gerar Link de Convite
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGenerateInvite} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label
                htmlFor="inv-person"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Associar a Pessoa do Livro (Opcional)
              </Label>
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger
                  id="inv-person"
                  className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                >
                  <SelectValue placeholder="Selecione um irmão ou deixe avulso..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded max-h-56">
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="inv-role"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                Papel / Permissão Concedida *
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) =>
                  setSelectedRole(val as 'secretary' | 'pastor' | 'leader' | 'member')
                }
              >
                <SelectTrigger id="inv-role" className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded">
                  <SelectItem value="member">Membro (Comunhão e seu núcleo familiar)</SelectItem>
                  <SelectItem value="leader">Líder (Visão do seu pequeno grupo)</SelectItem>
                  <SelectItem value="pastor">Pastor (Visão pastoral e rebanho)</SelectItem>
                  <SelectItem value="secretary">Secretaria (Gestão plena institucional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="inv-email"
                className="font-mono uppercase tracking-wider text-slate-600"
              >
                E-mail para Acesso
              </Label>
              <Input
                id="inv-email"
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="membro@exemplo.com (ou deixe em branco se selecionou a pessoa)"
                className="h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-9 rounded font-mono"
            >
              {isSubmitting ? 'Gerando convite...' : 'Gerar e Obter Link'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
