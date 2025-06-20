import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient, getQueryFn } from '@/lib/queryClient';
import { 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Reply, 
  Eye,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  tournament_id: string;
  user_id: string;
  message: string;
  category: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

interface Tournament {
  id: string;
  name: string;
}

export default function FeedbackManagement() {
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');

  // Get all feedback for app admin
  const { data: allFeedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['/api/admin/feedback'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get tournaments for mapping names
  const { data: tournaments = [] } = useQuery({
    queryKey: ['/api/tournaments'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Mark feedback as resolved
  const markResolvedMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      return await apiRequest('PATCH', `/api/feedback/${feedbackId}/status`, { status: 'resolved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      toast({
        title: "Feedback Updated",
        description: "Feedback marked as resolved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send response to feedback
  const sendResponseMutation = useMutation({
    mutationFn: async ({ feedbackId, message }: { feedbackId: string; message: string }) => {
      return await apiRequest('POST', `/api/feedback/${feedbackId}/responses`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/feedback'] });
      setResponseMessage('');
      setSelectedFeedback(null);
      toast({
        title: "Response Sent",
        description: "Your response has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Response Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTournamentName = (tournamentId: string) => {
    const tournament = tournaments?.find((t: Tournament) => t.id === tournamentId);
    return tournament?.name || 'Unknown Tournament';
  };

  const getStatusBadge = (feedback: Feedback) => {
    const status = feedback.status || 'pending';
    if (status === 'resolved') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Resolved
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

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

  const filteredFeedback = allFeedback?.filter((feedback: Feedback) => {
    if (filterStatus === 'all') return true;
    const status = feedback.status || 'pending';
    return status === filterStatus;
  }) || [];

  if (loadingFeedback) {
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
      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Filter:</span>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'resolved'] as const).map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-sm text-slate-600">
          {filteredFeedback.length} feedback items
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length > 0 ? (
        <div className="space-y-4">
          {filteredFeedback.map((feedback: Feedback) => (
            <Card key={feedback.id} className="bg-white/50 border-slate-200 hover:bg-white/70 transition-all">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-800">{getTournamentName(feedback.tournament_id)}</h4>
                        {getCategoryBadge(feedback.category)}
                        {getStatusBadge(feedback)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User ID: {feedback.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">{feedback.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFeedback(feedback)}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Respond
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Respond to Feedback</DialogTitle>
                          <DialogDescription>
                            Send a response to this feedback from {getTournamentName(feedback.tournament_id)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-sm text-slate-700">{feedback.message}</p>
                          </div>
                          <Textarea
                            placeholder="Type your response..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                if (responseMessage.trim()) {
                                  sendResponseMutation.mutate({
                                    feedbackId: feedback.id,
                                    message: responseMessage
                                  });
                                }
                              }}
                              disabled={!responseMessage.trim() || sendResponseMutation.isPending}
                              className="flex-1"
                            >
                              {sendResponseMutation.isPending ? 'Sending...' : 'Send Response'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {(!feedback.status || feedback.status === 'pending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markResolvedMutation.mutate(feedback.id)}
                        disabled={markResolvedMutation.isPending}
                        className="text-green-700 border-green-200 hover:bg-green-50"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {filterStatus === 'all' ? 'No Feedback Yet' : `No ${filterStatus} feedback`}
          </h3>
          <p className="text-slate-500">
            {filterStatus === 'all' 
              ? 'When players submit feedback, it will appear here for management.'
              : `There are currently no ${filterStatus} feedback items.`
            }
          </p>
        </div>
      )}
    </div>
  );
}