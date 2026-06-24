import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Delete all storage objects for this user (files stored under {user_id}/ prefix)
  const { data: objects } = await service.storage
    .from('listing-images')
    .list(user.id)
  if (objects && objects.length > 0) {
    const paths = objects.map(o => `${user.id}/${o.name}`)
    await service.storage.from('listing-images').remove(paths)
  }

  // Delete auth user — all table rows cascade automatically via ON DELETE CASCADE
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
