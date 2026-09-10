import React, { useState, useEffect } from 'react'
import {
  Mail,
  Send,
  Copy,
  Check,
  Plus,
  QrCode,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Clock,
  Sparkles,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { invitesService, personsService } from '@/services/church'
import type { InviteRecord, PersonRecord, UserRole } from '@/types/church'
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

export default function Secretary() {
  const { canAccessAll, role } = useAuth()
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Generate Invite Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'secretary' | 'pastor' | 'leader' | 'member'>(
    'member',
  )
  const [invitePersonId, setInvitePersonId] = useState<string>('none')
  const [inviteWhatsapp, setInviteWhatsapp] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Share Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [activeShareInvite, setActiveShareInvite] = useState<InviteRecord | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Realtime hook
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
      const [invitesList, personsList] = await Promise.all([
        invitesService.list(),
        personsService.list(),
      ])
      setInvites(invitesList)
      setPersons(personsList)
    } catch {
      toast.error('Erro ao carregar dados da secretaria.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Informe o e-mail para envio do convite.')
      return
    }

    try {
      setIsGenerating(true)
      const created = await invitesService.create({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        person: invitePersonId !== 'none' ? invitePersonId : undefined,
      })

      setInvites((prev) => [created, ...prev])
      toast.success('Convite gerado com sucesso!')
      setCreateOpen(false)

      // Open sharing dialog immediately
      setActiveShareInvite(created)
      setShareDialogOpen(true)

      setInviteEmail('')
      setInviteRole('member')
      setInvitePersonId('none')
      setInviteWhatsapp('')
    } catch {
      toast.error('Erro ao gerar convite.')
    } finally {
      setIsGenerating(false)
    }
  }

  const getInviteLink = (token: string) => {
    return `${window.location.origin}/convite/${token}`
  }

  const copyLink = (token: string) => {
    const link = getInviteLink(token)
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success('Link de convite copiado para a área de transferência!')
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const shareViaWhatsApp = (invite: InviteRecord, phoneOverride?: string) => {
    const link = getInviteLink(invite.token)
    const person = persons.find((p) => p.id === invite.person)
    const name = person?.name ? `Olá, ${person.name.split(' ')[0]}!` : 'Olá!'
    const text = encodeURIComponent(
      `${name} A Comunidade Logos preparou seu acesso exclusivo ao nosso portal da igreja.\n\nClique no link abaixo para criar sua senha e entrar:\n${link}\n\nDeus abençoe!`,
    )
    const targetPhone = phoneOverride || person?.whatsapp || ''
    const cleanPhone = targetPhone.replace(/\D/g, '')

    if (cleanPhone) {
      window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank')
    } else {
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
    }
  }

  if (!canAccessAll) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3 max-w-lg mx-auto my-12 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-serif-sacred font-bold text-[#2C3E50]">Acesso Restrito</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          O módulo de Secretaria & Emissão de Convites é exclusivo para membros da equipe pastoral e
          secretaria da igreja.
        </p>
        <p className="text-[11px] text-slate-400">
          Você está navegando com a persona <span className="font-bold">{role}</span>. Use o menu
          superior para alternar para a persona Secretaria.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#1F2D3A] flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#D4AF37]" />
            Secretaria & Emissão de Convites
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geração de links de onboarding seguros, convites por WhatsApp e ativação de contas
            oficiais.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#1F2D3A] hover:bg-[#15202B] text-white text-xs font-semibold h-10 px-4 rounded-xl shadow-md self-start sm:self-auto active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Gerar Novo Convite
        </Button>
      </div>

      {/* Quick Info Banner with Modern Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200/80 bg-white shadow-soft hover:shadow-elevated rounded-3xl p-4.5 flex items-center gap-3 transition-all duration-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#D4AF37] flex items-center justify-center font-bold shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{invites.length} Convites Totais</p>
            <p className="text-[11px] text-slate-400">Histórico de emissão</p>
          </div>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-soft hover:shadow-elevated rounded-3xl p-4.5 flex items-center gap-3 transition-all duration-200">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {invites.filter((i) => !i.used).length} Aguardando Ativação
            </p>
            <p className="text-[11px] text-slate-400">Links disponíveis</p>
          </div>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-soft hover:shadow-elevated rounded-3xl p-4.5 flex items-center gap-3 transition-all duration-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {invites.filter((i) => i.used).length} Contas Ativadas
            </p>
            <p className="text-[11px] text-slate-400">Membros cadastrados</p>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          MOBILE VIEW: TOUCH-FIRST CARDS (Visible only on < md)
          ========================================================================= */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-10">Carregando convites...</p>
        ) : invites.length === 0 ? (
          <Card className="border-slate-200 p-8 text-center bg-white rounded-2xl shadow-sm">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum convite emitido</p>
            <p className="text-xs text-slate-400 mt-1">
              Gere um link para convidar novos líderes ou membros.
            </p>
          </Card>
        ) : (
          invites.map((inv) => {
            const p = persons.find((person) => person.id === inv.person)
            return (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate">{inv.email}</p>
                    {p && (
                      <p className="text-[11px] text-[#2C3E50] font-semibold mt-0.5">
                        Pessoa: {p.name}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={inv.used ? 'secondary' : 'default'}
                    className={`text-[10px] font-bold rounded-full ${
                      inv.used
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {inv.used ? 'Ativado' : 'Aguardando'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="capitalize font-semibold text-slate-700">Papel: {inv.role}</span>
                  <span className="text-[10px]">
                    {new Date(inv.created).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Quick Share Buttons Mobile */}
                {!inv.used && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => shareViaWhatsApp(inv, p?.whatsapp)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 rounded-xl font-semibold"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Enviar WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(inv.token)}
                      className="h-9 px-3 rounded-xl border-slate-200 text-slate-700"
                    >
                      {copiedToken === inv.token ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}
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
                <th className="py-3.5 px-4">E-mail Convidado</th>
                <th className="py-3.5 px-4">Pessoa Vinculada</th>
                <th className="py-3.5 px-4">Papel Concedido</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Data do Convite</th>
                <th className="py-3.5 px-4 text-right">Ações de Envio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Carregando convites...
                  </td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Nenhum convite emitido até o momento.
                  </td>
                </tr>
              ) : (
                invites.map((inv) => {
                  const p = persons.find((person) => person.id === inv.person)

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{inv.email}</td>
                      <td className="py-3.5 px-4">
                        {p ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{p.name}</span>
                            {p.whatsapp && (
                              <span className="text-[10px] text-slate-400">({p.whatsapp})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Novo registro</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] capitalize font-semibold">
                          {inv.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={inv.used ? 'secondary' : 'default'}
                          className={`text-[10px] font-bold rounded-full ${
                            inv.used
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {inv.used ? 'Ativado' : 'Aguardando'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(inv.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!inv.used ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => shareViaWhatsApp(inv, p?.whatsapp)}
                              className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-medium"
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                              WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyLink(inv.token)}
                              className="h-8 px-2.5 text-xs rounded-xl border-slate-200"
                            >
                              {copiedToken === inv.token ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span>Copiar Link</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Conta já ativa</span>
                        )}
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
          GENERATE INVITE DIALOG
          ========================================================================= */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              Gerar Convite de Acesso
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGenerateInvite} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="inv-email">E-mail do Convidado *</Label>
              <Input
                id="inv-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="exemplo@igreja.com"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-role">Papel / Nível de Acesso</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) =>
                  setInviteRole(val as 'secretary' | 'pastor' | 'leader' | 'member')
                }
              >
                <SelectTrigger id="inv-role" className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="member">Membro (Meu lar & jornada)</SelectItem>
                  <SelectItem value="leader">Líder (Grupo & acompanhamento)</SelectItem>
                  <SelectItem value="pastor">Pastor (Gestão pastoral plena)</SelectItem>
                  <SelectItem value="secretary">Secretaria (Gestão total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-person">Vincular a Pessoa Existente (Opcional)</Label>
              <Select
                value={invitePersonId}
                onValueChange={(val) => {
                  setInvitePersonId(val)
                  const p = persons.find((person) => person.id === val)
                  if (p?.email && !inviteEmail) setInviteEmail(p.email)
                  if (p?.whatsapp) setInviteWhatsapp(p.whatsapp)
                }}
              >
                <SelectTrigger id="inv-person" className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione caso a pessoa já esteja cadastrada" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl">
                  <SelectItem value="none">Criar novo vínculo</SelectItem>
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
              disabled={isGenerating}
              className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs h-10 rounded-xl font-semibold shadow-md"
            >
              {isGenerating ? 'Gerando convite...' : 'Gerar Convite & Link'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          SHARE INVITE MODAL (Fast sharing via WhatsApp/Link)
          ========================================================================= */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              Convite Gerado com Sucesso!
            </DialogTitle>
          </DialogHeader>

          {activeShareInvite && (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-slate-600 leading-relaxed">
                O token de segurança foi criado para{' '}
                <span className="font-bold text-slate-800">{activeShareInvite.email}</span> com
                papel de <span className="font-bold capitalize">{activeShareInvite.role}</span>.
              </p>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Link Único de Ativação:
                </span>
                <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-2.5 rounded-xl border border-slate-200">
                  {getInviteLink(activeShareInvite.token)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={() => copyLink(activeShareInvite.token)}
                  variant="outline"
                  className="h-10 text-xs rounded-xl border-slate-200 font-semibold"
                >
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copiar Link
                </Button>

                <Button
                  onClick={() => shareViaWhatsApp(activeShareInvite)}
                  className="h-10 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Enviar no WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
