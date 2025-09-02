interface DayCellProps {
  date: number | null
  month: number // 0-based (0 = January)
  year: number
  isSelected: boolean
  onSelect: (date: string) => void
  className?: string
}

const DayCell: React.FC<DayCellProps> = ({ 
  date, 
  month, 
  year, 
  isSelected, 
  onSelect,
  className = '' 
}) => {
  // Handle click for valid dates only
  const handleClick = () => {
    if (date) {
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
    
    if (isSelected) {
      classes.push('selected')
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
        <span className="date-number">{date}</span>
      )}
    </div>
  )
}

export default DayCell