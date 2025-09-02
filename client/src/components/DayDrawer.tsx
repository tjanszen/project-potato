import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import './DayDrawer.css'

interface DayDrawerProps {
  selectedDate: string | null
  isOpen: boolean
  onClose: () => void
}

const DayDrawer: React.FC<DayDrawerProps> = ({ selectedDate, isOpen, onClose }) => {
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

  // Handle "No Drink" button click
  const handleMarkNoDrink = async () => {
    if (!selectedDate) return

    setIsMarking(true)
    setMessage(null)

    try {
      const response = await apiClient.markDay(selectedDate)
      
      if (response.error) {
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
      }
    } catch (error) {
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
          >
            {isMarking ? 'Marking...' : '✓ Mark as No Drink'}
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