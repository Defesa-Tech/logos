import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRole, PersonRecord } from '@/types/church'
import { personsService } from '@/services/church'

interface AuthContextType {
  user: { id: string; email: string; name: string } | null
  currentPerson: PersonRecord | null
  role: UserRole
  isLoading: boolean
  isSimulatedRole: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  switchSimulatedRole: (newRole: UserRole) => void
  canAccessAll: boolean
  isLeader: boolean
  isMemberOrVisitor: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [currentPerson, setCurrentPerson] = useState<PersonRecord | null>(null)
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

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
        try {
          const list = await personsService.list(`user="${authRec.id}"`)
          if (list.length > 0) {
            setCurrentPerson(list[0])
          } else {
            // Check if email matches
            const byEmail = await personsService.list(`email="${u.email}"`)
            if (byEmail.length > 0) {
              setCurrentPerson(byEmail[0])
            }
          }
        } catch {
          // ignore error
        }
      } else {
        setUser(null)
        setCurrentPerson(null)
      }
    } catch {
      setUser(null)
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
    setSimulatedRole(null)
  }

  const switchSimulatedRole = (newRole: UserRole) => {
    setSimulatedRole(newRole)
  }

  // Determine actual role
  const actualRole: UserRole = useMemo(() => {
    if (!user) return 'visitor'
    if (user.email === 'cleristonx.lima@gmail.com') return 'secretary'
    if (currentPerson) {
      if (currentPerson.status === 'pastor') return 'pastor'
      if (currentPerson.status === 'leader') return 'leader'
      if (currentPerson.status === 'member') return 'member'
      if (currentPerson.status === 'attender') return 'member'
    }
    return 'secretary' // default fallback for admin
  }, [user, currentPerson])

  const role: UserRole = simulatedRole || actualRole

  const canAccessAll = role === 'secretary' || role === 'pastor'
  const isLeader = role === 'leader'
  const isMemberOrVisitor = role === 'member' || role === 'visitor'

  return (
    <AuthContext.Provider
      value={{
        user,
        currentPerson,
        role,
        isLoading,
        isSimulatedRole: simulatedRole !== null,
        login,
        logout,
        switchSimulatedRole,
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
