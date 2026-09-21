import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Megaphone, Bell, Info, Check, Filter } from 'lucide-react'
import { PageTransition } from '@/components/MotionKit'
import { useAuth } from '@/contexts/AuthContext'
import {
  churchNoticesService,
  ChurchNoticeItem,
  NoticePeriod,
  UserNoticePreferences,
} from '@/data/churchNotices'

export function Avisos() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<ChurchNoticeItem[]>(() => churchNoticesService.getAll())
  const [preferences, setPreferences] = useState<UserNoticePreferences>(() =>
    churchNoticesService.getPreferences(),
  )
  const [showPreferencesMobile, setShowPreferencesMobile] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)

  // Iniciais do usuário logado ou "AB" do design original
  const userInitials = useMemo(() => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return user.name.slice(0, 2).toUpperCase()
    }
    return 'AB'
  }, [user])

  const userName = user?.name || 'Ana Beatriz'

  // Contagem de não lidos
  const unreadCount = useMemo(() => notices.filter((n) => !n.read).length, [notices])

  // Marcar todos como lidos
  const handleMarkAllAsRead = () => {
    const updated = churchNoticesService.markAllAsRead()
    setNotices(updated)
  }

  // Marcar um como lido
  const handleMarkOne = (id: string) => {
    const updated = churchNoticesService.markAsRead(id)
    setNotices(updated)
  }

  // Alternar preferência
  const handleTogglePref = (key: keyof UserNoticePreferences) => {
    if (key === 'igreja') return // Avisos da igreja não podem ser desligados por completo
    const next = { ...preferences, [key]: !preferences[key] }
    churchNoticesService.savePreferences(next)
    setPreferences(next)
  }

  // Filtragem conforme preferências do usuário
  const visibleNotices = useMemo(() => {
    return notices.filter((item) => {
      if (item.category === 'escalas' && !preferences.escalas) return false
      if (item.category === 'departamento' && !preferences.departamento) return false
      if (item.category === 'cadastro' && !preferences.cadastro) return false
      // 'igreja' sempre visível
      return true
    })
  }, [notices, preferences])

  // Agrupamento por período: hoje, esta semana, anteriores
  const noticesHoje = useMemo(
    () => visibleNotices.filter((n) => n.period === 'hoje'),
    [visibleNotices],
  )
  const noticesEstaSemana = useMemo(
    () => visibleNotices.filter((n) => n.period === 'esta_semana'),
    [visibleNotices],
  )
  const noticesAnteriores = useMemo(
    () => visibleNotices.filter((n) => n.period === 'anteriores'),
    [visibleNotices],
  )

  // Renderizador de ícone temático fiel às telas 24 e 25
  const renderIcon = (item: ChurchNoticeItem) => {
    if (item.iconVariant === 'accent') {
      // Caixa branca com ícone roxo #3A31CE (ou caixa #F2F1FB quando card branco)
      return (
        <span className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 flex items-center justify-center rounded-[13px] md:rounded-[14px] bg-white text-[#3A31CE] shadow-xs">
          <Calendar className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
        </span>
      )
    }

    if (item.iconVariant === 'amber') {
      // Caixa âmbar #FDF3E2 com cor #8A5300 (megafone/comunicado)
      return (
        <span className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 flex items-center justify-center rounded-[13px] md:rounded-[14px] bg-[#FDF3E2] text-[#8A5300]">
          <Megaphone className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={1.75} />
        </span>
      )
    }

    // iconVariant === 'gray' (informação/cadastro)
    return (
      <span className="w-10 h-10 md:w-11 md:h-11 flex-shrink-0 flex items-center justify-center rounded-[13px] md:rounded-[14px] bg-[#F1F2F7] text-[#5A6072]">
        <Info className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={1.8} />
      </span>
    )
  }

  // Componente de card de aviso reutilizável
  const renderNoticeCard = (item: ChurchNoticeItem) => {
    const isUnread = !item.read

    return (
      <div
        key={item.id}
        onClick={() => !item.read && handleMarkOne(item.id)}
        className={`group transition-all ${
          isUnread
            ? 'p-4 md:p-5 bg-[#F2F1FB] border-[1.5px] border-[#DAD7F3] rounded-[18px] md:rounded-[20px]'
            : 'p-4 md:p-5 bg-white border-[1.5px] border-[#E8EAF0] hover:border-[#DAD7F3] rounded-[18px] md:rounded-[20px]'
        }`}
      >
        <div className="flex items-start gap-3.5 md:gap-4">
          {renderIcon(item)}

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-[15px] md:text-base font-bold text-[#14161D] leading-snug">
                {item.title}
              </h3>
              {isUnread && (
                <span
                  title="Aviso não lido"
                  className="w-2.5 h-2.5 rounded-full bg-[#3A31CE] flex-shrink-0 mt-1 shadow-xs ring-2 ring-white"
                />
              )}
            </div>

            <p className="font-sans text-xs md:text-[13.5px] text-[#5A6072] leading-relaxed">
              {item.description}
            </p>

            <span className="font-sans text-[11.5px] md:text-xs font-semibold text-[#8A90A2] mt-0.5">
              {item.timeAgo}
            </span>

            {/* Ação primária se houver (ex: Ver minha escala, Confirmar presença) */}
            {item.actionLabel && (
              <div className="pt-2 md:pt-2.5">
                {item.actionLink ? (
                  <Link
                    to={item.actionLink}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkOne(item.id)
                    }}
                    className="inline-flex items-center justify-center h-10 md:h-11 px-4 md:px-5 bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-xs md:text-sm font-bold rounded-[13px] md:rounded-[14px] shadow-sm shadow-[#3A31CE]/20 transition-all cursor-pointer active:scale-95"
                  >
                    {item.actionLabel}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkOne(item.id)
                    }}
                    className="inline-flex items-center justify-center h-10 md:h-11 px-4 md:px-5 bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-xs md:text-sm font-bold rounded-[13px] md:rounded-[14px] shadow-sm shadow-[#3A31CE]/20 transition-all cursor-pointer active:scale-95"
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Painel lateral "O que você recebe" (fiel ao Desktop e com gaveta/toggle no mobile)
  const renderPreferencesPanel = () => (
    <div className="flex flex-col gap-3">
      <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183]">
        O que você recebe
      </span>

      <div className="bg-white border-[1.5px] border-[#E8EAF0] rounded-[20px] divide-y divide-[#F0F1F5] overflow-hidden shadow-xs">
        {/* Item 1: Escalas e confirmações */}
        <label className="flex items-start gap-3 p-4 hover:bg-[#FBFBFD] transition-colors cursor-pointer select-none">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="font-sans text-sm font-bold text-[#14161D] leading-tight">
              Escalas e confirmações
            </span>
            <span className="font-sans text-xs text-[#5A6072] leading-relaxed">
              Quando você é escalada ou precisa confirmar presença.
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.escalas}
            onChange={() => handleTogglePref('escalas')}
            className="w-5 h-5 rounded-[6px] text-[#3A31CE] accent-[#3A31CE] cursor-pointer mt-0.5"
            aria-label="Escalas e confirmações"
          />
        </label>

        {/* Item 2: Avisos da igreja (obrigatório / fixo) */}
        <div className="flex items-start gap-3 p-4 bg-[#FBFBFD]/60 select-none">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-sm font-bold text-[#14161D] leading-tight">
                Avisos da igreja
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                Fixo
              </span>
            </div>
            <span className="font-sans text-xs text-[#5A6072] leading-relaxed">
              Comunicados da secretaria e da liderança.
            </span>
          </div>
          <input
            type="checkbox"
            checked={true}
            disabled
            className="w-5 h-5 rounded-[6px] accent-[#3A31CE] opacity-80 cursor-not-allowed mt-0.5"
            aria-label="Avisos da igreja (obrigatório)"
          />
        </div>

        {/* Item 3: Atividades do meu departamento */}
        <label className="flex items-start gap-3 p-4 hover:bg-[#FBFBFD] transition-colors cursor-pointer select-none">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="font-sans text-sm font-bold text-[#14161D] leading-tight">
              Atividades do meu departamento
            </span>
            <span className="font-sans text-xs text-[#5A6072] leading-relaxed">
              Ensaios, treinamentos e mudanças de horário.
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.departamento}
            onChange={() => handleTogglePref('departamento')}
            className="w-5 h-5 rounded-[6px] text-[#3A31CE] accent-[#3A31CE] cursor-pointer mt-0.5"
            aria-label="Atividades do meu departamento"
          />
        </label>

        {/* Item 4: Mudanças no meu cadastro */}
        <label className="flex items-start gap-3 p-4 hover:bg-[#FBFBFD] transition-colors cursor-pointer select-none">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="font-sans text-sm font-bold text-[#14161D] leading-tight">
              Mudanças no meu cadastro
            </span>
            <span className="font-sans text-xs text-[#5A6072] leading-relaxed">
              Registro de alterações nos seus dados.
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.cadastro}
            onChange={() => handleTogglePref('cadastro')}
            className="w-5 h-5 rounded-[6px] text-[#3A31CE] accent-[#3A31CE] cursor-pointer mt-0.5"
            aria-label="Mudanças no meu cadastro"
          />
        </label>
      </div>

      <p className="font-sans text-xs text-[#5A6072] leading-relaxed px-1">
        Avisos da igreja não podem ser desligados por completo — a liderança precisa conseguir falar
        com a congregação.
      </p>
    </div>
  )

  return (
    <PageTransition className="max-w-6xl mx-auto space-y-6 md:space-y-8">
      {/* =========================================================================
          CABEÇALHO DA PÁGINA (Fiel a Celular Tela 24 e Desktop Tela 25)
          Título "Avisos" em Sora + contagem de não lidos + Marcar todos como lidos + Avatar
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EAF0]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl md:text-[30px] font-semibold tracking-[-0.025em] text-[#14161D] leading-tight">
              Avisos
            </h1>
            {unreadCount > 0 ? (
              <span className="font-sans text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                {unreadCount} {unreadCount === 1 ? 'não lido' : 'não lidos'}
              </span>
            ) : (
              <span className="font-sans text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                <Check className="w-3 h-3" /> Todos lidos
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-[13.5px]">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="font-bold text-[#3A31CE] hover:text-[#2A23A6] hover:underline cursor-pointer transition-colors"
              >
                Marcar todos como lidos
              </button>
            )}
            <span className="hidden sm:inline text-gray-300">&bull;</span>
            <span className="text-[#5A6072] hidden sm:inline">
              Mural informativo e comunicados oficiais da congregação
            </span>
          </div>
        </div>

        {/* Perfil Pill (Desktop & Mobile) + Botão de Preferências no mobile */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Botão de preferências apenas no celular */}
          <button
            type="button"
            onClick={() => setShowPreferencesMobile(!showPreferencesMobile)}
            className="md:hidden flex items-center gap-1.5 h-10 px-3 rounded-full bg-white border border-[#E1E3EB] text-xs font-bold text-[#5A6072] hover:text-[#3A31CE] hover:border-[#DAD7F3] transition-all cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>

          <Link
            to="/meu-cadastro"
            className="flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-white border-[1.5px] border-[#E1E3EB] hover:border-[#3A31CE] text-[#14161D] transition-all group"
            title="Ver meu perfil"
          >
            <span className="w-8 h-8 rounded-full bg-[#F2F1FB] border border-[#DAD7F3] flex items-center justify-center font-heading text-xs font-bold text-[#3A31CE] group-hover:scale-105 transition-transform">
              {userInitials}
            </span>
            <span className="font-sans text-xs sm:text-[13.5px] font-bold truncate max-w-[140px]">
              {userName}
            </span>
          </Link>
        </div>
      </div>

      {/* Painel colapsável de preferências no mobile se aberto */}
      {showPreferencesMobile && (
        <div className="md:hidden p-4 bg-[#FBFBFD] border-[1.5px] border-[#DAD7F3] rounded-[20px] shadow-sm animate-in fade-in duration-200">
          {renderPreferencesPanel()}
        </div>
      )}

      {/* =========================================================================
          CONTEÚDO PRINCIPAL (Layout 2 Colunas no Desktop / 1 Coluna no Celular)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Principal: Lista de Avisos agrupados por Período */}
        <div className="lg:col-span-8 space-y-7">
          {/* GRUPO 1: HOJE */}
          {noticesHoje.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183] block">
                Hoje
              </span>
              <div className="space-y-3">{noticesHoje.map(renderNoticeCard)}</div>
            </div>
          )}

          {/* GRUPO 2: ESTA SEMANA */}
          {noticesEstaSemana.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183] block">
                Esta semana
              </span>
              <div className="space-y-3">{noticesEstaSemana.map(renderNoticeCard)}</div>
            </div>
          )}

          {/* GRUPO 3: ANTERIORES */}
          {(showAllPast || noticesAnteriores.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#6B7183] block">
                  Antes
                </span>
                {!showAllPast && (
                  <button
                    type="button"
                    onClick={() => setShowAllPast(true)}
                    className="text-xs font-bold text-[#3A31CE] hover:underline cursor-pointer"
                  >
                    Ver avisos anteriores
                  </button>
                )}
              </div>
              <div className="space-y-3">{noticesAnteriores.map(renderNoticeCard)}</div>
            </div>
          )}

          {/* ESTADO VAZIO */}
          {visibleNotices.length === 0 && (
            <div className="p-8 sm:p-12 text-center bg-white border-[1.5px] border-[#E8EAF0] rounded-[22px] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#14161D]">
                Nenhum aviso no momento
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#5A6072] max-w-md mx-auto">
                Você está em dia com todas as novidades, escalas e comunicados da igreja.
              </p>
            </div>
          )}

          {/* Link de rodapé para avisos anteriores (fiel ao Desktop) */}
          {!showAllPast && noticesAnteriores.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAllPast(true)}
                className="font-sans text-sm font-bold text-[#3A31CE] hover:text-[#2A23A6] hover:underline cursor-pointer"
              >
                Ver avisos anteriores &darr;
              </button>
            </div>
          )}
        </div>

        {/* Coluna Lateral Desktop: "O que você recebe" (fiel à Tela 25 Desktop) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24">
          {renderPreferencesPanel()}
        </aside>
      </div>
    </PageTransition>
  )
}

export default Avisos
