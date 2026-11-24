'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inputClass, labelClass, primaryButton } from '@/components/admin/styles'

const messages = {
  INVALID_CREDENTIALS: 'Email ou palavra-passe incorretos.',
  RATE_LIMITED: 'Demasiadas tentativas. Aguarde alguns minutos e tente de novo.',
  FORBIDDEN_ORIGIN: 'Pedido recusado. Abra o painel a partir do endereço oficial do site.',
  ADMIN_NOT_CONFIGURED: 'O painel ainda não está configurado no servidor.',
}

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        router.replace('/admin')
        router.refresh()
        return
      }
      setError(messages[body.code] ?? 'Não foi possível entrar. Tente de novo.')
    } catch {
      setError('Sem ligação ao servidor. Verifique a internet e tente de novo.')
    }
    setSending(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-800">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={sending} className={`${primaryButton} w-full`}>
        {sending ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  )
}
