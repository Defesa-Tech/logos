import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  QrCode,
  MapPin,
  Clock,
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
  const [birthDate, setBirthDate] = useState('')
  const [howMet, setHowMet] = useState('Culto presencial')
  const [prayerRequest, setPrayerRequest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe seu nome.')
      return
    }

    try {
      setSubmitting(true)
      const person = await personsService.create({
        name: name.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        birth_date: birthDate || undefined,
        how_met: howMet,
        status: 'visitor',
        notes: prayerRequest ? `Pedido de oração no acolhimento: ${prayerRequest}` : undefined,
      })

      // Register activity
      await activitiesService.create({
        title: `Novo visitante acolhido: ${name}`,
        description: `Cadastro via QR da recepção do culto. Contato: ${whatsapp || 'não informado'}`,
        type: 'visitor_signup',
        person: person.id,
      })

      setCompleted(true)
      toast.success('Que alegria ter você conosco! Seu cadastro foi recebido.')
    } catch {
      toast.error('Erro ao enviar suas informações. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Top minimal header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            L
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900">Logos</span>
        </Link>
        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
          Recepção & Boas-Vindas
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          {completed ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-10 shadow-xs text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 block">
                  Acolhimento Confirmado
                </span>
                <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
                  Seja muito bem-vindo(a), {name.split(' ')[0]}!
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
                  É uma honra ter você conosco em nosso culto. Nossa equipe pastoral já recebeu seus
                  dados com carinho para orar por você.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 text-left text-xs space-y-2">
                <p className="font-semibold text-zinc-900">Próximos passos acolhedores:</p>
                <div className="flex items-center gap-2 text-zinc-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                  <span>Retire seu kit de boas-vindas no balcão da recepção</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                  <span>Conheça os Pequenos Grupos nos lares da sua região</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    setCompleted(false)
                    setName('')
                    setWhatsapp('')
                    setEmail('')
                    setPrayerRequest('')
                  }}
                  variant="outline"
                  className="text-xs h-9 rounded-lg border-zinc-200 text-zinc-700 font-medium"
                >
                  Cadastrar outro visitante
                </Button>
                <Link to="/">
                  <Button className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9 px-4 rounded-lg font-medium shadow-xs">
                    Ir para o Painel da Igreja
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
              {/* Hero inside card */}
              <div className="space-y-2 text-center pb-4 border-b border-zinc-100">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-medium mb-1">
                  <QrCode className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Boas-Vindas à Igreja</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
                  Estamos felizes com a sua presença!
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-md mx-auto">
                  Preencha este breve cartão para que possamos orar por você e manter contato com a
                  nossa comunidade.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="v-name" className="font-medium text-zinc-700">
                    Seu Nome Completo *
                  </Label>
                  <Input
                    id="v-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Mariana Castro"
                    className="h-10 text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="v-phone" className="font-medium text-zinc-700">
                      WhatsApp com DDD
                    </Label>
                    <Input
                      id="v-phone"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="h-10 text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="v-email" className="font-medium text-zinc-700">
                      E-mail (opcional)
                    </Label>
                    <Input
                      id="v-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="mariana@exemplo.com"
                      className="h-10 text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="v-birth" className="font-medium text-zinc-700">
                      Data de Nascimento
                    </Label>
                    <Input
                      id="v-birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-10 text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="v-how" className="font-medium text-zinc-700">
                      Como conheceu a igreja?
                    </Label>
                    <Select value={howMet} onValueChange={setHowMet}>
                      <SelectTrigger
                        id="v-how"
                        className="h-10 text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-lg shadow-lg">
                        <SelectItem value="Culto presencial">Culto presencial</SelectItem>
                        <SelectItem value="Convite de amigo/familiar">
                          Convite de amigo ou familiar
                        </SelectItem>
                        <SelectItem value="Redes sociais / Instagram">
                          Redes Sociais / Instagram
                        </SelectItem>
                        <SelectItem value="Pequeno Grupo no lar">Pequeno Grupo no lar</SelectItem>
                        <SelectItem value="Outro">Outro meio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="v-prayer" className="font-medium text-zinc-700">
                    Podemos orar por algum motivo específico hoje?
                  </Label>
                  <Textarea
                    id="v-prayer"
                    rows={3}
                    value={prayerRequest}
                    onChange={(e) => setPrayerRequest(e.target.value)}
                    placeholder="Deixe aqui seu pedido de oração ou mensagem para a equipe pastoral..."
                    className="text-xs rounded-lg bg-zinc-50 border-zinc-200 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-10 rounded-lg font-medium shadow-xs cursor-pointer"
                >
                  {submitting ? 'Enviando...' : 'Confirmar Presença no Culto'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 px-6 text-center text-xs text-zinc-400">
        Logos Gestão de Igreja &bull; Todos os direitos reservados
      </footer>
    </PageTransition>
  )
}
