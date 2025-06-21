import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  MessageSquare, 
  Reply,
  CheckCircle, 
  Clock,
  User,
  Calendar
} from 'lucide-react';

interface FeedbackNotificationProps {
  notification: any;
}

export function FeedbackNotification({ notification }: FeedbackNotificationProps) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  // Get feedback responses for this notification
  const { data: feedbackResponses = [] } = useQuery({
    queryKey: ['/api/feedback', notification.data?.feedbackId, 'responses'],
    queryFn: async () => {
      if (!notification.data?.feedbackId) return [];
      const response = await fetch(`/api/feedback/${notification.data.feedbackId}/responses`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!notification.data?.feedbackId && showDetails,
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/notifications/${notification.id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleMarkAsRead = () => {
    markReadMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`transition-all ${!notification.is_read ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{notification.title}</CardTitle>
            {!notification.is_read && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">New</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {formatDate(notification.created_at)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-gray-700">
          {notification.message}
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Reply className="h-4 w-4 mr-1" />
                View Response
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Administrator Response</DialogTitle>
                <DialogDescription>
                  Response to your feedback submission
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {feedbackResponses.length > 0 ? (
                    feedbackResponses.map((response: any, index: number) => (
                      <div key={response.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Administrator</span>
                          <span className="text-sm text-gray-500">
                            {formatDate(response.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{response.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Loading response...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {!notification.is_read && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAsRead}
              disabled={markReadMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark as Read
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}