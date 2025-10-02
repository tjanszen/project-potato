import { useQuery } from '@tanstack/react-query'
import { useParams } from 'wouter'
import { apiClient, type LeaguesResponse } from '../lib/api'
import { useCompleteLeague, useJoinLeague } from '../hooks/useLeagueMembership'

interface FeatureFlag {
  name: string
  enabled: boolean
  description?: string
}

interface LeagueMember {
  email: string
}

interface LeagueMembersResponse {
  members: LeagueMember[]
  count: number
}

export function LeagueDetailsPage() {
  const params = useParams()
  const leagueId = parseInt(params.id || '0')

  const joinMutation = useJoinLeague()
  const completeMutation = useCompleteLeague()

  const { data: detailsFlag } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.leagues.details'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.leagues.details') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: leaguesData,
    isLoading: leaguesLoading
  } = useQuery<LeaguesResponse>({
    queryKey: ['leagues'],
    queryFn: async () => {
      const result = await apiClient.getLeagues()
      return result as unknown as LeaguesResponse
    },
    enabled: detailsFlag?.enabled === true,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: membersData,
    isLoading: membersLoading
  } = useQuery<LeagueMembersResponse>({
    queryKey: ['league-members', leagueId],
    queryFn: async () => {
      const result = await apiClient.getLeagueMembers(leagueId)
      return result as unknown as LeagueMembersResponse
    },
    enabled: detailsFlag?.enabled === true && !isNaN(leagueId),
    staleTime: 5 * 60 * 1000,
  })

  if (!detailsFlag?.enabled) {
    return null
  }

  const league = leaguesData?.leagues?.find(l => l.id === leagueId)
  const userMembership = league?.userMembership
  const isMember = userMembership?.isActive === true
  const isCompleted = userMembership?.completedAt !== null && userMembership?.completedAt !== undefined
  const isPending = joinMutation.isPending || completeMutation.isPending

  console.log(`LeagueDetailsPage loaded for league: ${leagueId}`)

  const handleJoin = () => {
    if (isPending) return
    console.log(`Join league requested: ${leagueId}`)
    joinMutation.mutate(leagueId)
  }

  const handleMarkCompleted = () => {
    if (isPending || isCompleted) return
    console.log(`League marked as completed: ${leagueId}`)
    completeMutation.mutate(leagueId)
  }

  const isLoading = leaguesLoading || membersLoading

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      paddingBottom: '80px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {isLoading ? (
          <div data-testid="skeleton-loader">
            <div style={{
              backgroundColor: '#e0e0e0',
              height: '32px',
              borderRadius: '8px',
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              backgroundColor: '#e0e0e0',
              height: '20px',
              width: '70%',
              borderRadius: '8px',
              marginBottom: '24px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              backgroundColor: '#e0e0e0',
              height: '24px',
              width: '40%',
              borderRadius: '8px',
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              backgroundColor: '#e0e0e0',
              height: '48px',
              borderRadius: '8px',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              backgroundColor: '#e0e0e0',
              height: '48px',
              borderRadius: '8px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </div>
        ) : (
          <>
            {league && (
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#333',
                  margin: '0 0 8px 0'
                }} data-testid="league-title">
                  {league.title}
                </h1>
                <p style={{
                  fontSize: '16px',
                  color: '#666',
                  margin: '0 0 16px 0'
                }} data-testid="league-description">
                  {league.description}
                </p>
                {league.tag && (
                  <span style={{
                    display: 'inline-block',
                    backgroundColor: '#f0f0f0',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#666',
                    fontWeight: '500'
                  }} data-testid="league-tag">
                    {league.tag}
                  </span>
                )}

                {/* CTA Button - Join / Mark Completed / Completed */}
                <button
                  onClick={!isMember ? handleJoin : handleMarkCompleted}
                  disabled={isPending || (isMember && isCompleted)}
                  data-testid={
                    !isMember 
                      ? `button-join-${leagueId}` 
                      : isCompleted 
                        ? `button-completed-${leagueId}` 
                        : `button-mark-completed-${leagueId}`
                  }
                  style={{
                    width: '100%',
                    height: '48px',
                    marginTop: '24px',
                    backgroundColor: (isMember && isCompleted) ? '#28A745' : '#FF5A1F',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (isPending || (isMember && isCompleted)) ? 'not-allowed' : 'pointer',
                    opacity: (isPending || (isMember && isCompleted)) ? 0.7 : 1,
                    transition: 'background-color 0.2s ease, opacity 0.2s ease'
                  }}
                >
                  {!isMember 
                    ? (joinMutation.isPending ? 'Joining...' : 'Join')
                    : (completeMutation.isPending ? 'Completing...' : (isCompleted ? 'Completed ✓' : 'Mark Completed'))
                  }
                </button>
              </div>
            )}

            <div style={{ marginTop: '32px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333',
                margin: '0 0 16px 0'
              }} data-testid="members-header">
                Active Members ({membersData?.count || 0})
              </h2>

              {membersData && membersData.members.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }} data-testid="empty-state">
                  <p style={{
                    fontSize: '16px',
                    color: '#999',
                    margin: 0
                  }}>
                    No active members yet
                  </p>
                </div>
              ) : (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }} data-testid="members-list">
                  {membersData?.members.map((member, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < membersData.members.length - 1 ? '1px solid #f0f0f0' : 'none',
                        fontSize: '15px',
                        color: '#333'
                      }}
                      data-testid={`member-email-${index}`}
                    >
                      {member.email}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
