import React, { useState, useEffect } from 'react'
import {
  Heart,
  Send,
  Sparkles,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Calendar,
  Share2,
  MessageCircle,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  RotateCcw,
  Baby,
  MapPin,
  HelpCircle,
  Check,
  ArrowRight,
} from 'lucide-react'
import {
  personsService,
  cultosService,
  presencesService,
  followUpService,
  activitiesService,
  divergencesService,
} from '@/services/church'
import type { CultoRecord, PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/MotionKit'

const DEVICE_STORAGE_KEY = 'logos_church_device_token'
const DEVICE_PERSON_NAME_KEY = 'logos_church_device_person_name'
const DEVICE_PERSON_ID_KEY = 'logos_church_device_person_id'

export default function VisitorLanding() {
  // Device token recognition state
  const [deviceToken, setDeviceToken] = useState<string>('')
  const [recognizedPersonName, setRecognizedPersonName] = useState<string | null>(null)
  const [recognizedPersonId, setRecognizedPersonId] = useState<string | null>(null)
  const [showCleanForm, setShowCleanForm] = useState(false)

  // Active Culto based on schedule & tolerance (D11)
  const [activeCulto, setActiveCulto] = useState<CultoRecord | null>(null)
  const [, setAllCultos] = useState<CultoRecord[]>([])
  const [, setLoadingInitial] = useState(true)

  // 1st Visit Form fields (short & light for low mobile signal)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contactAuthorized, setContactAuthorized] = useState(false) // Desmarcada por padrão
  const [contactPreference, setContactPreference] = useState<'whatsapp' | 'ligacao' | 'nenhum'>(
    'whatsapp',
  )

  // Submission state & confirmation
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedPerson, setConfirmedPerson] = useState<PersonRecord | null>(null)
  const [alreadyRegisteredToday, setAlreadyRegisteredToday] = useState(false)
  const [visitCount, setVisitCount] = useState<number>(1)

  // Progressive Form: "Conte mais sobre você" (2ª visita principal ou 3ª pendente)
  const [showProgressiveModal, setShowProgressiveModal] = useState(false)
  const [savingProgressive, setSavingProgressive] = useState(false)
  const [progressiveSuccess, setProgressiveSuccess] = useState(false)

  // Progressive Fields (pre-filled if known, max 5 fields per step)
  const [progressiveBirthDate, setProgressiveBirthDate] = useState('')
  const [progressiveNeighborhood, setProgressiveNeighborhood] = useState('')
  const [progressiveHowMet, setProgressiveHowMet] = useState('')
  const [progressiveHasChildren, setProgressiveHasChildren] = useState(false)
  const [progressiveChildrenInfo, setProgressiveChildrenInfo] = useState('')

  // Format Phone (Mascara brasileira)
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 2) return raw
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`
  }

  // Pre-fill progressive form from person record
  const prefillProgressiveForm = (person: PersonRecord) => {
    setProgressiveBirthDate(person.birth_date ? person.birth_date.slice(0, 10) : '')
    setProgressiveNeighborhood(person.neighborhood || person.address || '')
    setProgressiveHowMet(person.how_met_details || person.how_found || person.how_met || '')
    setProgressiveHasChildren(!!person.has_children)
    setProgressiveChildrenInfo(person.children_info || '')
  }

  // Check device recognition on mount
  useEffect(() => {
    async function init() {
      try {
        setLoadingInitial(true)
        // 1. Check or generate device token
        let token = localStorage.getItem(DEVICE_STORAGE_KEY)
        if (!token) {
          token = 'dev_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
          localStorage.setItem(DEVICE_STORAGE_KEY, token)
        }
        setDeviceToken(token)

        const savedName = localStorage.getItem(DEVICE_PERSON_NAME_KEY)
        const savedId = localStorage.getItem(DEVICE_PERSON_ID_KEY)
        if (savedName && savedId) {
          setRecognizedPersonName(savedName)
          setRecognizedPersonId(savedId)
        } else {
          // Try looking up person by device token
          const recognized = await personsService.findByDeviceToken(token)
          if (recognized) {
            setRecognizedPersonName(recognized.name)
            setRecognizedPersonId(recognized.id)
            localStorage.setItem(DEVICE_PERSON_NAME_KEY, recognized.name)
            localStorage.setItem(DEVICE_PERSON_ID_KEY, recognized.id)
          }
        }

        // 2. Load active culto by schedule + tolerance (D11)
        const currentActive = await cultosService.getActiveCultoNow()
        setActiveCulto(currentActive)

        const list = await cultosService.list()
        setAllCultos(list.slice(0, 3))
      } catch {
        // Silent fail on weak signal
      } finally {
        setLoadingInitial(false)
      }
    }
    init()
  }, [])

  // Action for recognized device: "Olá de novo, Fulano" -> 1-click confirmation
  const handleRecognizedPresence = async () => {
    if (!recognizedPersonId) return
    try {
      setSubmitting(true)
      const person = await personsService.getById(recognizedPersonId)

      // Register presence if active culto exists
      if (activeCulto) {
        // Check if already registered
        const existingPresences = await presencesService.listByCulto(activeCulto.id)
        const already = existingPresences.some((p) => p.person === person.id)

        if (already) {
          setAlreadyRegisteredToday(true)
        } else {
          await presencesService.create({
            culto: activeCulto.id,
            person: person.id,
            modality: 'presencial',
            presence_type: 'retorno',
            origin: 'qr_code',
            device_token: deviceToken,
            registered_by_name: 'Autoatendimento QR Code',
          })
        }
      }

      // Check visit count and full form status
      const allPresences = await presencesService.listByPerson(person.id)
      const totalVisits = allPresences.length + 1
      setVisitCount(totalVisits)

      prefillProgressiveForm(person)
      setConfirmedPerson(person)
      setConfirmed(true)
    } catch {
      toast.error('Erro ao registrar presença. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Switch to clean form if "Não é você?" is clicked
  const handleNotYou = () => {
    localStorage.removeItem(DEVICE_PERSON_NAME_KEY)
    localStorage.removeItem(DEVICE_PERSON_ID_KEY)
    setRecognizedPersonName(null)
    setRecognizedPersonId(null)
    setShowCleanForm(true)
  }

  // Submit short form (new or lookup by phone)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    const cleanPhone = phone.replace(/\D/g, '')

    if (!cleanName || cleanPhone.length < 10) {
      toast.error('Informe seu nome e um WhatsApp válido com DDD.')
      return
    }

    try {
      setSubmitting(true)

      // Lookup if phone already exists (D12)
      const existingPerson = await personsService.findByPhone(cleanPhone)
      let targetPerson: PersonRecord

      if (existingPerson) {
        targetPerson = existingPerson

        // Check for divergences (nome variação / e-mail diferente / possível familiar)
        const nameA = existingPerson.name.toLowerCase().trim()
        const nameB = cleanName.toLowerCase().trim()

        // Check if clearly different person on the same phone (possible relative)
        const firstA = nameA.split(' ')[0]
        const firstB = nameB.split(' ')[0]
        const isClearlyDifferentPerson =
          firstA !== firstB && !nameA.includes(firstB) && !nameB.includes(firstA)

        if (isClearlyDifferentPerson) {
          // Create new person marked as is_possible_relative (D12 scenario 8)
          targetPerson = await personsService.create({
            name: cleanName,
            phone: cleanPhone,
            whatsapp: cleanPhone,
            email: email.trim() || undefined,
            stage: 'visitante',
            status: 'visitor',
            device_token: deviceToken,
            is_possible_relative: true,
            relative_phone_owner: existingPerson.name,
            contact_authorized: contactAuthorized,
            contact_preference: contactPreference,
          })

          await divergencesService.create({
            person: targetPerson.id,
            phone: cleanPhone,
            field_name: 'name',
            current_value: existingPerson.name,
            submitted_value: cleanName,
            divergence_type: 'nome_possivel_familiar',
            status: 'pendente',
            notes: `Mesmo telefone (${cleanPhone}) com nome diferente (${cleanName} vs ${existingPerson.name}). Criado como possível familiar.`,
          })
        } else {
          // Same person: check for small variations or new email without overwriting
          if (
            email.trim() &&
            existingPerson.email &&
            existingPerson.email.toLowerCase() !== email.trim().toLowerCase()
          ) {
            await divergencesService.create({
              person: existingPerson.id,
              phone: cleanPhone,
              field_name: 'email',
              current_value: existingPerson.email,
              submitted_value: email.trim(),
              divergence_type: 'email_diferente',
              status: 'pendente',
              notes: 'E-mail enviado pelo QR Code difere do e-mail cadastrado.',
            })
          }

          if (nameA !== nameB) {
            await divergencesService.create({
              person: existingPerson.id,
              phone: cleanPhone,
              field_name: 'name',
              current_value: existingPerson.name,
              submitted_value: cleanName,
              divergence_type: 'nome_variacao',
              status: 'pendente',
              notes: 'Variação na grafia do nome submetida no QR Code.',
            })
          }

          // Update device_token and contact preferences on existing person
          await personsService.update(existingPerson.id, {
            device_token: deviceToken,
            contact_authorized: contactAuthorized || existingPerson.contact_authorized,
            contact_preference: contactPreference,
          })
        }
      } else {
        // Completely new visitor (1ª visita)
        targetPerson = await personsService.create({
          name: cleanName,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          email: email.trim() || undefined,
          stage: 'visitante',
          status: 'visitor',
          device_token: deviceToken,
          contact_authorized: contactAuthorized,
          contact_auth_date: contactAuthorized ? new Date().toISOString() : undefined,
          contact_preference: contactPreference,
          how_found: 'QR Code no Culto',
        })

        // Generate follow-up 48h task for volunteer
        await followUpService.create({
          person: targetPerson.id,
          responsible_name: 'Equipe de Boas-Vindas',
          status: 'aberta',
          notes: 'Visitante registrou presença de 1ª vez pelo QR Code.',
        })

        await activitiesService.create({
          title: `Novo Visitante via QR Code: ${cleanName}`,
          description: `Primeiro registro através do autoatendimento no culto.`,
          type: 'visitor_signup',
          person: targetPerson.id,
        })
      }

      // Link device to person
      localStorage.setItem(DEVICE_PERSON_NAME_KEY, targetPerson.name)
      localStorage.setItem(DEVICE_PERSON_ID_KEY, targetPerson.id)

      // Register presence if active culto is happening (D11)
      if (activeCulto) {
        const existingPresences = await presencesService.listByCulto(activeCulto.id)
        const already = existingPresences.some((p) => p.person === targetPerson.id)

        if (already) {
          setAlreadyRegisteredToday(true)
        } else {
          await presencesService.create({
            culto: activeCulto.id,
            person: targetPerson.id,
            modality: 'presencial',
            presence_type: existingPerson ? 'retorno' : 'primeira_visita',
            origin: 'qr_code',
            device_token: deviceToken,
            registered_by_name: 'Autoatendimento QR Code',
          })
        }
      }

      // Check visit count
      const allPresences = await presencesService.listByPerson(targetPerson.id)
      const totalVisits = allPresences.length + 1
      setVisitCount(totalVisits)

      prefillProgressiveForm(targetPerson)
      setConfirmedPerson(targetPerson)
      setConfirmed(true)
    } catch {
      toast.error('Erro ao enviar registro. Por favor tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Progressive Form submission ("Conte mais sobre você")
  const handleSaveProgressive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmedPerson) return

    try {
      setSavingProgressive(true)
      const updateData: Partial<PersonRecord> = {
        full_form_completed: true,
        full_form_date: new Date().toISOString(),
      }

      if (progressiveBirthDate) {
        updateData.birth_date = new Date(progressiveBirthDate).toISOString()
      }
      if (progressiveNeighborhood.trim()) {
        updateData.neighborhood = progressiveNeighborhood.trim()
        if (!confirmedPerson.address) {
          updateData.address = progressiveNeighborhood.trim()
        }
      }
      if (progressiveHowMet.trim()) {
        updateData.how_met_details = progressiveHowMet.trim()
        updateData.how_found = progressiveHowMet.trim()
      }
      updateData.has_children = progressiveHasChildren
      if (progressiveHasChildren && progressiveChildrenInfo.trim()) {
        updateData.children_info = progressiveChildrenInfo.trim()
      }

      const updated = await personsService.update(confirmedPerson.id, updateData)
      setConfirmedPerson(updated)
      setProgressiveSuccess(true)
      toast.success('Obrigado por compartilhar! Suas informações foram salvas com carinho.')
    } catch {
      toast.error('Erro ao salvar informações adicionais.')
    } finally {
      setSavingProgressive(false)
    }
  }

  // -------------------------------------------------------------
  // VIEW 1: TELA DE CONFIRMAÇÃO ACOLHEDORA (D13 REVISADA POR MOMENTO)
  // -------------------------------------------------------------
  if (confirmed && confirmedPerson) {
    const firstName = confirmedPerson.name.split(' ')[0]
    const isFirstVisit = visitCount === 1
    const isSecondVisit = visitCount === 2
    const isThirdOrMore = visitCount >= 3
    const fullFormPending = !confirmedPerson.full_form_completed && !progressiveSuccess

    return (
      <PageTransition className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4 sm:p-6 text-[#191919]">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6 text-center">
          {/* Logo & Church Badge */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#820AD1] bg-purple-50 px-3 py-1 rounded-full">
              Igreja Defesa da Fé
            </span>
            <h1 className="text-2xl font-black text-[#191919]">
              {isFirstVisit
                ? `Que alegria ter você, ${firstName}!`
                : `Presença Confirmada, ${firstName}!`}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              {alreadyRegisteredToday
                ? 'Sua presença já estava confirmada no culto de hoje. Bom culto!'
                : activeCulto
                  ? `Que bênção adorar a Deus com você no ${activeCulto.name}.`
                  : 'Sua presença foi acolhida com sucesso pela nossa equipe.'}
            </p>
          </div>

          {/* MOMENTO 1: 1ª VISITA */}
          {/* D13: APENAS horários dos cultos da semana e preferência de contato. */}
          {/* SEM link do app e SEM formulário longo ("pedir compromisso na proporção do vínculo") */}
          {isFirstVisit && (
            <div className="space-y-4">
              {/* Preferência de Contato Confirmada */}
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl text-left flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#820AD1] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#820AD1]">Preferência de contato registrada</p>
                  <p className="text-gray-600 text-[11px] mt-0.5">
                    {confirmedPerson.contact_preference === 'whatsapp'
                      ? 'Entraremos em contato via WhatsApp com uma mensagem de boas-vindas.'
                      : confirmedPerson.contact_preference === 'ligacao'
                        ? 'Nossa equipe ligará para você durante a semana para te acolher.'
                        : 'Respeitamos sua opção de não receber mensagens pastorais.'}
                  </p>
                </div>
              </div>

              {/* Horários dos Cultos da Semana */}
              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-left space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <Calendar className="w-4 h-4 text-[#820AD1]" />
                  <span>Nossos Cultos Durante a Semana</span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/50">
                    <span className="font-semibold text-gray-800">Culto da Palavra</span>
                    <span className="text-[11px] text-gray-500">Domingo &bull; 10h00</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/50">
                    <span className="font-semibold text-gray-800">Culto de Doutrina</span>
                    <span className="text-[11px] text-gray-500">Quarta &bull; 19h30</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-semibold text-gray-800">
                      Encontro de Jovens &amp; Famílias
                    </span>
                    <span className="text-[11px] text-gray-500">Sábado &bull; 18h00</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                Aproveite o culto! Nossa equipe de Boas-Vindas está à disposição para o que você
                precisar.
              </p>
            </div>
          )}

          {/* MOMENTO 2: 2ª VISITA (OU 3ª COM FORMULÁRIO PENDENTE) */}
          {/* D13: Formulário "Conte mais sobre você" como AÇÃO PRINCIPAL; link do app como secundária */}
          {(isSecondVisit || (isThirdOrMore && fullFormPending)) && fullFormPending && (
            <div className="space-y-4">
              {!showProgressiveModal ? (
                <div className="p-5 bg-gradient-to-br from-purple-50 via-white to-purple-50/40 border-2 border-[#820AD1]/30 rounded-3xl text-left space-y-3.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#820AD1] bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                        Ação Principal &bull; 2ª Visita
                      </span>
                      <h2 className="font-extrabold text-sm text-[#191919]">
                        Conte mais sobre você
                      </h2>
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        Para lembrarmos do seu aniversário e indicar programações especiais para sua
                        família.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      onClick={() => setShowProgressiveModal(true)}
                      className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#820AD1]/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Preencher em 1 minuto</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Progressive Form Inline (<= 5 campos, indicador de progresso, microcopys de propósito) */
                <form
                  onSubmit={handleSaveProgressive}
                  className="p-5 bg-white border border-purple-200 rounded-3xl text-left space-y-4 shadow-md text-xs"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#820AD1] tracking-wider">
                        Passo Único &bull; 4 campos rápidos
                      </span>
                      <h3 className="font-bold text-[#191919] text-sm">Conte mais sobre você</h3>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Tudo opcional
                    </span>
                  </div>

                  {/* Microcopy de propósito geral */}
                  <div className="p-2.5 bg-[#F7EEFD] rounded-xl text-[11px] text-[#820AD1] flex items-center gap-2">
                    <Heart className="w-4 h-4 shrink-0" />
                    <span>
                      Pedimos apenas para lembrarmos do seu aniversário e indicar programações para
                      sua família.
                    </span>
                  </div>

                  {/* Campo 1: Data de Nascimento */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-gray-700">Data de Nascimento</label>
                      <span className="text-[10px] text-[#820AD1]">Para seu aniversário</span>
                    </div>
                    <Input
                      type="date"
                      value={progressiveBirthDate}
                      onChange={(e) => setProgressiveBirthDate(e.target.value)}
                      className="h-10 rounded-2xl bg-[#F8F9FB] border-gray-200"
                    />
                  </div>

                  {/* Campo 2: Bairro */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-gray-700">Seu Bairro / Região</label>
                      <span className="text-[10px] text-gray-400">Para células próximas</span>
                    </div>
                    <Input
                      placeholder="Ex: Centro, Pinheiros, Vila Nova..."
                      value={progressiveNeighborhood}
                      onChange={(e) => setProgressiveNeighborhood(e.target.value)}
                      className="h-10 rounded-2xl bg-[#F8F9FB] border-gray-200"
                    />
                  </div>

                  {/* Campo 3: Como conheceu a igreja */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-gray-700">Como conheceu a igreja?</label>
                      <span className="text-[10px] text-gray-400">Opcional</span>
                    </div>
                    <Input
                      placeholder="Ex: Convite de amigo, Instagram, mora perto..."
                      value={progressiveHowMet}
                      onChange={(e) => setProgressiveHowMet(e.target.value)}
                      className="h-10 rounded-2xl bg-[#F8F9FB] border-gray-200"
                    />
                  </div>

                  {/* Campo 4: Filhos e idades */}
                  <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-gray-100 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={progressiveHasChildren}
                        onChange={(e) => setProgressiveHasChildren(e.target.checked)}
                        className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                      />
                      <span>Tenho filhos</span>
                    </label>

                    {progressiveHasChildren && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-gray-600">
                            Nome e idades dos filhos
                          </label>
                          <span className="text-[10px] text-[#820AD1]">Para o Ministério Kids</span>
                        </div>
                        <Input
                          placeholder="Ex: Pedro (5 anos) e Clara (8 anos)"
                          value={progressiveChildrenInfo}
                          onChange={(e) => setProgressiveChildrenInfo(e.target.value)}
                          className="h-9 rounded-2xl bg-white border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={savingProgressive}
                      className="flex-1 bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
                    >
                      {savingProgressive ? 'Salvando...' : 'Salvar e Concluir'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowProgressiveModal(false)}
                      className="text-xs text-gray-500 hover:bg-gray-100 rounded-full h-10 px-3"
                    >
                      Depois
                    </Button>
                  </div>
                </form>
              )}

              {/* Ação secundária na 2ª visita: Link do app */}
              <div className="pt-2 border-t border-gray-100">
                <Link
                  to="/"
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#820AD1] py-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Acessar o aplicativo web da igreja (secundário)</span>
                </Link>
              </div>
            </div>
          )}

          {/* SUCESSO DO FORMULÁRIO PROGRESSIVO OU JÁ PREENCHIDO ANTERIORMENTE */}
          {(!fullFormPending || progressiveSuccess) && !isFirstVisit && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cadastro Acolhido e Atualizado</span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Já temos suas informações para comunhão e ministérios da família. Não se preocupe,
                não voltaremos a pedir estes dados!
              </p>
            </div>
          )}

          {/* MOMENTO 3: 3ª VISITA EM DIANTE (SÓ O QUE AINDA NÃO FOI FEITO) */}
          {isThirdOrMore && (
            <div className="space-y-3 pt-1 text-left">
              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800">
                    Sua Caminhada na Defesa da Fé
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {visitCount}ª Visita
                  </span>
                </div>
                <p className="text-[11px] text-gray-600">
                  {fullFormPending
                    ? 'Ainda não completou sua ficha? Você pode nos contar mais sobre sua família quando quiser.'
                    : 'Você já completou seus dados básicos! Em breve você poderá dar o próximo passo para Frequentador ou Membro.'}
                </p>
              </div>

              {/* Oferecer app se ainda não visitou o app */}
              <Link
                to="/"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200 hover:border-[#820AD1] transition-colors text-xs font-semibold text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#820AD1]" />
                  <span>Acessar portal web da igreja</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          )}

          {/* Social Links & WhatsApp Shortcut */}
          <div className="space-y-2 pt-1">
            <a
              href="https://wa.me/5511999999999?text=Olá!%20Estou%20visitando%20a%20Igreja%20Defesa%20da%20Fé."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Salvar WhatsApp da Igreja</span>
            </a>
          </div>

          <div className="pt-2 text-[10px] text-gray-400">
            Igreja Defesa da Fé &bull; Rua da Paz, 100 &bull; Ministério com fidelidade bíblica
          </div>
        </div>
      </PageTransition>
    )
  }

  // -------------------------------------------------------------
  // VIEW 2: RECONHECIMENTO DE APARELHO ("Olá de novo")
  // -------------------------------------------------------------
  if (recognizedPersonName && !showCleanForm) {
    const firstName = recognizedPersonName.split(' ')[0]

    return (
      <PageTransition className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4 sm:p-6 text-[#191919]">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center shadow-inner">
              <User className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#820AD1] bg-purple-50 px-3 py-1 rounded-full">
              Reconhecimento do Aparelho
            </span>
            <h1 className="text-2xl font-black text-[#191919]">Olá de novo, {firstName}!</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              {activeCulto
                ? `Confirmar sua presença hoje no ${activeCulto.name}?`
                : 'Que bom ter você conosco na Defesa da Fé!'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleRecognizedPresence}
              disabled={submitting}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-sm h-12 rounded-full shadow-lg shadow-[#820AD1]/20 cursor-pointer active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {submitting ? 'Registrando...' : 'Confirmar Minha Presença Hoje'}
            </Button>

            <button
              type="button"
              onClick={handleNotYou}
              className="text-xs text-gray-400 hover:text-[#820AD1] font-semibold underline cursor-pointer"
            >
              Não é você? Clique aqui para abrir um formulário em branco.
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  // -------------------------------------------------------------
  // VIEW 3: FORMULÁRIO CURTO & LEVE (USO COM UMA MÃO NO BANCO)
  // -------------------------------------------------------------
  return (
    <PageTransition className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center p-4 sm:p-6 text-[#191919]">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6">
        {/* Acolhimento Curto no Topo */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7EEFD] text-[#820AD1] text-[10px] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Igreja Defesa da Fé</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#191919]">
            Seja muito bem-vindo(a)!
          </h1>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            {activeCulto
              ? `Culto da Agenda: ${activeCulto.name}`
              : 'Preencha seus dados para registrar sua presença no culto.'}
          </p>
        </div>

        {/* Short Form (<= 5 campos, propósito explícito) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">Seu Nome Completo *</label>
              <span className="text-[10px] text-[#820AD1]">Para te dar as boas-vindas</span>
            </div>
            <Input
              placeholder="Ex.: Lucas Silveira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl h-12 text-sm border-gray-200 focus:border-[#820AD1]"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">Seu WhatsApp (com DDD) *</label>
              <span className="text-[10px] text-gray-400">Identificador no culto</span>
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="rounded-2xl h-12 text-sm border-gray-200 focus:border-[#820AD1] font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">E-mail</label>
              <span className="text-[10px] text-gray-400">Opcional</span>
            </div>
            <Input
              type="email"
              inputMode="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl h-12 text-sm border-gray-200 focus:border-[#820AD1]"
            />
          </div>

          {/* Preferência de Contato */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-gray-600 block">
              Como prefere que nossa equipe entre em contato?
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setContactPreference('whatsapp')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'whatsapp'
                    ? 'border-[#820AD1] bg-purple-50 text-[#820AD1]'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setContactPreference('ligacao')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'ligacao'
                    ? 'border-[#820AD1] bg-purple-50 text-[#820AD1]'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Ligação
              </button>
              <button
                type="button"
                onClick={() => setContactPreference('nenhum')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'nenhum'
                    ? 'border-[#820AD1] bg-purple-50 text-[#820AD1]'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Não contatar
              </button>
            </div>
          </div>

          {/* LGPD: Autorização de contato DESMARCADA por padrão */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-gray-600">
              <input
                type="checkbox"
                checked={contactAuthorized}
                onChange={(e) => setContactAuthorized(e.target.checked)}
                className="mt-0.5 rounded text-[#820AD1] focus:ring-[#820AD1]"
              />
              <span>
                Autorizo a Igreja Defesa da Fé a enviar uma mensagem de acolhimento e avisos sobre
                nossas atividades bíblicas, conforme a{' '}
                <span className="text-[#820AD1] underline">Política de Privacidade (LGPD)</span>.
              </span>
            </label>
          </div>

          {/* Botão Único Enviar */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white font-bold text-sm h-12 rounded-full shadow-lg shadow-[#820AD1]/20 cursor-pointer active:scale-95 transition-all mt-3"
          >
            {submitting ? 'Enviando...' : 'Enviar e Confirmar Presença'}
          </Button>
        </form>

        <div className="text-center pt-1">
          <Link to="/" className="text-[11px] text-gray-400 hover:text-gray-600 font-medium">
            Acessar com login de membro &rarr;
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
