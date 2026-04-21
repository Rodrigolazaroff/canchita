import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './OnboardingWizard'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { new?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const isNewGroup = searchParams.new === 'true'

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display text-3xl text-green-light tracking-wider">CANCHITA</span>
          <p className="text-text-secondary font-body mt-1">
            {isNewGroup ? 'Crear nuevo grupo' : 'Configurá tu primer grupo'}
          </p>
        </div>
        <OnboardingWizard userId={user.id} isNewGroup={isNewGroup} />
      </div>
    </main>
  )
}
