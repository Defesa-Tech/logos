import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Heart,
  Church,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { personsService, churchSettingsService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
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
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function RetornoFormulario() {
  const [step, setStep] = useState<'identify' | 'form' | 'success'>('identify')
  const [phone, setPhone] = useState('')
  const [matchedPerson, setMatchedPerson] = useState<PersonRecord | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Form Fields
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [hasBaptism, setHasBaptism] = useState(false)
  const [baptismDate, setBaptismDate] = useState('')
  const [baptismLocation, setBaptismLocation] = useState<'defesa_da_fe' | 'outra_igreja'>(
    'defesa_da_fe',
  )
  const [baptismChurchName, setBaptismChurchName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Identify person by phone (R3)
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    try {
      setIsSearching(true)
      const found = await personsService.findByPhone(phone)
      if (!found) {
        toast.error('Telefone não encontrado. Verifique o número digitado ou procure a recepção.')
        return
      }

      setMatchedPerson(found)
      setBirthDate(found.birth_date ? found.birth_date.slice(0, 10) : '')
      setAddress(found.address || '')
      setHasBaptism(!!found.baptism_date)
      setBaptismDate(found.baptism_date ? found.baptism_date.slice(0, 10) : '')
      setBaptismLocation(found.baptism_location || 'defesa_da_fe')
      setBaptismChurchName(found.baptism_church_name || '')
      setStep('form')
    } catch {
      toast.error('Erro ao buscar cadastro.')
    } finally {
      setIsSearching(false)
    }
  }

  // Update cadastro existente sem criar senha (J4)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matchedPerson) return

    try {
      setIsSubmitting(true)
      await personsService.update(matchedPerson.id, {
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
        address: address.trim() || undefined,
        baptism_date: hasBaptism && baptismDate ? new Date(baptismDate).toISOString() : undefined,
        baptism_location: hasBaptism ? baptismLocation : undefined,
        baptism_church_name:
          hasBaptism && baptismLocation === 'outra_igreja' ? baptismChurchName.trim() : undefined,
      })

      toast.success('Cadastro completado com sucesso!')
      setStep('success')
    } catch {
      toast.error('Erro ao atualizar dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F1F5] flex items-center justify-center p-4">
      <PageTransition className="w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-xl border border-gray-100 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-black text-xl shadow-md mx-auto">
            L
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#820AD1] block">
            Jornada J4 &bull; Retorno ao Culto
          </span>
          <h1 className="text-2xl font-extrabold text-[#191919]">Complete Seu Cadastro</h1>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            É uma alegria ter você conosco novamente na Igreja Defesa da Fé! Complete seus dados sem
            precisar criar senha.
          </p>
        </div>

        {/* STEP 1: IDENTIFY BY PHONE */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">
                Informe o seu Telefone / WhatsApp cadastrado no culto
              </Label>
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="h-11 rounded-2xl bg-[#F0F1F5] border-transparent text-sm font-semibold"
              />
              <p className="text-[10px] text-gray-400">
                Utilizamos seu telefone para localizar sua presença anterior sem duplicar o
                cadastro.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSearching}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
            >
              {isSearching ? 'Localizando...' : 'Continuar &rarr;'}
            </Button>
          </form>
        )}

        {/* STEP 2: COMPLETE DATA */}
        {step === 'form' && matchedPerson && (
          <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
            <div className="bg-[#F7EEFD] p-3.5 rounded-2xl border border-purple-200">
              <p className="font-bold text-[#820AD1] text-sm">Olá, {matchedPerson.name}!</p>
              <p className="text-[11px] text-[#820AD1]/80 mt-0.5">
                Localizamos sua visita anterior. Por favor, complete os campos abaixo:
              </p>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Data de Nascimento</Label>
              <Input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Endereço Residencial</Label>
              <Input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro e cidade"
                className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent"
              />
            </div>

            {/* Baptism Details */}
            <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-gray-100 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBaptism}
                  onChange={(e) => setHasBaptism(e.target.checked)}
                  className="rounded text-[#820AD1] focus:ring-[#820AD1]"
                />
                <span className="font-semibold text-gray-800">
                  Já fui batizado nas águas (em qualquer igreja evangélica)
                </span>
              </label>

              {hasBaptism && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="space-y-1">
                    <Label className="font-semibold text-gray-700">Data do Batismo</Label>
                    <Input
                      type="date"
                      value={baptismDate}
                      onChange={(e) => setBaptismDate(e.target.value)}
                      className="h-9 rounded-2xl bg-white border-gray-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="font-semibold text-gray-700">Onde foi batizado?</Label>
                    <Select
                      value={baptismLocation}
                      onValueChange={(val) =>
                        setBaptismLocation(val as 'defesa_da_fe' | 'outra_igreja')
                      }
                    >
                      <SelectTrigger className="h-9 rounded-2xl bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-2xl shadow-xl">
                        <SelectItem value="defesa_da_fe">Igreja Defesa da Fé</SelectItem>
                        <SelectItem value="outra_igreja">Em outra denominação / igreja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {baptismLocation === 'outra_igreja' && (
                    <div className="space-y-1">
                      <Label className="font-semibold text-gray-700">Nome da Igreja</Label>
                      <Input
                        value={baptismChurchName}
                        onChange={(e) => setBaptismChurchName(e.target.value)}
                        placeholder="Ex: Igreja Presbiteriana de Curitiba"
                        className="h-9 rounded-2xl bg-white border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Salvando...' : 'Atualizar Meu Cadastro'}
            </Button>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-xl font-extrabold text-[#191919]">Cadastro Atualizado!</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Seus dados foram vinculados com sucesso à secretaria da Igreja Defesa da Fé. Deus
              abençoe sua caminhada conosco!
            </p>
            <Button
              onClick={() => (window.location.href = '/')}
              className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-6 rounded-full font-bold"
            >
              Acessar Página Inicial
            </Button>
          </div>
        )}
      </PageTransition>
    </div>
  )
}
