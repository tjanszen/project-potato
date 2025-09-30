import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

// Types for league membership
export interface MembershipResponse {
  membership: {
    joinedAt: string
    leftAt: string | null
    isActive: boolean
    completedAt: string | null
  } | null
}

export interface MembershipMutationResponse {
  success: boolean
  membership: {
    id: string
    userId: string
    leagueId: number
    isActive: boolean
    joinedAt: string
    leftAt: string | null
    createdAt: string
    updatedAt: string
  }
  memberCount: number
}

// Hook for getting league membership status
export function useLeagueMembership(leagueId: number) {
  return useQuery<MembershipResponse>({
    queryKey: ['league-membership', leagueId],
    queryFn: () => apiClient.getLeagueMembership(leagueId) as Promise<MembershipResponse>,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Hook for joining a league
export function useJoinLeague() {
  const queryClient = useQueryClient()
  
  return useMutation<MembershipMutationResponse, Error, number>({
    mutationFn: (leagueId: number) => 
      apiClient.joinLeague(leagueId) as Promise<MembershipMutationResponse>,
    onSuccess: (_, leagueId) => {
      // Invalidate and refetch membership status
      queryClient.invalidateQueries({ queryKey: ['league-membership', leagueId] })
      // Invalidate leagues list to update member counts
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// Hook for leaving a league
export function useLeaveLeague() {
  const queryClient = useQueryClient()
  
  return useMutation<MembershipMutationResponse, Error, number>({
    mutationFn: (leagueId: number) => 
      apiClient.leaveLeague(leagueId) as Promise<MembershipMutationResponse>,
    onSuccess: (_, leagueId) => {
      // Invalidate and refetch membership status
      queryClient.invalidateQueries({ queryKey: ['league-membership', leagueId] })
      // Invalidate leagues list to update member counts
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// Hook for completing a league
export function useCompleteLeague() {
  const queryClient = useQueryClient()
  
  return useMutation<MembershipMutationResponse, Error, number>({
    mutationFn: (leagueId: number) => {
      console.log('[COMPLETION] Starting completion for league:', leagueId)
      return apiClient.completeLeague(leagueId) as Promise<MembershipMutationResponse>
    },
    onSuccess: (data, leagueId) => {
      console.log('[COMPLETION] Success response:', data)
      console.log('[COMPLETION] Invalidating queries for league:', leagueId)
      
      // Invalidate and refetch membership status
      queryClient.invalidateQueries({ queryKey: ['league-membership', leagueId] })
      // Invalidate leagues list to update completion status
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
      
      console.log('[COMPLETION] Cache invalidation complete')
    },
    onError: (error, leagueId) => {
      console.error('[COMPLETION] Error for league', leagueId, ':', error)
    },
  })
}