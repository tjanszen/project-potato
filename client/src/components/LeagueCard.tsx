import { Users, LineChart } from 'lucide-react'
import { useLocation } from 'wouter'
import { useJoinLeague, useLeaveLeague, useCompleteLeague } from '../hooks/useLeagueMembership'

interface UserMembership {
  joinedAt: string
  leftAt: string | null
  isActive: boolean
  completedAt: string | null
}

interface LeagueCardProps {
  id: number
  image_url?: string
  tag: string
  title: string
  description: string
  users: number
  memberCount?: number
  trending: boolean
  userMembership?: UserMembership | null
  completionMode?: boolean
}

export function LeagueCard({ id, image_url, tag, title, description, users, memberCount, trending, userMembership, completionMode = false }: LeagueCardProps) {
  console.log("Image fix applied: LeagueCard now rendering image_url")
  console.log("LeagueCard CTA rendered")
  
  const [, setLocation] = useLocation()
  
  // React Query hooks for membership mutations
  const joinMutation = useJoinLeague()
  const leaveMutation = useLeaveLeague()
  const completeMutation = useCompleteLeague()
  
  // Determine CTA button state
  const isJoined = userMembership?.isActive === true
  const isCompleted = userMembership?.completedAt !== null && userMembership?.completedAt !== undefined
  const isPending = joinMutation.isPending || leaveMutation.isPending || completeMutation.isPending
  
  // Debug logging for completion mode
  if (completionMode) {
    console.log('[LEAGUE_CARD] Rendering in completion mode:', {
      id,
      title,
      userMembership,
      isCompleted,
      completedAt: userMembership?.completedAt
    })
  }
  
  const handleCardClick = () => {
    if (completionMode) {
      console.log(`Navigating to league details: ${id}`)
      setLocation(`/leagues/${id}`)
    }
  }
  
  const handleCTAClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (isPending) return
    
    if (completionMode) {
      // In completion mode, clicking marks the league as completed
      if (!isCompleted) {
        completeMutation.mutate(id)
      }
    } else {
      // In normal mode, toggle join/leave
      if (isJoined) {
        leaveMutation.mutate(id)
      } else {
        joinMutation.mutate(id)
      }
    }
  }
  return (
    <div
      role="listitem"
      onClick={handleCardClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        cursor: completionMode ? 'pointer' : 'default',
        position: 'relative'
      }}
      data-testid={`league-card-${id}`}
    >
      {/* League Image */}
      <div style={{
        position: 'relative',
        marginBottom: '12px'
      }}>
        <img
          src={image_url || '/assets/league_placeholder.png'}
          alt={title}
          style={{
            width: '100%',
            height: '120px',
            objectFit: 'cover',
            borderRadius: '8px',
            backgroundColor: '#f0f0f0'
          }}
        />
        
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
        {/* Bottom left: Members */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#666',
          fontSize: '14px'
        }}>
          <Users size={16} />
          <span>{memberCount ?? users}</span>
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

      {/* CTA Button - Strava-style Join/Joined or Mark Completed/Completed */}
      <button
        onClick={handleCTAClick}
        disabled={isPending || (completionMode && isCompleted)}
        role="button"
        tabIndex={0}
        aria-label={
          completionMode
            ? (isCompleted ? `${title} league completed` : `Mark ${title} league as completed`)
            : (isJoined ? `Leave ${title} league` : `Join ${title} league`)
        }
        data-testid={`cta-button-${id}`}
        style={{
          width: '100%',
          height: '44px',
          marginTop: '16px',
          backgroundColor: completionMode
            ? (isCompleted ? '#28A745' : '#FF5A1F')
            : (isJoined ? '#28A745' : '#FF5A1F'),
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: (isPending || (completionMode && isCompleted)) ? 'not-allowed' : 'pointer',
          opacity: (isPending || (completionMode && isCompleted)) ? 0.7 : 1,
          transition: 'background-color 0.2s ease, opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCTAClick(e)
          }
        }}
      >
        {completionMode
          ? (isPending ? 'Completing...' : (isCompleted ? 'Completed ✓' : 'Mark Completed'))
          : (isPending ? (isJoined ? 'Leaving...' : 'Joining...') : (isJoined ? 'Joined' : 'Join'))
        }
      </button>
    </div>
  )
}