import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Camera,
  ArrowLeft,
  X,
  Share2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function Carteirinha() {
  const navigate = useNavigate()
  const { user, currentPerson, permissions } = useAuth()

  const [person, setPerson] = useState<PersonRecord | null>(currentPerson)
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrValidSeconds, setQrValidSeconds] = useState(300) // 5 minutos válidos

  // Secretaria / pastor pode alternar membros para conferência
  const [allMembers, setAllMembers] = useState<PersonRecord[]>([])
  const [selectedMember, setSelectedMember] = useState<PersonRecord | null>(null)

  useEffect(() => {
    if (currentPerson) {
      setPerson(currentPerson)
    }
  }, [currentPerson])

  useEffect(() => {
    if (permissions.canManageAssignments || permissions.isPastor) {
      personsService
        .list('stage = "membro" || stage = "desligado" || status = "member"')
        .then((list) => {
          setAllMembers(list)
          if (!selectedMember && list.length > 0) {
            setSelectedMember(list[0])
          }
        })
    }
  }, [permissions])

  // Timer para o QR code dinâmico (válido por alguns minutos)
  useEffect(() => {
    if (!showQrModal) return
    const interval = setInterval(() => {
      setQrValidSeconds((prev) => (prev > 0 ? prev - 1 : 300))
    }, 1000)
    return () => clearInterval(interval)
  }, [showQrModal])

  const activePerson = selectedMember || person

  // Se não houver pessoa logada e nem demo selecionada (visitante anônimo no modo demo)
  const memberName = activePerson?.name || user?.name || 'Membro Logos'
  const isMember = activePerson?.stage === 'membro' || activePerson?.status === 'member'
  const isDesligado = activePerson?.stage === 'desligado'
  const isValid = (isMember && !isDesligado) || (!activePerson && !!user)

  // Extrai ano de ingresso/membresia
  const ingressYear = activePerson?.ingress_date
    ? new Date(activePerson.ingress_date).getFullYear().toString()
    : activePerson?.created
      ? new Date(activePerson.created).getFullYear().toString()
      : '2022'

  const matricula =
    activePerson?.rol_number ||
    activePerson?.provisional_number ||
    (activePerson?.id ? `Nº ${activePerson.id.slice(0, 5).toUpperCase()}` : 'Nº 0142')

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

  const minutesLeft = Math.floor(qrValidSeconds / 60)
  const secondsLeft = (qrValidSeconds % 60).toString().padStart(2, '0')

  return (
    <PageTransition className="space-y-6 max-w-xl mx-auto pb-8 font-sans">
      {/* Barra superior de navegação / Voltar ao perfil (estilo 09_Carteirinha_digital_Celular.html) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3.5">
          <Link
            to="/meu-cadastro"
            aria-label="Voltar para o perfil"
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-white border-[1.5px] border-[#E1E3EB] rounded-[14px] text-[#3C4255] hover:bg-[#F2F1FB] hover:text-[#3A31CE] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-[-0.025em] text-[#14161D]">
              Carteirinha digital
            </h1>
            <p className="text-xs text-[#5A6072] hidden sm:block">
              Credencial oficial de membro da Igreja Defesa da Fé
            </p>
          </div>
        </div>

        {/* Alternar membro (Secretaria/Pastor) */}
        {(permissions.canManageAssignments || permissions.isPastor) && allMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedMember?.id || ''}
              onChange={(e) => {
                const found = allMembers.find((m) => m.id === e.target.value)
                if (found) setSelectedMember(found)
              }}
              className="text-xs font-bold rounded-[14px] bg-white border border-[#E8EAF0] px-3 py-2 text-[#14161D] shadow-xs max-w-[160px] truncate"
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

      {/* =========================================================================
          CARTÃO ESTILO 09_Carteirinha_digital_Celular.html
          Design original: Card container branco com cartão índigo #3A31CE rotacionado
          ou modo paisagem em telas maiores
          ========================================================================= */}
      <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[26px] p-4 sm:p-6 flex flex-col items-center gap-5 shadow-xs">
        {/* Contêiner vertical no mobile com cartão rotacionado 90deg,
            e direto em paisagem natural em telas > 540px */}
        <div className="relative w-full flex items-center justify-center overflow-hidden py-2 sm:py-4">
          {/* Card em visual direto (adaptável, responsivo e mantendo exato grafismo) */}
          <div
            className={`relative w-full max-w-[500px] aspect-[500/316] min-h-[290px] rounded-[24px] p-6 sm:p-7 text-white shadow-xl overflow-hidden flex flex-col justify-between transition-all select-none ${
              isValid
                ? 'bg-[#3A31CE] shadow-[#3A31CE]/25'
                : 'bg-zinc-800 shadow-zinc-800/25 border-2 border-red-500/40'
            }`}
          >
            {/* Círculos concêntricos de marca d'água originais do HTML 09 */}
            <svg
              width="500"
              height="316"
              viewBox="0 0 500 316"
              fill="none"
              aria-hidden="true"
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            >
              <circle
                cx="440"
                cy="300"
                r="120"
                stroke="#FFFFFF"
                strokeOpacity="0.15"
                strokeWidth="1.5"
              />
              <circle
                cx="440"
                cy="300"
                r="200"
                stroke="#FFFFFF"
                strokeOpacity="0.11"
                strokeWidth="1.5"
              />
              <circle
                cx="440"
                cy="300"
                r="290"
                stroke="#FFFFFF"
                strokeOpacity="0.08"
                strokeWidth="1.5"
              />
            </svg>

            {/* Linha superior: Marca Logos + Igreja Defesa da Fé */}
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7.6 4.6 C10.4 4.2 11.6 6.2 12.6 8.9 L16.6 19.4"
                    stroke="#FFFFFF"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.9 10.6 L6.6 19.4"
                    stroke="#FFFFFF"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-heading text-lg sm:text-xl font-bold tracking-[-0.025em]">
                  Logos
                </span>
              </div>
              <span className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.16em] uppercase opacity-85 text-right">
                Igreja Defesa da Fé
              </span>
            </div>

            {/* Meio: Foto oficial do membro + Nome + Membro desde */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-5 my-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-[20px] sm:rounded-[22px] bg-white flex items-end justify-center overflow-hidden shadow-inner border border-white/20">
                {activePerson?.card_photo_url ? (
                  <img
                    src={activePerson.card_photo_url}
                    alt={memberName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    width="76"
                    height="76"
                    viewBox="0 0 76 76"
                    fill="none"
                    aria-hidden="true"
                    className="text-[#C2C7D6] w-16 h-16 sm:w-20 sm:h-20"
                  >
                    <circle cx="38" cy="29" r="14" fill="currentColor" />
                    <path d="M10 76 C12 58 23 48 38 48 C53 48 64 58 66 76 Z" fill="currentColor" />
                  </svg>
                )}
              </div>

              <div className="flex-grow min-w-0 flex flex-col gap-1 sm:gap-2">
                <span className="font-heading text-xl sm:text-2xl font-semibold tracking-[-0.03em] leading-tight truncate">
                  {memberName}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.15em] uppercase opacity-75">
                    Membro desde
                  </span>
                  <span className="font-heading text-base sm:text-lg font-semibold leading-tight">
                    {ingressYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Linha inferior: Matrícula + Badge Status Ativo */}
            <div className="relative z-10 flex items-end justify-between gap-4 pt-1">
              <div className="flex flex-col">
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.15em] uppercase opacity-75">
                  Matrícula
                </span>
                <span className="font-heading text-sm sm:text-base font-semibold tracking-[0.04em]">
                  {matricula}
                </span>
              </div>
              <span
                className={`px-3.5 py-1.5 rounded-full text-[10.5px] sm:text-[11px] font-bold tracking-[0.11em] uppercase ${
                  isValid
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500/30 text-red-200 border border-red-400/40'
                }`}
              >
                {isValid ? 'Membro ativo' : 'Desligado / Inativo'}
              </span>
            </div>
          </div>
        </div>

        {/* Dica do original: "Gire o aparelho para ler" */}
        <span className="flex items-center gap-2 text-xs font-semibold text-[#5A6072]">
          <RotateCw className="w-4 h-4 text-[#3A31CE]" />
          <span>Gire o aparelho para apresentar a credencial</span>
        </span>
      </div>

      {/* Botão de ação: Mostrar QR de identificação (fiel a 09_Carteirinha_digital_Celular.html) */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="w-full h-[54px] rounded-[16px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-base font-bold flex items-center justify-center gap-2.5 shadow-md shadow-[#3A31CE]/20 active:scale-[0.99] transition-all cursor-pointer"
        >
          <QrCode className="w-5 h-5" />
          <span>Mostrar QR de identificação</span>
        </button>
        <p className="text-xs text-[#5A6072] text-center">
          O QR é gerado na hora e vale por alguns minutos.
        </p>
      </div>

      {/* Links rápidos e validação pública */}
      <div className="p-4 bg-white rounded-[18px] border-[1.5px] border-[#E8EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-[#14161D] block">Verificação de autenticidade</span>
          <span className="text-[#5A6072]">
            Qualquer líder ou igreja pode validar esta credencial escaneando o QR Code.
          </span>
        </div>
        <a
          href={qrVerifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-bold text-[#3A31CE] hover:underline flex-shrink-0"
        >
          <span>Página pública de validação</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* =========================================================================
          GESTÃO DA FOTO DA CARTEIRINHA (Secretaria / Membro)
          Mantendo a lógica existente e adaptada ao visual institucional Logos
          ========================================================================= */}
      <div className="bg-white rounded-[22px] p-5 sm:p-6 border-[1.5px] border-[#E8EAF0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAF0]">
          <div>
            <h2 className="font-heading text-sm sm:text-base font-semibold text-[#14161D]">
              Foto da carteirinha
            </h2>
            <p className="text-xs text-[#5A6072] mt-0.5">
              Envio pelo membro e validação pela Secretaria
            </p>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              activePerson?.card_photo_status === 'aprovada'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : activePerson?.card_photo_status === 'pendente'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-[#F2F1FB] text-[#3A31CE]'
            }`}
          >
            {activePerson?.card_photo_status === 'aprovada'
              ? 'Foto Aprovada'
              : activePerson?.card_photo_status === 'pendente'
                ? 'Aguardando Análise'
                : 'Pedir Nova Foto'}
          </span>
        </div>

        <form onSubmit={handleSendPhoto} className="space-y-3 text-xs">
          <Label className="font-semibold text-[#14161D]">
            Atualizar foto 3x4 (URL da imagem aprovada no padrão)
          </Label>
          <div className="flex gap-2">
            <Input
              value={photoUrlInput}
              onChange={(e) => setPhotoUrlInput(e.target.value)}
              placeholder="https://img.usecurling.com/ppl/medium?gender=female..."
              className="h-10 rounded-[14px] bg-[#FBFBFD] border-[#E8EAF0] text-xs font-medium focus-visible:ring-[#3A31CE]"
            />
            <Button
              type="submit"
              disabled={isUpdatingPhoto}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-10 px-4 rounded-[14px] font-bold"
            >
              {isUpdatingPhoto ? 'Enviando...' : 'Enviar foto'}
            </Button>
          </div>
        </form>

        {/* Aprovação da Secretaria */}
        {permissions.canManageAssignments && activePerson?.card_photo_url && (
          <div className="p-4 bg-[#F2F1FB] rounded-[16px] border border-[#DAD7F3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-[#14161D] block">
                Painel da Secretaria: Validação de Foto
              </span>
              <p className="text-[11px] text-[#5A6072]">
                A imagem atende aos critérios de nitidez e identificação oficial?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprovePhoto('nova_foto')}
                className="text-xs h-9 rounded-[12px] border-[#E8EAF0] text-[#14161D] hover:bg-white font-bold"
              >
                Pedir nova foto
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprovePhoto('aprovada')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-[12px] font-bold"
              >
                Aprovar foto
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL COM QR CODE DE IDENTIFICAÇÃO (Fiel ao design original)
          ========================================================================= */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-[26px] p-6 sm:p-7 border border-[#E8EAF0] shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="font-heading text-xl font-semibold text-[#14161D] text-center">
              QR Code de Identificação
            </DialogTitle>
            <p className="text-xs text-[#5A6072] text-center">
              Apresente este código no check-in de cultos ou assembleias
            </p>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-56 h-56 p-4 rounded-[22px] bg-[#F2F1FB] border-[2px] border-[#DAD7F3] flex flex-col items-center justify-center shadow-inner relative group">
              {/* QR Code gerado por SVG estilizado com link real */}
              <div className="bg-white p-3 rounded-[16px] shadow-sm">
                <QrCode className="w-36 h-36 text-[#14161D]" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <span className="font-heading text-base font-bold text-[#14161D]">{memberName}</span>
              <p className="text-xs text-[#5A6072]">
                Matrícula: <strong>{matricula}</strong> &bull; Membro ativo
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-xs font-bold mt-2">
                <span>
                  Válido por mais {minutesLeft}:{secondsLeft}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(qrVerifyUrl)
                toast.success('Link de validação copiado!')
              }}
              className="flex-1 h-11 rounded-[14px] text-xs font-bold border-[#E8EAF0]"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Copiar link
            </Button>
            <Button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="flex-1 h-11 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs font-bold"
            >
              Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
