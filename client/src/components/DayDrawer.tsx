import React, { useState, useEffect, useRef } from 'react'
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
  const [isMarking, setIsMarking] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const markButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

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

  // Clear data when drawer closes and cleanup debounce timers
  useEffect(() => {
    if (!isOpen) {
      setLastUpdated(null)
      // Clear any pending debounce timers when drawer closes
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [isOpen])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Focus management when drawer opens/closes
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      // Small delay to ensure drawer animation starts
      const focusTimer = setTimeout(() => {
        // Focus the mark button when drawer opens for immediate user action
        if (markButtonRef.current) {
          markButtonRef.current.focus()
        }
      }, 100)
      return () => clearTimeout(focusTimer)
    }
  }, [isOpen])

  // Trap focus within drawer when open
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = drawerRef.current?.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Handle "No Drink" button click with debouncing and optimistic updates
  const handleMarkNoDrink = () => {
    if (!selectedDate || isMarking) return

    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If clicks are too rapid (within 300ms), debounce them
    if (timeSinceLastClick < 300) {
      debounceTimerRef.current = setTimeout(() => {
        executeMarkNoDrink()
      }, 300)
      return
    }

    // Record this click time and execute immediately
    lastClickTimeRef.current = now
    executeMarkNoDrink()
  }

  // Extracted marking logic for debouncing
  const executeMarkNoDrink = async () => {
    if (!selectedDate || isMarking) return

    setIsMarking(true)

    // Optimistic update - immediately show visual feedback
    onOptimisticMark?.(selectedDate)

    try {
      console.log("[MarkNoDrink] Before API call", selectedDate);
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
        
        console.log("[MarkNoDrink] Success - updating calendar & showing toast");
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
      console.log("[MarkNoDrink] Error - showing error toast", error);
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
      <div 
        ref={drawerRef}
        className={`day-drawer ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby="drawer-description"
      >
        {/* Header */}
        <div className="drawer-header">
          <h2 id="drawer-title" className="drawer-title">Mark Day</h2>
          <button 
            ref={closeButtonRef}
            className="close-btn"
            onClick={onClose}
            data-testid="button-close-drawer"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        {/* Selected Date Display */}
        <div className="selected-date-display">
          <div className="date-label">Selected Date:</div>
          <div 
            id="drawer-description" 
            className="date-value" 
            data-testid="text-selected-date"
          >
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
            ref={markButtonRef}
            className="no-drink-btn"
            onClick={handleMarkNoDrink}
            disabled={isMarking}
            data-testid="button-mark-no-drink"
            aria-describedby="drawer-description"
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