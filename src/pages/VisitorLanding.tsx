import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass,
  Heart,
  CheckCircle2,
  Calendar,
  Send,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  QrCode,
  MapPin,
  Clock,
  Instagram,
  Youtube,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { personsService } from '@/services/church'
import { toast } from 'sonner'

export default function VisitorLanding() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [howMet, setHowMet] = useState('QR Code no Culto')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Por favor, informe seu nome completo.')
      return
    }

    try {
      setLoading(true)
      await personsService.create({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        birth_date: birthDate || undefined,
        email: email.trim() || undefined,
        how_met: howMet,
        status: 'visitor',
      })
      setSubmitted(true)
      toast.success('Que alegria ter você conosco! Seu cadastro foi recebido.')
    } catch {
      toast.error('Ocorreu um erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Thank You Page (Pós-Envio)
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between items-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in my-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-lg">
            <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-bold">
              Cadastro Confirmado
            </span>
            <h1 className="text-3xl font-serif-sacred font-bold text-[#2C3E50]">
              Seja Bem-vindo(a) à Família Logos, {name.split(' ')[0]}!
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              É uma honra receber você. Nossa equipe pastoral já foi notificada e estamos muito
              felizes por conectar com você e sua família.
            </p>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white text-left p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-[#D4AF37] mt-0.5">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Nosso Próximo Encontro</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Culto de Celebração &bull; Domingo às 10h e às 18h.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-medium text-slate-500">Conecte-se com a gente nas redes:</p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-4 h-4" />
                <span>Instagram</span>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                <Youtube className="w-4 h-4" />
                <span>YouTube</span>
              </a>
              <a
                href="https://wa.me"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="pt-6">
            <Link to="/">
              <Button variant="ghost" className="text-xs text-[#2C3E50] hover:text-[#D4AF37]">
                Acessar Portal Logos
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-400">
          Logos Gestão de Igreja &bull; Todos os direitos reservados.
        </footer>
      </div>
    )
  }

  // Registration Landing Form
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#2C3E50] shadow-sm">
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-serif-sacred text-xl font-bold text-[#2C3E50]">Logos</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <QrCode className="w-4 h-4 text-[#D4AF37]" />
          <span>Cadastro de Visitante</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Hero Card */}
        <div className="md:col-span-5 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Seja Muito Bem-vindo(a)
          </div>

          <h1 className="text-3xl md:text-4xl font-serif-sacred font-bold text-[#2C3E50] leading-tight">
            Uma igreja feita de lares, amor e comunhão.
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed">
            Estamos felizes em ter você aqui conosco hoje! Preencha seus dados rápidos para que
            possamos orar por você, enviar uma mensagem de boas-vindas e manter contato.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-2.5 justify-center md:justify-start">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              <span>Av. Central, 1000 &bull; Sede Logos</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center md:justify-start">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>Cultos de Domingo às 10h e 18h</span>
            </div>
          </div>

          {/* Picture banner */}
          <div className="relative rounded-2xl overflow-hidden shadow-md hidden sm:block">
            <img
              src="https://img.usecurling.com/p/600/340?q=church%20community"
              alt="Comunidade acolhedora"
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2C3E50]/80 via-transparent to-transparent flex items-end p-4">
              <p className="text-xs text-white font-medium">
                Acolhimento com excelência e propósito bíblico.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-7">
          <Card className="border-slate-200 shadow-xl bg-white rounded-2xl">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-serif-sacred font-bold text-[#2C3E50]">
                  Cartão de Boas-Vindas
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Leva menos de 1 minuto. Seus dados são confidenciais e tratados com carinho pela
                  pastoral.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="v-name" className="text-xs font-semibold text-slate-700">
                    Nome Completo *
                  </Label>
                  <Input
                    id="v-name"
                    required
                    placeholder="Ex: João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-whatsapp" className="text-xs font-semibold text-slate-700">
                      WhatsApp com DDD
                    </Label>
                    <Input
                      id="v-whatsapp"
                      placeholder="(11) 98765-4321"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="text-xs h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-birth" className="text-xs font-semibold text-slate-700">
                      Data de Nascimento
                    </Label>
                    <Input
                      id="v-birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-email" className="text-xs font-semibold text-slate-700">
                    E-mail (opcional)
                  </Label>
                  <Input
                    id="v-email"
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="v-how" className="text-xs font-semibold text-slate-700">
                    Como você conheceu a Igreja?
                  </Label>
                  <Select value={howMet} onValueChange={setHowMet}>
                    <SelectTrigger id="v-how" className="text-xs h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="QR Code no Culto">QR Code no Culto de Domingo</SelectItem>
                      <SelectItem value="Convite de Familiar / Amigo">
                        Convite de Amigo ou Familiar
                      </SelectItem>
                      <SelectItem value="Instagram / Redes Sociais">
                        Instagram / Redes Sociais
                      </SelectItem>
                      <SelectItem value="Passei em frente à Igreja">
                        Passei em frente à Igreja
                      </SelectItem>
                      <SelectItem value="Outro canal">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2C3E50] hover:bg-[#1E2B37] text-white font-semibold text-xs h-11 rounded-xl shadow-md transition-transform active:scale-[0.99]"
                >
                  {loading ? (
                    'Enviando cadastro...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Cartão de Visitante
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Logos &bull; Sistema de Gestão de Igreja &bull; Todos os direitos reservados.
      </footer>
    </div>
  )
}
