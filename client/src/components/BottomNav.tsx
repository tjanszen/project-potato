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

  const [location] = useLocation()

  // Define navigation items with icons and paths
  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: Home,
      ariaLabel: 'Navigate to Home'
    },
    { 
      path: '/leagues', 
      label: 'Leagues', 
      icon: Sword,
      ariaLabel: 'Navigate to Leagues (placeholder)'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: Settings,
      ariaLabel: 'Navigate to Settings (placeholder)'
    }
  ]

  // If flag is disabled, don't render anything
  if (!bottomNavFlag?.enabled) {
    return null
  }

  // Phase 3 logging
  console.log("Phase 3: BottomNav active state + icons enabled");

  // If flag is enabled, render sticky footer with mobile-only display
  return (
    <nav className="bottom-nav">
      <div className="nav-grid">
        {navItems.map((item) => {
          const isActive = location === item.path
          const Icon = item.icon
          
          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}