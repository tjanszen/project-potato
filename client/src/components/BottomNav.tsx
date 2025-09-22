import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

interface FeatureFlag {
  name: string
  enabled: boolean
  description?: string
}

export function BottomNav() {
  const { 
    data: bottomNavFlag 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.bottom_nav'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.bottom_nav') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // If flag is disabled, don't render anything
  if (!bottomNavFlag?.enabled) {
    return null
  }

  // If flag is enabled, render placeholder
  return (
    <div>Mobile Bottom Nav Placeholder</div>
  )
}