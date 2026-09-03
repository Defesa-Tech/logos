import React, { useState, useEffect } from 'react'
import {
  Mail,
  Plus,
  Share2,
  Copy,
  Check,
  Phone,
  Calendar,
  Sparkles,
  Shield,
  Trash2,
  ExternalLink,
  MessageSquare,
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
  const { canAccessAll } = useAuth()
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [persons, setPersons] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [personId, setPersonId] = useState<string>('none')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteWhatsapp, setInviteWhatsapp] = useState('')
  const [inviteRole, setInviteRole] = useState<'secretary' | 'pastor' | 'leader' | 'member'>(
    'member',
  )
  const [isGenerating, setIsGenerating] = useState(false)

  // Newly generated invite modal
  const [generatedResult, setGeneratedResult] = useState<{ token: string; link: string } | null>(
    null,
  )
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
      const [invList, pList] = await Promise.all([invitesService.list(), personsService.list()])
      setInvites(invList)
      setPersons(pList)
    } catch {
      toast.error('Erro ao carregar convites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-fill phone/email when selecting a person
  const handlePersonSelect = (pId: string) => {
    setPersonId(pId)
    if (pId !== 'none') {
      const p = persons.find((item) => item.id === pId)
      if (p) {
        if (p.email) setInviteEmail(p.email)
        if (p.whatsapp) setInviteWhatsapp(p.whatsapp)
      }
    }
  }

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsGenerating(true)
      const res = await invitesService.generate({
        personId: personId !== 'none' ? personId : undefined,
        email: inviteEmail.trim() || undefined,
        whatsapp: inviteWhatsapp.trim() || undefined,
        role: inviteRole,
      })

      const origin = window.location.origin
      const link = `${origin}/convite/${res.token}`

      setGeneratedResult({
        token: res.token,
        link,
      })

      toast.success('Convite gerado com sucesso!')
      setGenerateDialogOpen(false)
      loadData()
    } catch {
      toast.error('Erro ao gerar convite.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/convite/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    toast.success('Link copiado para a área de transferência!')
    setTimeout(() => setCopiedToken(null), 3000)
  }

  const handleWhatsAppShare = (inv: InviteRecord) => {
    const link = `${window.location.origin}/convite/${inv.token}`
    const text = encodeURIComponent(
      `Olá! A Igreja Logos convida você para ativar seu acesso no nosso sistema.\n\nClique no link seguro para definir sua senha de acesso e acompanhar sua jornada:\n${link}\n\nSeja muito bem-vindo(a)!`,
    )
    const phoneClean = (inv.whatsapp || '').replace(/\D/g, '')
    const whatsappUrl = phoneClean
      ? `https://wa.me/55${phoneClean}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(whatsappUrl, '_blank')
  }

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Deseja cancelar e revogar este convite?')) return
    try {
      await invitesService.delete(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast.success('Convite revogado com sucesso.')
    } catch {
      toast.error('Erro ao revogar convite.')
    }
  }

  if (!canAccessAll) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-serif-sacred font-bold text-slate-800">
          Acesso Restrito à Secretaria
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Apenas a Secretaria e Pastores têm permissão para gerar links de convite e onboarding.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif-sacred font-bold text-[#2C3E50] flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#D4AF37]" />
            Secretaria & Onboarding de Usuários
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Geração de convites tokenizados por link ou WhatsApp. Ao aceitar, o usuário define sua
            senha.
          </p>
        </div>

        <Button
          onClick={() => {
            setPersonId('none')
            setInviteEmail('')
            setInviteWhatsapp('')
            setInviteRole('member')
            setGenerateDialogOpen(true)
          }}
          className="bg-[#2C3E50] hover:bg-[#1E2B37] text-white text-xs font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Gerar Novo Convite
        </Button>
      </div>

      {/* Generated Token Result Banner (if open) */}
      {generatedResult && (
        <Card className="border-amber-300 bg-amber-50/60 p-4 rounded-2xl animate-fade-in shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Convite Gerado com Sucesso!
              </span>
              <p className="text-xs text-slate-600">
                Compartilhe o link abaixo com a pessoa para que ela defina a senha:
              </p>
              <code className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-amber-200 block text-slate-800 break-all">
                {generatedResult.link}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleCopyLink(generatedResult.token)}
                className="bg-[#2C3E50] text-white text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGeneratedResult(null)}
                className="text-xs border-slate-300"
              >
                Fechar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Invites List Table */}
      <Card className="border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
          <CardTitle className="text-base font-serif-sacred text-[#2C3E50] flex items-center justify-between">
            <span>Convites Ativos & Histórico de Envio</span>
            <Badge variant="outline" className="text-xs bg-white">
              {invites.length} convites
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Acompanhe o status de aceitação dos convites gerados para membros e líderes.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Pessoa / Destinatário</th>
                <th className="py-3 px-4">Papel Atribuído</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expira em</th>
                <th className="py-3 px-4">Link Tokenizado</th>
                <th className="py-3 px-4 text-right">Compartilhar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Carregando convites...
                  </td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Nenhum convite emitido até o momento.
                  </td>
                </tr>
              ) : (
                invites.map((inv) => {
                  const linkedPerson =
                    persons.find((p) => p.id === inv.person) || inv.expand?.person
                  const isCopied = copiedToken === inv.token

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {linkedPerson?.name || inv.email || 'Convidado Geral'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {inv.whatsapp || inv.email || 'Sem contato salvo'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {inv.role || 'membro'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {inv.used ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Conta Ativada
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                            Aguardando Aceite
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {inv.expires ? new Date(inv.expires).toLocaleDateString('pt-BR') : '7 dias'}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          /convite/{inv.token.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(inv.token)}
                            title="Copiar Link"
                            className="h-8 px-2 text-slate-600 hover:text-slate-900"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsAppShare(inv)}
                            title="Compartilhar no WhatsApp"
                            className="h-8 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteInvite(inv.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </Card>

      {/* GENERATE INVITE DIALOG */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-serif-sacred text-xl text-[#2C3E50]">
              Gerar Link de Convite
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleGenerateInvite} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="inv-person">Vincular a uma Pessoa Cadastrada (opcional)</Label>
              <Select value={personId} onValueChange={handlePersonSelect}>
                <SelectTrigger id="inv-person">
                  <SelectValue placeholder="Selecione uma pessoa..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">-- Nenhum vínculo prévio --</SelectItem>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-role">Nível de Permissão (Persona)</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) =>
                  setInviteRole(val as 'secretary' | 'pastor' | 'leader' | 'member')
                }
              >
                <SelectTrigger id="inv-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="member">Membro (Visão Restrita)</SelectItem>
                  <SelectItem value="leader">Líder (Restrito ao Contexto)</SelectItem>
                  <SelectItem value="pastor">Pastor (Acesso Total)</SelectItem>
                  <SelectItem value="secretary">Secretaria (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-whatsapp">WhatsApp do Convidado</Label>
              <Input
                id="inv-whatsapp"
                value={inviteWhatsapp}
                onChange={(e) => setInviteWhatsapp(e.target.value)}
                placeholder="(11) 98765-4321"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-email">E-mail (opcional)</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="convidado@email.com"
              />
            </div>

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-[#2C3E50] text-white text-xs font-semibold"
            >
              {isGenerating ? 'Gerando...' : 'Gerar Token & Link'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
