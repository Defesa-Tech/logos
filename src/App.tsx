/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { extractRunnerReady } from '@/lib/extract-runner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import People from './pages/People'
import Families from './pages/Families'
import Journey from './pages/Journey'
import Secretary from './pages/Secretary'
import VisitorLanding from './pages/VisitorLanding'
import ClaimInvite from './pages/ClaimInvite'
import Cultos from './pages/Cultos'
import FollowUp from './pages/FollowUp'
import Frequentadores from './pages/Frequentadores'
import IngressoMembro from './pages/IngressoMembro'
import DepartamentosAtuacoes from './pages/DepartamentosAtuacoes'
import { Courses } from './pages/Courses'
import { QueroServir } from './pages/QueroServir'
import Carteirinha from './pages/Carteirinha'
import VerificarCarteirinha from './pages/VerificarCarteirinha'
import MeuCadastro from './pages/MeuCadastro'
import AtencaoAusencia from './pages/AtencaoAusencia'
import RetornoFormulario from './pages/RetornoFormulario'
import Agenda from './pages/Agenda'
import Disponibilidade from './pages/Disponibilidade'
import BloquearPeriodo from './pages/BloquearPeriodo'
import Igreja from './pages/Igreja'
import QuemSomos from './pages/QuemSomos'
import PaginaPublica from './pages/PaginaPublica'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public entrypoint / landing for visitors */}
          <Route path="/publica" element={<PaginaPublica />} />
          <Route path="/pagina-publica" element={<PaginaPublica />} />
          <Route path="/visitar" element={<VisitorLanding />} />
          <Route path="/visitante-cadastro" element={<VisitorLanding />} />
          <Route path="/retorno-cadastro" element={<RetornoFormulario />} />

          {/* Public onboarding invite claim */}
          <Route path="/convite/:token" element={<ClaimInvite />} />
          <Route path="/verificar-carteirinha/:id" element={<VerificarCarteirinha />} />

          {/* Authenticated / Main layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/igreja" element={<Igreja />} />
            <Route path="/quem-somos" element={<QuemSomos />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/disponibilidade" element={<Disponibilidade />} />
            <Route path="/bloquear-periodo" element={<BloquearPeriodo />} />
            <Route path="/cultos" element={<Cultos />} />
            <Route path="/follow-up" element={<FollowUp />} />
            <Route path="/frequentadores" element={<Frequentadores />} />
            <Route path="/ingresso-membro" element={<IngressoMembro />} />
            <Route path="/departamentos" element={<DepartamentosAtuacoes />} />
            <Route path="/cursos" element={<Courses />} />
            <Route path="/quero-servir" element={<QueroServir />} />
            <Route path="/carteirinha" element={<Carteirinha />} />
            <Route path="/meu-cadastro" element={<MeuCadastro />} />
            <Route path="/perfil" element={<MeuCadastro />} />
            <Route path="/atencao-ausencia" element={<AtencaoAusencia />} />
            <Route path="/pessoas" element={<People />} />
            <Route path="/familias" element={<Families />} />
            <Route path="/jornada" element={<Journey />} />
            <Route path="/secretaria" element={<Secretary />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

if (!extractRunnerReady) {
  console.log('Runner status check')
}

export default App
