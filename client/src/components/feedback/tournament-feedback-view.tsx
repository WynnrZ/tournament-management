import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getQueryFn } from '@/lib/queryClient';
import { 
  MessageSquare, 
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TournamentFeedbackViewProps {
  tournamentId: string;
  tournamentName: string;
}

interface Feedback {
  id: string;
  tournament_id: string;
  user_id: string;
  message: string;
  category: string;
  status?: string;
  created_at: string;
}

export default function TournamentFeedbackView({ tournamentId, tournamentName }: TournamentFeedbackViewProps) {
  // Get feedback for specific tournament
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/feedback`],
    queryFn: getQueryFn(),
  });

  const getCategoryBadge = (category: string) => {
    const colors = {
      bug_report: 'bg-red-100 text-red-800',
      feature_request: 'bg-blue-100 text-blue-800', 
      general: 'bg-gray-100 text-gray-800',
      complaint: 'bg-orange-100 text-orange-800'
    };
    return (
      <Badge variant="outline" className={colors[category as keyof typeof colors] || colors.general}>
        {category.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (feedback: Feedback) => {
    const status = feedback.status || 'pending';
    if (status === 'resolved') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Resolved
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Needs Attention
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2 animate-pulse" />
          <p className="text-slate-500">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Tournament Feedback</h3>
          <p className="text-slate-600 text-sm">Feedback submitted for {tournamentName}</p>
        </div>
        <div className="text-sm text-slate-600">
          {feedback.length} feedback items
        </div>
      </div>

      {feedback.length > 0 ? (
        <div className="space-y-4">
          {feedback.map((item: Feedback) => (
            <Card key={item.id} className="bg-white/50 border-slate-200 hover:bg-white/70 transition-all">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(item.category)}
                        {getStatusBadge(item)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User ID: {item.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">{item.message}</p>
                  </div>

                  {/* Note for tournament admin */}
                  {(!item.status || item.status === 'pending') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 font-medium">Action Required</p>
                          <p className="text-xs text-amber-700 mt-1">
                            This feedback requires attention from the app administrator. 
                            The app admin will be able to respond and mark it as resolved.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Feedback Yet</h3>
          <p className="text-slate-500">
            No feedback has been submitted for this tournament yet.
          </p>
        </div>
      )}
    </div>
  );
}