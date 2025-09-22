import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { useLocation } from 'wouter'
import { Home, Sword, Settings } from 'lucide-react'
import './BottomNav.css'

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

  // Phase 2 logging
  console.log("Phase 2: BottomNav sticky layout active");

  // If flag is enabled, render sticky footer with mobile-only display
  return (
    <nav className="bottom-nav">
      <div className="nav-grid">
        <div className="nav-item-placeholder">Home</div>
        <div className="nav-item-placeholder">Leagues</div>
        <div className="nav-item-placeholder">Settings</div>
      </div>
    </nav>
  )
}