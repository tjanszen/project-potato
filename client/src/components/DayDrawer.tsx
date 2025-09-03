import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import './DayDrawer.css'

interface DayDrawerProps {
  selectedDate: string | null
  isOpen: boolean
  onClose: () => void
  onDayMarked?: () => void // Callback to refresh calendar after marking
  onOptimisticMark?: (date: string) => void // For immediate visual feedback
  onOptimisticUnmark?: (date: string) => void // For rollback on failure
}

interface DayMarkResponse {
  message: string
  data: {
    date: string
    value: boolean
    updatedAt: string
  }
  timezone?: {
    yourTimezone: string
    todayInYourTimezone: string
  }
}

const DayDrawer: React.FC<DayDrawerProps> = ({ selectedDate, isOpen, onClose, onDayMarked, onOptimisticMark, onOptimisticUnmark }) => {
  console.log('🟡 DayDrawer rendering, isOpen:', isOpen, 'selectedDate:', selectedDate)
  const [isMarking, setIsMarking] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  console.log('🟡 DayDrawer toast hooks:', { showSuccess: !!showSuccess, showError: !!showError })

  // Format date for display (e.g., "Monday, September 2, 2025")
  const formatSelectedDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00') // Ensure local timezone
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Clear data when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setLastUpdated(null)
    }
  }, [isOpen])

  // Handle "No Drink" button click with optimistic updates
  const handleMarkNoDrink = async () => {
    if (!selectedDate) return

    setIsMarking(true)

    // Optimistic update - immediately show visual feedback
    onOptimisticMark?.(selectedDate)

    try {
      const response = await apiClient.markDay(selectedDate)
      
      if (response.error) {
        // Rollback optimistic update on failure
        onOptimisticUnmark?.(selectedDate)
        
        const errorMessage = response.error === 'Feature flag disabled' 
          ? 'Feature is currently disabled. Please enable the feature flag first.' 
          : `Failed to mark day: ${response.error}`
        
        showError('Day Marking Failed', errorMessage)
      } else {
        // Success case - parse response for timestamp
        const successResponse = response as DayMarkResponse
        if (successResponse.data?.updatedAt) {
          setLastUpdated(successResponse.data.updatedAt)
        }
        
        console.log('🟡 Day marking success - calling showSuccess')
        showSuccess(
          'Day Marked Successfully!',
          `${formatSelectedDate(selectedDate)} marked as No Drink`
        )
        
        // Trigger calendar refresh - this will clear optimistic updates
        onDayMarked?.()
      }
    } catch (error) {
      // Rollback optimistic update on network error
      onOptimisticUnmark?.(selectedDate)
      showError(
        'Network Error',
        'Unable to connect to server. Please check your connection and try again.'
      )
    } finally {
      setIsMarking(false)
    }
  }

  // Handle drawer close (click outside or escape key)
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [isOpen, onClose])

  if (!selectedDate) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={handleOverlayClick}
      />
      
      {/* Drawer */}
      <div className={`day-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">Mark Day</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            data-testid="button-close-drawer"
          >
            ×
          </button>
        </div>

        {/* Selected Date Display */}
        <div className="selected-date-display">
          <div className="date-label">Selected Date:</div>
          <div className="date-value" data-testid="text-selected-date">
            {formatSelectedDate(selectedDate)}
          </div>
        </div>

        {/* Last Updated Timestamp */}
        {lastUpdated && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#6c757d',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ marginRight: '8px' }}>⏰</span>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </div>
        )}

        {/* Action Button */}
        <div className="drawer-actions">
          <button
            className="no-drink-btn"
            onClick={handleMarkNoDrink}
            disabled={isMarking}
            data-testid="button-mark-no-drink"
            style={{
              opacity: isMarking ? 0.7 : 1,
              cursor: isMarking ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s ease'
            }}
          >
            {isMarking ? (
              <>
                <span style={{ marginRight: '8px' }}>⏳</span>
                Marking Day...
              </>
            ) : (
              <>
                <span style={{ marginRight: '8px' }}>✓</span>
                Mark as No Drink
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="drawer-instructions">
          <p>Click the button above to mark this day as alcohol-free.</p>
          <p>This will be saved to your tracking record.</p>
        </div>
      </div>
    </>
  )
}

export default DayDrawer