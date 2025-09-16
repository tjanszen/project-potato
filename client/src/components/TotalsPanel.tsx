import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { LoadingSpinner } from './LoadingSpinner'

interface TotalsData {
  total_days: number
  longest_run: number
  current_run: number
}

interface FeatureFlag {
  name: string
  enabled: boolean
  description?: string
}

export function TotalsPanel() {
  // Check both required feature flags
  const { 
    data: runsV2Flag, 
    isLoading: runsV2Loading 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.runs_v2'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.runs_v2') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { 
    data: totalsV2Flag, 
    isLoading: totalsV2Loading 
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.totals_v2'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.totals_v2') as Promise<FeatureFlag>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch totals data only if both flags are enabled
  const shouldFetchTotals = runsV2Flag?.enabled && totalsV2Flag?.enabled
  
  const {
    data: totalsData,
    isLoading: totalsLoading,
    error: totalsError,
    refetch: refetchTotals
  } = useQuery<TotalsData>({
    queryKey: ['totals'],
    queryFn: () => apiClient.getTotals() as Promise<TotalsData>,
    enabled: shouldFetchTotals,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  })

  // Don't render if either feature flag is disabled
  if (runsV2Loading || totalsV2Loading) {
    return (
      <div style={{ 
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        textAlign: 'center'
      }}>
        <LoadingSpinner />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          Checking feature flags...
        </p>
      </div>
    )
  }

  if (!runsV2Flag?.enabled || !totalsV2Flag?.enabled) {
    // Feature flags are off - don't show the panel
    return null
  }

  // Loading state
  if (totalsLoading) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        textAlign: 'center'
      }} data-testid="totals-panel-loading">
        <LoadingSpinner />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          Loading your progress...
        </p>
      </div>
    )
  }

  // Error state
  if (totalsError || !totalsData) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffeaa7',
        textAlign: 'center'
      }} data-testid="totals-panel-error">
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
          Unable to Load Progress
        </h3>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '15px' }}>
          We couldn't fetch your tracking statistics right now.
        </p>
        <button
          onClick={() => refetchTotals()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          data-testid="button-retry-totals"
        >
          Try Again
        </button>
      </div>
    )
  }

  // Check if user has any data
  const hasData = totalsData.total_days > 0 || totalsData.longest_run > 0 || totalsData.current_run > 0

  // Empty state
  if (!hasData) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        border: '1px solid #bee5eb',
        textAlign: 'center'
      }} data-testid="totals-panel-empty">
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎯</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>
          Start Your Journey
        </h3>
        <p style={{ color: '#0c5460', fontSize: '14px', marginBottom: '10px' }}>
          Mark your first alcohol-free day to begin tracking your progress!
        </p>
        <p style={{ color: '#0c5460', fontSize: '12px' }}>
          Your statistics will appear here once you start marking days.
        </p>
      </div>
    )
  }

  // Success state with data
  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }} data-testid="totals-panel-success">
      <h3 style={{ 
        margin: '0 0 20px 0', 
        color: '#333',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        📊 Your Progress
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '15px' 
      }}>
        {/* Current Run */}
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: totalsData.current_run > 0 ? '#d4edda' : '#f8f9fa',
          borderRadius: '6px',
          border: `1px solid ${totalsData.current_run > 0 ? '#c3e6cb' : '#e9ecef'}`
        }} data-testid="stat-current-run">
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: totalsData.current_run > 0 ? '#155724' : '#666',
            marginBottom: '5px'
          }}>
            {totalsData.current_run}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: totalsData.current_run > 0 ? '#155724' : '#666',
            fontWeight: '500'
          }}>
            Current Run
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#999',
            marginTop: '2px'
          }}>
            {totalsData.current_run === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Longest Run */}
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffeaa7'
        }} data-testid="stat-longest-run">
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#856404',
            marginBottom: '5px'
          }}>
            {totalsData.longest_run}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#856404',
            fontWeight: '500'
          }}>
            Longest Run
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#999',
            marginTop: '2px'
          }}>
            {totalsData.longest_run === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Total Days */}
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderRadius: '6px',
          border: '1px solid #bee5eb'
        }} data-testid="stat-total-days">
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#0c5460',
            marginBottom: '5px'
          }}>
            {totalsData.total_days}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#0c5460',
            fontWeight: '500'
          }}>
            Total Days
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: '#999',
            marginTop: '2px'
          }}>
            {totalsData.total_days === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Last updated indicator */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '15px',
        paddingTop: '10px',
        borderTop: '1px solid #e9ecef'
      }}>
        <div style={{ 
          fontSize: '10px', 
          color: '#999'
        }}>
          Updated automatically when you mark days
        </div>
      </div>
    </div>
  )
}