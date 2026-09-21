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

  // Active Events based on schedule & tolerance (D11 General Agenda)
  const [activeEvents, setActiveEvents] = useState<CultoRecord[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
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

        // 2. Load active events by schedule + tolerance + recurrence (D11 General Agenda)
        // Regra de desambiguação automática: escolhe o mais próximo do momento do registro
        const currentActiveList = await cultosService.getActiveEventsNow()
        setActiveEvents(currentActiveList)
        const autoChosen = await cultosService.resolveTargetEventAuto()
        setActiveCulto(autoChosen)
        setSelectedEventId(autoChosen ? autoChosen.id : '')

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

  // Resolve target event: regra de desambiguação automática (início mais próximo, zero fricção)
  const determineTargetEvent = async (): Promise<CultoRecord | null> => {
    const liveActiveEvents = await cultosService.getActiveEventsNow()
    setActiveEvents(liveActiveEvents)

    const chosen = await cultosService.resolveTargetEventAuto()
    return chosen
  }

  // Action for recognized device: "Olá de novo, Fulano" -> 1-click confirmation (Zero atrito)
  const handleRecognizedPresence = async () => {
    if (!recognizedPersonId) return
    try {
      setSubmitting(true)
      const person = await personsService.getById(recognizedPersonId)

      // Regra de desambiguação automática: escolhe evento cujo início é mais próximo do momento do registro
      const chosenEvent = await determineTargetEvent()
      setActiveCulto(chosenEvent)

      if (chosenEvent) {
        // Evento encontrado: verificar se já registrado
        const existingPresences = await presencesService.listByCulto(chosenEvent.id)
        const already = existingPresences.some((p) => p.person === person.id)

        if (already) {
          setAlreadyRegisteredToday(true)
        } else {
          await presencesService.create({
            culto: chosenEvent.id,
            person: person.id,
            modality: 'presencial',
            presence_type: 'retorno',
            origin: 'qr_code',
            device_token: deviceToken,
            registered_by_name: 'Autoatendimento QR Code',
          })
        }
      } else {
        // Presença órfã (sem evento na agenda): gravar com culto vazio e is_orphan=true
        await presencesService.create({
          culto: '',
          person: person.id,
          modality: 'presencial',
          presence_type: 'retorno',
          origin: 'qr_code',
          device_token: deviceToken,
          is_orphan: true,
          registered_by_name: 'Autoatendimento QR Code (Sem evento na agenda)',
        })
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

      // Regra de desambiguação automática: escolhe o evento cujo início é mais próximo do momento do registro
      const chosenEvent = await determineTargetEvent()
      setActiveCulto(chosenEvent)

      if (chosenEvent) {
        const existingPresences = await presencesService.listByCulto(chosenEvent.id)
        const already = existingPresences.some((p) => p.person === targetPerson.id)

        if (already) {
          setAlreadyRegisteredToday(true)
        } else {
          await presencesService.create({
            culto: chosenEvent.id,
            person: targetPerson.id,
            modality: 'presencial',
            presence_type: existingPerson ? 'retorno' : 'primeira_visita',
            origin: 'qr_code',
            device_token: deviceToken,
            registered_by_name: 'Autoatendimento QR Code',
          })
        }
      } else {
        // Presenças sem evento (órfãs): o cadastro é gravado, a presença fica sem evento (is_orphan: true)
        // e a secretaria vê esses casos na lista para vincular manualmente ou ignorar.
        await presencesService.create({
          culto: '',
          person: targetPerson.id,
          modality: 'presencial',
          presence_type: existingPerson ? 'retorno' : 'primeira_visita',
          origin: 'qr_code',
          device_token: deviceToken,
          is_orphan: true,
          registered_by_name: 'Autoatendimento QR Code (Sem evento na agenda)',
        })
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
      <PageTransition className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center p-4 sm:p-6 text-[#14161D]">
        <div className="w-full max-w-md bg-white rounded-[22px] p-6 sm:p-8 shadow-xl border border-[#E8EAF0] space-y-6 text-center">
          {/* Logo & Church Badge */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#3A31CE] bg-[#F2F1FB] px-3 py-1 rounded-full font-heading">
              Logos Gestão de Igreja
            </span>
            <h1 className="text-2xl font-black text-[#14161D] font-heading">
              {isFirstVisit
                ? `Que alegria ter você, ${firstName}!`
                : `Presença Confirmada, ${firstName}!`}
            </h1>
            <p className="text-xs text-[#5A6072] leading-relaxed max-w-xs mx-auto">
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
              <div className="p-3 bg-[#F2F1FB] border border-[#DAD7F3] rounded-2xl text-left flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#3A31CE] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-[#3A31CE]">Preferência de contato registrada</p>
                  <p className="text-[#5A6072] text-[11px] mt-0.5">
                    {confirmedPerson.contact_preference === 'whatsapp'
                      ? 'Entraremos em contato via WhatsApp com uma mensagem de boas-vindas.'
                      : confirmedPerson.contact_preference === 'ligacao'
                        ? 'Nossa equipe ligará para você durante a semana para te acolher.'
                        : 'Respeitamos sua opção de não receber mensagens pastorais.'}
                  </p>
                </div>
              </div>

              {/* Horários dos Cultos da Semana */}
              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-[#E8EAF0] text-left space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#14161D]">
                  <Calendar className="w-4 h-4 text-[#3A31CE]" />
                  <span>Nossos Cultos Durante a Semana</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#5A6072]">
                  <div className="flex justify-between items-center py-1 border-b border-[#E8EAF0]">
                    <span className="font-semibold text-[#14161D]">Culto da Palavra</span>
                    <span className="text-[11px] text-[#6B7183]">Domingo &bull; 10h00</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#E8EAF0]">
                    <span className="font-semibold text-[#14161D]">Culto de Doutrina</span>
                    <span className="text-[11px] text-[#6B7183]">Quarta &bull; 19h30</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-semibold text-[#14161D]">
                      Encontro de Jovens &amp; Famílias
                    </span>
                    <span className="text-[11px] text-[#6B7183]">Sábado &bull; 18h00</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#6B7183] italic">
                Aproveite o culto! Nossa equipe de Boas-Vindas está à disposição para o que você
                precisar.
              </p>
            </div>
          )}

          {/* MOMENTO 2: 2ª VISITA (OU 3ª COM FORMULÁRIO PENDENTE) */}
          {(isSecondVisit || (isThirdOrMore && fullFormPending)) && fullFormPending && (
            <div className="space-y-4">
              {!showProgressiveModal ? (
                <div className="p-5 bg-gradient-to-br from-[#F2F1FB] via-white to-[#F2F1FB]/40 border-2 border-[#DAD7F3] rounded-[20px] text-left space-y-3.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#3A31CE] text-white flex items-center justify-center shrink-0 shadow-xs font-heading">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#3A31CE] bg-[#F2F1FB] px-2.5 py-0.5 rounded-full font-heading">
                        Ação Principal &bull; 2ª Visita
                      </span>
                      <h2 className="font-extrabold text-sm text-[#14161D] font-heading">
                        Conte mais sobre você
                      </h2>
                      <p className="text-[11px] text-[#5A6072] leading-relaxed">
                        Para lembrarmos do seu aniversário e indicar programações especiais para sua
                        família.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Button
                      onClick={() => setShowProgressiveModal(true)}
                      className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#3A31CE]/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Preencher em 1 minuto</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Progressive Form Inline */
                <form
                  onSubmit={handleSaveProgressive}
                  className="p-5 bg-white border border-[#DAD7F3] rounded-[20px] text-left space-y-4 shadow-md text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#E8EAF0] pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#3A31CE] tracking-wider font-heading">
                        Passo Único &bull; 4 campos rápidos
                      </span>
                      <h3 className="font-bold text-[#14161D] text-sm font-heading">
                        Conte mais sobre você
                      </h3>
                    </div>
                    <span className="text-[10px] text-[#6B7183] bg-gray-100 px-2 py-0.5 rounded-full">
                      Tudo opcional
                    </span>
                  </div>

                  {/* Microcopy de propósito geral */}
                  <div className="p-2.5 bg-[#F2F1FB] rounded-xl text-[11px] text-[#3A31CE] flex items-center gap-2">
                    <Heart className="w-4 h-4 shrink-0" />
                    <span>
                      Pedimos apenas para lembrarmos do seu aniversário e indicar programações para
                      sua família.
                    </span>
                  </div>

                  {/* Campo 1: Data de Nascimento */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[#5A6072]">Data de Nascimento</label>
                      <span className="text-[10px] text-[#3A31CE]">Para seu aniversário</span>
                    </div>
                    <Input
                      type="date"
                      value={progressiveBirthDate}
                      onChange={(e) => setProgressiveBirthDate(e.target.value)}
                      className="h-10 rounded-[14px] bg-[#F8F9FB] border-[#E8EAF0]"
                    />
                  </div>

                  {/* Campo 2: Bairro */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[#5A6072]">Seu Bairro / Região</label>
                      <span className="text-[10px] text-[#6B7183]">Para células próximas</span>
                    </div>
                    <Input
                      placeholder="Ex: Centro, Pinheiros, Vila Nova..."
                      value={progressiveNeighborhood}
                      onChange={(e) => setProgressiveNeighborhood(e.target.value)}
                      className="h-10 rounded-[14px] bg-[#F8F9FB] border-[#E8EAF0]"
                    />
                  </div>

                  {/* Campo 3: Como conheceu a igreja */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[#5A6072]">Como conheceu a igreja?</label>
                      <span className="text-[10px] text-[#6B7183]">Opcional</span>
                    </div>
                    <Input
                      placeholder="Ex: Convite de amigo, Instagram, mora perto..."
                      value={progressiveHowMet}
                      onChange={(e) => setProgressiveHowMet(e.target.value)}
                      className="h-10 rounded-[14px] bg-[#F8F9FB] border-[#E8EAF0]"
                    />
                  </div>

                  {/* Campo 4: Filhos e idades */}
                  <div className="p-3 bg-[#F8F9FB] rounded-2xl border border-[#E8EAF0] space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[#14161D]">
                      <input
                        type="checkbox"
                        checked={progressiveHasChildren}
                        onChange={(e) => setProgressiveHasChildren(e.target.checked)}
                        className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                      />
                      <span>Tenho filhos</span>
                    </label>

                    {progressiveHasChildren && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-[#5A6072]">
                            Nome e idades dos filhos
                          </label>
                          <span className="text-[10px] text-[#3A31CE]">Para o Ministério Kids</span>
                        </div>
                        <Input
                          placeholder="Ex: Pedro (5 anos) e Clara (8 anos)"
                          value={progressiveChildrenInfo}
                          onChange={(e) => setProgressiveChildrenInfo(e.target.value)}
                          className="h-9 rounded-[14px] bg-white border-[#E8EAF0]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      disabled={savingProgressive}
                      className="flex-1 bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all"
                    >
                      {savingProgressive ? 'Salvando...' : 'Salvar e Concluir'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowProgressiveModal(false)}
                      className="text-xs text-[#5A6072] hover:bg-[#F2F1FB] rounded-full h-10 px-3"
                    >
                      Depois
                    </Button>
                  </div>
                </form>
              )}

              {/* Ação secundária na 2ª visita: Link do app */}
              <div className="pt-2 border-t border-[#E8EAF0]">
                <Link
                  to="/"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#5A6072] hover:text-[#3A31CE] py-1 font-semibold"
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
              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-[#E8EAF0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#14161D]">
                    Sua Caminhada com a Logos
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-[#F2F1FB] text-[#3A31CE] px-2 py-0.5 rounded-full font-heading">
                    {visitCount}ª Visita
                  </span>
                </div>
                <p className="text-[11px] text-[#5A6072]">
                  {fullFormPending
                    ? 'Ainda não completou sua ficha? Você pode nos contar mais sobre sua família quando quiser.'
                    : 'Você já completou seus dados básicos! Em breve você poderá dar o próximo passo para Frequentador ou Membro.'}
                </p>
              </div>

              {/* Oferecer app se ainda não visitou o app */}
              <Link
                to="/"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8EAF0] hover:border-[#3A31CE] transition-colors text-xs font-semibold text-[#14161D]"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#3A31CE]" />
                  <span>Acessar portal web da igreja</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          )}

          {/* Social Links & WhatsApp Shortcut */}
          <div className="space-y-2 pt-1">
            <a
              href="https://wa.me/5511999999999?text=Olá!%20Estou%20visitando%20a%20Igreja%20Logos."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Salvar WhatsApp da Igreja</span>
            </a>
          </div>

          <div className="pt-2 text-[10px] text-[#6B7183]">
            Logos Gestão de Igreja &bull; Comunidade &bull; Ministério com fidelidade bíblica
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
      <PageTransition className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center p-4 sm:p-6 text-[#14161D]">
        <div className="w-full max-w-md bg-white rounded-[22px] p-6 sm:p-8 shadow-xl border border-[#E8EAF0] space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center shadow-inner font-heading">
              <User className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#3A31CE] bg-[#F2F1FB] px-3 py-1 rounded-full font-heading">
              Reconhecimento do Aparelho
            </span>
            <h1 className="text-2xl font-black text-[#14161D] font-heading">
              Olá de novo, {firstName}!
            </h1>
            <p className="text-xs text-[#5A6072] leading-relaxed">
              {activeCulto
                ? `Confirmar sua presença hoje no ${activeCulto.name}?`
                : 'Que bom ter você conosco na Logos! Toque abaixo para confirmar sua presença.'}
            </p>
          </div>

          {/* D11 Regra de desambiguação automática: zero fricção para o visitante */}
          {activeCulto && (
            <div className="p-3 bg-[#F2F1FB] border border-[#DAD7F3] rounded-2xl text-left flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3A31CE]" />
                <span className="font-semibold text-[#14161D]">{activeCulto.name}</span>
              </div>
              <span className="text-[10px] font-bold text-[#3A31CE] bg-white px-2 py-0.5 rounded-full border border-[#DAD7F3]">
                Identificado automaticamente
              </span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleRecognizedPresence}
              disabled={submitting}
              className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-sm h-12 rounded-full shadow-lg shadow-[#3A31CE]/20 cursor-pointer active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {submitting ? 'Registrando...' : 'Confirmar Minha Presença Hoje'}
            </Button>

            <button
              type="button"
              onClick={handleNotYou}
              className="text-xs text-[#6B7183] hover:text-[#3A31CE] font-semibold underline cursor-pointer"
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
    <PageTransition className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center p-4 sm:p-6 text-[#14161D]">
      <div className="w-full max-w-md bg-white rounded-[22px] p-6 sm:p-8 shadow-xl border border-[#E8EAF0] space-y-6">
        {/* Acolhimento Curto no Topo */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2F1FB] text-[#3A31CE] text-[10px] font-bold uppercase tracking-wider mb-1 font-heading">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Logos Igreja</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#14161D] font-heading">
            Seja muito bem-vindo(a)!
          </h1>
          <p className="text-xs text-[#5A6072] max-w-xs mx-auto">
            {activeCulto
              ? `Evento em andamento: ${activeCulto.name}`
              : 'Preencha seus dados para registrar sua visita à igreja.'}
          </p>
        </div>

        {/* D11 Regra de desambiguação automática: zero fricção para o visitante */}
        {activeCulto && (
          <div className="p-3 bg-[#F2F1FB] border border-[#DAD7F3] rounded-2xl text-left flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3A31CE]" />
              <span className="font-semibold text-[#14161D]">{activeCulto.name}</span>
            </div>
            <span className="text-[10px] font-bold text-[#3A31CE] bg-white px-2 py-0.5 rounded-full border border-[#DAD7F3]">
              Vinculação automática
            </span>
          </div>
        )}

        {/* Short Form (<= 5 campos, propósito explícito) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#5A6072]">Seu Nome Completo *</label>
              <span className="text-[10px] text-[#3A31CE]">Para te dar as boas-vindas</span>
            </div>
            <Input
              placeholder="Ex.: Lucas Silveira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[14px] h-12 text-sm border-[#E8EAF0] focus:border-[#3A31CE]"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#5A6072]">Seu WhatsApp (com DDD) *</label>
              <span className="text-[10px] text-[#6B7183]">Identificador no culto</span>
            </div>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="rounded-[14px] h-12 text-sm border-[#E8EAF0] focus:border-[#3A31CE] font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#5A6072]">E-mail</label>
              <span className="text-[10px] text-[#6B7183]">Opcional</span>
            </div>
            <Input
              type="email"
              inputMode="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[14px] h-12 text-sm border-[#E8EAF0] focus:border-[#3A31CE]"
            />
          </div>

          {/* Preferência de Contato */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-[#5A6072] block">
              Como prefere que nossa equipe entre em contato?
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setContactPreference('whatsapp')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'whatsapp'
                    ? 'border-[#3A31CE] bg-[#F2F1FB] text-[#3A31CE]'
                    : 'border-[#E8EAF0] text-[#5A6072]'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setContactPreference('ligacao')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'ligacao'
                    ? 'border-[#3A31CE] bg-[#F2F1FB] text-[#3A31CE]'
                    : 'border-[#E8EAF0] text-[#5A6072]'
                }`}
              >
                Ligação
              </button>
              <button
                type="button"
                onClick={() => setContactPreference('nenhum')}
                className={`py-2 px-2 rounded-xl border text-center font-semibold cursor-pointer transition-colors ${
                  contactPreference === 'nenhum'
                    ? 'border-[#3A31CE] bg-[#F2F1FB] text-[#3A31CE]'
                    : 'border-[#E8EAF0] text-[#5A6072]'
                }`}
              >
                Não contatar
              </button>
            </div>
          </div>

          {/* LGPD: Autorização de contato DESMARCADA por padrão */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-[#5A6072]">
              <input
                type="checkbox"
                checked={contactAuthorized}
                onChange={(e) => setContactAuthorized(e.target.checked)}
                className="mt-0.5 rounded text-[#3A31CE] focus:ring-[#3A31CE]"
              />
              <span>
                Autorizo a Igreja a enviar uma mensagem de acolhimento e avisos sobre nossas
                atividades bíblicas, conforme a{' '}
                <span className="text-[#3A31CE] underline">Política de Privacidade (LGPD)</span>.
              </span>
            </label>
          </div>

          {/* Botão Único Enviar */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-sm h-12 rounded-full shadow-lg shadow-[#3A31CE]/20 cursor-pointer active:scale-95 transition-all mt-3"
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
