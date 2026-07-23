import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Role hierarchy: admin > user > guest
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
}

// Check if a role has at least the required level
export function hasRole(userRole, requiredRole) {
  const hierarchy = { admin: 3, user: 2, guest: 1 }
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [refreshTokenStr, setRefreshTokenStr] = useState(() => localStorage.getItem('refresh_token'))
  const [loading, setLoading] = useState(true)

  // Setup Axios defaults & interceptor
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem('access_token')
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          // Don't attempt token refresh for guest users
          const isGuest = localStorage.getItem('guest_mode') === 'true'
          if (isGuest) {
            return Promise.reject(error)
          }

          try {
            const currentRefresh = localStorage.getItem('refresh_token')
            if (!currentRefresh) throw new Error('No refresh token')
            
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: currentRefresh
            })
            
            const newAccess = res.data.access_token
            const newRefresh = res.data.refresh_token
            
            localStorage.setItem('access_token', newAccess)
            localStorage.setItem('refresh_token', newRefresh)
            setToken(newAccess)
            setRefreshTokenStr(newRefresh)
            
            originalRequest.headers.Authorization = `Bearer ${newAccess}`
            return axios(originalRequest)
          } catch (refreshErr) {
            logout()
            return Promise.reject(refreshErr)
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.request.eject(requestInterceptor)
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [])

  // Verify user on mount or token change
  useEffect(() => {
    async function fetchMe() {
      // Check if user is in guest mode first
      const isGuest = localStorage.getItem('guest_mode') === 'true'
      if (isGuest) {
        setUser({
          id: 'guest_user',
          username: 'Khách',
          email: 'guest@academy.com',
          role: ROLES.GUEST,
          auth_provider: 'local'
        })
        setLoading(false)
        return
      }

      const storedToken = localStorage.getItem('access_token')
      if (!storedToken) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        // Ensure role is set (default to 'user' if backend doesn't return one)
        const userData = res.data
        if (!userData.role) {
          userData.role = ROLES.USER
        }
        setUser(userData)
      } catch (err) {
        setUser(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [token])

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) return
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
      const userData = res.data
      if (!userData.role) {
        userData.role = ROLES.USER
      }
      setUser(userData)
    } catch (e) {
      console.error('Failed to refresh user', e)
    }
  }

  const saveTokensAndFetchUser = async (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.removeItem('guest_mode') // Clear guest mode on real login
    setToken(access)
    setRefreshTokenStr(refresh)
    await refreshUser()
  }

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password })
    await saveTokensAndFetchUser(res.data.access_token, res.data.refresh_token)
    return res.data
  }

  const register = async (email, username, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, { email, username, password })
    await saveTokensAndFetchUser(res.data.access_token, res.data.refresh_token)
    return res.data
  }

  const loginWithGoogle = async (googleIdToken) => {
    const res = await axios.post(`${API_BASE_URL}/auth/google`, { id_token: googleIdToken })
    await saveTokensAndFetchUser(res.data.access_token, res.data.refresh_token)
    return res.data
  }

  const continueAsGuest = () => {
    // Persist guest mode so it survives page refresh and fetchMe race
    localStorage.setItem('guest_mode', 'true')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setRefreshTokenStr(null)
    setUser({
      id: 'guest_user',
      username: 'Khách',
      email: 'guest@academy.com',
      role: ROLES.GUEST,
      auth_provider: 'local'
    })
    setLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('guest_mode')
    setToken(null)
    setRefreshTokenStr(null)
    setUser(null)
  }

  const getGuestProgress = () => {
    try {
      const stored = localStorage.getItem('guest_progress')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      return []
    }
  }

  const completeGuestLesson = (lessonId) => {
    try {
      const current = getGuestProgress()
      if (!current.includes(lessonId)) {
        const updated = [...current, lessonId]
        localStorage.setItem('guest_progress', JSON.stringify(updated))
        return updated
      }
      return current
    } catch (e) {
      return []
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isGuest: user?.role === ROLES.GUEST,
        isAdmin: user?.role === ROLES.ADMIN,
        role: user?.role || null,
        refreshUser,
        login,
        register,
        loginWithGoogle,
        continueAsGuest,
        logout,
        getGuestProgress,
        completeGuestLesson,
        hasRole: (requiredRole) => hasRole(user?.role, requiredRole),
        ROLES
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
