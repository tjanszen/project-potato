import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { Users, LineChart } from 'lucide-react'

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

  // If flag is disabled, don't render anything
  if (!leaguesFlag?.enabled) {
    return null
  }

  // Hardcoded league data for Phase 2
  const leagueCards = [
    {
      id: 1,
      name: "Weekend Warrior",
      description: "Go on a weekend dry run!",
      tag: "Beginner",
      users: 55
    },
    {
      id: 2,
      name: "NBA Finals",
      description: "Professional Basketball League",
      tag: "Beginner", 
      users: 55
    },
    {
      id: 3,
      name: "IPL",
      description: "Indian Premier League Cricket",
      tag: "Beginner",
      users: 55
    },
    {
      id: 4,
      name: "Champions League",
      description: "Elite European Football Tournament",
      tag: "Intermediate",
      users: 55
    },
    {
      id: 5,
      name: "World Series",
      description: "Major League Baseball Championship",
      tag: "Advanced",
      users: 55
    },
    {
      id: 6,
      name: "Olympic Challenge",
      description: "Compete at the highest level",
      tag: "Advanced",
      users: 55
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
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {leagueCards.map((league) => (
          <div
            key={league.id}
            role="listitem"
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              padding: '16px',
              cursor: 'default',
              position: 'relative'
            }}
            data-testid={`league-card-${league.id}`}
          >
            {/* Image Placeholder */}
            <div style={{
              width: '100%',
              height: '120px',
              backgroundColor: '#e0e0e0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '14px',
              marginBottom: '12px',
              position: 'relative'
            }}>
              Image Placeholder
              
              {/* Top-right tag */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: '#f0f0f0',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#666',
                fontWeight: '500'
              }}>
                {league.tag}
              </div>
            </div>

            {/* Header */}
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              margin: '0 0 4px 0'
            }}>
              {league.name}
            </h3>

            {/* Subtext */}
            <p style={{
              fontSize: '14px',
              color: '#666',
              margin: '0 0 16px 0',
              lineHeight: '1.4'
            }}>
              {league.description}
            </p>

            {/* Bottom row with Users and Trending */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Bottom left: Users */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#666',
                fontSize: '14px'
              }}>
                <Users size={16} />
                <span>{league.users}</span>
              </div>

              {/* Bottom right: Trending */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#666',
                fontSize: '14px'
              }}>
                <LineChart size={16} />
                <span>Trending</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}