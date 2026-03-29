'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const ADMIN_USERNAME = 'InkyGoose_'

export default function AdminPanel() {
  const router = useRouter()
  const supabase = createClient()

  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profile?.username !== ADMIN_USERNAME) {
        router.push('/')
        return
      }

      setAuthorized(true)
      setLoading(false)
      loadProfiles()
    }
    checkAdmin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('username')
    setProfiles(data ?? [])
  }
  function startEditing(profile: Profile) {
    setEditing(profile.id)
    setEditValues({
      coins: String(profile.coins),
      elo: String(profile.elo),
      elo_1v1: String(profile.elo_1v1),
      elo_3p: String(profile.elo_3p),
      elo_4p: String(profile.elo_4p),
      games_played: String(profile.games_played),
      games_won: String(profile.games_won),
    })
  }

  async function saveChanges(profileId: string) {
    setSaving(true)
    const updates: Record<string, number> = {}
    for (const [key, val] of Object.entries(editValues)) {
      updates[key] = parseInt(val, 10) || 0
    }

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, updates }),
    })
    const result = await res.json()

    if (!res.ok) {
      showToast('Save failed: ' + (result.error || 'Unknown error'), false)
    } else {
      showToast('Saved!', true)
      setEditing(null)
      loadProfiles()
    }
    setSaving(false)
  }

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = profiles.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="btn-ghost text-sm">
            &#8592; Back
          </button>
          <h1 className="text-2xl font-black text-red-500">Admin Panel</h1>
          <div className="text-xs text-slate-600">
            {profiles.length} players
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`card border mb-4 text-sm text-center animate-slide-in ${toast.ok ? 'border-neon-green/30 text-neon-green' : 'border-red-500/30 text-red-400'}`}>
            {toast.text}
          </div>
        )}

        {/* Search */}
        <div className="card border-white/5 mb-6">
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-slate-200 text-sm outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Player list */}
        <div className="space-y-3">
          {filtered.map(profile => {
            const isEditing = editing === profile.id

            return (
              <div
                key={profile.id}
                className="card border border-white/5 hover:border-white/10 transition-all"
              >
                {/* Player header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-slate-200">{profile.username}</span>
                    <span className="text-xs text-slate-600 ml-2">
                      {profile.games_played} games, {profile.games_won} wins
                    </span>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(profile)}
                      className="text-xs px-3 py-1 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveChanges(profile.id)}
                        disabled={saving}
                        className="text-xs px-3 py-1 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20 transition-all disabled:opacity-40"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="text-xs px-3 py-1 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'coins', label: 'Coins', color: 'text-neon-amber' },
                    { key: 'elo', label: 'ELO', color: 'text-neon-cyan' },
                    { key: 'elo_1v1', label: '1v1 ELO', color: 'text-purple-400' },
                    { key: 'elo_3p', label: '3P ELO', color: 'text-emerald-400' },
                    { key: 'elo_4p', label: '4P ELO', color: 'text-orange-400' },
                    { key: 'games_played', label: 'Games', color: 'text-slate-400' },
                    { key: 'games_won', label: 'Wins', color: 'text-slate-400' },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="text-center">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                        {label}
                      </div>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues[key] ?? ''}
                          onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1 text-center text-sm font-bold outline-none focus:border-neon-cyan/50"
                          style={{ color: 'inherit' }}
                        />
                      ) : (
                        <div className={`font-bold text-sm ${color}`}>
                          {(profile as Record<string, unknown>)[key] as number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center text-slate-600 text-sm py-8">
              No players found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
