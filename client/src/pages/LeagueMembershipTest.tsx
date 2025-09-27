import { useState } from 'react'
import { useLeagueMembership, useJoinLeague, useLeaveLeague } from '../hooks/useLeagueMembership'

export function LeagueMembershipTest() {
  const [testLeagueId] = useState(1)
  
  // React Query hooks
  const { data: membership, isLoading, refetch } = useLeagueMembership(testLeagueId)
  const joinMutation = useJoinLeague()
  const leaveMutation = useLeaveLeague()

  const handleJoinLeague = () => {
    joinMutation.mutate(testLeagueId)
  }

  const handleLeaveLeague = () => {
    leaveMutation.mutate(testLeagueId)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>League Membership Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Membership Status (League {testLeagueId})</h3>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <p><strong>Is Active:</strong> {membership?.membership?.isActive ? 'Yes' : 'No'}</p>
            <p><strong>Joined At:</strong> {membership?.membership?.joinedAt || 'Never'}</p>
            <p><strong>Left At:</strong> {membership?.membership?.leftAt || 'N/A'}</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Actions</h3>
        <button 
          onClick={handleJoinLeague}
          disabled={joinMutation.isPending}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: joinMutation.isPending ? 'not-allowed' : 'pointer'
          }}
          data-testid="button-join-league"
        >
          {joinMutation.isPending ? 'Joining...' : 'Join League'}
        </button>
        
        <button 
          onClick={handleLeaveLeague}
          disabled={leaveMutation.isPending}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: leaveMutation.isPending ? 'not-allowed' : 'pointer'
          }}
          data-testid="button-leave-league"
        >
          {leaveMutation.isPending ? 'Leaving...' : 'Leave League'}
        </button>

        <button 
          onClick={() => refetch()}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          data-testid="button-refresh"
        >
          Refresh Status
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Mutation States</h3>
        <p><strong>Join Mutation:</strong> 
          {joinMutation.isPending && ' Pending'}
          {joinMutation.isError && ' Error: ' + joinMutation.error?.message}
          {joinMutation.isSuccess && ' Success'}
        </p>
        <p><strong>Leave Mutation:</strong> 
          {leaveMutation.isPending && ' Pending'}
          {leaveMutation.isError && ' Error: ' + leaveMutation.error?.message}
          {leaveMutation.isSuccess && ' Success'}
        </p>
      </div>
    </div>
  )
}