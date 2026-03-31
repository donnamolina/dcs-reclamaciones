import { useState, useEffect } from 'react'

const AUTH_KEY = 'dcs_auth'
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isAuthenticated() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const { expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(AUTH_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function useAuth() {
  const [authed, setAuthed] = useState(isAuthenticated)
  const [error, setError] = useState('')

  function login(password) {
    if (password === import.meta.env.VITE_APP_PASSWORD) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ expiry: Date.now() + EXPIRY_MS }))
      setAuthed(true)
      setError('')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setAuthed(false)
  }

  return { authed, login, logout, error }
}
