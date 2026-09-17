import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Shield, Building2, Calendar, UserCheck } from 'lucide-react'
import { personsService } from '@/services/church'
import type { PersonRecord } from '@/types/church'
import { PageTransition } from '@/components/MotionKit'

export default function VerificarCarteirinha() {
  const { id } = useParams<{ id: string }>()
  const [person, setPerson] = useState<PersonRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      personsService
        .getById(id)
        .then(setPerson)
        .catch(() => setPerson(null))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id])

  const isMember = person?.stage === 'membro' || person?.status === 'member'
  const isDesligado = person?.stage === 'desligado'
  const isValid = isMember && !isDesligado

  return (
    <div className="min-h-screen bg-[#F0F1F5] flex items-center justify-center p-4">
      <PageTransition className="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 shadow-xl border border-gray-100 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#820AD1] text-white flex items-center justify-center font-black text-xl shadow-md">
            L
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
            Verificação Pública de Membresia &bull; J7
          </span>
          <h1 className="text-xl font-extrabold text-[#191919] mt-0.5">Igreja Defesa da Fé</h1>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400 py-8">Consultando dados da credencial...</p>
        ) : !person ? (
          <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center space-y-2">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-base font-bold text-red-700">Carteirinha Não Encontrada</h2>
            <p className="text-xs text-red-600">
              O código informado não corresponde a nenhum membro registrado.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* PUBLIC RESULT (Shows ONLY whether card is valid or invalid per spec) */}
            <div
              className={`p-6 rounded-3xl border flex flex-col items-center text-center space-y-2 ${
                isValid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {isValid ? (
                <>
                  <CheckCircle2 className="w-14 h-14 text-emerald-600 animate-bounce" />
                  <h2 className="text-lg font-extrabold text-emerald-900">
                    CARTEIRINHA DIGITAL VÁLIDA
                  </h2>
                  <p className="text-xs text-emerald-700 font-semibold">
                    Membro em plena comunhão na Igreja Defesa da Fé
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-14 h-14 text-red-600" />
                  <h2 className="text-lg font-extrabold text-red-900">
                    CARTEIRINHA DIGITAL INVÁLIDA
                  </h2>
                  <p className="text-xs text-red-700 font-semibold">
                    {isDesligado
                      ? 'Vínculo desligado / saída da membresia registrada (Regra R9)'
                      : 'Esta pessoa não se encontra com status de membro ativo'}
                  </p>
                </>
              )}
            </div>

            {/* Basic Public Details */}
            <div className="bg-[#F8F9FB] p-4 rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Nome do Portador:</span>
                <span className="font-bold text-[#191919]">{person.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Matrícula:</span>
                <span className="font-bold text-[#191919]">
                  {person.rol_number || person.provisional_number || 'MAT-0001'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-medium">Data de Ingresso:</span>
                <span className="font-bold text-[#191919]">
                  {person.ingress_date
                    ? new Date(person.ingress_date).toLocaleDateString('pt-BR')
                    : 'Registrada em ata'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-center">
          <Link
            to="/"
            className="text-xs font-bold text-[#820AD1] hover:underline flex items-center justify-center gap-1"
          >
            &larr; Voltar para o Logos Gestão
          </Link>
        </div>
      </PageTransition>
    </div>
  )
}
