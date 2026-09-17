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
} from 'lucide-react'
import {
  personsService,
  cultosService,
  presencesService,
  followUpService,
  activitiesService,
  divergencesService,
} from '@/services/church'
import type { CultoRecord, PersonRecord, PresenceRecord } from '@/types/church'
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
  const [allCultos, setAllCultos] = useState<CultoRecord[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Form fields (short & light for low mobile signal)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contactAuthorized, setContactAuthorized] = useState(false) // Desmarcada por padrão
  const [contactPreference, setContactPreference] = useState<'whatsapp' | 'ligacao' | 'nenhum'>(
    'whatsapp',
  )

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedPerson, setConfirmedPerson] = useState<PersonRecord | null>(null)
  const [alreadyRegisteredToday, setAlreadyRegisteredToday] = useState(false)
  const [visitCount, setVisitCount] = useState<number>(1)
  const [showFullFormInvite, setShowFullFormInvite] = useState(false)

  // Format Phone (Mascara brasileira)
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 2) return raw
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`
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

      // Check visit count and full form status (D14)
      const allPresences = await presencesService.listByPerson(person.id)
      const totalVisits = allPresences.length + 1
      setVisitCount(totalVisits)

      // D14: Invite to full form appears on 1st, 2nd and 3rd visits if not completed yet
      if (!person.full_form_completed && totalVisits <= 3) {
        setShowFullFormInvite(true)
      } else {
        setShowFullFormInvite(false)
      }

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
        // Completely new visitor
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

        // Generate follow-up 48h task
        await followUpService.create({
          person: targetPerson.id,
          responsible_name: 'Equipe de Boas-Vindas',
          status: 'aberta',
          notes: 'Visitante registrou presença pelo QR Code.',
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

      // Check visit count & full form status
      const allPresences = await presencesService.listByPerson(targetPerson.id)
      const totalVisits = allPresences.length + 1
      setVisitCount(totalVisits)

      // D14 rule: Show full form invite on 1st, 2nd, 3rd visits if not completed yet
      if (!targetPerson.full_form_completed && totalVisits <= 3) {
        setShowFullFormInvite(true)
      } else {
        setShowFullFormInvite(false)
      }

      setConfirmedPerson(targetPerson)
      setConfirmed(true)
    } catch {
      toast.error('Erro ao enviar registro. Por favor tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------
  // VIEW 1: TELA DE CONFIRMAÇÃO ACOLHEDORA (NEUTRA & LGPD)
  // -------------------------------------------------------------
  if (confirmed && confirmedPerson) {
    const firstName = confirmedPerson.name.split(' ')[0]

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
              Presença Confirmada, {firstName}!
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              {alreadyRegisteredToday
                ? 'Sua presença já estava confirmada no culto de hoje. Que bom ter você conosco!'
                : activeCulto
                  ? `Que alegria adorar a Deus com você no ${activeCulto.name}.`
                  : 'Seu cadastro foi recebido com sucesso pela nossa equipe.'}
            </p>
          </div>

          {/* D13/D14: Convite ao Formulário Completo (se 1ª, 2ª ou 3ª visita e não preenchido) */}
          {showFullFormInvite && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-[#820AD1] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-[#820AD1]">
                    Quer nos contar um pouco mais sobre você?
                  </p>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Ajude-nos a orar por você e saber seus pedidos ou interesse em estudos bíblicos.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex gap-2">
                <Link to="/retorno" className="flex-1">
                  <Button className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-9 rounded-full font-bold shadow-xs">
                    Preencher agora &rarr;
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => setShowFullFormInvite(false)}
                  className="text-xs text-purple-700 hover:bg-purple-100/50 rounded-full h-9 px-3"
                >
                  Pular
                </Button>
              </div>
            </div>
          )}

          {/* Horários dos Cultos da Semana */}
          <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-left space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Calendar className="w-4 h-4 text-[#820AD1]" />
              <span>Programação Semanal Defesa da Fé</span>
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

          {/* Social Links & WhatsApp Shortcut */}
          <div className="space-y-2.5 pt-1">
            <a
              href="https://wa.me/5511999999999?text=Olá!%20Estou%20visitando%20a%20Igreja%20Defesa%20da%20Fé."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Salvar WhatsApp da Igreja</span>
            </a>

            {/* D13: Link opcional em posição secundária para baixar o app */}
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-[#820AD1] py-1 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Conhecer o aplicativo web da igreja (opcional)</span>
            </Link>
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
  // VIEW 3: FORMULÁRIO CURTO & LEVE (USO COM UMA MÃO)
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

        {/* Short Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Seu Nome Completo *</label>
            <Input
              placeholder="Ex.: Lucas Silveira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl h-12 text-sm border-gray-200 focus:border-[#820AD1]"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Seu WhatsApp (com DDD) *</label>
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
