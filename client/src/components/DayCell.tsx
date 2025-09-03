interface DayCellProps {
  date: number | null
  month: number // 0-based (0 = January)
  year: number
  isSelected: boolean
  isMarked?: boolean // Whether this day is marked as "No Drink"
  isDisabled?: boolean // Whether this day should be disabled (future dates)
  onSelect: (date: string) => void
  className?: string
}

const DayCell: React.FC<DayCellProps> = ({ 
  date, 
  month, 
  year, 
  isSelected,
  isMarked = false,
  isDisabled = false,
  onSelect,
  className = '' 
}) => {
  // Handle click for valid dates only (not disabled)
  const handleClick = () => {
    if (date && !isDisabled) {
      // Format date as YYYY-MM-DD
      const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      onSelect(formattedDate)
    }
  }

  // Determine cell classes based on state
  const getCellClasses = () => {
    const baseClasses = 'date-cell'
    
    if (!date) {
      return `${baseClasses} empty-date`
    }
    
    const classes = [baseClasses, 'valid-date']
    
    if (isDisabled) {
      classes.push('disabled')
    } else if (isSelected) {
      classes.push('selected')
    }
    
    if (isMarked) {
      classes.push('marked')
    }
    
    return classes.join(' ')
  }

  return (
    <div
      className={`${getCellClasses()} ${className}`}
      onClick={handleClick}
      data-testid={date ? `cell-date-${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}` : 'cell-empty'}
    >
      {date && (
        <>
          <span className="date-number">{date}</span>
          {isMarked && <div className="marked-indicator" data-testid={`indicator-marked-${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`}></div>}
        </>
      )}
    </div>
  )
}

export default DayCell