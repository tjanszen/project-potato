import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import './DayDrawer.css'

interface DayDrawerProps {
  selectedDate: string | null
  isOpen: boolean
  onClose: () => void
  onDayMarked?: () => void // Callback to refresh calendar after marking
  onOptimisticMark?: (date: string) => void // For immediate visual feedback
  onOptimisticUnmark?: (date: string) => void // For rollback on failure
}

const DayDrawer: React.FC<DayDrawerProps> = ({ selectedDate, isOpen, onClose, onDayMarked, onOptimisticMark, onOptimisticUnmark }) => {
  const [isMarking, setIsMarking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  // Clear message when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setMessage(null)
    }
  }, [isOpen])

  // Handle "No Drink" button click with optimistic updates
  const handleMarkNoDrink = async () => {
    if (!selectedDate) return

    setIsMarking(true)
    setMessage(null)

    // Optimistic update - immediately show visual feedback
    onOptimisticMark?.(selectedDate)

    try {
      const response = await apiClient.markDay(selectedDate)
      
      if (response.error) {
        // Rollback optimistic update on failure
        onOptimisticUnmark?.(selectedDate)
        setMessage({ 
          type: 'error', 
          text: response.error === 'Feature flag disabled' 
            ? 'Feature is currently disabled. Please enable the feature flag first.' 
            : `Failed to mark day: ${response.error}`
        })
      } else {
        setMessage({ 
          type: 'success', 
          text: `Successfully marked ${formatSelectedDate(selectedDate)} as No Drink!`
        })
        // Trigger calendar refresh - this will clear optimistic updates
        onDayMarked?.()
      }
    } catch (error) {
      // Rollback optimistic update on network error
      onOptimisticUnmark?.(selectedDate)
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please check your connection and try again.'
      })
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

        {/* Message Display */}
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
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