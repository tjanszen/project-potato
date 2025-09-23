import { Users, LineChart } from 'lucide-react'

interface LeagueCardProps {
  id: number
  tag: string
  title: string
  description: string
  users: number
  trending: boolean
}

export function LeagueCard({ id, tag, title, description, users, trending }: LeagueCardProps) {
  return (
    <div
      role="listitem"
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        cursor: 'default',
        position: 'relative'
      }}
      data-testid={`league-card-${id}`}
    >
      {/* Image Placeholder */}
      <div style={{
        width: '100%',
        height: '120px',
        backgroundColor: '#e0e0e0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '14px',
        marginBottom: '12px',
        position: 'relative'
      }}>
        Image Placeholder
        
        {/* Top-right tag */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: '#f0f0f0',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#666',
          fontWeight: '500'
        }}>
          {tag}
        </div>
      </div>

      {/* Header */}
      <h3 style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0 0 4px 0'
      }}>
        {title}
      </h3>

      {/* Subtext */}
      <p style={{
        fontSize: '14px',
        color: '#666',
        margin: '0 0 16px 0',
        lineHeight: '1.4'
      }}>
        {description}
      </p>

      {/* Bottom row with Users and conditionally Trending */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Bottom left: Users */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#666',
          fontSize: '14px'
        }}>
          <Users size={16} />
          <span>{users}</span>
        </div>

        {/* Bottom right: Trending (conditional) */}
        {trending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#666',
            fontSize: '14px'
          }}>
            <LineChart size={16} />
            <span>Trending</span>
          </div>
        )}
      </div>
    </div>
  )
}