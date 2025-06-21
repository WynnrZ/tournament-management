import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Users, Target, Calendar, MessageCircle, Heart, Share2 } from 'lucide-react';
import { PlayerAvatar } from '@/components/ui/player-avatar';
import { formatRelativeTime } from '@/lib/i18n';

interface ActivityItem {
  id: string;
  type: 'game_win' | 'achievement' | 'tournament_join' | 'leaderboard_climb';
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  message: string;
  timestamp: Date;
  likes: number;
  comments: number;
  tournamentName?: string;
}

interface ActivityFeedProps {
  tournamentId?: string;
  playerId?: string;
  limit?: number;
}

export function ActivityFeed({ tournamentId, playerId, limit = 20 }: ActivityFeedProps) {
  const [likedActivities, setLikedActivities] = useState<Set<string>>(new Set());

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', tournamentId, playerId],
    queryFn: async () => {
      const response = await fetch(`/api/activity-feed?${new URLSearchParams({
        ...(tournamentId && { tournamentId }),
        ...(playerId && { playerId }),
        limit: limit.toString()
      })}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity feed');
      }
      
      return response.json();
    }
  });

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'game_win':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'achievement':
        return <Target className="h-4 w-4 text-purple-500" />;
      case 'tournament_join':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'leaderboard_climb':
        return <Trophy className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleLike = async (activityId: string) => {
    try {
      const response = await fetch(`/api/activity/${activityId}/like`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setLikedActivities(prev => {
          const newSet = new Set(prev);
          if (newSet.has(activityId)) {
            newSet.delete(activityId);
          } else {
            newSet.add(activityId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to like activity:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Activity Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity: ActivityItem) => (
            <div key={activity.id} className="flex space-x-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <PlayerAvatar
                player={{
                  id: activity.playerId,
                  name: activity.playerName,
                  profileImage: activity.playerAvatar
                }}
                size="sm"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  {getActivityIcon(activity.type)}
                  <span className="font-medium text-slate-900">
                    {activity.playerName}
                  </span>
                  <span className="text-slate-600">{activity.message}</span>
                  {activity.tournamentName && (
                    <Badge variant="secondary" className="text-xs">
                      {activity.tournamentName}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-slate-500">
                    {formatRelativeTime(new Date(activity.timestamp))}
                  </span>
                  
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(activity.id)}
                      className={`text-sm ${
                        likedActivities.has(activity.id) 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-slate-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${
                        likedActivities.has(activity.id) ? 'fill-current' : ''
                      }`} />
                      {activity.likes + (likedActivities.has(activity.id) ? 1 : 0)}
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="text-sm text-slate-500 hover:text-blue-500">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {activity.comments}
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="text-sm text-slate-500 hover:text-blue-500">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {activities?.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No recent activity to show</p>
            <p className="text-sm">Play some games to see activity here!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}