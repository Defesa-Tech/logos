import React, { useState, useEffect } from 'react'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { PageTransition } from '@/components/MotionKit'

export default function MeuCadastro() {
  const { user, currentPerson, refreshProfile, permissions } = useAuth()

  // For testing: allow switching persons if secretary/pastor
  const [allPersons, setAllPersons] = useState<PersonRecord[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')

  const [person, setPerson] = useState<PersonRecord | null>(currentPerson)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)

  // Phone change OTP confirmation modal (spec J8: troca de telefone exige código porque telefone identifica a pessoa R3)
  const [phoneCodeModalOpen, setPhoneCodeModalOpen] = useState(false)
  const [targetPhone, setTargetPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')

  useEffect(() => {
    if (permissions.canManageAssignments || permissions.isPastor) {
      personsService.list().then((list) => {
        setAllPersons(list)
        if (!selectedPersonId && list.length > 0) {
          setSelectedPersonId(currentPerson?.id || list[0].id)
        }
      })
    }
  }, [permissions, currentPerson])

  useEffect(() => {
    const active = allPersons.find((p) => p.id === selectedPersonId) || currentPerson || null
    setPerson(active)
    if (active) {
      setName(active.name || '')
      setPhone(active.phone || active.whatsapp || '')
      setAddress(active.address || '')
      setBirthDate(active.birth_date ? active.birth_date.slice(0, 10) : '')
    }
  }, [selectedPersonId, currentPerson, allPersons])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!person) return

    // If phone has changed, request confirmation code per J8!
    const oldPhone = (person.phone || person.whatsapp || '').replace(/\D/g, '')
    const newPhoneClean = phone.replace(/\D/g, '')

    if (newPhoneClean && oldPhone && newPhoneClean !== oldPhone) {
      // Trigger code confirmation
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(code)
      setTargetPhone(phone)
      setPhoneCodeModalOpen(true)
      toast.info(`Código de validação SMS/WhatsApp simulado: ${code}`)
      return
    }

    try {
      setLoading(true)
      await personsService.update(person.id, {
        name,
        address,
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      })
      toast.success('Seus dados cadastrais foram atualizados!')
      await refreshProfile()
    } catch {
      toast.error('Erro ao atualizar cadastro.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode !== generatedOtp) {
      toast.error('Código de confirmação incorreto! Tente novamente.')
      return
    }
    if (!person) return

    try {
      await personsService.update(person.id, {
        name,
        phone: targetPhone,
        whatsapp: targetPhone,
        address,
        birth_date: birthDate ? new Date(birthDate).toISOString() : undefined,
      })
      toast.success('Telefone confirmado e cadastro atualizado!')
      setPhoneCodeModalOpen(false)
      setOtpCode('')
      await refreshProfile()
    } catch {
      toast.error('Erro ao salvar novo telefone.')
    }
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#820AD1] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#820AD1]" />
            <span>Jornada J8</span>
            <span className="text-gray-300">/</span>
            <span>Autoatendimento Cadastral</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191919]">
            Meu Cadastro
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl font-normal">
            Atualize seus dados de contato e endereço. Dados oficiais (estágio, batismo e matrícula)
            são protegidos e gerenciados exclusivamente pela Secretaria.
          </p>
        </div>

        {/* Switch person tester for Secretaria/Pastor */}
        {(permissions.canManageAssignments || permissions.isPastor) && allPersons.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">
              Testar Autoatendimento Como:
            </Label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="text-xs font-bold rounded-2xl bg-white border border-gray-200 p-2 shadow-xs"
            >
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stage || p.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Official Status Banner (read-only per spec) */}
      <div className="bg-[#F7EEFD] border border-purple-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-black text-base shadow-sm">
            {person?.name ? person.name.slice(0, 2).toUpperCase() : 'ME'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#191919] text-base">{person?.name}</span>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#820AD1] text-white">
                {person?.stage || person?.status || 'Visitante'}
              </span>
            </div>
            <p className="text-xs text-[#820AD1] font-semibold mt-0.5">
              Matrícula:{' '}
              {person?.rol_number || person?.provisional_number || 'Sem matrícula oficial'} &bull;
              Vínculo: {person?.stage || 'Visitante'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-white/80 px-3 py-1.5 rounded-full border border-purple-100 self-start sm:self-auto">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          <span>Campos oficiais protegidos (Secretaria)</span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-5 text-xs"
      >
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-[#191919]">Dados Básicos Editáveis</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Você pode alterar nome, telefone (com confirmação por código), data de nascimento e
            endereço.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="font-semibold text-gray-700">Nome Completo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="font-semibold text-gray-700">
              Telefone / WhatsApp (Identificador da Pessoa - R3)
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
              className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-medium"
            />
            <p className="text-[10px] text-gray-400 pt-0.5">
              A alteração de telefone exigirá validação por código para manter a segurança do
              cadastro.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="font-semibold text-gray-700">Data de Nascimento</Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="font-semibold text-gray-700">Endereço Residencial Completo</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, complemento, bairro e cidade"
              className="h-10 rounded-2xl bg-[#F0F1F5] border-transparent font-medium"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 px-6 rounded-full font-bold shadow-md shadow-[#820AD1]/20 active:scale-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>

      {/* PHONE CHANGE CONFIRMATION OTP MODAL (J8 Exceção) */}
      <Dialog open={phoneCodeModalOpen} onOpenChange={setPhoneCodeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-gray-100">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-xl font-bold text-[#191919]">
              Confirmação de Novo Telefone (J8)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmPhoneChange} className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-[#820AD1] space-y-1">
              <span className="font-bold block">Segurança do Cadastro (Regra R3)</span>
              <span>
                Como o telefone é o identificador único de presença no culto, digite o código de 6
                dígitos enviado para <strong>{targetPhone}</strong>:
              </span>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-gray-700">Código de 6 Dígitos</Label>
              <Input
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Ex: 123456"
                className="h-11 rounded-2xl bg-[#F0F1F5] border-transparent text-center text-lg font-bold tracking-widest"
              />
              <p className="text-[10px] text-emerald-700 text-center font-semibold pt-1">
                (Simulação do MVP: utilize o código <strong>{generatedOtp}</strong>)
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#820AD1] hover:bg-[#7008B7] text-white text-xs h-10 rounded-full font-bold shadow-md shadow-[#820AD1]/20"
            >
              Validar Código e Alterar Telefone
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
