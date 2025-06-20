import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FeedbackNotification } from '@/components/feedback/feedback-notification';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/mobile-nav';
import { 
  Bell, 
  MessageSquare, 
  CheckCircle,
  Info,
  Calendar,
  Loader2
} from 'lucide-react';

export default function NotificationCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all notifications for the user
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter((n: any) => !n.is_read);
      await Promise.all(
        unreadNotifications.map((n: any) => 
          apiRequest('POST', `/api/notifications/${n.id}/read`)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "All notifications marked as read",
        description: "You're all caught up!",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'feedback_response':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'tournament_update':
        return <Calendar className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Sidebar />
      <MobileNav />
      
      <main className="flex-1 overflow-auto ml-64 lg:ml-80">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
                <p className="text-gray-600">Stay updated with important messages and responses</p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button 
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read ({unreadCount})
              </Button>
            )}
          </div>

          {notificationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
                <p className="text-gray-600">When administrators respond to your feedback or when there are important updates, you'll see them here.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[70vh]">
              <div className="space-y-4">
                {notifications.map((notification: any) => (
                  <Card key={notification.id} className={`transition-all ${!notification.is_read ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <CardTitle className="text-lg">{notification.title}</CardTitle>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 mt-1">New</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {formatDate(notification.created_at)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-gray-700 mb-4">{notification.message}</p>
                      
                      {notification.type === 'feedback_response' && (
                        <FeedbackNotification notification={notification} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </main>
    </div>
  );
}