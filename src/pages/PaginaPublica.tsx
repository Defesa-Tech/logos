import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Clock,
  Phone,
  Heart,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Calendar,
  LogIn,
} from 'lucide-react'
import { CHURCH_PROFILE } from '@/data/churchData'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/MotionKit'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export const PaginaPublica: React.FC = () => {
  const { user } = useAuth()
  const [copiedPix, setCopiedPix] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)
  const [showSecretaryModal, setShowSecretaryModal] = useState(false)

  const handleCopyPix = () => {
    navigator.clipboard.writeText(CHURCH_PROFILE.pixKey)
    setCopiedPix(true)
    toast({
      title: 'Chave PIX copiada!',
      description: CHURCH_PROFILE.pixKey,
    })
    setTimeout(() => setCopiedPix(false), 2500)
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#FBFBFD] text-[#14161D]">
        {/* =====================================================================
            HEADER PÚBLICO (Barra Superior com Logo e Botão de Acesso Membro)
            ===================================================================== */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E8EAF0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Logo da Igreja */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-[12px] bg-[#3A31CE] text-white flex items-center justify-center shadow-md shadow-[#3A31CE]/20 transition-transform group-hover:scale-105">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7.6 4.6 C10.4 4.2 11.6 6.2 12.6 8.9 L16.6 19.4"
                    stroke="#FFFFFF"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.9 10.6 L6.6 19.4"
                    stroke="#FFFFFF"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="font-heading font-bold text-sm md:text-base text-[#14161D] block leading-tight">
                  {CHURCH_PROFILE.name}
                </span>
                <span className="text-[11px] text-[#5A6072] block">{CHURCH_PROFILE.campus}</span>
              </div>
            </Link>

            {/* Links de Apoio / Entrar */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/quem-somos"
                className="hidden sm:inline-flex items-center text-xs font-bold text-[#5A6072] hover:text-[#3A31CE] px-3 py-2 transition-colors"
              >
                Quem somos
              </Link>

              {user ? (
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs md:text-sm font-bold shadow-xs transition-colors"
                >
                  <span>Acessar Painel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] bg-[#F2F1FB] hover:bg-[#DAD7F3] text-[#3A31CE] text-xs md:text-sm font-bold border border-[#DAD7F3] transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Área de Membros</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================================
            CORPO PRINCIPAL (Hero, Boas-vindas, Cultos, FAQ e Contato)
            ===================================================================== */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-14 space-y-10 md:space-y-14">
          {/* ===================================================================
              HERO DE BOAS-VINDAS (Fiel às telas 22_Celular e 23_Desktop)
              =================================================================== */}
          <section className="text-center space-y-4 md:space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2F1FB] border border-[#DAD7F3] text-[#3A31CE] text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bem-vindo à {CHURCH_PROFILE.shortName}</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#14161D] max-w-2xl mx-auto leading-tight">
              {CHURCH_PROFILE.heroHeadline}
            </h1>

            <p className="font-sans text-sm sm:text-base md:text-lg text-[#5A6072] max-w-xl mx-auto leading-relaxed">
              {CHURCH_PROFILE.heroDescription}
            </p>

            {/* CTAs Principais */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/visitar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[16px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-heading font-bold text-sm md:text-base shadow-md shadow-[#3A31CE]/25 transition-all transform active:scale-95"
              >
                <span>Sou visitante &bull; Quero me cadastrar</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#cultos"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-[16px] bg-white hover:bg-[#F2F1FB] border border-[#D9DCE6] text-[#14161D] font-heading font-bold text-sm md:text-base transition-colors"
              >
                <span>Ver horários dos cultos</span>
              </a>
            </div>
          </section>

          {/* ===================================================================
              CARD INSTITUCIONAL: QUEM SOMOS (Telas 22 e 23)
              =================================================================== */}
          <section className="bg-white border border-[#E8EAF0] rounded-[24px] p-6 md:p-8 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
                Quem somos
              </span>
              <Link
                to="/quem-somos"
                className="text-xs font-bold text-[#3A31CE] hover:underline inline-flex items-center gap-1"
              >
                <span>Nossa história & valores</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="font-sans text-sm md:text-base text-[#3C4255] leading-relaxed">
              {CHURCH_PROFILE.tagline} {CHURCH_PROFILE.doctrineBase}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#F0F1F5]">
              {CHURCH_PROFILE.pillars.map((p) => (
                <div key={p.number} className="pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#14161D]">
                    <div className="w-5 h-5 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center text-[10px]">
                      {p.number}
                    </div>
                    <span>{p.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===================================================================
              HORÁRIOS DOS CULTOS (Âncora #cultos)
              =================================================================== */}
          <section id="cultos" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183]">
                Cultos Semanais
              </span>
              <span className="text-xs text-[#5A6072] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3A31CE]" />
                <span>Cultos presenciais</span>
              </span>
            </div>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {CHURCH_PROFILE.services.map((svc, idx) => (
                <StaggerItem key={idx}>
                  <div className="h-full p-4 md:p-5 bg-white border border-[#E8EAF0] rounded-[20px] shadow-xs hover:border-[#DAD7F3] transition-all flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xs font-bold uppercase tracking-wider text-[#6B7183]">
                          {svc.dayOfWeekFull}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      </div>
                      <h3 className="font-heading font-bold text-sm md:text-base text-[#14161D] pt-1">
                        {svc.name}
                      </h3>
                      {svc.description && (
                        <p className="text-xs text-[#5A6072] leading-snug">{svc.description}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#F0F1F5]">
                      <span className="font-heading font-extrabold text-lg text-[#3A31CE]">
                        {svc.time}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          {/* ===================================================================
              PRIMEIRA VEZ NA IGREJA? (Dúvidas frequentes de visitantes)
              =================================================================== */}
          <section className="space-y-4">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183] block">
              Primeira vez conosco?
            </span>

            <div className="bg-white border border-[#E8EAF0] rounded-[24px] divide-y divide-[#F0F1F5] overflow-hidden shadow-xs">
              {CHURCH_PROFILE.firstVisitInfo.map((item, idx) => (
                <div key={idx} className="p-5 md:p-6 space-y-1">
                  <h4 className="font-heading font-bold text-sm md:text-base text-[#14161D]">
                    {item.question}
                  </h4>
                  <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===================================================================
              LOCALIZAÇÃO & CONTATO
              =================================================================== */}
          <section className="space-y-4">
            <span className="text-[11.5px] font-bold tracking-wider uppercase text-[#6B7183] block">
              Localização & Contato
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card de Localização */}
              <div className="p-5 md:p-6 bg-white border border-[#E8EAF0] rounded-[22px] shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-[12px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h4 className="font-heading font-bold text-base text-[#14161D]">
                    {CHURCH_PROFILE.campus}
                  </h4>
                  <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">
                    {CHURCH_PROFILE.fullAddress}
                  </p>
                </div>

                <a
                  href={CHURCH_PROFILE.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#F2F1FB] hover:bg-[#DAD7F3] text-[#3A31CE] font-bold text-xs transition-colors"
                >
                  <span>Abrir no Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Card de Secretaria & WhatsApp */}
              <div className="p-5 md:p-6 bg-white border border-[#E8EAF0] rounded-[22px] shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-[12px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h4 className="font-heading font-bold text-base text-[#14161D]">
                    Fale com a gente
                  </h4>
                  <p className="text-xs md:text-sm text-[#5A6072] leading-relaxed">
                    Atendimento de {CHURCH_PROFILE.secretariaHours}. Tire dúvidas ou peça oração.
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/55${CHURCH_PROFILE.secretariaWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs transition-colors"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowSecretaryModal(true)}
                    className="px-4 py-2.5 rounded-[14px] bg-[#F2F1FB] hover:bg-[#DAD7F3] text-[#3A31CE] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Mais contatos
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================================
              CONTRIBUIR (Chave PIX e dados de dízimos/ofertas)
              =================================================================== */}
          <section className="p-6 md:p-8 bg-[#F2F1FB] border border-[#DAD7F3] rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#3A31CE] text-xs font-bold border border-[#DAD7F3]">
                <Heart className="w-3.5 h-3.5" />
                <span>Generosidade & Dízimos</span>
              </div>
              <h3 className="font-heading text-lg md:text-2xl font-bold text-[#14161D]">
                Contribua com a missão
              </h3>
              <p className="text-xs md:text-sm text-[#5A6072] max-w-md">
                Sua contribuição voluntária sustenta nossos cultos, obras sociais e expansão do
                Reino.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={handleCopyPix}
                className="w-full sm:w-auto px-5 py-3 rounded-[14px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-4 h-4" /> Chave PIX copiada!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar Chave PIX
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPixModal(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-[14px] bg-white hover:bg-gray-100 text-[#14161D] border border-[#DAD7F3] font-bold text-xs md:text-sm transition-colors cursor-pointer"
              >
                Dados Bancários
              </button>
            </div>
          </section>
        </main>

        {/* =====================================================================
            FOOTER INSTITUCIONAL
            ===================================================================== */}
        <footer className="border-t border-[#E8EAF0] bg-white py-8 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="space-y-1">
              <p className="font-heading font-bold text-sm text-[#14161D]">{CHURCH_PROFILE.name}</p>
              <p className="text-xs text-[#5A6072]">
                {CHURCH_PROFILE.streetAndNumber} — {CHURCH_PROFILE.neighborhood},{' '}
                {CHURCH_PROFILE.cityState}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#5A6072]">
              <Link to="/visitar" className="hover:text-[#3A31CE] transition-colors">
                Cadastro de Visitantes
              </Link>
              <span>&bull;</span>
              <Link to="/quem-somos" className="hover:text-[#3A31CE] transition-colors">
                Quem Somos
              </Link>
              <span>&bull;</span>
              <Link to="/" className="hover:text-[#3A31CE] transition-colors">
                Área de Membros
              </Link>
            </div>
          </div>
        </footer>

        {/* Modal PIX */}
        {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-[24px] p-6 space-y-5 border border-[#E8EAF0] shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-[#14161D]">Contribuir</h3>
                    <p className="text-xs text-[#5A6072]">Dízimos e Ofertas</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPixModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[18px] space-y-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                  Chave PIX ({CHURCH_PROFILE.pixType})
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm md:text-base text-[#14161D] break-all">
                    {CHURCH_PROFILE.pixKey}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="flex-shrink-0 px-3 py-1.5 rounded-[12px] bg-[#3A31CE] hover:bg-[#2A23A6] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#6B7183] space-y-1">
                <p className="font-semibold text-[#14161D]">Transferência Bancária:</p>
                <p>{CHURCH_PROFILE.bankInfo}</p>
                <p className="text-[11px] text-[#5A6072]">Titular: {CHURCH_PROFILE.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowPixModal(false)}
                className="w-full py-3 bg-[#F2F1FB] hover:bg-[#e4e1f7] text-[#3A31CE] font-bold text-sm rounded-[14px] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Modal Secretaria */}
        {showSecretaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-[24px] p-6 space-y-5 border border-[#E8EAF0] shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center font-bold">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-[#14161D]">
                      Secretaria da Igreja
                    </h3>
                    <p className="text-xs text-[#5A6072]">{CHURCH_PROFILE.campus}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecretaryModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                    Horário de Atendimento
                  </span>
                  <p className="text-sm font-semibold text-[#14161D]">
                    {CHURCH_PROFILE.secretariaHours}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                    WhatsApp
                  </span>
                  <p className="text-sm font-semibold text-[#14161D]">
                    {CHURCH_PROFILE.secretariaWhatsapp}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FBFBFD] border border-[#E8EAF0] rounded-[16px] space-y-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B7183] block">
                    E-mail
                  </span>
                  <p className="text-sm font-semibold text-[#14161D]">
                    {CHURCH_PROFILE.secretariaEmail}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSecretaryModal(false)}
                className="w-full py-3 bg-[#F2F1FB] hover:bg-[#e4e1f7] text-[#3A31CE] font-bold text-sm rounded-[14px] transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default PaginaPublica
