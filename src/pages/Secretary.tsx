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
import {
  invitesService,
  personsService,
  divergencesService,
  presencesService,
  cultosService,
} from '@/services/church'
import type {
  InviteRecord,
  PersonRecord,
  UserRole,
  RegistrationDivergenceRecord,
  PresenceRecord,
  CultoRecord,
} from '@/types/church'
import { AlertCircle, CheckCircle2, XCircle, Link as LinkIcon, Trash2 } from 'lucide-react'
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
  const [divergences, setDivergences] = useState<RegistrationDivergenceRecord[]>([])
  const [orphanPresences, setOrphanPresences] = useState<PresenceRecord[]>([])
  const [allCultos, setAllCultos] = useState<CultoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Link orphan dialog
  const [linkOrphanModalOpen, setLinkOrphanModalOpen] = useState(false)
  const [orphanToLink, setOrphanToLink] = useState<PresenceRecord | null>(null)
  const [linkTargetCultoId, setLinkTargetCultoId] = useState('')

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
      const [invList, perList, divList, orphans, cultosList] = await Promise.all([
        invitesService.list(),
        personsService.list(),
        divergencesService.list('status = "pendente"'),
        presencesService.listOrphans(),
        cultosService.list(),
      ])
      setInvites(invList)
      setPersons(perList)
      setDivergences(divList)
      setOrphanPresences(orphans)
      setAllCultos(cultosList)
    } catch {
      toast.error('Erro ao carregar dados da secretaria.')
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

  const handleResolveDivergence = async (
    div: RegistrationDivergenceRecord,
    status: 'aprovada' | 'rejeitada',
  ) => {
    try {
      if (status === 'aprovada') {
        // Apply submitted value to person
        if (div.field_name === 'email') {
          await personsService.update(div.person, { email: div.submitted_value })
        } else if (div.field_name === 'name' && div.divergence_type === 'nome_variacao') {
          await personsService.update(div.person, { name: div.submitted_value })
        }
      }
      await divergencesService.resolve(
        div.id,
        status,
        'Secretaria',
        `Resolvida pela Secretaria: ${status}`,
      )
      setDivergences((prev) => prev.filter((d) => d.id !== div.id))
      toast.success(
        status === 'aprovada' ? 'Divergência aprovada e aplicada.' : 'Divergência rejeitada.',
      )
    } catch {
      toast.error('Erro ao resolver divergência.')
    }
  }

  const handleLinkOrphan = async () => {
    if (!orphanToLink || !linkTargetCultoId) return
    try {
      await presencesService.linkToCulto(orphanToLink.id, linkTargetCultoId)
      toast.success('Presença vinculada ao evento com sucesso!')
      setLinkOrphanModalOpen(false)
      setOrphanToLink(null)
      setLinkTargetCultoId('')
      const updated = await presencesService.listOrphans()
      setOrphanPresences(updated)
    } catch {
      toast.error('Erro ao vincular presença.')
    }
  }

  const handleDeleteOrphan = async (id: string) => {
    if (!confirm('Deseja descartar este registro de presença órfã?')) return
    try {
      await presencesService.delete(id)
      toast.success('Registro de presença descartado.')
      setOrphanPresences((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error('Erro ao descartar presença.')
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
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Gestão Institucional</span>
            <span className="text-gray-300">/</span>
            <span>{invites.filter((i) => !i.used).length} convites pendentes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Secretaria & Acessos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            Geração de links de convite por e-mail com vinculação direta de papéis ministeriais.
          </p>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-5 rounded-full font-bold shadow-md shadow-[#820AD1]/20 cursor-pointer self-start sm:self-auto active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
          Gerar Novo Convite
        </Button>
      </div>

      {/* ALERTA DE PRESENÇAS ÓRFÃS / SEM EVENTO NA AGENDA (Secretaria D11) */}
      {orphanPresences.length > 0 && (
        <section className="bg-white border border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800">
                  Agenda da Igreja &bull; Pendências de Presença
                </span>
                <h2 className="text-base font-bold text-[#191919]">
                  Presenças Sem Evento Correspondente ({orphanPresences.length})
                </h2>
              </div>
            </div>
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full font-bold">
              Agenda Desatualizada ou Registro Fora de Hora
            </span>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed">
            Visitantes ou frequentadores escanearam o QR Code num momento sem evento ativo na
            agenda. O cadastro foi gravado com segurança. Vincule manualmente ao evento correto
            (inclusive passado) ou descarte o registro de presença:
          </p>

          <div className="divide-y divide-amber-100 text-xs">
            {orphanPresences.map((orphan) => {
              const person = orphan.expand?.person
              return (
                <div
                  key={orphan.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/50 rounded-xl px-2 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191919]">
                        {person?.name || 'Pessoa Registrada'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {orphan.presence_type === 'primeira_visita' ? '1ª Visita' : 'Retorno'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px]">
                      Telefone: {person?.phone || person?.whatsapp || 'Sem telefone'} &bull;
                      Escaneamento:{' '}
                      {new Date(orphan.created).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      de {new Date(orphan.created).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      onClick={() => {
                        setOrphanToLink(orphan)
                        setLinkOrphanModalOpen(true)
                      }}
                      className="bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-xs h-8 px-3 rounded-full cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5 mr-1" />
                      Vincular a Evento
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteOrphan(orphan.id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 font-bold text-xs h-8 px-2.5 rounded-full cursor-pointer"
                      title="Descartar este registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Conciliação de Divergências de Cadastro do QR Code (D12 Cenários 7 & 8) */}
      {divergences.length > 0 && (
        <section className="bg-white border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800">
                  Conciliação de Cadastros (QR Code)
                </span>
                <h2 className="text-base font-bold text-[#191919]">
                  Divergências Submetidas no Culto ({divergences.length})
                </h2>
              </div>
            </div>
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full font-bold">
              Pendentes de Revisão
            </span>
          </div>

          <div className="divide-y divide-amber-100 text-xs">
            {divergences.map((div) => {
              const person = persons.find((p) => p.id === div.person)
              return (
                <div
                  key={div.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191919]">Telefone: {div.phone}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {div.divergence_type === 'email_diferente'
                          ? 'E-mail Diferente'
                          : div.divergence_type === 'nome_variacao'
                            ? 'Variação de Nome'
                            : 'Possível Familiar'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px]">
                      Valor Atual: <strong>{div.current_value || 'Nenhum'}</strong> &rarr; Submetido
                      no QR: <strong className="text-[#820AD1]">{div.submitted_value}</strong>
                    </p>
                    {div.notes && <p className="text-[10px] text-gray-400 italic">{div.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResolveDivergence(div, 'aprovada')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-full"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Aprovar &amp; Atualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveDivergence(div, 'rejeitada')}
                      className="text-gray-500 hover:text-red-600 border-gray-200 font-bold text-xs h-8 px-3 rounded-full"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Manter Atual
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Nubank Rounded Table Container */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8F9FB] border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3.5 px-5">E-mail / Destinatário</th>
              <th className="py-3.5 px-4">Papel Atribuído</th>
              <th className="py-3.5 px-4">Pessoa Vinculada</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Criado em</th>
              <th className="py-3.5 px-5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Carregando convites...
                </td>
              </tr>
            ) : invites.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  Nenhum convite emitido até o momento.
                </td>
              </tr>
            ) : (
              invites.map((inv) => {
                const linkedPerson = persons.find((p) => p.id === inv.person)

                return (
                  <tr key={inv.id} className="hover:bg-[#F8F9FB] transition-colors">
                    {/* Email */}
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-[#191919]">{inv.email}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Token: {inv.token}
                      </p>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#F7EEFD] text-[#820AD1]">
                        {roleLabels[inv.role] || inv.role}
                      </span>
                    </td>

                    {/* Person */}
                    <td className="py-3.5 px-4 text-gray-600">
                      {linkedPerson ? (
                        <span className="font-semibold text-[#191919]">{linkedPerson.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Livre (sem cadastro prévio)</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {inv.used ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Resgatado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                      {new Date(inv.created).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!inv.used && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            className="h-8 px-3 text-xs text-[#820AD1] hover:bg-[#F7EEFD] rounded-full font-bold active:scale-95"
                          >
                            {copiedId === inv.id ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Copiado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Copy className="w-3.5 h-3.5 text-[#820AD1]" /> Copiar link
                              </span>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="h-8 px-2.5 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full font-bold"
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

      {/* VINCULAR PRESENÇA ÓRFÃ A EVENTO */}
      <Dialog open={linkOrphanModalOpen} onOpenChange={setLinkOrphanModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#191919]">
              Vincular Presença a um Evento da Agenda
            </DialogTitle>
            <p className="text-xs text-gray-500">
              Corrija o registro atribuindo-o ao culto ou evento correspondente (inclusive passado).
            </p>
          </DialogHeader>

          {orphanToLink && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <span className="font-bold text-purple-900 block">
                  {orphanToLink.expand?.person?.name || 'Pessoa'}
                </span>
                <span className="text-[11px] text-purple-700">
                  Data/Hora do escaneamento:{' '}
                  {new Date(orphanToLink.created).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-gray-700">Evento de Destino</Label>
                <Select value={linkTargetCultoId} onValueChange={setLinkTargetCultoId}>
                  <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent">
                    <SelectValue placeholder="Selecione o evento para vincular" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl shadow-xl">
                    {allCultos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({new Date(c.date_time).toLocaleDateString('pt-BR')} - {c.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleLinkOrphan}
                disabled={!linkTargetCultoId}
                className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 cursor-pointer"
              >
                Confirmar Vinculação
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE INVITE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border-gray-100 shadow-2xl p-6 sm:p-8">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-bold mb-1">
              L
            </div>
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Gerar Convite de Acesso
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateInvite} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="inv-email" className="font-semibold text-gray-700">
                E-mail do Convidado *
              </Label>
              <Input
                id="inv-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="convidado@exemplo.com"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-role" className="font-semibold text-gray-700">
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
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100">
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="leader">Líder de Grupo</SelectItem>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="secretary">Secretaria (Acesso Pleno)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-person" className="font-semibold text-gray-700">
                Vincular a Cadastro Existente (Opcional)
              </Label>
              <Select value={invitePersonId} onValueChange={setInvitePersonId}>
                <SelectTrigger
                  id="inv-person"
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                >
                  <SelectValue placeholder="Selecione se já houver registro" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100 max-h-56">
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
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Gerando...' : 'Criar Link de Convite'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
