'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/user/delete', { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Something went wrong. Please email us.')
      setLoading(false)
      return
    }
    router.replace('/login')
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 max-w-sm">
        <p className="text-sm font-medium text-red-700">
          This permanently deletes your account and all listings. This cannot be undone.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg text-sm font-semibold px-4 text-white transition-opacity disabled:opacity-60"
            style={{ minHeight: 36, background: '#EF4444' }}
          >
            {loading ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-lg text-sm font-medium px-4 border border-line text-muted hover:text-ink transition-colors"
            style={{ minHeight: 36 }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted hover:text-red-500 transition-colors text-left w-fit"
    >
      Delete my account
    </button>
  )
}
