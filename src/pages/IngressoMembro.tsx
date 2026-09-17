import React, { useState, useEffect } from 'react'
import {
  UserCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  FileCheck,
  Lock,
  Mail,
  Send,
  Building,
  AlertTriangle,
  Camera,
  HeartHandshake,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, stageHistoryService, invitesService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function IngressoMembro() {
  const { user, permissions } = useAuth()

  const [candidates, setCandidates] = useState<PersonRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Ingress Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null)

  // Coleta progressiva do ingresso como membro:
  // Tabela: Foto, data e local do batismo, estado civil e documentos que o rol exigir
  // Microcopy: "Registro oficial e carteirinha"
  // Regras R6 (Batismo obrigatório) e R7 (Forma de ingresso) mantidas intactas!
  const [hasBaptism, setHasBaptism] = useState(false)
  const [baptismDate, setBaptismDate] = useState('')
  const [baptismLocation, setBaptismLocation] = useState<'defesa_da_fe' | 'outra_igreja'>(
    'defesa_da_fe',
  )
  const [baptismChurchName, setBaptismChurchName] = useState('')
  const [ingressForm, setIngressForm] = useState<
    'batismo' | 'profissao_de_fe' | 'transferencia' | 'aclamacao' | 'jurisdicao'
  >('batismo')
  const [maritalStatus, setMaritalStatus] = useState<
    'solteiro' | 'casado' | 'viuvo' | 'divorciado' | 'uniao_estavel'
  >('solteiro')
  const [ingressDate, setIngressDate] = useState(new Date().toISOString().slice(0, 10))
  const [cardPhotoUrl, setCardPhotoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadCandidates = async () => {
    try {
      setLoading(true)
      // People eligible for membership (Frequentadores or Visitantes)
      const list = await personsService.list(
        'stage != "membro" && stage != "desligado" && status != "member"',
      )
      setCandidates(list)
    } catch {
      toast.error('Erro ao listar pessoas para ingresso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()
  }, [])

  const openIngressModal = (p: PersonRecord) => {
    setSelectedPerson(p)
    // Pré-preenchimento com dados existentes (NUNCA pedir de novo o que já temos)
    const baptized = !!p.baptism_date
    setHasBaptism(baptized)
    setBaptismDate(p.baptism_date ? p.baptism_date.slice(0, 10) : '')
    setBaptismLocation(p.baptism_location || 'defesa_da_fe')
    setBaptismChurchName(p.baptism_church_name || '')
    setIngressForm(p.ingress_form || 'batismo')
    setMaritalStatus(p.marital_status || 'solteiro')
    setCardPhotoUrl(p.card_photo_url || '')
    setIngressDate(new Date().toISOString().slice(0, 10))
    setModalOpen(true)
  }

  // Handle member ingress per J6, R6 & R7
  const handleIngress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPerson) return

    // ENFORCE REGRA R6: Membresia exige batismo!
    if (!hasBaptism || !baptismDate) {
      toast.error(
        'Bloqueio Regra R6: Só é possível mudar para membro com batismo registrado (na Defesa da Fé ou em outra igreja)!',
      )
      return
    }

    if (baptismLocation === 'outra_igreja' && !baptismChurchName.trim()) {
      toast.error('Informe o nome da outra igreja onde a pessoa foi batizada.')
      return
    }

    try {
      setIsSubmitting(true)

      // Generate provisional membership number (ex: MAT-0005)
      const provNumber = `MAT-${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Update person record to membro com os dados da coleta progressiva
      await personsService.update(selectedPerson.id, {
        stage: 'membro',
        status: 'member',
        baptism_date: new Date(baptismDate).toISOString(),
        baptism_location: baptismLocation,
        baptism_church_name: baptismLocation === 'outra_igreja' ? baptismChurchName.trim() : '',
        ingress_date: new Date(ingressDate).toISOString(),
        ingress_form: ingressForm,
        marital_status: maritalStatus,
        provisional_number: selectedPerson.provisional_number || provNumber,
        card_photo_status: cardPhotoUrl.trim()
          ? 'aprovada'
          : selectedPerson.card_photo_status || 'pendente',
        card_photo_url: cardPhotoUrl.trim() || selectedPerson.card_photo_url || undefined,
      })

      // 2. Record in stage_history
      const originName =
        baptismLocation === 'defesa_da_fe' ? 'Defesa da Fé' : baptismChurchName.trim()
      await stageHistoryService.recordChange({
        person: selectedPerson.id,
        from_stage: selectedPerson.stage || 'frequentador',
        to_stage: 'membro',
        author_name: user?.name || 'Secretaria',
        reason: `Ingresso oficial por ${ingressForm}. Batismo comprovado (${originName} em ${baptismDate}). Estado civil: ${maritalStatus}. Matrícula provisória: ${provNumber}.`,
      })

      // 3. Generate app invite link per J6
      await invitesService.create({
        email: selectedPerson.email || undefined,
        whatsapp: selectedPerson.whatsapp || selectedPerson.phone || undefined,
        role: 'member',
        person: selectedPerson.id,
      })

      toast.success(
        `${selectedPerson.name} ingressou como Membro com sucesso! Matrícula: ${provNumber}. Convite do app gerado.`,
      )
      setModalOpen(false)
      loadCandidates()
    } catch {
      toast.error('Erro ao efetivar ingresso de membro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J6</span>
            <span className="text-gray-300">/</span>
            <span>Exclusivo Secretaria (Regras R6 & R7 &bull; Coleta Progressiva)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Ingresso como Membro
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl font-normal">
            No ingresso oficial na membresia, coletamos os dados formais: foto, dados do batismo,
            estado civil e forma de ingresso. <strong>Regra R6:</strong> sem batismo, o ingresso é
            estritamente bloqueado.
          </p>
        </div>

        <div className="bg-[#F7EEFD] text-[#820AD1] border border-purple-200 px-4 py-2 rounded-2xl text-xs font-bold self-start sm:self-auto">
          Secretaria Oficial
        </div>
      </div>

      {/* Candidatos a Membro (Frequentadores e Visitantes Batizados) */}
      <section className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-[#191919]">
              Frequentadores e Visitantes para Ingresso
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Clique em &quot;Ingressar como Membro&quot; para registrar batismo, foto e matrícula
            </p>
          </div>
          <span className="text-xs font-bold text-gray-400">{candidates.length} pessoa(s)</span>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {loading ? (
            <p className="text-center py-10 text-gray-400">Carregando pessoas...</p>
          ) : candidates.length === 0 ? (
            <p className="text-center py-10 text-gray-400">
              Nenhuma pessoa aguardando ingresso no momento.
            </p>
          ) : (
            candidates.map((p) => {
              const isBaptized = !!p.baptism_date

              return (
                <div
                  key={p.id}
                  className="py-4 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F8F9FB] rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#191919] text-sm">{p.name}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          {p.stage || p.status}
                        </span>
                        {isBaptized ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Batismo Informado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Sem Batismo (Bloqueado R6)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Contato: {p.phone || p.whatsapp || 'Sem telefone'} &bull;{' '}
                        {p.baptism_church_name
                          ? `Batizado em: ${p.baptism_church_name}`
                          : 'Necessário comprovar batismo'}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={!permissions.canChangeStage}
                    onClick={() => openIngressModal(p)}
                    className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 px-4 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all self-end md:self-auto cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    Ingressar como Membro
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* MODAL INGRESSO DE MEMBRO (J6, R6 & R7 &bull; COLETA PROGRESSIVA) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F7EEFD] text-[#820AD1]">
                Jornada J6 &bull; Secretaria &bull; Coleta Progressiva
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Ingresso de Membro: {selectedPerson?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleIngress} className="space-y-4 pt-2 text-xs">
            {/* Microcopy de Propósito */}
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-[11px] text-[#820AD1]">
              <strong>Microcopy de Propósito:</strong>
              <p>Registro oficial e emissão de carteirinha com validação eclesiástica.</p>
            </div>

            {/* REGRA R6 BLOCKING BOX */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Regra R6: Batismo Obrigatório para Membresia</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Pela constituição eclesiástica da Defesa da Fé, apenas pessoas batizadas nas águas
                podem se tornar membros da igreja.
              </p>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={hasBaptism}
                  onChange={(e) => setHasBaptism(e.target.checked)}
                  className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                />
                <span className="font-bold text-gray-900">
                  Confirmar que esta pessoa foi batizada
                </span>
              </label>
            </div>

            {hasBaptism && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#F8F9FB] border border-gray-100">
                <div className="space-y-1">
                  <Label className="font-semibold text-gray-700">Data do Batismo *</Label>
                  <Input
                    type="date"
                    required
                    value={baptismDate}
                    onChange={(e) => setBaptismDate(e.target.value)}
                    className="h-10 rounded-2xl bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-gray-700">Local do Batismo *</Label>
                  <Select
                    value={baptismLocation}
                    onValueChange={(val) =>
                      setBaptismLocation(val as 'defesa_da_fe' | 'outra_igreja')
                    }
                  >
                    <SelectTrigger className="h-10 rounded-2xl bg-white border-gray-200 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-2xl shadow-xl">
                      <SelectItem value="defesa_da_fe">
                        Nesta igreja (Igreja Defesa da Fé)
                      </SelectItem>
                      <SelectItem value="outra_igreja">Em outra igreja / denominação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {baptismLocation === 'outra_igreja' && (
                  <div className="space-y-1">
                    <Label className="font-semibold text-gray-700">Nome da Outra Igreja *</Label>
                    <Input
                      required
                      value={baptismChurchName}
                      onChange={(e) => setBaptismChurchName(e.target.value)}
                      placeholder="Ex: Primeira Igreja Batista Central"
                      className="h-10 rounded-2xl bg-white border-gray-200"
                    />
                  </div>
                )}
              </div>
            )}

            {/* DADOS DE INGRESSO (R7 & COLETA PROGRESSIVA) */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-semibold text-gray-700">Forma de Ingresso (R7) *</Label>
                  <Select
                    value={ingressForm}
                    onValueChange={(val) =>
                      setIngressForm(
                        val as
                          | 'batismo'
                          | 'profissao_de_fe'
                          | 'transferencia'
                          | 'aclamacao'
                          | 'jurisdicao',
                      )
                    }
                  >
                    <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-2xl shadow-xl">
                      <SelectItem value="batismo">Batismo nas águas</SelectItem>
                      <SelectItem value="profissao_de_fe">Profissão de Fé</SelectItem>
                      <SelectItem value="transferencia">Carta de Transferência</SelectItem>
                      <SelectItem value="aclamacao">Aclamação / Testemunho</SelectItem>
                      <SelectItem value="jurisdicao">Jurisdição / Reintegração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-gray-700">Estado Civil *</Label>
                  <Select
                    value={maritalStatus}
                    onValueChange={(val) =>
                      setMaritalStatus(
                        val as 'solteiro' | 'casado' | 'viuvo' | 'divorciado' | 'uniao_estavel',
                      )
                    }
                  >
                    <SelectTrigger className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-2xl shadow-xl">
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-gray-700">Data de Ingresso Oficial *</Label>
                <Input
                  type="date"
                  required
                  value={ingressDate}
                  onChange={(e) => setIngressDate(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
                />
              </div>

              {/* Foto da Carteirinha Digital */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-gray-700">
                    Foto para Carteirinha Digital
                  </Label>
                  <span className="text-[10px] text-gray-400">Opcional no momento</span>
                </div>
                <Input
                  placeholder="URL da foto homologada ou foto oficial"
                  value={cardPhotoUrl}
                  onChange={(e) => setCardPhotoUrl(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !hasBaptism}
              className={`w-full text-xs h-11 rounded-full font-bold shadow-md transition-all ${
                !hasBaptism
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#820AD1] hover:bg-[#7008B7] text-white shadow-[#820AD1]/20 active:scale-95'
              }`}
            >
              {isSubmitting
                ? 'Oficializando Ingresso...'
                : !hasBaptism
                  ? 'Bloqueado por R6 (exige batismo)'
                  : 'Oficializar Ingresso e Gerar Matrícula'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
