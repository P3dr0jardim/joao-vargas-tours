'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { primaryButton } from '@/components/admin/styles'

/** Copies the example services from the code into the empty database (first setup only). */
export default function ImportButton() {
  const router = useRouter()
  const [state, setState] = useState({ busy: false, error: '' })

  async function run() {
    setState({ busy: true, error: '' })
    const res = await fetch('/api/admin/services/import', { method: 'POST' }).catch(() => null)
    if (res?.ok) {
      router.refresh()
      return
    }
    const body = await res?.json().catch(() => ({}))
    setState({
      busy: false,
      error:
        body?.code === 'NOT_EMPTY'
          ? 'A base de dados já tem serviços. Atualize a página.'
          : 'Não foi possível importar. Tente de novo.',
    })
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={run} disabled={state.busy} className={primaryButton}>
        {state.busy ? 'A importar…' : 'Importar os serviços atuais'}
      </button>
      {state.error && (
        <p role="alert" className="font-semibold text-red-700">
          {state.error}
        </p>
      )}
    </div>
  )
}
