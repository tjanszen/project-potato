import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api'
import { LoadingSpinner } from './LoadingSpinner'

interface TotalsData {
  total_days: number
  longest_run: number
  current_run: number
}

interface FeatureFlag {
  enabled: boolean
}

export function TotalsPanel() {
  console.log("TotalsPanel updated: Longest Run 🔥");
  
  // Feature flag queries
  const {
    data: runsV2Flag,
    isLoading: runsV2Loading,
    error: runsV2Error
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.runs_v2'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.runs_v2').then(response => {
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch feature flag')
      }
      return response.data as FeatureFlag
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const {
    data: totalsV2Flag,
    isLoading: totalsV2Loading,
    error: totalsV2Error
  } = useQuery<FeatureFlag>({
    queryKey: ['feature-flag', 'ff.potato.totals_v2'],
    queryFn: () => apiClient.getFeatureFlag('ff.potato.totals_v2').then(response => {
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch feature flag')
      }
      return response.data as FeatureFlag
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  // Only fetch totals if both feature flags are enabled
  const bothFlagsEnabled = runsV2Flag?.enabled && totalsV2Flag?.enabled
  
  const {
    data: totalsData,
    isLoading: totalsLoading,
    error: totalsError,
    refetch: refetchTotals
  } = useQuery<TotalsData>({
    queryKey: ['totals'],
    queryFn: () => apiClient.getTotals() as Promise<TotalsData>,
    enabled: bothFlagsEnabled, // Only run if both flags are enabled
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  })

  // Feature flags loading state
  if (runsV2Loading || totalsV2Loading) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        textAlign: 'center'
      }} data-testid="totals-panel-flag-loading">
        <LoadingSpinner />
        <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
          Checking feature availability...
        </p>
      </div>
    )
  }

  // Feature flag error state
  if (runsV2Error || totalsV2Error) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffeaa7',
        textAlign: 'center'
      }} data-testid="totals-panel-flag-error">
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
          Feature Check Failed
        </h3>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '15px' }}>
          Unable to verify feature availability. Please try again.
        </p>
      </div>
    )
  }

  // Feature flags disabled state
  if (!bothFlagsEnabled) {
    const disabledFlags = []
    if (!runsV2Flag?.enabled) disabledFlags.push('Runs V2')
    if (!totalsV2Flag?.enabled) disabledFlags.push('Totals V2')
    
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8d7da',
        borderRadius: '8px',
        border: '1px solid #f5c6cb',
        textAlign: 'center'
      }} data-testid="totals-panel-disabled">
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>🚫</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>
          Feature Not Available
        </h3>
        <p style={{ color: '#721c24', fontSize: '14px', marginBottom: '10px' }}>
          The progress tracking feature is currently disabled.
        </p>
        <p style={{ color: '#721c24', fontSize: '12px' }}>
          Required features: {disabledFlags.join(', ')}
        </p>
      </div>
    )
  }

  // Totals data loading state (when feature flags are enabled)
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
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
          Longest Run 🔥
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
  )
}