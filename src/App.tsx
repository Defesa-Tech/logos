/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
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

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public landing for visitors / QR Code */}
          <Route path="/visitante-cadastro" element={<VisitorLanding />} />

          {/* Public onboarding invite claim */}
          <Route path="/convite/:token" element={<ClaimInvite />} />

          {/* Authenticated / Main layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
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

export default App
