import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { useLocation } from 'wouter'
import { useAuth } from '../contexts/AuthContext'
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

  const [location, navigate] = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

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
      ariaLabel: 'Navigate to Leagues'
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: Settings,
      ariaLabel: 'Navigate to Settings'
    }
  ]

  // If flag is disabled, don't render anything
  if (!bottomNavFlag?.enabled) {
    return null
  }

  // Addendum Phase: Authentication and route checks
  
  // Hide on /auth routes (Sign In / Sign Up)
  if (location.startsWith('/auth')) {
    console.log("BottomNav hidden: /auth route");
    return null
  }

  // Hide on unauthenticated root route (Authentication Required page)
  if (location === '/' && !isAuthenticated && !isLoading) {
    console.log("BottomNav hidden: unauthenticated");
    return null
  }

  // Don't render while auth is loading to prevent flash
  if (isLoading) {
    return null
  }

  // Show for authenticated users on in-app routes
  if (isAuthenticated) {
    console.log("BottomNav rendered: authenticated in-app route");
  }

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
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
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