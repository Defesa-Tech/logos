import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
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
  Sparkles,
  QrCode,
  Shield,
  UserCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { personsService, activitiesService } from '@/services/church'
import type { PersonRecord, ActivityRecord, UserRole } from '@/types/church'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  const { user, role, switchSimulatedRole, logout, canAccessAll, isLeader } = useAuth()
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
    }, 220)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const navItems = [
    { label: 'Início', fullLabel: 'Dashboard', path: '/', icon: LayoutDashboard },
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
    { label: string; badge: string; pillColor: string; roleType: string }
  > = {
    secretary: {
      label: 'Secretaria',
      roleType: 'Gestão Total',
      badge: 'bg-amber-50 text-amber-900 border-amber-300',
      pillColor: 'bg-amber-400',
    },
    pastor: {
      label: 'Pastor',
      roleType: 'Gestão Pastoral',
      badge: 'bg-purple-50 text-purple-900 border-purple-300',
      pillColor: 'bg-purple-400',
    },
    leader: {
      label: 'Líder',
      roleType: 'Visão de Grupo',
      badge: 'bg-blue-50 text-blue-900 border-blue-300',
      pillColor: 'bg-blue-400',
    },
    member: {
      label: 'Membro',
      roleType: 'Visão Pessoal',
      badge: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      pillColor: 'bg-emerald-400',
    },
    visitor: {
      label: 'Visitante',
      roleType: 'Acesso Básico',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      pillColor: 'bg-slate-400',
    },
  }

  const currentMeta = roleMeta[role] || roleMeta.secretary

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-800 font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-[#2C3E50]">
      {/* =========================================================================
          DESKTOP SIDEBAR - Rich Management View
          ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#202E3B] text-slate-100 flex-shrink-0 border-r border-[#19242F] shadow-2xl z-20 sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-[#202E3B] shadow-md shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-6 h-6 stroke-[2.3]" />
            </div>
            <div>
              <span className="font-serif-sacred text-2xl font-bold tracking-tight text-white flex items-center gap-1 leading-none">
                Logos
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block animate-pulse" />
              </span>
              <p className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold mt-1">
                Gestão Pastoral
              </p>
            </div>
          </Link>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2 py-0.5 rounded-md"
          >
            Desktop Pro
          </Badge>
        </div>

        {/* Persona quick switch badge */}
        <div className="px-4 py-3 bg-[#19242E] border-b border-white/5">
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Persona Ativa
            </span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-bold">
              Simulador
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-colors text-xs font-medium text-white group">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${currentMeta.pillColor}`} />
                  <span className="font-semibold">{currentMeta.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({currentMeta.roleType})
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 bg-white text-slate-800 shadow-2xl border border-slate-200 rounded-xl p-1.5"
            >
              <DropdownMenuLabel className="text-[11px] text-slate-400 font-semibold px-2 py-1 uppercase tracking-wider">
                Alternar Visão de Demonstração
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => switchSimulatedRole('secretary')}
                className="cursor-pointer rounded-lg py-2"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                <div className="flex-1">
                  <p className="font-semibold text-xs text-slate-800">Secretaria</p>
                  <p className="text-[10px] text-slate-500">
                    Acesso Total &bull; Gestão & Convites
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => switchSimulatedRole('pastor')}
                className="cursor-pointer rounded-lg py-2"
              >
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
                <div className="flex-1">
                  <p className="font-semibold text-xs text-slate-800">Pastor</p>
                  <p className="text-[10px] text-slate-500">Acesso Total &bull; Cuidado Pastoral</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => switchSimulatedRole('leader')}
                className="cursor-pointer rounded-lg py-2"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <div className="flex-1">
                  <p className="font-semibold text-xs text-slate-800">Líder de Grupo</p>
                  <p className="text-[10px] text-slate-500">Visão do Grupo e Casas</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => switchSimulatedRole('member')}
                className="cursor-pointer rounded-lg py-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <div className="flex-1">
                  <p className="font-semibold text-xs text-slate-800">Membro</p>
                  <p className="text-[10px] text-slate-500">Minha Família e Jornada</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => switchSimulatedRole('visitor')}
                className="cursor-pointer rounded-lg py-2"
              >
                <div className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
                <div className="flex-1">
                  <p className="font-semibold text-xs text-slate-800">Visitante</p>
                  <p className="text-[10px] text-slate-500">Experiência inicial de acolhimento</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
            Módulos Principais
          </p>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#D4AF37] text-[#1E2B37] font-semibold shadow-md shadow-[#D4AF37]/20 translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#1E2B37]' : 'text-slate-400'}`} />
                <span className="flex-1">{item.fullLabel}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-[#1E2B37]" />}
              </Link>
            )
          })}

          {/* Quick link: Visitor landing */}
          <div className="pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
              Recepção & QR Code
            </p>
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#18232D] hover:bg-[#151F28] text-amber-300 text-xs font-medium transition-all border border-amber-400/20 group shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                <span>Link do Visitante (QR)</span>
              </div>
              <ExternalLink className="w-3 h-3 text-amber-400/70" />
            </Link>
          </div>
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-white/10 bg-[#1A2632] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] text-[#202E3B] font-bold text-xs flex items-center justify-center shadow-md flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.name || 'Visitante Logos'}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {user?.email || 'Acesso Anônimo'}
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Sair"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTAINER (Mobile-First Canvas + Desktop View)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* TOP BAR / HEADER */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center justify-between gap-3 shadow-sm transition-all">
          {/* Mobile brand & Persona chip */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-[#202E3B] shadow-sm">
                <Compass className="w-4 h-4 stroke-[2.4]" />
              </div>
              <span className="font-serif-sacred text-lg font-bold text-[#202E3B] tracking-tight">
                Logos
              </span>
            </Link>

            {/* Mobile quick persona badge button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 ml-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentMeta.pillColor}`} />
                  <span>{currentMeta.label}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 bg-white shadow-xl border border-slate-200 rounded-xl"
              >
                <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Mudar Persona Mobile:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => switchSimulatedRole(r)}
                    className="text-xs cursor-pointer capitalize font-medium"
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${roleMeta[r].pillColor}`} />
                    <span>{roleMeta[r].label}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {roleMeta[r].roleType.split(' ')[0]}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-serif-sacred font-bold text-[#202E3B] text-base tracking-tight">
              Logos
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700 capitalize">
              {location.pathname === '/'
                ? 'Painel Pastoral'
                : location.pathname === '/pessoas'
                  ? 'Gestão de Pessoas'
                  : location.pathname === '/familias'
                    ? 'Núcleos Familiares'
                    : location.pathname === '/jornada'
                      ? 'Jornada Logos (Pipeline)'
                      : location.pathname === '/secretaria'
                        ? 'Secretaria & Convites'
                        : location.pathname.replace('/', '')}
            </span>
          </div>

          {/* Actions: Search, Notifications, User */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xl">
            {/* Desktop Search Bar */}
            <div className="relative hidden sm:block w-full max-w-xs lg:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar pessoas por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-9 text-xs rounded-full bg-slate-100/80 border-transparent hover:bg-slate-100 focus:bg-white focus:border-[#D4AF37] transition-all"
              />

              {/* Desktop Search Dropdown */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50">
                  {isSearching ? (
                    <p className="text-xs text-slate-400 p-3 text-center">Buscando pessoas...</p>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSearchQuery('')
                            navigate(`/pessoas?id=${p.id}`)
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.whatsapp || p.email || 'Sem contato'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                            {p.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-3 text-center">
                      Nenhuma pessoa encontrada.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile search toggle button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors active:scale-95"
              title="Notificações e Atividades"
            >
              <Bell className="w-5 h-5" />
              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-white" />
              )}
            </button>

            {/* QR Quick Access Button (Mobile & Desktop) */}
            <Link
              to="/visitante-cadastro"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>QR Visitante</span>
            </Link>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#202E3B] text-[#D4AF37] font-bold text-xs flex items-center justify-center shadow-sm">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-white shadow-2xl border border-slate-200 rounded-2xl p-1.5"
              >
                <DropdownMenuLabel className="p-2">
                  <p className="font-semibold text-slate-800 text-xs">
                    {user?.name || 'Visitante'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                    {user?.email || 'Acesso anônimo'}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${currentMeta.badge}`}
                    >
                      {currentMeta.label} &bull; {currentMeta.roleType}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => navigate('/pessoas')}
                  className="text-xs cursor-pointer py-2 rounded-lg"
                >
                  <Users className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Cadastros de Pessoas</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/familias')}
                  className="text-xs cursor-pointer py-2 rounded-lg"
                >
                  <HomeIcon className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Núcleos Familiares</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/jornada')}
                  className="text-xs cursor-pointer py-2 rounded-lg"
                >
                  <GitFork className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Jornada Logos</span>
                </DropdownMenuItem>
                {canAccessAll && (
                  <DropdownMenuItem
                    onClick={() => navigate('/secretaria')}
                    className="text-xs cursor-pointer py-2 rounded-lg"
                  >
                    <Mail className="w-4 h-4 mr-2 text-slate-500" />
                    <span>Secretaria & Convites</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1" />
                {user ? (
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-xs text-red-600 font-medium cursor-pointer py-2 rounded-lg"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Encerrar sessão</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => navigate('/')}
                    className="text-xs text-emerald-600 font-medium cursor-pointer py-2 rounded-lg"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    <span>Acessar com Clériston (Admin)</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Search Overlay Input */}
        {mobileSearchOpen && (
          <div className="sm:hidden px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm animate-fade-in">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                autoFocus
                placeholder="Buscar por nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-xs h-9 rounded-xl bg-slate-50"
              />
              <button
                onClick={() => {
                  setSearchQuery('')
                  setMobileSearchOpen(false)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Search results list mobile */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {isSearching ? (
                  <p className="text-xs text-slate-400 p-3 text-center">Buscando...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSearchQuery('')
                        setMobileSearchOpen(false)
                        navigate(`/pessoas?id=${p.id}`)
                      }}
                      className="w-full text-left p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.whatsapp || p.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.status}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-3 text-center">Nenhum resultado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTENT CANVAS */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* =========================================================================
          NOTIFICATIONS SLIDE-OVER (Mobile & Desktop)
          ========================================================================= */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 font-serif-sacred text-xl text-[#202E3B]">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              Atividades e Notificações
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhuma atividade recente registrada.
              </p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-semibold text-slate-800 truncate">{act.title}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(act.created).toLocaleDateString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE DRAWER / HAMBURGER MENU (Management & Quick Shortcuts)
          ========================================================================= */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[85vw] bg-[#202E3B] text-slate-100 p-0 flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F7E7A9] flex items-center justify-center text-[#202E3B] shadow-md">
                <Compass className="w-5 h-5 stroke-[2.3]" />
              </div>
              <div>
                <span className="font-serif-sacred text-xl font-bold text-white leading-none">
                  Logos
                </span>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                  Menu & Gestão
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Persona Selector */}
          <div className="p-4 border-b border-white/10 bg-[#19242E]">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              Simulador de Persona:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['secretary', 'pastor', 'leader', 'member', 'visitor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchSimulatedRole(r)
                    setMobileMenuOpen(false)
                  }}
                  className={`text-[11px] px-2.5 py-1.5 rounded-xl font-semibold text-center transition-all ${
                    role === r
                      ? 'bg-[#D4AF37] text-[#202E3B] shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {roleMeta[r].label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-1">
              Navegação
            </p>
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#D4AF37] text-[#202E3B] font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.fullLabel}</span>
                </Link>
              )
            })}

            <div className="pt-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-1">
                Atalhos
              </p>
              <Link
                to="/visitante-cadastro"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-300 bg-white/5 hover:bg-white/10 border border-amber-400/20"
              >
                <QrCode className="w-4 h-4 text-[#D4AF37]" />
                <span>Landing do Visitante (QR)</span>
              </Link>
            </div>
          </nav>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-white/10 bg-[#1A2632] flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || 'Visitante'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{currentMeta.roleType}</p>
            </div>
            {user && (
              <button
                onClick={() => {
                  logout()
                  setMobileMenuOpen(false)
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (Touch-first, Ergonomic, Floating modern aesthetic)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-1.5 px-3 z-30 flex items-center justify-around shadow-2xl safe-bottom">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] relative ${
                active
                  ? 'text-[#202E3B] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                  active ? 'bg-[#D4AF37]/20 text-[#202E3B] scale-105' : 'text-slate-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#202E3B] stroke-[2.4]' : ''}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {active && <span className="absolute bottom-0 w-4 h-0.5 rounded-full bg-[#D4AF37]" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
