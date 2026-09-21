import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Eye,
  CheckCircle2,
  Users,
  Shield,
  Heart,
  Sparkles,
} from 'lucide-react'
import { CHURCH_PROFILE } from '@/data/churchData'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/MotionKit'
import { personsService } from '@/services/church'
import { PersonRecord } from '@/types/church'

export const QuemSomos: React.FC = () => {
  const [pastors, setPastors] = useState<PersonRecord[]>([])

  useEffect(() => {
    let isMounted = true
    const loadLeadership = async () => {
      try {
        const leaders = await personsService.list("status = 'pastor' || status = 'leader'")
        if (isMounted && leaders.length > 0) {
          setPastors(leaders.slice(0, 4))
        }
      } catch (err) {
        console.error('Erro ao carregar liderança:', err)
      }
    }
    loadLeadership()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <PageTransition>
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6 md:space-y-8">
        {/* =====================================================================
            BARRA DE RETORNO & TÍTULO (Fiel à Tela 21_Igreja_Quem_somos.html)
            ===================================================================== */}
        <div className="flex items-center gap-3.5">
          <Link
            to="/igreja"
            aria-label="Voltar para Igreja"
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-white hover:bg-[#F2F1FB] border border-[#E1E3EB] hover:border-[#DAD7F3] rounded-[14px] text-[#3C4255] hover:text-[#3A31CE] transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="font-heading text-xl md:text-3xl font-bold tracking-tight text-[#14161D]">
              Quem somos
            </h1>
            <p className="text-xs text-[#5A6072]">
              {CHURCH_PROFILE.name} &bull; {CHURCH_PROFILE.campus}
            </p>
          </div>
        </div>

        {/* =====================================================================
            1. NOSSA BASE (Doutrina e Identidade da Defesa da Fé)
            ===================================================================== */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#3A31CE]" />
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
              Nossa base
            </span>
          </div>
          <div className="p-5 md:p-6 bg-white border border-[#E8EAF0] rounded-[22px] shadow-xs">
            <p className="font-sans text-sm md:text-base text-[#3C4255] leading-relaxed">
              {CHURCH_PROFILE.doctrineBase}
            </p>
          </div>
        </div>

        {/* =====================================================================
            2. NOSSA VISÃO (Destaque em Indigo Tint #F2F1FB)
            ===================================================================== */}
        <div className="p-5 md:p-6 bg-[#F2F1FB] border border-[#DAD7F3] rounded-[22px] space-y-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#3A31CE]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A31CE]">
              Nossa visão
            </span>
          </div>
          <h2 className="font-heading text-lg md:text-2xl font-bold text-[#14161D] leading-snug">
            &ldquo;{CHURCH_PROFILE.vision}&rdquo;
          </h2>
          <p className="text-xs text-[#5A6072] leading-relaxed pt-1">
            {CHURCH_PROFILE.heroDescription}
          </p>
        </div>

        {/* =====================================================================
            3. NOSSOS PILARES (Numeração em Indigo #3A31CE e cards estruturados)
            ===================================================================== */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#3A31CE]" />
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
              Nossos pilares
            </span>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CHURCH_PROFILE.pillars.map((pilar) => (
              <StaggerItem key={pilar.number}>
                <div className="h-full flex flex-col gap-3 p-5 bg-white border border-[#E8EAF0] rounded-[20px] shadow-xs hover:border-[#DAD7F3] transition-all">
                  <div className="w-9 h-9 rounded-[12px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-heading font-bold text-sm">
                    {pilar.number}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-[#14161D]">
                      {pilar.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">
                      {pilar.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* =====================================================================
            4. QUEM CONDUZ (Liderança Pastoral de Referência)
            ===================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3A31CE]" />
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
              Quem conduz
            </span>
          </div>

          <div className="bg-white border border-[#E8EAF0] rounded-[22px] divide-y divide-[#F0F1F5] overflow-hidden shadow-xs">
            {pastors.length > 0
              ? pastors.map((leader) => {
                  const initials = leader.name
                    ? leader.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                    : 'LD'

                  const isPres = leader.status === 'pastor'
                  const roleLabel = isPres
                    ? 'Pastor Presidente'
                    : leader.stage === 'membro'
                      ? 'Líder Ministerial'
                      : 'Liderança'

                  return (
                    <div
                      key={leader.id}
                      className="flex items-center gap-3.5 p-4 md:px-5 hover:bg-[#FBFBFD] transition-colors"
                    >
                      <div className="w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-[14px] bg-[#F1F2F7] border border-[#E1E3EB] text-[#3A31CE] flex items-center justify-center font-heading font-bold text-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-heading font-bold text-sm md:text-base text-[#14161D] block truncate">
                          {leader.name}
                        </span>
                        <span className="text-xs text-[#5A6072] block">{roleLabel}</span>
                      </div>
                      {isPres && (
                        <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                          Pastoral
                        </span>
                      )}
                    </div>
                  )
                })
              : // Fallback para as constantes pré-definidas
                CHURCH_PROFILE.leaders.map((leader, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-4 md:px-5 hover:bg-[#FBFBFD] transition-colors"
                  >
                    <div className="w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-[14px] bg-[#F1F2F7] border border-[#E1E3EB] text-[#3A31CE] flex items-center justify-center font-heading font-bold text-sm">
                      {leader.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-heading font-bold text-sm md:text-base text-[#14161D] block truncate">
                        {leader.name}
                      </span>
                      <span className="text-xs text-[#5A6072] block">{leader.role}</span>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* =====================================================================
            5. BOTÃO / CTA PÁGINA PÚBLICA (Fiel ao rodapé da tela 21)
            ===================================================================== */}
        <div className="pt-4">
          <Link
            to="/publica"
            className="w-full h-12 md:h-14 flex items-center justify-center gap-2.5 bg-white hover:bg-[#F2F1FB] border border-[#D9DCE6] hover:border-[#DAD7F3] rounded-[16px] font-heading font-bold text-sm md:text-base text-[#3A31CE] transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ver a página pública da igreja</span>
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}

export default QuemSomos
