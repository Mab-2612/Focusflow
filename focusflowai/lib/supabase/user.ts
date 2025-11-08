'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getUser() {
  const { data: { user } } = await supabaseServer.auth.getUser()
  return user
}

export async function signOut() {
  await supabaseServer.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
