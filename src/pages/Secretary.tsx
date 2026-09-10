import React, { useState, useEffect } from 'react'
import {
  Mail,
  Plus,
  Copy,
  Check,
  Send,
  Users,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  QrCode,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { invitesService, personsService } from '@/services/church'
import type { InviteRecord, PersonRecord, UserRole } from '@/types/church'
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

export default function Secretary() {
  const { canAccessAll } = useAuth()

  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Create invite dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'secretary' | 'pastor' | 'leader' | 'member'>(
    'member',
  )
  const [invitePersonId, setInvitePersonId] = useState<string>('none')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Copied token state
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
      toast.error('Erro ao listar convites da secretaria.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Informe o e-mail do destinatário.')
      return
    }

    try {
      setIsSubmitting(true)
      const token = Math.random().toString(36).substring(2, 10).toUpperCase()
      const created = await invitesService.create({
        email: inviteEmail.trim(),
        role: inviteRole,
        person: invitePersonId !== 'none' ? invitePersonId : undefined,
        token: token,
        used: false,
      })
      setInvites((prev) => [created, ...prev])
      toast.success('Convite gerado com sucesso!')
      setDialogOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      setInvitePersonId('none')
    } catch {
      toast.error('Erro ao gerar convite.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/convite/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Link de resgate copiado para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Deseja realmente revogar este convite?')) return
    try {
      await invitesService.delete(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success('Convite cancelado.')
    } catch {
      toast.error('Erro ao revogar convite.')
    }
  }

  const roleLabels: Record<UserRole, string> = {
    secretary: 'Secretaria',
    pastor: 'Pastor',
    leader: 'Líder',
    member: 'Membro',
    visitor: 'Visitante',
  }

  if (!canAccessAll) {
    return (
      <div className="p-12 text-center text-xs text-zinc-500 bg-white border border-zinc-200 rounded-xl space-y-3">
        <ShieldAlert className="w-8 h-8 mx-auto text-amber-500" />
        <h2 className="text-base font-semibold text-zinc-900">Acesso Restrito à Secretaria</h2>
        <p className="max-w-md mx-auto text-zinc-400">
          Você precisa de privilégios de Secretaria ou Pastoral para gerenciar permissões e disparar
          convites formais.
        </p>
      </div>
    )
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            <span>Gestão Institucional</span>
            <span className="text-zinc-300">/</span>
            <span>{invites.filter((i) => !i.used).length} convites pendentes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
            Secretaria & Acessos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl font-normal">
            Geração de links de convite por e-mail com vinculação direta de papéis ministeriais.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-4 rounded-lg font-medium shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
          Gerar Novo Convite
        </Button>
      </div>

      {/* Modern SaaS Table Container */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">E-mail / Destinatário</th>
              <th className="py-3 px-4">Papel Atribuído</th>
              <th className="py-3 px-4">Pessoa Vinculada</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Criado em</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-zinc-400">
                  Carregando convites...
                </td>
              </tr>
            ) : invites.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-400">
                  Nenhum convite emitido até o momento.
                </td>
              </tr>
            ) : (
              invites.map((inv) => {
                const linkedPerson = persons.find((p) => p.id === inv.person)

                return (
                  <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                    {/* Email */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900">{inv.email}</p>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Token: {inv.token}
                      </p>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
                        {roleLabels[inv.role] || inv.role}
                      </span>
                    </td>

                    {/* Person */}
                    <td className="py-3 px-4 text-zinc-600">
                      {linkedPerson ? (
                        <span className="font-medium text-zinc-900">{linkedPerson.name}</span>
                      ) : (
                        <span className="text-zinc-400 italic">Livre (sem cadastro prévio)</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {inv.used ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Resgatado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(inv.created).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!inv.used && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            className="h-7 px-2 text-xs text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
                          >
                            {copiedId === inv.id ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Copiado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Copy className="w-3 h-3 text-zinc-400" /> Copiar link
                              </span>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="h-7 px-2 text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50"
                        >
                          Revogar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE INVITE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl border-zinc-200 shadow-xl">
          <DialogHeader className="border-b border-zinc-100 pb-3">
            <DialogTitle className="text-xl font-semibold text-zinc-900">
              Gerar Convite de Acesso
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateInvite} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="inv-email" className="font-medium text-zinc-700">
                E-mail do Convidado *
              </Label>
              <Input
                id="inv-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="convidado@exemplo.com"
                className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-role" className="font-medium text-zinc-700">
                Papel a Conceder
              </Label>
              <Select
                value={inviteRole}
                onValueChange={(val) =>
                  setInviteRole(val as 'secretary' | 'pastor' | 'leader' | 'member')
                }
              >
                <SelectTrigger
                  id="inv-role"
                  className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-lg shadow-lg">
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="leader">Líder de Grupo</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="secretary">Secretaria (Acesso Pleno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-person" className="font-medium text-zinc-700">
                Vincular a Cadastro Existente (Opcional)
              </Label>
              <Select value={invitePersonId} onValueChange={setInvitePersonId}>
                <SelectTrigger
                  id="inv-person"
                  className="h-9 rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                >
                  <SelectValue placeholder="Selecione se já houver registro" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-lg max-h-56 shadow-lg">
                  <SelectItem value="none">Criar/vincular posteriormente</SelectItem>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 rounded-lg font-medium shadow-xs"
            >
              {isSubmitting ? 'Gerando...' : 'Criar Link de Convite'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
