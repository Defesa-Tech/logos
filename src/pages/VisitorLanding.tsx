import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  User,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Shield,
  Church,
} from 'lucide-react'
import { personsService, activitiesService } from '@/services/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function VisitorLanding() {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [howMet, setHowMet] = useState('Culto de Domingo')
  const [prayerRequest, setPrayerRequest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe o seu nome completo.')
      return
    }

    try {
      setSubmitting(true)
      const notes = [
        howMet ? `Como conheceu: ${howMet}` : '',
        prayerRequest ? `Pedido de oração: ${prayerRequest}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const person = await personsService.create({
        name: name.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        status: 'visitor',
        how_met: howMet,
        notes: notes || undefined,
      })

      // Log activity
      await activitiesService.create({
        title: `Novo Visitante: ${person.name}`,
        description: `Cadastro via QR Code no culto (${howMet || 'Recepção'}).`,
        type: 'visitor_signup',
        person: person.id,
      })

      setSubmitted(true)
      toast.success('Que alegria ter você conosco! Seja muito bem-vindo à Família Logos.')
    } catch {
      toast.error('Erro ao enviar seu cadastro. Avise nossa equipe de recepção.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#17212A] selection:bg-[#C5A046]/20 selection:text-[#141B22]">
      {/* =========================================================================
          TOP MINIMAL MASTHEAD
          ========================================================================= */}
      <header className="border-b border-[#E6E2D8] bg-[#FAF9F6] py-5 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-serif-sacred text-2xl font-bold tracking-tight text-[#141B22]">
              Logos
            </span>
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#C5A046] font-semibold">
              Recepção
            </span>
          </Link>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline-block">
            Culto Dominical &bull; 10h & 18h
          </span>
        </div>
      </header>

      {/* =========================================================================
          HERO & EDITORIAL INVITATION (Warmer, welcoming, typography-led)
          ========================================================================= */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E6E2D8] bg-white font-mono text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
            <span>Porta de Entrada da Comunidade</span>
          </div>

          <h1 className="font-serif-sacred text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#141B22] leading-[1.08]">
            É uma honra ter você conosco neste dia.
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Se você está visitando a Igreja Logos pela primeira vez, preencha este breve cartão para
            que nossa equipe pastoral possa acolher você com carinho e orar pela sua família.
          </p>
        </section>

        {/* =========================================================================
            REGISTRATION CARD / SUCCESS SCREEN
            ========================================================================= */}
        <div className="max-w-xl mx-auto bg-white border border-[#E6E2D8] rounded p-6 sm:p-10 shadow-editorial">
          {submitted ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-14 h-14 rounded-full bg-[#FAF9F6] border border-[#C5A046] text-[#141B22] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#C5A046]" strokeWidth={1.75} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A046]">
                  Acolhimento Confirmado
                </span>
                <h2 className="font-serif-sacred text-3xl font-bold text-[#141B22]">
                  Seja muito bem-vindo!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Recebemos seus dados com zelo pastoral. Nossa equipe de recepção entrará em
                  contato via WhatsApp para agradecer sua visita.
                </p>
              </div>

              <div className="p-4 bg-[#FAF9F6] border border-[#E6E2D8] rounded text-left text-xs space-y-2 font-mono">
                <p className="font-semibold text-[#141B22] font-sans">Próximos Encontros:</p>
                <p className="text-slate-600">
                  &bull; Domingo: Cultos às 10h e às 18h <br />
                  &bull; Quarta-feira: Estudo Bíblico & Oração às 20h <br />
                  &bull; Pequenos Grupos nos Lares durante a semana
                </p>
              </div>

              <div className="pt-2">
                <Link to="/">
                  <Button
                    variant="outline"
                    className="text-xs font-mono h-9 rounded border-[#E6E2D8] text-[#141B22]"
                  >
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div className="pb-3 border-b border-[#E6E2D8]">
                <h2 className="font-serif-sacred text-xl font-bold text-[#141B22]">
                  Cartão Pastoral de Boas-Vindas
                </h2>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Leva apenas 1 minuto &bull; 100% confidencial
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="vis-name"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Seu Nome Completo *
                </Label>
                <div className="relative">
                  <User
                    className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="vis-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Amanda Carvalho de Castro"
                    className="pl-8 text-xs h-10 rounded bg-[#FAF9F6] border-[#E6E2D8] focus:border-[#141B22]"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="vis-phone"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  WhatsApp com DDD *
                </Label>
                <div className="relative">
                  <Phone
                    className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="vis-phone"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="pl-8 text-xs h-10 rounded bg-[#FAF9F6] border-[#E6E2D8] focus:border-[#141B22]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="vis-email"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  E-mail (Opcional)
                </Label>
                <div className="relative">
                  <Mail
                    className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="vis-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amanda@exemplo.com"
                    className="pl-8 text-xs h-10 rounded bg-[#FAF9F6] border-[#E6E2D8] focus:border-[#141B22]"
                  />
                </div>
              </div>

              {/* How met */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="vis-how"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Como conheceu a Igreja Logos?
                </Label>
                <Select value={howMet} onValueChange={setHowMet}>
                  <SelectTrigger
                    id="vis-how"
                    className="h-10 rounded bg-[#FAF9F6] border-[#E6E2D8] text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded text-xs">
                    <SelectItem value="Culto de Domingo">Culto Dominical (Presencial)</SelectItem>
                    <SelectItem value="Convite de Amigo / Familiar">
                      Convite de Amigo ou Familiar
                    </SelectItem>
                    <SelectItem value="Redes Sociais / Internet">
                      Instagram / Redes Sociais
                    </SelectItem>
                    <SelectItem value="Pequeno Grupo no Lar">Pequeno Grupo nos Lares</SelectItem>
                    <SelectItem value="Passando em frente ao templo">Moro na vizinhança</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prayer Request */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="vis-prayer"
                  className="font-mono uppercase tracking-wider text-slate-600"
                >
                  Pedido de Oração (Opcional & Confidencial)
                </Label>
                <Textarea
                  id="vis-prayer"
                  rows={3}
                  value={prayerRequest}
                  onChange={(e) => setPrayerRequest(e.target.value)}
                  placeholder="Gostaria de oração por saúde, família, decisões profissionais..."
                  className="rounded bg-[#FAF9F6] border-[#E6E2D8] text-xs focus:border-[#141B22]"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#141B22] hover:bg-[#1E2732] text-white text-xs h-11 rounded font-mono shadow-none cursor-pointer"
              >
                {submitting ? 'Registrando acolhimento...' : 'Entregar Cartão de Visita'}
              </Button>
            </form>
          )}
        </div>

        {/* Church identity footnote */}
        <section className="pt-6 border-t border-[#E6E2D8] grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left text-xs text-slate-600">
          <div>
            <p className="font-serif-sacred font-bold text-sm text-[#141B22] mb-1">
              Cultos Dominicais
            </p>
            <p className="leading-relaxed font-mono text-[11px] text-slate-500">
              Manhã às 10h00 &bull; Noite às 18h00 <br />
              Com ministério infantil em ambos os horários.
            </p>
          </div>
          <div>
            <p className="font-serif-sacred font-bold text-sm text-[#141B22] mb-1">
              Pequenos Grupos
            </p>
            <p className="leading-relaxed font-mono text-[11px] text-slate-500">
              Encontros nos lares de terça a quinta-feira para comunhão, oração e estudo bíblico.
            </p>
          </div>
          <div>
            <p className="font-serif-sacred font-bold text-sm text-[#141B22] mb-1">
              Cuidado Pastoral
            </p>
            <p className="leading-relaxed font-mono text-[11px] text-slate-500">
              Agende uma visita pastoral ou aconselhamento com a secretaria após o culto.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
