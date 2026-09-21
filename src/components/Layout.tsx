import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Home as HomeIcon,
  GitFork,
  Mail,
  Search,
  Bell,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronRight,
  QrCode,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Calendar,
  HeartHandshake,
  UserCheck,
  Briefcase,
  CreditCard,
  User,
  AlertTriangle,
  Church,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
import { LoginDialog } from '@/components/LoginDialog'
import { toast } from 'sonner'
import type { PersonRecord, ActivityRecord, UserRole } from '@/types/church'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRealtime } from '@/hooks/use-realtime'

export default function Layout() {
  const { user, role, logout, canAccessAll, setIsLoginModalOpen, permissions } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Você encerrou a sessão com sucesso.')
    navigate('/')
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PersonRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Realtime subscription for activities
  useRealtime<ActivityRecord>('activities', (data) => {
    if (data.action === 'create') {
      setActivities((prev) => [data.record, ...prev])
    }
  })

  useEffect(() => {
    activitiesService
      .list(10)
      .then((res) => {
        setActivities(res.items)
      })
      .catch(() => {})
  }, [])

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await personsService.list(`name ~ "${searchQuery.trim()}"`)
        setSearchResults(results.slice(0, 5))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 180)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const navItems = [
    { label: 'Início', fullLabel: 'Visão Geral', path: '/', icon: LayoutDashboard },
    // Grupo 4: Igreja & Institucional
    { label: 'Igreja', fullLabel: 'Igreja & Departamentos', path: '/igreja', icon: Church },
    // Grupo 3: Agenda & Escalas
    { label: 'Agenda', fullLabel: 'Agenda & Escalas', path: '/agenda', icon: Calendar },
    // J1/J2 Cultos & Presença
    { label: 'Cultos', fullLabel: 'Cultos & Presenças (J1/J2)', path: '/cultos', icon: Calendar },
    // J3 Follow-up
    {
      label: 'Follow-up',
      fullLabel: 'Follow-up de Visitantes (J3)',
      path: '/follow-up',
      icon: HeartHandshake,
    },
    // J5 Frequentadores
    {
      label: 'Frequentador',
      fullLabel: 'Virada Frequentador (J5)',
      path: '/frequentadores',
      icon: GitFork,
    },
    // J6 Ingresso de Membro (Secretaria)
    ...(permissions.canChangeStage
      ? [
          {
            label: 'Ingresso',
            fullLabel: 'Ingresso de Membro (J6)',
            path: '/ingresso-membro',
            icon: UserCheck,
          },
        ]
      : []),
    // J9 Atuações & Saída
    ...(permissions.canManageAssignments
      ? [
          {
            label: 'Atuações',
            fullLabel: 'Departamentos & Atuações (J9)',
            path: '/departamentos',
            icon: Briefcase,
          },
        ]
      : []),
    // Jornada Quero Servir (Feature 2)
    {
      label: 'Quero Servir',
      fullLabel: 'Quero Servir (Jornada Voluntariado)',
      path: '/quero-servir',
      icon: HeartHandshake,
    },
    // Cursos & Turmas C1 (Feature 3)
    ...(permissions.isSecretaria || permissions.canManageAssignments
      ? [
          {
            label: 'Cursos',
            fullLabel: 'Cursos & Turmas C1',
            path: '/cursos',
            icon: Calendar,
          },
        ]
      : []),
    // J7 Carteirinha Digital
    {
      label: 'Carteirinha',
      fullLabel: 'Carteirinha Digital (J7)',
      path: '/carteirinha',
      icon: CreditCard,
    },
    // J8 Meu Perfil / Cadastro
    { label: 'Meu Perfil', fullLabel: 'Meu Perfil (J8)', path: '/meu-cadastro', icon: User },
    // R10 Atenção por ausência
    ...(permissions.canViewAll || permissions.isBoasVindasLider
      ? [
          {
            label: 'Atenção R10',
            fullLabel: 'Atenção por Ausência (R10)',
            path: '/atencao-ausencia',
            icon: AlertTriangle,
          },
        ]
      : []),
    // General Base
    { label: 'Pessoas', fullLabel: 'Base Geral de Pessoas', path: '/pessoas', icon: Users },
    { label: 'Famílias', fullLabel: 'Núcleos Familiares', path: '/familias', icon: HomeIcon },
    ...(canAccessAll
      ? [
          {
            label: 'Secretaria',
            fullLabel: 'Secretaria & Convites',
            path: '/secretaria',
            icon: Mail,
          },
        ]
      : []),
  ]

  const roleMeta: Record<
    UserRole,
    { label: string; badge: string; dotColor: string; roleType: string }
  > = {
    secretary: {
      label: 'Secretaria',
      roleType: 'Gestão Plena',
      badge: 'border-[#DAD7F3] text-[#3A31CE] bg-[#F2F1FB]',
      dotColor: 'bg-[#3A31CE]',
    },
    pastor: {
      label: 'Pastor',
      roleType: 'Cuidado Pastoral',
      badge: 'border-[#DAD7F3] text-[#3A31CE] bg-[#F2F1FB]',
      dotColor: 'bg-[#3A31CE]',
    },
    leader: {
      label: 'Líder',
      roleType: 'Pequenos Grupos',
      badge: 'border-[#E8EAF0] text-[#14161D] bg-[#FBFBFD]',
      dotColor: 'bg-[#3A31CE]',
    },
    member: {
      label: 'Membro',
      roleType: 'Vida Comunitária',
      badge: 'border-[#E8EAF0] text-[#14161D] bg-[#FBFBFD]',
      dotColor: 'bg-emerald-600',
    },
    visitor: {
      label: 'Visitante',
      roleType: 'Acolhimento',
      badge: 'border-[#E8EAF0] text-[#5A6072] bg-[#FBFBFD]',
      dotColor: 'bg-[#6B7183]',
    },
  }

  const currentMeta = roleMeta[role] || roleMeta.secretary

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col md:flex-row text-[#14161D] antialiased selection:bg-[#3A31CE] selection:text-white font-sans">
      {/* =========================================================================
          DESKTOP SIDEBAR — Design System Logos (Fundo limpo e Indigo #3A31CE)
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white text-[#14161D] flex-shrink-0 border-r border-[#E8EAF0] z-20 sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-[#E8EAF0] flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#3A31CE] text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm shadow-[#3A31CE]/20 group-hover:scale-105 transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold tracking-tight text-[#14161D]">
                Logos
              </span>
              <span className="text-[10px] font-bold text-[#6B7183] uppercase tracking-wider leading-none">
                Defesa da Fé
              </span>
            </div>
          </Link>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-[#F2F1FB] text-[#3A31CE] rounded-full">
            v2.4
          </span>
        </div>
        {/* User Identity Display */}
        <div className="px-5 py-4 border-b border-[#E8EAF0] bg-[#FBFBFD]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#5A6072] mb-2">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#3A31CE]" /> Perfil Autenticado
            </span>
            {user ? (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
              </span>
            ) : (
              <span className="text-[10px] text-[#6B7183] font-medium">Modo Visitante</span>
            )}
          </div>

          <div className="w-full p-2.5 rounded-[16px] bg-white border border-[#E8EAF0] space-y-2 text-xs text-[#14161D] shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${currentMeta.dotColor}`} />
                <span className="font-bold">{currentMeta.label}</span>
                <span className="text-[11px] text-[#6B7183]">
                  &bull; {currentMeta.roleType.split(' ')[0]}
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE] flex-shrink-0">
                {user ? 'Real' : 'Visitante'}
              </span>
            </div>

            {/* Quick action inside identity card */}
            <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 truncate max-w-[130px]">
                {user ? user.email : 'Sem login'}
              </span>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" strokeWidth={2} />
                  Sair da conta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-[11px] font-bold text-[#3A31CE] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Navigation list */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1 mb-1">
            Menu Principal
          </p>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-xs font-semibold transition-all ${
                  active
                    ? 'text-[#3A31CE] bg-[#F2F1FB] shadow-xs'
                    : 'text-[#5A6072] hover:text-[#14161D] hover:bg-[#FBFBFD]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[10px] flex items-center justify-center transition-colors ${
                    active ? 'bg-[#3A31CE] text-white' : 'bg-[#F2F3F7] text-[#5A6072]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="flex-1 tracking-tight">{item.fullLabel}</span>
                {active && <span className="w-2 h-2 rounded-full bg-[#3A31CE]" />}
              </Link>
            )
          })}

          {/* Quick links: Reception & Página Pública */}
          <div className="pt-6 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1 mb-1">
              Acesso Público
            </p>
            <Link
              to="/publica"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-xs text-[#5A6072] hover:text-[#3A31CE] hover:bg-[#F2F1FB] border border-[#E8EAF0] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[10px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
                  <Church className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="tracking-tight font-semibold text-[#14161D]">Página Pública</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#6B7183] group-hover:text-[#3A31CE] transition-colors" />
            </Link>
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-[14px] text-xs text-[#5A6072] hover:text-[#3A31CE] hover:bg-[#F2F1FB] border border-[#E8EAF0] transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[10px] bg-[#F2F1FB] text-[#3A31CE] flex items-center justify-center">
                  <QrCode className="w-3.5 h-3.5" strokeWidth={2} />
                </div>
                <span className="tracking-tight font-semibold text-[#14161D]">
                  QR Culto / Boas-Vindas
                </span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#6B7183] group-hover:text-[#3A31CE] transition-colors" />
            </Link>
          </div>
        </nav>
        {/* User profile footer */}
        <div className="p-4 border-t border-[#F0F1F5] bg-[#F8F9FB] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#F2F1FB] border border-[#DAD7F3] text-[#3A31CE] text-xs flex items-center justify-center font-bold flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#14161D] truncate leading-tight">
                {user?.name || 'Visitante Logos'}
              </p>
              <p className="text-[11px] text-[#6B7183] truncate mt-0.5">
                {user?.email || 'Acesso anônimo'}
              </p>
            </div>
          </div>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200/60 active:scale-95 transition-all cursor-pointer flex-shrink-0 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Sair</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              title="Fazer Login"
              className="px-3 py-1.5 rounded-[10px] text-xs font-semibold text-[#3A31CE] bg-[#F2F1FB] hover:bg-[#e4e1f7] active:scale-95 transition-all cursor-pointer flex-shrink-0 shadow-xs"
            >
              Entrar
            </button>
          )}
        </div>
      </aside>
      {/* =========================================================================
          MAIN CONTAINER (Nubank Canvas: Soft Off-White Background)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* TOP BAR / HEADER — Design System Logos */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-[#E8EAF0] px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between gap-3 transition-all text-[#14161D]">
          {/* Mobile brand & Logos Icon */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-[#14161D] hover:bg-[#F2F1FB] transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" strokeWidth={2} />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[11px] bg-[#3A31CE] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm tracking-tight leading-tight text-[#14161D]">
                  Logos
                </span>
                <span className="text-[10px] text-[#6B7183] leading-none uppercase font-bold">
                  Defesa da Fé
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Section indicator (breadcrumb) */}
          <div className="hidden md:flex items-center gap-2.5 text-xs">
            <span className="text-[#3A31CE] font-bold text-xs tracking-tight font-heading">
              Logos
            </span>
            <span className="text-gray-300">/</span>
            <span className="font-semibold text-gray-700">
              {location.pathname === '/'
                ? 'Painel Geral'
                : location.pathname === '/pessoas'
                  ? 'Pessoas & Membros'
                  : location.pathname === '/familias'
                    ? 'Núcleos Familiares'
                    : location.pathname === '/jornada'
                      ? 'Jornada & Pipeline'
                      : location.pathname === '/secretaria'
                        ? 'Secretaria & Convites'
                        : location.pathname.replace('/', '')}
            </span>
          </div>

          {/* Actions: Search, Notifications, User */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xl">
            {/* Desktop Search Bar */}
            <div className="relative hidden sm:block w-full max-w-xs lg:max-w-sm">
              <Search
                className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                strokeWidth={2}
              />
              <Input
                type="text"
                placeholder="Buscar por nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-9 text-xs rounded-full bg-[#F2F3F7] md:bg-[#FBFBFD] border-[#E8EAF0] focus:bg-white focus:border-[#3A31CE] focus:ring-1 focus:ring-[#3A31CE] transition-all shadow-none placeholder:text-[#6B7183]"
              />

              {/* Desktop Search Dropdown */}
              <AnimatePresence>
                {searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 divide-y divide-gray-100"
                  >
                    {isSearching ? (
                      <p className="text-xs text-gray-400 p-4 text-center">Buscando...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSearchQuery('')
                              navigate(`/pessoas?id=${p.id}`)
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#F7EEFD] flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-[#191919] group-hover:text-[#820AD1] truncate">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {p.whatsapp || p.email || 'Sem contato'}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                              {p.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 p-4 text-center">
                        Nenhum registro encontrado.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Mobile search toggle button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 rounded-full text-white md:text-gray-600 hover:bg-white/10 md:hover:bg-gray-100 transition-colors"
              title="Buscar"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
            {/* Notifications Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-full text-white md:text-gray-600 hover:bg-white/10 md:hover:bg-gray-100 transition-colors cursor-pointer"
              title="Atividades Recentes"
            >
              <Bell className="w-5 h-5 md:w-4 md:h-4" strokeWidth={2} />
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 md:bg-[#820AD1] ring-2 ring-white" />
              )}
            </button>
            {/* QR Quick Access Button */}
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[12px] bg-[#F2F1FB] text-[#3A31CE] hover:bg-[#e4e1f7] transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-[#3A31CE]" strokeWidth={2} />
              <span>QR Recepção</span>
            </Link>
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[#3A31CE]/30 transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-full border border-[#DAD7F3] bg-[#F2F1FB] text-[#3A31CE] font-bold text-xs flex items-center justify-center shadow-xs">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-white text-[#14161D] shadow-xl border border-[#E8EAF0] rounded-2xl p-2 text-xs"
              >
                <DropdownMenuLabel className="p-2.5">
                  <p className="font-bold text-[#14161D] text-xs">{user?.name || 'Visitante'}</p>
                  <p className="text-[11px] text-[#6B7183] truncate mt-0.5">
                    {user?.email || 'Acesso anônimo'}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F2F1FB] text-[#3A31CE]">
                      {currentMeta.label} &bull; {currentMeta.roleType}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E8EAF0]" />
                <DropdownMenuItem
                  onClick={() => navigate('/meu-cadastro')}
                  className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                >
                  <User className="w-4 h-4 mr-2.5 text-[#3A31CE]" strokeWidth={1.75} />
                  <span className="font-medium">Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/carteirinha')}
                  className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                >
                  <CreditCard className="w-4 h-4 mr-2.5 text-[#3A31CE]" strokeWidth={1.75} />
                  <span className="font-medium">Carteirinha Digital</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/pessoas')}
                  className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                >
                  <Users className="w-4 h-4 mr-2.5 text-gray-500" strokeWidth={1.75} />
                  <span className="font-medium">Pessoas & Membros</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/familias')}
                  className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                >
                  <HomeIcon className="w-4 h-4 mr-2.5 text-gray-500" strokeWidth={1.75} />
                  <span className="font-medium">Núcleos Familiares</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/jornada')}
                  className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                >
                  <GitFork className="w-4 h-4 mr-2.5 text-gray-500" strokeWidth={1.75} />
                  <span className="font-medium">Jornada & Pipeline</span>
                </DropdownMenuItem>
                {canAccessAll && (
                  <DropdownMenuItem
                    onClick={() => navigate('/secretaria')}
                    className="cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] hover:text-[#3A31CE]"
                  >
                    <Mail className="w-4 h-4 mr-2.5 text-gray-500" strokeWidth={1.75} />
                    <span className="font-medium">Secretaria & Convites</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#E8EAF0]" />
                {user ? (
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 cursor-pointer py-2 rounded-xl hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2 text-red-600" strokeWidth={1.75} />
                    <span className="font-bold">Encerrar Sessão</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-[#3A31CE] font-bold cursor-pointer py-2 rounded-xl hover:bg-[#F2F1FB] focus:bg-[#F2F1FB] focus:text-[#3A31CE]"
                  >
                    <LogIn className="w-4 h-4 mr-2 text-[#3A31CE]" strokeWidth={2} />
                    <span>Entrar no Sistema</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>{' '}
          </div>
        </header>

        {/* Mobile Search Overlay Input */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden px-4 py-3 bg-white border-b border-gray-200 shadow-xs overflow-hidden"
            >
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  strokeWidth={2}
                />
                <Input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nome ou contato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 text-xs h-10 rounded-full bg-[#F0F1F5] border-transparent"
                />
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setMobileSearchOpen(false)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              {searchQuery.trim().length > 0 && (
                <div className="mt-2 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 max-h-56 overflow-y-auto shadow-lg">
                  {isSearching ? (
                    <p className="text-xs text-gray-400 p-3 text-center">Buscando...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchQuery('')
                          setMobileSearchOpen(false)
                          navigate(`/pessoas?id=${p.id}`)
                        }}
                        className="w-full text-left p-3 flex items-center justify-between text-xs hover:bg-[#F7EEFD]"
                      >
                        <div>
                          <p className="font-bold text-[#191919]">{p.name}</p>
                          <p className="text-[11px] text-gray-400">{p.whatsapp || p.email}</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {p.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 p-3 text-center">Nenhum resultado.</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT CANVAS */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* =========================================================================
          NOTIFICATIONS SLIDE-OVER — Nubank Style Drawer
          ========================================================================= */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 overflow-y-auto border-l border-gray-100 rounded-l-3xl">
          <SheetHeader className="mb-4 pb-3 border-b border-gray-100">
            <SheetTitle className="text-lg font-bold text-[#191919] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#820AD1]" />
              Atividades Recentes
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2.5">
            {activities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                Nenhum registro de atividade recente.
              </p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 bg-[#F8F9FB] hover:bg-[#F7EEFD] rounded-2xl text-xs space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#191919] truncate">{act.title}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3 text-[#820AD1]" strokeWidth={1.75} />
                      {new Date(act.created).toLocaleDateString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE DRAWER / HAMBURGER MENU — Nubank Purple Canvas
          ========================================================================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[85vw] bg-white text-[#191919] p-0 flex flex-col border-r border-gray-100 rounded-r-3xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#820AD1] text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base">Logos</span>
                <span className="text-[11px] text-purple-200">Gestão de Igreja</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-full text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Authenticated user status mobile */}
          <div className="p-4 border-b border-gray-100 bg-[#F8F9FB]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Perfil Autenticado:
            </p>
            <div className="p-3 rounded-2xl bg-white border border-gray-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${currentMeta.dotColor}`} />
                  <span className="font-bold text-[#191919]">{currentMeta.label}</span>
                  <span className="text-[11px] text-gray-400 truncate">
                    &bull; {currentMeta.roleType}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F7EEFD] text-[#820AD1] flex-shrink-0">
                  {user ? 'Autenticado' : 'Visitante'}
                </span>
              </div>

              {/* Direct mobile logout/login button right in the profile card */}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Sair da conta (Logout)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setIsLoginModalOpen(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-[#820AD1] text-white hover:bg-[#7008B7] font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-sm shadow-[#820AD1]/20"
                >
                  <LogIn className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Entrar no sistema</span>
                </button>
              )}
            </div>
          </div>

          {/* Links */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#F7EEFD] text-[#820AD1]'
                      : 'text-gray-700 hover:text-[#820AD1] hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      active ? 'bg-[#820AD1] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span>{item.fullLabel}</span>
                </Link>
              )
            })}

            <div className="pt-4 mt-2 border-t border-gray-100">
              <Link
                to="/visitante-cadastro"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-3 rounded-[14px] text-xs font-semibold text-[#3A31CE] bg-[#F2F1FB]"
              >
                <span className="flex items-center gap-2.5">
                  <QrCode className="w-4 h-4" strokeWidth={2} />
                  QR Recepção / Culto
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#E8EAF0] bg-[#FBFBFD] flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#14161D] truncate">
                {user?.name || 'Visitante'}
              </p>
              <p className="text-[10px] text-[#6B7183] truncate">
                {user ? user.email : currentMeta.roleType}
              </p>
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all cursor-pointer active:scale-95"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Sair</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setIsLoginModalOpen(true)
                }}
                className="px-3 py-1.5 rounded-[10px] text-xs font-bold text-[#3A31CE] bg-[#F2F1FB] hover:bg-[#e4e1f7] transition-all cursor-pointer active:scale-95"
              >
                Entrar
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION — Design System Logos (Fiel às Telas 03 e 04)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E8EAF0] py-1.5 px-3 z-30 flex items-center justify-around safe-bottom shadow-lg shadow-black/5">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-1 px-2 min-w-[58px] select-none text-center active:scale-95 transition-transform"
            >
              <div
                className={`w-7 h-7 rounded-[10px] flex items-center justify-center transition-all ${
                  active ? 'bg-[#F2F1FB] text-[#3A31CE]' : 'text-[#6B7183]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.4 : 1.75} />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors mt-0.5 ${
                  active ? 'text-[#3A31CE] font-bold' : 'text-[#5A6072] font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Global accessible Login Modal */}
      <LoginDialog />
    </div>
  )
}
