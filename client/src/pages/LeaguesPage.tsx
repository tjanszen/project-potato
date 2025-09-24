import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiClient } from '../lib/api'
import { LeagueCard } from '../components/LeagueCard'

interface FeatureFlag {
  name: string
  enabled: boolean
  description?: string
}

export function LeaguesPage() {
  const { 
    data: leaguesFlag 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.leagues_placeholder'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.leagues_placeholder') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { 
    data: leaguesTabsFlag 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.leagues_tabs'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.leagues_tabs') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Responsive layout state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // If flag is disabled, don't render anything
  if (!leaguesFlag?.enabled) {
    return null
  }

  // Phase 4: Log responsive polish activation
  console.log("Phase 4: Responsive polish active")
  
  // Phase 1 Leagues Tabs: Log feature flag state
  console.log("FF_POTATO_LEAGUES_TABS state:", leaguesTabsFlag?.enabled)

  // Calculate grid columns and max width based on viewport
  const getGridConfig = () => {
    if (windowWidth <= 480) {
      return { columns: '1fr', maxWidth: '400px' }
    } else if (windowWidth <= 768) {
      return { columns: 'repeat(2, 1fr)', maxWidth: '800px' }
    } else {
      return { columns: 'repeat(3, 1fr)', maxWidth: '1200px' }
    }
  }

  const gridConfig = getGridConfig()

  // Hardcoded league data for Phase 3
  const leagueCards = [
    {
      id: 1,
      title: "Weekend Warrior",
      description: "Go on a weekend dry run!",
      tag: "Beginner",
      users: 55,
      trending: true
    },
    {
      id: 2,
      title: "NBA Finals",
      description: "Professional Basketball League",
      tag: "Beginner", 
      users: 55,
      trending: true
    },
    {
      id: 3,
      title: "IPL",
      description: "Indian Premier League Cricket",
      tag: "Beginner",
      users: 55,
      trending: false
    },
    {
      id: 4,
      title: "Champions League",
      description: "Elite European Football Tournament",
      tag: "Intermediate",
      users: 55,
      trending: true
    },
    {
      id: 5,
      title: "World Series",
      description: "Major League Baseball Championship",
      tag: "Advanced",
      users: 55,
      trending: false
    },
    {
      id: 6,
      title: "Olympic Challenge",
      description: "Compete at the highest level",
      tag: "Advanced",
      users: 55,
      trending: true
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      paddingBottom: '90px' // Extra space for BottomNav on mobile
    }}>
      {/* Page Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0'
        }}>
          Leagues
        </h1>
      </div>

      {/* Scrollable Cards Container */}
      <div 
        role="list"
        style={{
          maxHeight: 'calc(100vh - 140px)', // Account for header + BottomNav
          overflowY: 'auto',
          display: 'grid',
          gap: '20px',
          padding: '0 10px',
          paddingBottom: '70px', // Respect BottomNav spacing
          gridTemplateColumns: gridConfig.columns,
          maxWidth: gridConfig.maxWidth,
          margin: '0 auto',
          // Ensure smooth scrolling on touch devices
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {leagueCards.map((league) => (
          <LeagueCard
            key={league.id}
            id={league.id}
            tag={league.tag}
            title={league.title}
            description={league.description}
            users={league.users}
            trending={league.trending}
          />
        ))}
      </div>
    </div>
  )
}