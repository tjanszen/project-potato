import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiClient, type LeaguesResponse, type League } from '../lib/api'
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

  const { 
    data: leaguesCsvFlag 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.leagues_csv'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.leagues_csv') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { 
    data: leaguesActiveFlag 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.leagues.active'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.leagues.active') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Phase 2.2: Leagues CSV data query - only enabled when CSV flag is true
  const { 
    data: leaguesData,
    isLoading: leaguesLoading,
    isError: leaguesError 
  } = useQuery<LeaguesResponse>({
    queryKey: ['leagues'],
    queryFn: () => apiClient.getLeagues() as Promise<LeaguesResponse>,
    enabled: leaguesCsvFlag?.enabled === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Responsive layout state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768)
  
  // Phase 2: Tab state management
  const [activeTab, setActiveTab] = useState<'active' | 'list' | 'clubs'>('list')
  
  const handleTabChange = (tab: 'active' | 'list' | 'clubs') => {
    setActiveTab(tab)
    console.log("Active tab switched to:", tab)
  }

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
  
  // Required integration log
  console.log("LeaguesPage integration complete")
  
  // Phase 1 Leagues Tabs: Log feature flag state
  console.log("FF_POTATO_LEAGUES_TABS state:", leaguesTabsFlag?.enabled)
  
  // Phase 4: Header size reduction
  console.log("Phase 4: Header size reduced on LeaguesPage")

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

  // Phase 2: TabBar component
  const TabBar = () => {
    console.log("Phase 2: Leagues TabBar rendered")
    
    const tabs: Array<{key: 'active' | 'list' | 'clubs', label: string}> = [
      { key: 'active', label: 'Active' },
      { key: 'list', label: 'List' },
      { key: 'clubs', label: 'Clubs' }
    ]

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxWidth: '400px',
          width: '100%'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              style={{
                background: activeTab === tab.key ? '#e7f3ff' : 'transparent',
                color: activeTab === tab.key ? '#007bff' : '#666',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 8px',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? '600' : '400',
                cursor: 'pointer',
                minHeight: '44px',
                minWidth: '44px',
                transition: 'all 0.2s ease'
              }}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Hardcoded league data for Phase 3 (fallback when CSV disabled)
  const hardcodedLeagueCards = [
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

  // Phase 2.2: Determine which leagues data to use
  const getLeaguesData = (): League[] => {
    if (leaguesCsvFlag?.enabled && leaguesData?.leagues) {
      console.log("Phase 2.2: LeaguesPage rendering from CSV")
      return leaguesData.leagues
    } else {
      if (leaguesCsvFlag?.enabled && leaguesError) {
        console.warn("Phase 2.2: CSV data fetch failed, using fallback hardcoded data")
      }
      // Convert hardcoded data to match League interface
      return hardcodedLeagueCards.map(card => ({
        ...card,
        image_url: undefined // Optional field not in hardcoded data
      }))
    }
  }

  const currentLeagues = getLeaguesData()

  // Phase 2.2: Show loading state when fetching CSV data
  if (leaguesCsvFlag?.enabled && leaguesLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666'
        }}>
          <div style={{ marginBottom: '10px', fontSize: '16px' }}>Loading leagues...</div>
        </div>
      </div>
    )
  }

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
        marginBottom: '15px'
      }}>
        <h1 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0'
        }}>
          Leagues
        </h1>
      </div>

      {/* Conditional rendering based on feature flags */}
      {leaguesTabsFlag?.enabled ? (
        <>
          {/* Phase 2: TabBar */}
          <TabBar />
          
          {/* Tab Content */}
          <div style={{
            maxHeight: 'calc(100vh - 200px)', // Account for header + TabBar + BottomNav
            overflowY: 'auto',
            padding: '0 10px',
            paddingBottom: '70px', // Respect BottomNav spacing
            WebkitOverflowScrolling: 'touch'
          }}>
            {activeTab === 'list' && (
              <div 
                role="list"
                style={{
                  display: 'grid',
                  gap: '20px',
                  gridTemplateColumns: gridConfig.columns,
                  maxWidth: gridConfig.maxWidth,
                  margin: '0 auto'
                }}
              >
                {(() => {
                  console.log("Phase 3: Rendering list content")
                  return currentLeagues.map((league) => (
                    <LeagueCard
                      key={league.id}
                      id={league.id}
                      image_url={league.image_url}
                      tag={league.tag}
                      title={league.title}
                      description={league.description}
                      users={league.users}
                      memberCount={league.memberCount}
                      trending={league.trending}
                      userMembership={league.userMembership}
                    />
                  ))
                })()}
              </div>
            )}
            
            {activeTab === 'active' && (
              <>
                {(() => {
                  console.log("Phase 3: Rendering active content")
                  
                  // Check if completion feature is enabled
                  if (!leaguesActiveFlag?.enabled) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#666'
                      }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Active Leagues</h3>
                        <p style={{ margin: '0' }}>Your joined leagues will appear here</p>
                      </div>
                    )
                  }
                  
                  // Filter for joined leagues
                  const joinedLeagues = currentLeagues.filter(
                    league => league.userMembership?.isActive === true
                  )
                  
                  // Show placeholder if no joined leagues
                  if (joinedLeagues.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#666'
                      }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Active Leagues</h3>
                        <p style={{ margin: '0' }}>Your joined leagues will appear here</p>
                      </div>
                    )
                  }
                  
                  // Render joined leagues with completion mode
                  return (
                    <div 
                      role="list"
                      style={{
                        display: 'grid',
                        gap: '20px',
                        gridTemplateColumns: gridConfig.columns,
                        maxWidth: gridConfig.maxWidth,
                        margin: '0 auto'
                      }}
                    >
                      {joinedLeagues.map((league) => (
                        <LeagueCard
                          key={league.id}
                          id={league.id}
                          image_url={league.image_url}
                          tag={league.tag}
                          title={league.title}
                          description={league.description}
                          users={league.users}
                          memberCount={league.memberCount}
                          trending={league.trending}
                          userMembership={league.userMembership}
                          completionMode={true}
                        />
                      ))}
                    </div>
                  )
                })()}
              </>
            )}
            
            {activeTab === 'clubs' && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666'
              }}>
                {(() => {
                  console.log("Phase 3: Rendering clubs content")
                  return (
                    <>
                      <h3 style={{ margin: '0 0 10px 0' }}>Clubs</h3>
                      <p style={{ margin: '0' }}>Your clubs will appear here</p>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Phase 4: Original LeagueCard grid when tabs disabled */
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
          {currentLeagues.map((league) => (
            <LeagueCard
              key={league.id}
              id={league.id}
              image_url={league.image_url}
              tag={league.tag}
              title={league.title}
              description={league.description}
              users={league.users}
              memberCount={league.memberCount}
              trending={league.trending}
              userMembership={league.userMembership}
            />
          ))}
        </div>
      )}
    </div>
  )
}