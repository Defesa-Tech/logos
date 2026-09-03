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
  const { user, role, switchSimulatedRole, logout, canAccessAll } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PersonRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Realtime subscription for activities (new visitors / notifications)
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

  // Search logic
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
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Pessoas', path: '/pessoas', icon: Users },
    { label: 'Famílias', path: '/familias', icon: HomeIcon },
    { label: 'Jornada Logos', path: '/jornada', icon: GitFork },
    ...(canAccessAll ? [{ label: 'Secretaria & Convites', path: '/secretaria', icon: Mail }] : []),
  ]

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    secretary: {
      label: 'Secretaria (Acesso Total)',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    pastor: {
      label: 'Pastor (Acesso Total)',
      color: 'bg-purple-100 text-purple-900 border-purple-300',
    },
    leader: {
      label: 'Líder (Restrito ao Contexto)',
      color: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    member: {
      label: 'Membro (Visão Restrita)',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
    visitor: {
      label: 'Visitante (Público/Básico)',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
    },
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-800 font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#2C3E50] text-slate-100 flex-shrink-0 border-r border-[#1E2B37] shadow-xl z-20">
        {/* Brand */}
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#2C3E50] shadow-md group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-serif-sacred text-2xl font-bold tracking-tight text-white flex items-center gap-1">
                Logos
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block mb-1" />
              </span>
              <p className="text-[10px] tracking-wider uppercase text-slate-300 font-medium">
                Gestão de Igreja
              </p>
            </div>
          </Link>
        </div>

        {/* Persona quick switch badge */}
        <div className="px-4 py-3 bg-[#243342] border-b border-slate-700/40">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span className="flex items-center gap-1 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" /> Persona Ativa
            </span>
            <span className="text-[10px] text-amber-400 font-semibold uppercase">MVP Demo</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-600/50 flex items-center justify-between transition-colors text-xs font-medium text-white">
                <span className="truncate">{roleLabels[role].label.split(' (')[0]}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 bg-white text-slate-800 shadow-xl border border-slate-200"
            >
              <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                Simular Persona de Acesso:
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchSimulatedRole('secretary')}>
                <Shield className="w-4 h-4 mr-2 text-amber-600" />
                <span>Secretaria (Acesso Total)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchSimulatedRole('pastor')}>
                <UserCheck className="w-4 h-4 mr-2 text-purple-600" />
                <span>Pastor (Acesso Total)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchSimulatedRole('leader')}>
                <Users className="w-4 h-4 mr-2 text-blue-600" />
                <span>Líder (Restrito Contexto)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchSimulatedRole('member')}>
                <HomeIcon className="w-4 h-4 mr-2 text-emerald-600" />
                <span>Membro (Mais Restrito)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchSimulatedRole('visitor')}>
                <Compass className="w-4 h-4 mr-2 text-slate-500" />
                <span>Visitante (Sem Conta)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  active
                    ? 'bg-[#D4AF37] text-[#2C3E50] font-semibold shadow-md translate-x-1'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#2C3E50]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Public Visitor Landing Link shortcut */}
        <div className="p-3 bg-slate-800/40 border-t border-slate-700/50">
          <Link
            to="/visitante-cadastro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-xs text-amber-300 font-medium transition-colors border border-amber-400/20"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#D4AF37]" />
              <span>Link do Visitante (QR)</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-amber-300 font-semibold text-xs flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || 'Visitante Convidado'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'Acesso Anônimo'}
              </p>
            </div>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* HEADER */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 shadow-sm">
          {/* Mobile brand & hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#2C3E50]">
                <Compass className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-serif-sacred text-xl font-bold text-[#2C3E50]">Logos</span>
            </Link>
          </div>

          {/* Breadcrumb / Page Title */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <span className="font-serif-sacred font-semibold text-[#2C3E50] text-lg">Logos</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="font-medium capitalize text-slate-700">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '')}
            </span>
          </div>

          {/* Search bar & Action icons */}
          <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
            {/* Global Search */}
            <div className="relative w-full max-w-xs md:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar pessoas por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-9 text-xs rounded-full bg-slate-50 border-slate-200 focus:bg-white focus:border-[#D4AF37]"
              />

              {/* Search dropdown results */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  {isSearching ? (
                    <p className="text-xs text-slate-400 p-2 text-center">Buscando...</p>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSearchQuery('')
                            navigate(`/pessoas?id=${p.id}`)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between transition-colors text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.whatsapp || p.email || 'Sem contato'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {p.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 p-2 text-center">
                      Nenhuma pessoa encontrada.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
              title="Notificações e Atividades"
            >
              <Bell className="w-5 h-5" />
              {activities.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#D4AF37] ring-2 ring-white" />
              )}
            </button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#2C3E50] text-[#D4AF37] font-semibold text-xs flex items-center justify-center shadow-sm">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LG'}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-white shadow-xl border border-slate-200"
              >
                <DropdownMenuLabel>
                  <p className="font-semibold text-slate-800 text-sm">
                    {user?.name || 'Visitante'}
                  </p>
                  <p className="text-xs text-slate-500 font-normal">
                    {user?.email || 'Acesso anônimo'}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleLabels[role].color}`}
                    >
                      {roleLabels[role].label}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/pessoas')}>
                  <Users className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Cadastros de Pessoas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/familias')}>
                  <HomeIcon className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Núcleos Familiares</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/jornada')}>
                  <GitFork className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Jornada Logos</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user ? (
                  <DropdownMenuItem onClick={logout} className="text-red-600 font-medium">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Sair da conta</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => navigate('/')}
                    className="text-emerald-600 font-medium"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    <span>Acessar com Clériston</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* NOTIFICATIONS SLIDE-OVER */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md bg-white p-6 overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 font-serif-sacred text-xl text-[#2C3E50]">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              Atividades e Notificações
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Nenhuma atividade recente.</p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{act.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(act.created).toLocaleDateString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{act.description}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* MOBILE HAMBURGER MENU (ADMINS/LEADERS) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 bg-[#2C3E50] text-slate-100 p-0 flex flex-col">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] flex items-center justify-center text-[#2C3E50]">
                <Compass className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="font-serif-sacred text-2xl font-bold text-white">Logos</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-700/60 bg-[#243342]">
            <p className="text-[11px] text-slate-300 mb-1">Simular Perfil no Mobile:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['secretary', 'pastor', 'leader', 'member'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchSimulatedRole(r)
                    setMobileMenuOpen(false)
                  }}
                  className={`text-[10px] px-2 py-1 rounded font-medium text-center ${
                    role === r
                      ? 'bg-[#D4AF37] text-[#2C3E50] font-bold'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm ${
                    active
                      ? 'bg-[#D4AF37] text-[#2C3E50] font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <Link
              to="/visitante-cadastro"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-amber-300 bg-slate-800/80"
            >
              <QrCode className="w-5 h-5" />
              <span>Landing Visitante (QR)</span>
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* MOBILE BOTTOM NAVIGATION FOR MEMBERS / VISITORS & QUICK ACCESS */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 py-2 px-3 z-30 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 4).map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-[#D4AF37] font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
        {canAccessAll && (
          <Link
            to="/secretaria"
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
              location.pathname === '/secretaria'
                ? 'text-[#D4AF37] font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span>Convites</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
