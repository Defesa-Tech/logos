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
  ChevronRight,
  QrCode,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
  Sparkles,
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
    { label: 'Jornada', fullLabel: 'Jornada & Pipeline', path: '/jornada', icon: GitFork },
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
      badge: 'border-zinc-300 text-zinc-900 bg-zinc-100',
      dotColor: 'bg-amber-500',
    },
    pastor: {
      label: 'Pastor',
      roleType: 'Cuidado Pastoral',
      badge: 'border-zinc-300 text-zinc-900 bg-zinc-100',
      dotColor: 'bg-zinc-900',
    },
    leader: {
      label: 'Líder',
      roleType: 'Pequenos Grupos',
      badge: 'border-zinc-300 text-zinc-800 bg-zinc-100',
      dotColor: 'bg-blue-600',
    },
    member: {
      label: 'Membro',
      roleType: 'Vida Comunitária',
      badge: 'border-zinc-300 text-zinc-700 bg-zinc-100',
      dotColor: 'bg-emerald-600',
    },
    visitor: {
      label: 'Visitante',
      roleType: 'Acolhimento',
      badge: 'border-zinc-200 text-zinc-600 bg-zinc-100',
      dotColor: 'bg-zinc-400',
    },
  }

  const currentMeta = roleMeta[role] || roleMeta.secretary

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col md:flex-row text-zinc-900 antialiased selection:bg-zinc-900 selection:text-white">
      {/* =========================================================================
          DESKTOP SIDEBAR — Clean SaaS Monolith (Linear/Notion style)
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-68 bg-white text-zinc-900 flex-shrink-0 border-r border-zinc-200 z-20 sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs group-hover:bg-zinc-800 transition-colors">
              L
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-zinc-900">Logos</span>
              <span className="text-[10px] font-medium text-zinc-400 tracking-tight leading-none">
                Gestão de Igreja
              </span>
            </div>
          </Link>
          <span className="text-[10px] font-medium px-2 py-0.5 border border-zinc-200 bg-zinc-50 text-zinc-600 rounded-md">
            v2.5
          </span>
        </div>

        {/* Persona quick switch dropdown — compact SaaS team switcher */}
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/60">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-zinc-400" /> Papel Ativo
            </span>
            <span className="text-[10px] text-zinc-400">Simulação</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 flex items-center justify-between transition-colors text-xs text-zinc-900 group cursor-pointer shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${currentMeta.dotColor}`} />
                  <span className="font-semibold">{currentMeta.label}</span>
                  <span className="text-[11px] text-zinc-400">
                    &bull; {currentMeta.roleType.split(' ')[0]}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-58 bg-white text-zinc-900 border border-zinc-200 rounded-lg p-1.5 shadow-lg"
            >
              <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Alternar Papel Simulado
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100 my-1" />
              {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => switchSimulatedRole(r)}
                  className={`cursor-pointer rounded-md px-2 py-1.5 text-xs transition-colors ${
                    role === r
                      ? 'bg-zinc-100 text-zinc-900 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className={`w-1.5 h-1.5 rounded-full ${roleMeta[r].dotColor}`} />
                    <span>{roleMeta[r].label}</span>
                    <span className="text-[10px] text-zinc-400 ml-auto">
                      {roleMeta[r].roleType}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-3 py-1 mb-1">
            Módulos
          </p>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'text-zinc-950 bg-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    active ? 'text-zinc-950' : 'text-zinc-400'
                  }`}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="flex-1 tracking-tight">{item.fullLabel}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
              </Link>
            )
          })}

          {/* Quick link: Reception */}
          <div className="pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-3 py-1 mb-1">
              Público
            </p>
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200/80 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                <span className="tracking-tight font-medium">Recepção / QR Culto</span>
              </div>
              <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
            </Link>
          </div>
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-800 text-xs flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-900 truncate leading-tight">
                {user?.name || 'Visitante Logos'}
              </p>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {user?.email || 'Acesso anônimo'}
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTAINER (Crisp Neutral Canvas)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* TOP BAR / HEADER — Clean Linear-like header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-200 px-4 md:px-8 py-3 flex items-center justify-between gap-3 transition-all">
          {/* Mobile brand & Persona indicator */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 rounded-md text-zinc-700 hover:bg-zinc-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px]">
                L
              </div>
              <span className="font-semibold text-sm text-zinc-900 tracking-tight">Logos</span>
            </Link>

            {/* Mobile quick persona badge button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200/70 text-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 ml-1 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.dotColor}`} />
                  <span>{currentMeta.label}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-52 bg-white shadow-lg border border-zinc-200 rounded-lg p-1 text-xs"
              >
                <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                  Persona Ativa
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100" />
                {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => switchSimulatedRole(r)}
                    className="cursor-pointer font-medium rounded-md py-1.5 px-2 hover:bg-zinc-50"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${roleMeta[r].dotColor}`} />
                    <span>{roleMeta[r].label}</span>
                    <span className="text-[10px] text-zinc-400 ml-auto">
                      {roleMeta[r].roleType.split(' ')[0]}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Section indicator (breadcrumb) */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-zinc-900 font-semibold text-xs tracking-tight">Logos</span>
            <span className="text-zinc-300">/</span>
            <span className="font-medium text-zinc-600">
              {location.pathname === '/'
                ? 'Visão Geral & Indicadores'
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
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                strokeWidth={1.75}
              />
              <Input
                type="text"
                placeholder="Buscar por nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 h-8 text-xs rounded-lg bg-zinc-50 border-zinc-200 hover:border-zinc-300 focus:bg-white focus:border-zinc-900 focus:ring-0 transition-all shadow-none placeholder:text-zinc-400"
              />

              {/* Desktop Search Dropdown */}
              <AnimatePresence>
                {searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-zinc-200 p-1.5 z-50 divide-y divide-zinc-100"
                  >
                    {isSearching ? (
                      <p className="text-xs text-zinc-400 p-3 text-center">Buscando...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-0.5">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSearchQuery('')
                              navigate(`/pessoas?id=${p.id}`)
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-md hover:bg-zinc-50 flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-zinc-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-zinc-400">
                                {p.whatsapp || p.email || 'Sem contato cadastrado'}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600 flex-shrink-0">
                              {p.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 p-3 text-center">
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
              className="sm:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Buscar"
            >
              <Search className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Atividades Recentes"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-zinc-900 ring-2 ring-white" />
              )}
            </button>

            {/* QR Quick Access Button */}
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
              <span>QR Culto</span>
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-zinc-200 transition-all cursor-pointer">
                  <div className="w-7 h-7 rounded-full border border-zinc-200 bg-zinc-900 text-white font-semibold text-xs flex items-center justify-center">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-58 bg-white shadow-xl border border-zinc-200 rounded-lg p-1.5 text-xs"
              >
                <DropdownMenuLabel className="p-2">
                  <p className="font-semibold text-zinc-900 text-xs">{user?.name || 'Visitante'}</p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {user?.email || 'Acesso anônimo'}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block text-[10px] font-medium uppercase px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-700">
                      {currentMeta.label} &bull; {currentMeta.roleType}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100" />
                <DropdownMenuItem
                  onClick={() => navigate('/pessoas')}
                  className="cursor-pointer py-1.5 rounded-md hover:bg-zinc-50"
                >
                  <Users className="w-3.5 h-3.5 mr-2 text-zinc-500" strokeWidth={1.75} />
                  <span>Pessoas & Membros</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/familias')}
                  className="cursor-pointer py-1.5 rounded-md hover:bg-zinc-50"
                >
                  <HomeIcon className="w-3.5 h-3.5 mr-2 text-zinc-500" strokeWidth={1.75} />
                  <span>Núcleos Familiares</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/jornada')}
                  className="cursor-pointer py-1.5 rounded-md hover:bg-zinc-50"
                >
                  <GitFork className="w-3.5 h-3.5 mr-2 text-zinc-500" strokeWidth={1.75} />
                  <span>Jornada & Pipeline</span>
                </DropdownMenuItem>
                {canAccessAll && (
                  <DropdownMenuItem
                    onClick={() => navigate('/secretaria')}
                    className="cursor-pointer py-1.5 rounded-md hover:bg-zinc-50"
                  >
                    <Mail className="w-3.5 h-3.5 mr-2 text-zinc-500" strokeWidth={1.75} />
                    <span>Secretaria & Convites</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-100" />
                {user ? (
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-600 font-medium cursor-pointer py-1.5 rounded-md hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                    <span>Encerrar sessão</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => navigate('/')}
                    className="text-zinc-800 font-medium cursor-pointer py-1.5 rounded-md hover:bg-zinc-50"
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
              className="sm:hidden px-4 py-2.5 bg-white border-b border-zinc-200 shadow-xs overflow-hidden"
            >
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  strokeWidth={1.75}
                />
                <Input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nome ou contato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 text-xs h-9 rounded-lg bg-zinc-50 border-zinc-200"
                />
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setMobileSearchOpen(false)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 p-1"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
              {searchQuery.trim().length > 0 && (
                <div className="mt-2 bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                  {isSearching ? (
                    <p className="text-xs text-zinc-400 p-3 text-center">Buscando...</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSearchQuery('')
                          setMobileSearchOpen(false)
                          navigate(`/pessoas?id=${p.id}`)
                        }}
                        className="w-full text-left p-2.5 flex items-center justify-between text-xs hover:bg-zinc-50"
                      >
                        <div>
                          <p className="font-semibold text-zinc-900">{p.name}</p>
                          <p className="text-[11px] text-zinc-400">{p.whatsapp || p.email}</p>
                        </div>
                        <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600">
                          {p.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 p-3 text-center">Nenhum resultado.</p>
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
          NOTIFICATIONS SLIDE-OVER — Clean SaaS Drawer
          ========================================================================= */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 overflow-y-auto border-l border-zinc-200">
          <SheetHeader className="mb-4 pb-3 border-b border-zinc-100">
            <SheetTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-900" />
              Atividades Recentes
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">
                Nenhum registro de atividade recente.
              </p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-200/80 rounded-lg text-xs space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 truncate">{act.title}</span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
                      {new Date(act.created).toLocaleDateString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-[11px] leading-relaxed">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE DRAWER / HAMBURGER MENU
          ========================================================================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[85vw] bg-white text-zinc-900 p-0 flex flex-col border-r border-zinc-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                L
              </div>
              <span className="font-semibold text-base text-zinc-900">Logos</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Persona selector mobile */}
          <div className="p-4 border-b border-zinc-100 bg-zinc-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
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
                  className={`text-xs px-2.5 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-zinc-900 text-white font-semibold shadow-xs'
                      : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                  }`}
                >
                  {roleMeta[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-zinc-100 text-zinc-950 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-zinc-700" strokeWidth={1.75} />
                  <span>{item.fullLabel}</span>
                </Link>
              )
            })}

            <div className="pt-4 mt-2 border-t border-zinc-100">
              <Link
                to="/visitante-cadastro"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-700 bg-zinc-50 border border-zinc-200"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                  QR Culto (Recepção)
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">
                {user?.name || 'Visitante'}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">{currentMeta.roleType}</p>
            </div>
            {user && (
              <button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION — Modern SaaS Tab Bar
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-200 py-1 px-2 z-30 flex items-center justify-around safe-bottom shadow-lg">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-1.5 px-2 min-w-[56px] select-none text-center"
            >
              <div
                className={`relative w-6 h-6 flex items-center justify-center transition-colors ${
                  active ? 'text-zinc-900' : 'text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.75} />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors mt-0.5 ${
                  active ? 'text-zinc-900 font-semibold' : 'text-zinc-500 font-normal'
                }`}
              >
                {item.label}
              </span>
              {active && <span className="w-3.5 h-0.5 bg-zinc-900 mt-0.5 rounded-full" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
