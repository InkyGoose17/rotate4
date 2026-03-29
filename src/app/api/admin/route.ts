import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_USERNAME = 'InkyGoose_'

export async function POST(request: Request) {
  // 1. Verify the caller is admin via their session cookie
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabaseAuth
    .from('profiles').select('username').eq('id', user.id).single()

  if (profile?.username !== ADMIN_USERNAME) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // 2. Parse the update request
  const body = await request.json()
  const { profileId, updates } = body as {
    profileId: string
    updates: Record<string, number>
  }

  if (!profileId || !updates) {
    return NextResponse.json({ error: 'Missing profileId or updates' }, { status: 400 })
  }

  // 3. Use service role client to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', profileId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
