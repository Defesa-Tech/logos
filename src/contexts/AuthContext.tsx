import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRole, PersonRecord, AssignmentRecord, UserPermissions } from '@/types/church'
import { personsService, assignmentsService } from '@/services/church'

interface AuthContextType {
  user: { id: string; email: string; name: string } | null
  currentPerson: PersonRecord | null
  activeAssignments: AssignmentRecord[]
  permissions: UserPermissions
  role: UserRole
  isLoading: boolean
  refreshProfile: () => Promise<void>
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  isLoginModalOpen: boolean
  setIsLoginModalOpen: (open: boolean) => void
  canAccessAll: boolean
  isLeader: boolean
  isMemberOrVisitor: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [currentPerson, setCurrentPerson] = useState<PersonRecord | null>(null)
  const [activeAssignments, setActiveAssignments] = useState<AssignmentRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false)

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const authRec = pb.authStore.record
        const u = {
          id: authRec.id,
          email: authRec.get('email') || '',
          name: authRec.get('name') || 'Usuário Logos',
        }
        setUser(u)

        // Find linked person
        let person: PersonRecord | null = null
        try {
          const list = await personsService.list(`user="${authRec.id}"`)
          if (list.length > 0) {
            person = list[0]
          } else {
            // Check if email matches
            const byEmail = await personsService.list(`email="${u.email}"`)
            if (byEmail.length > 0) {
              person = byEmail[0]
            }
          }
        } catch {
          person = null
        }

        setCurrentPerson(person)

        // Fetch active assignments for this person
        if (person) {
          try {
            const asgs = await assignmentsService.listByPerson(person.id)
            const activeOnly = asgs.filter((a) => a.status === 'ativa')
            setActiveAssignments(activeOnly)
          } catch {
            setActiveAssignments([])
          }
        } else {
          setActiveAssignments([])
        }
      } else {
        setUser(null)
        setCurrentPerson(null)
        setActiveAssignments([])
      }
    } catch {
      setUser(null)
      setCurrentPerson(null)
      setActiveAssignments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    return pb.authStore.onChange(() => {
      fetchProfile()
    })
  }, [])

  const login = async (email: string, pass: string) => {
    await pb.collection('users').authWithPassword(email, pass)
    await fetchProfile()
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setCurrentPerson(null)
    setActiveAssignments([])
  }

  // Derive permissions directly from authenticated user + active assignments + stage
  const permissions: UserPermissions = useMemo(() => {
    const isSuperAdmin = user?.email === 'cleristonx.lima@gmail.com'

    // Check roles in active assignments
    const hasRole = (roleRegex: RegExp, deptRegex?: RegExp) => {
      return activeAssignments.some((a) => {
        const rName = a.expand?.role?.name || ''
        const dName = a.expand?.role?.expand?.department?.name || ''
        const dCode = a.expand?.role?.expand?.department?.code || ''
        const matchRole = roleRegex.test(rName)
        const matchDept = deptRegex ? deptRegex.test(dName) || deptRegex.test(dCode) : true
        return matchRole && matchDept
      })
    }

    const isSecretaria = isSuperAdmin || hasRole(/Secretár|Secretaria/i)
    const isPastor = hasRole(/Pastor/i) || currentPerson?.status === 'pastor'
    const isBoasVindasLider = hasRole(/Líder/i, /Boas-Vindas|Recepção/i)
    const isBoasVindasVoluntario =
      isBoasVindasLider || hasRole(/Voluntário|Recepção/i, /Boas-Vindas|Recepção/i)
    const isMember = currentPerson?.stage === 'membro' || currentPerson?.status === 'member'

    return {
      isSuperAdmin,
      isSecretaria,
      isPastor,
      isBoasVindasLider,
      isBoasVindasVoluntario,
      isMember,
      activeAssignments,
      canEditOfficialFields: isSecretaria,
      canChangeStage: isSecretaria,
      canConfirmFrequentador: isBoasVindasLider || isSecretaria,
      canManageAssignments: isSecretaria,
      canRegisterPresence: isBoasVindasVoluntario || isSecretaria,
      canViewAll: isPastor || isSecretaria,
      canOnlySeeVisitorsAndAttenders:
        (isBoasVindasVoluntario || isBoasVindasLider) && !isSecretaria && !isPastor,
    }
  }, [user, currentPerson, activeAssignments])

  // Backward compatible role calculation
  const role: UserRole = useMemo(() => {
    if (!user) return 'visitor'
    if (permissions.isSecretaria) return 'secretary'
    if (permissions.isPastor) return 'pastor'
    if (permissions.isBoasVindasLider) return 'leader'
    if (permissions.isMember) return 'member'
    return 'visitor'
  }, [user, permissions])

  const canAccessAll = permissions.isSecretaria || permissions.isPastor
  const isLeader = permissions.isBoasVindasLider
  const isMemberOrVisitor = !canAccessAll && !isLeader

  return (
    <AuthContext.Provider
      value={{
        user,
        currentPerson,
        activeAssignments,
        permissions,
        role,
        isLoading,
        refreshProfile: fetchProfile,
        login,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        canAccessAll,
        isLeader,
        isMemberOrVisitor,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
