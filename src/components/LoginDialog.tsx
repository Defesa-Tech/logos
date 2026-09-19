import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export function LoginDialog() {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useAuth()
  const [email, setEmail] = useState('cleristonx.lima@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Preencha e-mail e senha para prosseguir.')
      return
    }

    setIsLoading(true)
    try {
      await login(email.trim(), password)
      toast.success('Bem-vindo de volta!')
      setIsLoginModalOpen(false)
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Falha na autenticação. Verifique os dados inseridos.'
      toast.error(`Não foi possível entrar: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fillQuickCredentials = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
  }

  return (
    <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
      <DialogContent className="max-w-[420px] sm:max-w-[480px] lg:max-w-4xl p-0 overflow-hidden bg-[#FBFBFD] border border-[#E8EAF0] rounded-3xl shadow-2xl">
        <DialogTitle className="sr-only">Logos — Entrar no Sistema</DialogTitle>

        <div className="flex flex-col lg:flex-row min-h-[580px] lg:min-h-[620px]">
          {/* =========================================================
              COLUNA ESQUERDA / FORMULÁRIO (Mobile & Desktop)
              Fiel a 01_Login_Celular.html e 02_Login_Desktop.html
              ========================================================= */}
          <div className="w-full lg:w-[460px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 bg-[#FBFBFD]">
            {/* Topo / Logo */}
            <div>
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-[15px] bg-[#3A31CE] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#3A31CE]/20">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                <div className="flex flex-col gap-0.5">
                  <span className="font-heading font-bold text-2xl tracking-tight leading-none text-[#14161D]">
                    Logos
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#6B7183]">
                    Defesa da Fé
                  </span>
                </div>
              </div>

              {/* Título de Boas-Vindas */}
              <div className="space-y-1 mb-6">
                <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#14161D]">
                  Bem-vindo de volta
                </h2>
                <p className="text-sm leading-relaxed text-[#5A6072]">
                  Entre para ver seu cadastro, os eventos e as escalas da sua igreja.
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Usuário / E-mail */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-usuario"
                    className="text-xs font-semibold text-[#3C4255] block"
                  >
                    E-mail ou usuário
                  </label>
                  <input
                    id="login-usuario"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="voce@exemplo.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[52px] px-4 font-sans text-sm text-[#14161D] bg-white border-[1.5px] border-[#E1E3EB] rounded-[14px] focus:outline-none focus:border-[#3A31CE] focus:ring-2 focus:ring-[#3A31CE]/20 transition-all placeholder:text-[#6B7183]"
                  />
                </div>

                {/* Campo Senha */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-senha"
                    className="text-xs font-semibold text-[#3C4255] block"
                  >
                    Senha
                  </label>
                  <div className="flex items-center h-[52px] px-4 bg-white border-[1.5px] border-[#E1E3EB] rounded-[14px] focus-within:border-[#3A31CE] focus-within:ring-2 focus-within:ring-[#3A31CE]/20 transition-all">
                    <input
                      id="login-senha"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-grow min-w-0 h-full font-sans text-sm text-[#14161D] bg-transparent border-none outline-none placeholder:text-[#6B7183]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-[#5A6072] hover:text-[#14161D] transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" strokeWidth={1.8} />
                      ) : (
                        <Eye className="w-5 h-5" strokeWidth={1.8} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Esqueci minha senha */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        'Para redefinir sua senha, solicite um novo link à secretaria da congregação.',
                      )
                    }
                    className="text-xs font-semibold text-[#3A31CE] hover:text-[#2A23A6] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {/* Botão Principal Entrar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] flex items-center justify-center gap-2 bg-[#3A31CE] hover:bg-[#2A23A6] text-white font-sans text-sm font-bold rounded-[14px] shadow-sm shadow-[#3A31CE]/25 cursor-pointer active:scale-[0.99] transition-all disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>

                {/* Divisor ou */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-grow h-[1px] bg-[#E1E3EB]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7183]">
                    ou
                  </span>
                  <div className="flex-grow h-[1px] bg-[#E1E3EB]" />
                </div>

                {/* Botão Google (estilo extraído) */}
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      'Login social via Google em configuração pelo painel Skip Cloud / OAuth.',
                    )
                  }
                  className="w-full h-[50px] flex items-center justify-center gap-3 bg-white text-[#14161D] font-sans text-sm font-semibold border-[1.5px] border-[#D9DCE6] hover:border-[#14161D] rounded-[14px] cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 flex items-center justify-center border-[1.5px] border-[#D9DCE6] rounded-md font-heading text-xs font-bold text-[#5A6072]">
                    G
                  </span>
                  <span>Continuar com o Google</span>
                </button>

                {/* Atalho de Credencial Rápida de Teste */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => fillQuickCredentials('cleristonx.lima@gmail.com', 'Skip@Pass')}
                    className="w-full text-center text-[11px] text-[#6B7183] hover:text-[#3A31CE] transition-colors"
                  >
                    Usar acesso de demonstração (Secretaria):{' '}
                    <span className="font-mono font-semibold underline">Skip@Pass</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Rodapé: Ainda não tem acesso? */}
            <div className="p-4 bg-[#F2F1FB] border border-[#DAD7F3] rounded-[18px] flex flex-col gap-2.5">
              <div>
                <div className="text-xs font-bold text-[#14161D]">Ainda não tem acesso?</div>
                <div className="text-[12px] leading-relaxed text-[#5A6072]">
                  O cadastro é feito pela secretaria da igreja. Veja como dar o primeiro passo.
                </div>
              </div>
              <Link
                to="/visitante-cadastro"
                onClick={() => setIsLoginModalOpen(false)}
                className="h-[42px] px-4 flex items-center justify-center gap-2 bg-white text-[#3A31CE] hover:text-[#2A23A6] text-xs font-bold border-[1.5px] border-[#DAD7F3] rounded-[12px] transition-all shadow-xs"
              >
                <span>Quero ser membro / Visitante</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* =========================================================
              COLUNA DIREITA — HERO BRANDING (Apenas Desktop lg+)
              Fiel a 02_Login_Desktop.html (fundo #3A31CE, círculos concêntricos)
              ========================================================= */}
          <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#3A31CE] p-12 text-white flex-col justify-between">
            {/* Círculos de fundo decorativos exatos do arquivo HTML */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 800 900"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="650"
                cy="750"
                r="180"
                stroke="#FFFFFF"
                strokeOpacity="0.14"
                strokeWidth="1.5"
              />
              <circle
                cx="650"
                cy="750"
                r="300"
                stroke="#FFFFFF"
                strokeOpacity="0.12"
                strokeWidth="1.5"
              />
              <circle
                cx="650"
                cy="750"
                r="440"
                stroke="#FFFFFF"
                strokeOpacity="0.09"
                strokeWidth="1.5"
              />
              <circle
                cx="650"
                cy="750"
                r="580"
                stroke="#FFFFFF"
                strokeOpacity="0.07"
                strokeWidth="1.5"
              />
            </svg>

            {/* Cabeçalho da coluna direita */}
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-[18px] bg-white flex items-center justify-center shadow-lg">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7.6 4.6 C10.4 4.2 11.6 6.2 12.6 8.9 L16.6 19.4"
                    stroke="#3A31CE"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.9 10.6 L6.6 19.4"
                    stroke="#3A31CE"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-heading font-bold text-3xl tracking-tight leading-none text-white">
                  Logos
                </span>
                <span className="text-xs font-bold tracking-[0.14em] uppercase text-white/75">
                  Defesa da Fé
                </span>
              </div>
            </div>

            {/* Mensagem Institucional */}
            <div className="relative z-10 space-y-4 max-w-md">
              <p className="font-heading text-3xl font-semibold leading-tight tracking-tight text-white">
                Cadastro, eventos e escalas da igreja em um só lugar.
              </p>
              <p className="text-sm leading-relaxed text-white/80">
                Do visitante que chega pela primeira vez ao voluntário que serve toda semana — cada
                pessoa tem seu lugar registrado e cuidado.
              </p>
            </div>

            {/* Rodapé discreto */}
            <div className="relative z-10 text-xs text-white/60">
              Sistema de Gestão Eclesiástica Integrado
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
