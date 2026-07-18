import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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
        setUser(res.data)
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

  const saveTokensAndFetchUser = async (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    setToken(access)
    setRefreshTokenStr(refresh)
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${access}` }
      })
      setUser(res.data)
    } catch (e) {
      console.error('Failed to fetch user after login', e)
    }
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

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setRefreshTokenStr(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
