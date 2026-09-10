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
    <PageTransition className="min-h-screen bg-gradient-to-b from-[#820AD1] via-[#6807AB] to-[#190326] flex flex-col justify-between selection:bg-white selection:text-[#820AD1]">
      {/* Top Simple Header */}
      <header className="border-b border-white/10 bg-[#820AD1]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white text-[#820AD1] flex items-center justify-center font-bold text-xs shadow-xs">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-tight">Logos</span>
            <span className="text-[10px] text-purple-200 leading-none">Gestão de Igreja</span>
          </div>
        </Link>
        <span className="text-[11px] font-bold text-white bg-white/15 px-3 py-1 rounded-full border border-white/20 backdrop-blur-xs">
          Recepção & Boas-Vindas
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          {completed ? (
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#F7EEFD] text-[#820AD1] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.2} />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#820AD1] block">
                  Acolhimento Confirmado
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#191919] tracking-tight">
                  Seja muito bem-vindo(a), {name.split(' ')[0]}!
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
                  É uma honra ter você conosco em nosso culto. Nossa equipe pastoral já recebeu seus
                  dados com carinho para orar por você.
                </p>
              </div>

              <div className="p-4 bg-[#F8F9FB] rounded-2xl border border-gray-100 text-left text-xs space-y-2.5">
                <p className="font-bold text-[#191919]">Próximos passos acolhedores:</p>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
                  <span>Retire seu kit de boas-vindas no balcão da recepção</span>
                </div>
                <div className="flex items-center gap-2.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
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
                  className="text-xs h-10 px-5 rounded-full border-gray-200 text-gray-700 hover:text-[#820AD1] hover:bg-[#F7EEFD] font-bold active:scale-95 transition-all"
                >
                  Cadastrar outro visitante
                </Button>
                <Link to="/">
                  <Button className="w-full sm:w-auto bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-5 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all">
                    Ir para o Painel da Igreja
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Welcoming Top Card Banner */}
              <div className="text-center space-y-2 mb-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Você é nosso convidado especial
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Estamos felizes com a sua presença!
                </h1>
                <p className="text-xs sm:text-sm text-purple-200 leading-relaxed max-w-md mx-auto">
                  Preencha este breve cartão para que possamos orar por você e manter contato com a
                  nossa comunidade.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 border border-white/20">
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="v-name" className="font-semibold text-gray-700">
                      Seu Nome Completo *
                    </Label>
                    <Input
                      id="v-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Mariana Castro"
                      className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="v-phone" className="font-semibold text-gray-700">
                        WhatsApp com DDD
                      </Label>
                      <Input
                        id="v-phone"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="v-email" className="font-semibold text-gray-700">
                        E-mail (opcional)
                      </Label>
                      <Input
                        id="v-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mariana@exemplo.com"
                        className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="v-birth" className="font-semibold text-gray-700">
                        Data de Nascimento
                      </Label>
                      <Input
                        id="v-birth"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="v-how" className="font-semibold text-gray-700">
                        Como conheceu a igreja?
                      </Label>
                      <Select value={howMet} onValueChange={setHowMet}>
                        <SelectTrigger
                          id="v-how"
                          className="h-10 text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-2xl shadow-xl border-gray-100">
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
                    <Label htmlFor="v-prayer" className="font-semibold text-gray-700">
                      Podemos orar por algum motivo específico hoje?
                    </Label>
                    <Textarea
                      id="v-prayer"
                      rows={3}
                      value={prayerRequest}
                      onChange={(e) => setPrayerRequest(e.target.value)}
                      placeholder="Deixe aqui seu pedido de oração ou mensagem para a equipe pastoral..."
                      className="text-xs rounded-2xl bg-[#F0F1F5] border-transparent focus:bg-white focus:border-[#820AD1]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#820AD1]/25 cursor-pointer active:scale-95 transition-all"
                  >
                    {submitting ? 'Enviando...' : 'Confirmar Presença no Culto'}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6 text-center text-xs text-purple-200">
        Logos Gestão de Igreja &bull; Todos os direitos reservados
      </footer>
    </PageTransition>
  )
}
