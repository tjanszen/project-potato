import { useState } from 'react'

interface CalendarGridProps {
  className?: string
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ className = '' }) => {
  // Current date state - initialize to current month/year but restricted to 2025
  const now = new Date()
  const currentYear = 2025 // Force to 2025 for this app
  const currentMonth = now.getFullYear() === 2025 ? now.getMonth() : 0 // Jan if not 2025
  
  const [displayMonth, setDisplayMonth] = useState(currentMonth)
  const [displayYear] = useState(currentYear) // Fixed to 2025

  // Month names for header display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Day labels for calendar header
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate calendar grid dates
  const getCalendarDates = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDay.getDay() // 0 = Sunday
    const daysInMonth = lastDay.getDate()
    
    const dates = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      dates.push(null)
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(day)
    }
    
    // Fill remaining cells to make 6 rows (42 total cells)
    while (dates.length < 42) {
      dates.push(null)
    }
    
    return dates
  }

  // Navigation handlers with 2025 restriction
  const goToPreviousMonth = () => {
    if (displayMonth > 0) { // Can't go before January
      setDisplayMonth(displayMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (displayMonth < 11) { // Can't go past December
      setDisplayMonth(displayMonth + 1)
    }
  }

  // Check if navigation buttons should be disabled
  const isPrevDisabled = displayMonth === 0 // January
  const isNextDisabled = displayMonth === 11 // December

  const calendarDates = getCalendarDates(displayMonth, displayYear)

  return (
    <div className={`max-w-4xl mx-auto p-5 bg-white rounded-xl shadow-lg ${className}`}>
      {/* Month Header with Navigation */}
      <div className="flex justify-between items-center mb-5 px-3">
        <button 
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 ${
            isPrevDisabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60' 
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 cursor-pointer'
          }`}
          onClick={goToPreviousMonth}
          disabled={isPrevDisabled}
          data-testid="button-prev-month"
        >
          ‹
        </button>
        
        <h2 className="text-2xl font-semibold text-gray-800 m-0" data-testid="text-current-month">
          {monthNames[displayMonth]} {displayYear}
        </h2>
        
        <button 
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 ${
            isNextDisabled 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60' 
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 cursor-pointer'
          }`}
          onClick={goToNextMonth}
          disabled={isNextDisabled}
          data-testid="button-next-month"
        >
          ›
        </button>
      </div>

      {/* Day Labels Row */}
      <div className="grid grid-cols-7 gap-px mb-3">
        {dayLabels.map(day => (
          <div key={day} className="text-center font-semibold py-3 text-gray-600 text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - 6 rows x 7 columns */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {calendarDates.map((date, index) => (
          <div
            key={index}
            className={`bg-white min-h-[60px] flex items-center justify-center relative transition-colors duration-200 ${
              date 
                ? 'cursor-pointer hover:bg-gray-50' 
                : 'bg-gray-50'
            }`}
            data-testid={date ? `cell-date-${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` : 'cell-empty'}
          >
            {date && (
              <span className="text-base font-medium text-gray-800">{date}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarGrid