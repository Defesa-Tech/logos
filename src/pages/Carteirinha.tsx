import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Camera,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function Carteirinha() {
  const { user, currentPerson, permissions } = useAuth()

  const [person, setPerson] = useState<PersonRecord | null>(currentPerson)
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)

  // Secretaria approval state for testing
  const [allMembers, setAllMembers] = useState<PersonRecord[]>([])
  const [selectedMember, setSelectedMember] = useState<PersonRecord | null>(null)

  useEffect(() => {
    if (currentPerson) {
      setPerson(currentPerson)
    }
  }, [currentPerson])

  useEffect(() => {
    // If secretaria or pastor, allow previewing other members
    if (permissions.canManageAssignments || permissions.isPastor) {
      personsService.list('stage = "membro" || stage = "desligado"').then((list) => {
        setAllMembers(list)
        if (!selectedMember && list.length > 0) {
          setSelectedMember(list[0])
        }
      })
    }
  }, [permissions])

  const activePerson = selectedMember || person

  const isMember = activePerson?.stage === 'membro' || activePerson?.status === 'member'
  const isDesligado = activePerson?.stage === 'desligado'
  const isValid = isMember && !isDesligado

  const handleSendPhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePerson || !photoUrlInput.trim()) return

    try {
      setIsUpdatingPhoto(true)
      await personsService.update(activePerson.id, {
        card_photo_url: photoUrlInput.trim(),
        card_photo_status: 'pendente',
      })
      toast.success('Foto enviada para análise da Secretaria!')
      setPhotoUrlInput('')
      const updated = await personsService.getById(activePerson.id)
      if (selectedMember) setSelectedMember(updated)
      else setPerson(updated)
    } catch {
      toast.error('Erro ao enviar foto.')
    } finally {
      setIsUpdatingPhoto(false)
    }
  }

  // Secretaria approval
  const handleApprovePhoto = async (status: 'aprovada' | 'nova_foto') => {
    if (!activePerson) return
    try {
      await personsService.update(activePerson.id, {
        card_photo_status: status,
      })
      toast.success(
        status === 'aprovada'
          ? 'Foto da carteirinha aprovada com sucesso!'
          : 'Solicitado envio de nova foto ao membro.',
      )
      const updated = await personsService.getById(activePerson.id)
      if (selectedMember) setSelectedMember(updated)
      else setPerson(updated)
    } catch {
      toast.error('Erro ao atualizar status da foto.')
    }
  }

  const qrVerifyUrl = `${window.location.origin}/verificar-carteirinha/${activePerson?.id || 'demo'}`

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J7</span>
            <span className="text-gray-300">/</span>
            <span>Credencial Digital de Membro</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Carteirinha Digital
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl font-normal">
            Exibição oficial do membro com QR Code de verificação pública. Quem escaneia vê apenas
            se a carteirinha é válida ou inválida (Regra R9).
          </p>
        </div>

        {/* Member selector for Secretaria/Pastor testing */}
        {(permissions.canManageAssignments || permissions.isPastor) && allMembers.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">
              Ver Carteirinha de Membro:
            </Label>
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => {
                const found = allMembers.find((m) => m.id === e.target.value)
                if (found) setSelectedMember(found)
              }}
              className="text-xs font-bold rounded-2xl bg-white border border-gray-200 p-2 shadow-xs"
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.stage || m.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* THE DIGITAL CARD (Nubank deep purple card style) */}
      <div className="flex justify-center py-4">
        <div
          className={`relative w-full max-w-sm rounded-[32px] p-6 text-white shadow-2xl transition-all overflow-hidden ${
            isValid
              ? 'bg-gradient-to-br from-[#190326] via-[#2A0845] to-[#820AD1] shadow-[#820AD1]/25'
              : 'bg-gradient-to-br from-zinc-800 to-zinc-900 border border-red-500/30'
          }`}
        >
          {/* Card Top Brand */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm">
                L
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight block leading-tight">
                  Igreja Defesa da Fé
                </span>
                <span className="text-[9px] uppercase tracking-wider text-purple-200">
                  Sede Congregacional
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
                isValid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}
            >
              {isValid ? 'Membro Ativo' : 'Inválida / Desligado'}
            </span>
          </div>

          {/* Member Photo & Basic Data */}
          <div className="flex items-center gap-4 my-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 overflow-hidden flex items-center justify-center">
                {activePerson?.card_photo_url ? (
                  <img
                    src={activePerson.card_photo_url}
                    alt={activePerson.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-purple-200">
                    {activePerson?.name ? activePerson.name.slice(0, 2).toUpperCase() : 'MB'}
                  </span>
                )}
              </div>

              {activePerson?.card_photo_status === 'aprovada' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-[#2A0845] rounded-full" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                Nome do Membro
              </span>
              <h3 className="font-extrabold text-lg leading-tight">
                {activePerson?.name || 'Membro da Igreja'}
              </h3>
              <p className="text-xs text-purple-200">
                Matrícula:{' '}
                <strong className="text-white">
                  {activePerson?.rol_number || activePerson?.provisional_number || 'MAT-0001'}
                </strong>
              </p>
            </div>
          </div>

          {/* Card Footer with QR Code */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-purple-300 block">
                Data de Ingresso
              </span>
              <span className="text-xs font-extrabold">
                {activePerson?.ingress_date
                  ? new Date(activePerson.ingress_date).toLocaleDateString('pt-BR')
                  : 'Registrada em ata'}
              </span>
              <p className="text-[9px] text-purple-200 mt-1">
                Batismo:{' '}
                {activePerson?.baptism_location === 'defesa_da_fe'
                  ? 'Defesa da Fé'
                  : activePerson?.baptism_church_name || 'Comprovado'}
              </p>
            </div>

            {/* QR Code preview */}
            <div className="bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
              <QrCode className="w-12 h-12 text-[#191919]" />
            </div>
          </div>

          <div className="mt-4 text-center">
            <a
              href={qrVerifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-purple-200 hover:text-white underline flex items-center justify-center gap-1"
            >
              <span>Testar link de verificação pública</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* PHOTO MANAGEMENT & SECRETARIA APPROVAL (J7) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#191919]">Foto da Carteirinha</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Envio pelo membro e validação pela Secretaria
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              activePerson?.card_photo_status === 'aprovada'
                ? 'bg-emerald-50 text-emerald-700'
                : activePerson?.card_photo_status === 'pendente'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            Status:{' '}
            {activePerson?.card_photo_status === 'aprovada'
              ? 'Foto Aprovada'
              : activePerson?.card_photo_status === 'pendente'
                ? 'Aguardando Aprovação'
                : 'Pedir Nova Foto'}
          </span>
        </div>

        {/* Member submits photo url */}
        <form onSubmit={handleSendPhoto} className="space-y-3 text-xs">
          <Label className="font-semibold text-gray-700">
            Atualizar Foto 3x4 (URL da imagem aprovada no padrão do sistema)
          </Label>
          <div className="flex gap-2">
            <Input
              value={photoUrlInput}
              onChange={(e) => setPhotoUrlInput(e.target.value)}
              placeholder="https://img.usecurling.com/ppl/medium?gender=..."
              className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
            />
            <Button
              type="submit"
              disabled={isUpdatingPhoto}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20"
            >
              Enviar Foto
            </Button>
          </div>
        </form>

        {/* Secretaria Approval buttons */}
        {permissions.canManageAssignments && activePerson?.card_photo_url && (
          <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-[#191919] block">
                Painel da Secretaria: Aprovação de Foto
              </span>
              <p className="text-[11px] text-gray-500">
                A foto atende aos critérios de nitidez e identificação oficial?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprovePhoto('nova_foto')}
                className="text-xs h-9 rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
              >
                Pedir Nova Foto
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprovePhoto('aprovada')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-full font-bold shadow-md active:scale-95 transition-all"
              >
                Aprovar Foto
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
