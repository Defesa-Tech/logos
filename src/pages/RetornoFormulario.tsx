import React, { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  MapPin,
  Heart,
  Church,
  ArrowRight,
  ShieldCheck,
  Baby,
  Users,
  Compass,
  ChevronLeft,
} from 'lucide-react'
import { personsService } from '@/services/church'
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
  const [step, setStep] = useState<'identify' | 'etapa1' | 'etapa2' | 'success'>('identify')
  const [phone, setPhone] = useState('')
  const [matchedPerson, setMatchedPerson] = useState<PersonRecord | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Etapa 1: Dados Pessoais & Família (máximo 4 campos, tudo opcional exceto nome/fone)
  // Microcopy: "Para lembrarmos do seu aniversário e indicar programações para sua família"
  const [birthDate, setBirthDate] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [howMet, setHowMet] = useState('')
  const [hasChildren, setHasChildren] = useState(false)
  const [childrenInfo, setChildrenInfo] = useState('')

  // Etapa 2: Endereço & Caminho da Membresia / Batismo (máximo 4 campos)
  // Microcopy: "Para aproximar você da comunhão, células e caminho da membresia"
  const [address, setAddress] = useState('')
  const [interestInMembership, setInterestInMembership] = useState(false)
  const [hasBaptism, setHasBaptism] = useState(false)
  const [baptismDate, setBaptismDate] = useState('')
  const [baptismLocation, setBaptismLocation] = useState<'defesa_da_fe' | 'outra_igreja'>(
    'defesa_da_fe',
  )
  const [baptismChurchName, setBaptismChurchName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Identify person by phone (R3) & Pré-preenchimento
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
      // Pré-preenchimento com dados existentes para NUNCA re-perguntar o que já foi informado
      setBirthDate(found.birth_date ? found.birth_date.slice(0, 10) : '')
      setNeighborhood(found.neighborhood || '')
      setHowMet(found.how_met_details || found.how_found || found.how_met || '')
      setHasChildren(!!found.has_children)
      setChildrenInfo(found.children_info || '')

      setAddress(found.address || '')
      setInterestInMembership(!!found.interest_in_membership)
      setHasBaptism(!!found.baptism_date)
      setBaptismDate(found.baptism_date ? found.baptism_date.slice(0, 10) : '')
      setBaptismLocation(found.baptism_location || 'defesa_da_fe')
      setBaptismChurchName(found.baptism_church_name || '')

      setStep('etapa1')
    } catch {
      toast.error('Erro ao buscar cadastro.')
    } finally {
      setIsSearching(false)
    }
  }

  // Update cadastro existente sem criar senha (J4)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matchedPerson) return

    try {
      setIsSubmitting(true)
      await personsService.update(matchedPerson.id, {
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
        neighborhood: neighborhood.trim() || undefined,
        how_met_details: howMet.trim() || undefined,
        has_children: hasChildren,
        children_info: hasChildren && childrenInfo.trim() ? childrenInfo.trim() : undefined,
        address: address.trim() || undefined,
        interest_in_membership: interestInMembership,
        baptism_date: hasBaptism && baptismDate ? new Date(baptismDate).toISOString() : undefined,
        baptism_location: hasBaptism ? baptismLocation : undefined,
        baptism_church_name:
          hasBaptism && baptismLocation === 'outra_igreja' ? baptismChurchName.trim() : undefined,
        full_form_completed: true,
        full_form_date: new Date().toISOString(),
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
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-4">
      <PageTransition className="w-full max-w-lg bg-white rounded-[24px] p-6 sm:p-8 shadow-card border border-[#E8EAF0] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#3A31CE] text-white flex items-center justify-center font-black text-xl shadow-md mx-auto">
            L
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A31CE] block">
            Jornada J4 &bull; Coleta Progressiva
          </span>
          <h1 className="text-2xl font-extrabold text-[#14161D] font-heading">
            Conte Mais Sobre Você
          </h1>
          <p className="text-xs text-[#5A6072] max-w-sm mx-auto">
            Pedimos seus dados na proporção do seu vínculo conosco. Tudo é opcional e você pode
            completar em etapas curtas!
          </p>
        </div>

        {/* STEP 1: IDENTIFY BY PHONE */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-[#14161D]">
                Informe o seu WhatsApp cadastrado no culto
              </Label>
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="h-11 rounded-2xl bg-[#F8F9FB] border-[#E1E3EB] text-sm font-semibold text-[#14161D]"
              />
              <p className="text-[10px] text-[#6B7183]">
                Localizamos sua presença anterior para pré-preencher seus dados e nunca re-perguntar
                o que você já respondeu.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSearching}
              className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all"
            >
              {isSearching ? 'Localizando cadastro...' : 'Continuar &rarr;'}
            </Button>
          </form>
        )}

        {/* ETAPA 1 DE 2: ANIVERSÁRIO, BAIRRO E FAMÍLIA (Máx 4 campos) */}
        {step === 'etapa1' && matchedPerson && (
          <div className="space-y-5 text-xs">
            {/* Header com indicador de progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#3A31CE] text-xs">
                  Etapa 1 de 2: Você e Família
                </span>
                <span className="text-[10px] text-[#6B7183]">50% concluído</span>
              </div>
              <div className="w-full bg-[#F2F1FB] h-2 rounded-full overflow-hidden">
                <div className="bg-[#3A31CE] h-full w-1/2 rounded-full transition-all" />
              </div>
            </div>

            <div className="bg-[#F2F1FB] p-3.5 rounded-2xl border border-[#DAD7F3]">
              <p className="font-bold text-[#3A31CE] text-sm">Olá, {matchedPerson.name}!</p>
              <p className="text-[11px] text-[#3A31CE]/90 mt-0.5">
                Microcopy de propósito: Solicitamos estas informações para lembrarmos do seu
                aniversário e indicar programações para sua família.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep('etapa2')
              }}
              className="space-y-4"
            >
              {/* Campo 1: Data de nascimento */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-[#14161D]">Data de Nascimento</Label>
                  <span className="text-[10px] text-[#3A31CE]">Para comemorarmos seu dia</span>
                </div>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="h-10 rounded-2xl bg-[#F8F9FB] border-[#E1E3EB]"
                />
              </div>

              {/* Campo 2: Bairro */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-[#14161D]">Seu Bairro / Região</Label>
                  <span className="text-[10px] text-[#6B7183]">Para grupos próximos</span>
                </div>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Pinheiros, Vila Madalena..."
                  className="h-10 rounded-2xl bg-[#F8F9FB] border-[#E1E3EB]"
                />
              </div>

              {/* Campo 3: Como conheceu */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-[#14161D]">
                    Como conheceu a Defesa da Fé?
                  </Label>
                  <span className="text-[10px] text-[#6B7183]">Opcional</span>
                </div>
                <Input
                  value={howMet}
                  onChange={(e) => setHowMet(e.target.value)}
                  placeholder="Ex: Amigo, Instagram, convite da família..."
                  className="h-10 rounded-2xl bg-[#F8F9FB] border-[#E1E3EB]"
                />
              </div>

              {/* Campo 4: Filhos */}
              <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-[#E8EAF0] space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#14161D]">
                  <input
                    type="checkbox"
                    checked={hasChildren}
                    onChange={(e) => setHasChildren(e.target.checked)}
                    className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                  />
                  <span>Tenho filhos</span>
                </label>

                {hasChildren && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-semibold text-[#5A6072]">
                        Nomes e idades dos filhos
                      </Label>
                      <span className="text-[10px] text-[#3A31CE]">Para o Ministério Kids</span>
                    </div>
                    <Input
                      value={childrenInfo}
                      onChange={(e) => setChildrenInfo(e.target.value)}
                      placeholder="Ex: Mariana (6 anos) e Davi (9 anos)"
                      className="h-9 rounded-2xl bg-white border-[#E1E3EB]"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all"
              >
                Avançar para Etapa 2 &rarr;
              </Button>
            </form>
          </div>
        )}

        {/* ETAPA 2 DE 2: ENDEREÇO & CAMINHO DA MEMBRESIA (Máx 4 campos) */}
        {step === 'etapa2' && matchedPerson && (
          <div className="space-y-5 text-xs">
            {/* Indicador de progresso */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#3A31CE] text-xs">
                  Etapa 2 de 2: Comunhão &amp; Membresia
                </span>
                <span className="text-[10px] text-[#6B7183]">100%</span>
              </div>
              <div className="w-full bg-[#F2F1FB] h-2 rounded-full overflow-hidden">
                <div className="bg-[#3A31CE] h-full w-full rounded-full transition-all" />
              </div>
            </div>

            <div className="bg-[#F2F1FB] p-3.5 rounded-2xl border border-[#DAD7F3]">
              <p className="text-[11px] text-[#3A31CE]/90">
                Microcopy de propósito: Para aproximar você do caminho da membresia, grupos pequenos
                e comunhão bíblica.
              </p>
            </div>

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {/* Campo 1: Endereço */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-[#14161D]">Endereço Residencial</Label>
                  <span className="text-[10px] text-[#6B7183]">Opcional</span>
                </div>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número e complemento"
                  className="h-10 rounded-2xl bg-[#F8F9FB] border-[#E1E3EB]"
                />
              </div>

              {/* Campo 2: Interesse em membresia */}
              <div className="p-3 bg-[#F2F1FB] rounded-2xl border border-[#DAD7F3]">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#14161D]">
                  <input
                    type="checkbox"
                    checked={interestInMembership}
                    onChange={(e) => setInterestInMembership(e.target.checked)}
                    className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                  />
                  <span>Tenho interesse em ser membro da Defesa da Fé</span>
                </label>
              </div>

              {/* Campo 3 & 4: Batismo nas águas */}
              <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-[#E8EAF0] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#14161D]">
                  <input
                    type="checkbox"
                    checked={hasBaptism}
                    onChange={(e) => setHasBaptism(e.target.checked)}
                    className="rounded text-[#3A31CE] focus:ring-[#3A31CE]"
                  />
                  <span>Já sou batizado nas águas (em qualquer igreja evangélica)</span>
                </label>

                {hasBaptism && (
                  <div className="space-y-3 pt-2 border-t border-[#E8EAF0]">
                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Data do Batismo</Label>
                      <Input
                        type="date"
                        value={baptismDate}
                        onChange={(e) => setBaptismDate(e.target.value)}
                        className="h-9 rounded-2xl bg-white border-[#E1E3EB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="font-semibold text-[#14161D]">Onde foi batizado?</Label>
                      <Select
                        value={baptismLocation}
                        onValueChange={(val) =>
                          setBaptismLocation(val as 'defesa_da_fe' | 'outra_igreja')
                        }
                      >
                        <SelectTrigger className="h-9 rounded-2xl bg-white border-[#E1E3EB]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-2xl shadow-xl">
                          <SelectItem value="defesa_da_fe">Igreja Defesa da Fé</SelectItem>
                          <SelectItem value="outra_igreja">
                            Em outra denominação / igreja
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {baptismLocation === 'outra_igreja' && (
                      <div className="space-y-1">
                        <Label className="font-semibold text-[#14161D]">Nome da Igreja</Label>
                        <Input
                          value={baptismChurchName}
                          onChange={(e) => setBaptismChurchName(e.target.value)}
                          placeholder="Ex: Igreja Presbiteriana Central"
                          className="h-9 rounded-2xl bg-white border-[#E1E3EB]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('etapa1')}
                  className="rounded-full h-11 px-4 border-[#E1E3EB] text-[#5A6072] font-bold hover:bg-[#F2F1FB]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-11 rounded-full font-bold shadow-md shadow-[#3A31CE]/20 active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Salvando...' : 'Concluir Meu Cadastro'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-xl font-extrabold text-[#14161D] font-heading">
              Cadastro Atualizado!
            </h2>
            <p className="text-xs text-[#5A6072] max-w-xs mx-auto">
              Seus dados foram vinculados com sucesso à secretaria da Igreja Defesa da Fé. Deus
              abençoe sua caminhada conosco!
            </p>
            <Button
              onClick={() => (window.location.href = '/')}
              className="bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs h-10 px-6 rounded-full font-bold"
            >
              Acessar Página Inicial
            </Button>
          </div>
        )}
      </PageTransition>
    </div>
  )
}
