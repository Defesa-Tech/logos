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
  Menu,
  X,
  Compass,
  ChevronRight,
  QrCode,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
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
  const { user, role, switchSimulatedRole, logout, canAccessAll } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

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
    { label: 'Pessoas', fullLabel: 'Pessoas & Membros', path: '/pessoas', icon: Users },
    { label: 'Famílias', fullLabel: 'Núcleos Familiares', path: '/familias', icon: HomeIcon },
    { label: 'Jornada', fullLabel: 'Jornada Logos', path: '/jornada', icon: GitFork },
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
      badge: 'border-[#C5A046] text-[#141B22]',
      dotColor: 'bg-[#C5A046]',
    },
    pastor: {
      label: 'Pastor',
      roleType: 'Cuidado Pastoral',
      badge: 'border-[#141B22] text-[#141B22]',
      dotColor: 'bg-[#141B22]',
    },
    leader: {
      label: 'Líder',
      roleType: 'Pequenos Grupos',
      badge: 'border-slate-400 text-slate-800',
      dotColor: 'bg-slate-600',
    },
    member: {
      label: 'Membro',
      roleType: 'Vida Comunitária',
      badge: 'border-slate-300 text-slate-700',
      dotColor: 'bg-emerald-600',
    },
    visitor: {
      label: 'Visitante',
      roleType: 'Acolhimento',
      badge: 'border-slate-200 text-slate-600',
      dotColor: 'bg-slate-400',
    },
  }

  const currentMeta = roleMeta[role] || roleMeta.secretary

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col md:flex-row text-[#17212A] selection:bg-[#C5A046]/20 selection:text-[#141B22]">
      {/* =========================================================================
          DESKTOP SIDEBAR — Editorial Midnight monolith, ultra-sharp typography
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#121820] text-[#F4F3EE] flex-shrink-0 border-r border-white/10 z-20 sticky top-0 h-screen select-none">
        {/* Masthead Header */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="group flex items-baseline gap-2.5">
            <span className="font-serif-sacred text-2xl font-bold tracking-tight text-[#FAF9F6]">
              Logos
            </span>
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#C5A046] font-semibold">
              Eclesial
            </span>
          </Link>
          <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 border border-white/15 text-slate-300 rounded">
            v2.4
          </span>
        </div>

        {/* Persona quick switch — refined minimalist bar */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-[#0E141A]">
          <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#C5A046]" /> Papel Simulado
            </span>
            <span className="text-[9px] text-[#C5A046] font-semibold">Alternar</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-colors text-xs text-white group cursor-pointer">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.dotColor}`} />
                  <span className="font-medium tracking-tight">{currentMeta.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    /{currentMeta.roleType.split(' ')[0].toLowerCase()}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 bg-[#141B22] text-[#FAF9F6] border border-white/15 rounded-md p-1.5 shadow-xl"
            >
              <DropdownMenuLabel className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2.5 py-1.5">
                Modo de Demonstração
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10 my-1" />
              {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => switchSimulatedRole(r)}
                  className={`cursor-pointer rounded px-2.5 py-2 text-xs transition-colors ${
                    role === r
                      ? 'bg-[#C5A046]/15 text-[#C5A046] font-medium'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${roleMeta[r].dotColor}`} />
                    <span className="font-medium">{roleMeta[r].label}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">
                      {roleMeta[r].roleType}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation list — sharp, editorial lines */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 py-1 mb-1">
            Cadernos de Gestão
          </p>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-all ${
                  active
                    ? 'text-white font-medium bg-white/10 border-l-2 border-[#C5A046]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    active ? 'text-[#C5A046]' : 'text-slate-400'
                  }`}
                  strokeWidth={1.75}
                />
                <span className="flex-1 tracking-tight">{item.fullLabel}</span>
                {active && <span className="text-[10px] font-mono text-[#C5A046]">●</span>}
              </Link>
            )
          })}

          {/* Quick link: Reception */}
          <div className="pt-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 py-1 mb-1">
              Porta de Entrada
            </p>
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded text-xs text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-3.5 h-3.5 text-[#C5A046]" strokeWidth={1.75} />
                <span className="tracking-tight">Recepção / QR Culto</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/10 bg-[#0E141A] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded border border-white/20 bg-white/10 text-[#C5A046] font-mono text-xs flex items-center justify-center font-bold flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate leading-tight">
                {user?.name || 'Visitante Logos'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                {user?.email || 'Acesso anônimo'}
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTAINER (Editorial Off-white Canvas)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* TOP BAR / HEADER — Clean editorial line, no blur glow */}
        <header className="sticky top-0 z-20 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E2D8] px-4 md:px-8 py-3.5 flex items-center justify-between gap-3 transition-all">
          {/* Mobile brand & Persona indicator */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 rounded text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <Link to="/" className="flex items-baseline gap-1.5">
              <span className="font-serif-sacred text-lg font-bold text-[#141B22]">Logos</span>
            </Link>

            {/* Mobile quick persona badge button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[11px] font-mono bg-white hover:bg-slate-100 text-[#17212A] px-2.5 py-1 rounded border border-[#E6E2D8] ml-1 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.dotColor}`} />
                  <span className="font-medium">{currentMeta.label}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 bg-white shadow-lg border border-[#E6E2D8] rounded-md p-1 text-xs"
              >
                <DropdownMenuLabel className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2 py-1">
                  Persona Ativa
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E6E2D8]" />
                {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => switchSimulatedRole(r)}
                    className="cursor-pointer font-medium rounded py-1.5 px-2 hover:bg-[#FAF9F6]"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${roleMeta[r].dotColor}`} />
                    <span>{roleMeta[r].label}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">
                      {roleMeta[r].roleType.split(' ')[0]}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Section indicator (editorial breadcrumb) */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="font-serif-sacred text-[#141B22] font-semibold text-sm">Logos</span>
            <span className="text-slate-400 font-mono">/</span>
            <span className="font-medium text-slate-700">
              {location.pathname === '/'
                ? 'Relatório Pastoral & Indicadores'
                : location.pathname === '/pessoas'
                  ? 'Livro de Pessoas & Membresia'
                  : location.pathname === '/familias'
                    ? 'Núcleos Familiares e Casas'
                    : location.pathname === '/jornada'
                      ? 'Jornada Logos (Pipeline)'
                      : location.pathname === '/secretaria'
                        ? 'Secretaria & Emissão de Convites'
                        : location.pathname.replace('/', '')}
            </span>
          </div>

          {/* Actions: Search, Notifications, User */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xl">
            {/* Desktop Search Bar */}
            <div className="relative hidden sm:block w-full max-w-xs lg:max-w-sm">
              <Search
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                strokeWidth={1.75}
              />
              <Input
                type="text"
                placeholder="Buscar por nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 h-8 text-xs rounded bg-white border-[#E6E2D8] hover:border-slate-300 focus:bg-white focus:border-[#141B22] focus:ring-0 transition-all shadow-none placeholder:text-slate-400"
              />

              {/* Desktop Search Dropdown */}
              <AnimatePresence>
                {searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-[#E6E2D8] p-1.5 z-50 divide-y divide-[#F2EFE8]"
                  >
                    {isSearching ? (
                      <p className="text-xs text-slate-400 p-3 text-center font-mono">
                        Buscando...
                      </p>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSearchQuery('')
                              navigate(`/pessoas?id=${p.id}`)
                            }}
                            className="w-full text-left px-2.5 py-2 rounded hover:bg-[#FAF9F6] flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-medium text-[#141B22] truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {p.whatsapp || p.email || 'Sem contato cadastrado'}
                              </p>
                            </div>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#E6E2D8] text-slate-600 flex-shrink-0">
                              {p.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-3 text-center">
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
              className="sm:hidden p-2 rounded text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Buscar"
            >
              <Search className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded text-slate-600 hover:bg-slate-200/60 transition-colors"
              title="Atividades Recentes"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C5A046]" />
              )}
            </button>

            {/* QR Quick Access Button */}
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-[#141B22] border border-[#E6E2D8] transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-[#C5A046]" strokeWidth={1.75} />
              <span>QR Culto</span>
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded hover:bg-slate-200/60 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded border border-[#E6E2D8] bg-[#141B22] text-[#FAF9F6] font-mono font-bold text-xs flex items-center justify-center">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-white shadow-xl border border-[#E6E2D8] rounded-md p-1 text-xs"
              >
                <DropdownMenuLabel className="p-2">
                  <p className="font-semibold text-[#141B22] text-xs">
                    {user?.name || 'Visitante'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {user?.email || 'Acesso anônimo'}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-[#E6E2D8] text-slate-700">
                      {currentMeta.label} &bull; {currentMeta.roleType}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#E6E2D8]" />
                <DropdownMenuItem
                  onClick={() => navigate('/pessoas')}
                  className="cursor-pointer py-1.5 rounded hover:bg-[#FAF9F6]"
                >
                  <Users className="w-3.5 h-3.5 mr-2 text-slate-500" strokeWidth={1.75} />
                  <span>Livro de Pessoas</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/familias')}
                  className="cursor-pointer py-1.5 rounded hover:bg-[#FAF9F6]"
                >
                  <HomeIcon className="w-3.5 h-3.5 mr-2 text-slate-500" strokeWidth={1.75} />
                  <span>Núcleos Familiares</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/jornada')}
                  className="cursor-pointer py-1.5 rounded hover:bg-[#FAF9F6]"
                >
                  <GitFork className="w-3.5 h-3.5 mr-2 text-slate-500" strokeWidth={1.75} />
                  <span>Jornada Logos</span>
                </DropdownMenuItem>
                {canAccessAll && (
                  <DropdownMenuItem
                    onClick={() => navigate('/secretaria')}
                    className="cursor-pointer py-1.5 rounded hover:bg-[#FAF9F6]"
                  >
                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" strokeWidth={1.75} />
                    <span>Secretaria & Convites</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#E6E2D8]" />
                {user ? (
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-700 font-medium cursor-pointer py-1.5 rounded hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                    <span>Encerrar sessão</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => navigate('/')}
                    className="text-slate-800 font-medium cursor-pointer py-1.5 rounded hover:bg-slate-50"
                  >
                    <span>Entrar no sistema</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Search Overlay Input */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden px-4 py-2.5 bg-white border-b border-[#E6E2D8] shadow-sm overflow-hidden"
            >
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <Input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nome ou contato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 text-xs h-9 rounded bg-[#FAF9F6] border-[#E6E2D8]"
                />
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setMobileSearchOpen(false)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
              {searchQuery.trim().length > 0 && (
                <div className="mt-2 bg-white rounded border border-[#E6E2D8] divide-y divide-[#F2EFE8] max-h-56 overflow-y-auto">
                  {isSearching ? (
                    <p className="text-xs text-slate-400 p-3 text-center font-mono">Buscando...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchQuery('')
                          setMobileSearchOpen(false)
                          navigate(`/pessoas?id=${p.id}`)
                        }}
                        className="w-full text-left p-2.5 flex items-center justify-between text-xs hover:bg-[#FAF9F6]"
                      >
                        <div>
                          <p className="font-medium text-[#141B22]">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.whatsapp || p.email}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#E6E2D8] text-slate-600">
                          {p.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 p-3 text-center">Nenhum resultado.</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT CANVAS */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* =========================================================================
          NOTIFICATIONS SLIDE-OVER — Editorial Drawer
          ========================================================================= */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md bg-[#FAF9F6] p-6 overflow-y-auto border-l border-[#E6E2D8]">
          <SheetHeader className="mb-5 pb-3 border-b border-[#E6E2D8]">
            <SheetTitle className="font-serif-sacred text-xl text-[#141B22] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C5A046]" />
              Atividades & Notificações
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2.5">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhum registro de atividade recente.
              </p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 bg-white border border-[#E6E2D8] text-xs space-y-1 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#141B22] truncate">{act.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
                      {new Date(act.created).toLocaleDateString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE DRAWER / HAMBURGER MENU — Editorial Midnight Style
          ========================================================================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[85vw] bg-[#121820] text-[#FAF9F6] p-0 flex flex-col border-r border-white/10"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <span className="font-serif-sacred text-2xl font-bold text-white">Logos</span>
              <p className="text-[9px] uppercase tracking-widest font-mono text-[#C5A046] mt-0.5">
                Navegação Eclesial
              </p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Persona selector mobile */}
          <div className="p-4 border-b border-white/10 bg-[#0E141A]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
              Persona Ativa:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchSimulatedRole(r)
                    setMobileMenuOpen(false)
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded font-mono text-center transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-[#C5A046] text-[#141B22] font-semibold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {roleMeta[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded text-xs transition-colors ${
                    active
                      ? 'bg-white/10 text-white font-medium border-l-2 border-[#C5A046]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#C5A046]" strokeWidth={1.75} />
                  <span>{item.fullLabel}</span>
                </Link>
              )
            })}

            <div className="pt-4 mt-2 border-t border-white/10">
              <Link
                to="/visitante-cadastro"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded text-xs text-slate-200 bg-white/5 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-[#C5A046]" strokeWidth={1.75} />
                  QR Culto (Recepção)
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-[#0E141A] flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Visitante'}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {currentMeta.roleType}
              </p>
            </div>
            {user && (
              <button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION — Editorial Clean, No Floating Glow
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FAF9F6] border-t border-[#E6E2D8] py-1.5 px-2 z-30 flex items-center justify-around safe-bottom">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-1 px-2 min-w-[54px] select-none text-center"
            >
              <div
                className={`relative w-7 h-7 flex items-center justify-center transition-colors ${
                  active ? 'text-[#141B22]' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.75} />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors ${
                  active ? 'text-[#141B22] font-semibold' : 'text-slate-500 font-normal'
                }`}
              >
                {item.label}
              </span>
              {active && <span className="w-3 h-0.5 bg-[#C5A046] mt-0.5 rounded-full" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
