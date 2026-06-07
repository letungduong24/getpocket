"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PokemonLoader } from "./ui/loader"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface User {
  id: number
  username: string
  role: "USER" | "ADMIN"
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"))
    }
    setMounted(true)
  }, [])

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["auth-user", token],
    queryFn: async () => {
      if (!token) return null
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) {
          // Token expired or invalid
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          setToken(null)
          return null
        }
        const data = await res.json()
        // Map sub from JWT to id
        return {
          id: data.sub,
          username: data.username,
          role: data.role,
        }
      } catch (err) {
        console.error("Auth fetch error:", err)
        return null
      }
    },
    enabled: mounted && !!token,
    staleTime: 0
  })

  const isReallyLoading = !mounted || (!!token && isLoading)

  useEffect(() => {
    if (!isReallyLoading) {
      setFadeOut(true)
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
      setFadeOut(false)
    }
  }, [isReallyLoading])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    void queryClient.invalidateQueries({ queryKey: ["auth-user"] })
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    queryClient.setQueryData(["auth-user", null], null)
    router.push("/login")
  }

  const value: AuthContextType = {
    user: token ? user : null,
    token,
    isAuthenticated: !!token && !!user,
    isLoading: isReallyLoading,
    login,
    logout,
    refreshUser: refetch,
  }

  return (
    <AuthContext.Provider value={value}>
      {!isReallyLoading && children}
      {showLoader && (
        <PokemonLoader className={fadeOut ? "opacity-0 pointer-events-none transition-opacity duration-400" : ""} />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// --- Route Guards ---

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showLoader, setShowLoader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  const isGuardLoading = isLoading || !isAuthenticated

  useEffect(() => {
    if (!isGuardLoading) {
      setFadeOut(true)
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
      setFadeOut(false)
    }
  }, [isGuardLoading])

  return (
    <>
      {!isGuardLoading && children}
      {showLoader && (
        <PokemonLoader className={fadeOut ? "opacity-0 pointer-events-none transition-opacity duration-400" : ""} />
      )}
    </>
  )
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showLoader, setShowLoader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  const isGuardLoading = isLoading || isAuthenticated

  useEffect(() => {
    if (!isGuardLoading) {
      setFadeOut(true)
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
      setFadeOut(false)
    }
  }, [isGuardLoading])

  return (
    <>
      {!isGuardLoading && children}
      {showLoader && (
        <PokemonLoader className={fadeOut ? "opacity-0 pointer-events-none transition-opacity duration-400" : ""} />
      )}
    </>
  )
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showLoader, setShowLoader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login")
      } else if (user?.role !== "ADMIN") {
        router.push("/")
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  const isGuardLoading = isLoading || !isAuthenticated || user?.role !== "ADMIN"

  useEffect(() => {
    if (!isGuardLoading) {
      setFadeOut(true)
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
      setFadeOut(false)
    }
  }, [isGuardLoading])

  return (
    <>
      {!isGuardLoading && children}
      {showLoader && (
        <PokemonLoader className={fadeOut ? "opacity-0 pointer-events-none transition-opacity duration-400" : ""} />
      )}
    </>
  )
}
