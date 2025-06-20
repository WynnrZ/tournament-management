import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/layout/sidebar';
import { 
  Bell, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Send,
  Eye,
  UserCheck,
  UserX,
  HelpCircle
} from 'lucide-react';

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  location: z.string().optional(),
  requiresResponse: z.boolean().default(true),
});

const responseSchema = z.object({
  status: z.enum(["attending", "not_attending", "maybe"]),
  message: z.string().optional(),
});

export default function NotificationCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
      eventDate: '',
      eventTime: '',
      location: '',
      requiresResponse: true,
    },
  });

  const responseForm = useForm<z.infer<typeof responseSchema>>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      status: 'attending',
      message: '',
    },
  });

  // Fetch user's tournaments
  const { data: tournaments } = useQuery({
    queryKey: ['/api/my-tournaments'],
    enabled: !!user,
  });

  // Fetch notifications for selected tournament
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/tournaments', selectedTournament, 'notifications'],
    enabled: !!selectedTournament,
  });

  // Fetch attendance data for selected notification
  const { data: attendanceData } = useQuery({
    queryKey: ['/api/notifications', selectedNotification?.id, 'attendance'],
    enabled: !!selectedNotification && (user?.isAdmin || user?.isAppAdmin),
  });

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSchema>) => {
      const res = await apiRequest('POST', `/api/tournaments/${selectedTournament}/notifications`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', selectedTournament, 'notifications'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Notification sent!",
        description: "Your notification has been sent to all tournament participants.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send notification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Respond to notification mutation
  const respondToNotificationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof responseSchema>) => {
      const res = await apiRequest('POST', `/api/notifications/${selectedNotification.id}/respond`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments', selectedTournament, 'notifications'] });
      responseForm.reset();
      toast({
        title: "Response submitted!",
        description: "Your response has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit response",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitNotification = (data: z.infer<typeof notificationSchema>) => {
    createNotificationMutation.mutate(data);
  };

  const onSubmitResponse = (data: z.infer<typeof responseSchema>) => {
    respondToNotificationMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attending':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'not_attending':
        return <UserX className="h-4 w-4 text-red-600" />;
      case 'maybe':
        return <HelpCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attending':
        return <Badge variant="default" className="bg-green-100 text-green-800">Attending</Badge>;
      case 'not_attending':
        return <Badge variant="destructive">Not Attending</Badge>;
      case 'maybe':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Maybe</Badge>;
      default:
        return <Badge variant="outline">No Response</Badge>;
    }
  };

  const isAdmin = user?.isAdmin || user?.isAppAdmin;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto ml-64">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Notification Center
              </h1>
              <p className="text-slate-600 mt-1">
                {isAdmin ? "Send event notifications and track attendance" : "View tournament notifications and respond to events"}
              </p>
            </div>
          </div>

          {/* Tournament Selection */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center text-slate-800">
                <Bell className="h-5 w-5 mr-2 text-blue-500" />
                Select Tournament
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tournament to view notifications" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments && tournaments.length > 0 ? (
                    tournaments.map((tournament: any) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-tournaments" disabled>
                      No tournaments available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedTournament && (
            <div className="space-y-6">
              {/* Action Buttons */}
              {isAdmin && (
                <div className="flex gap-4">
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Notification
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Event Notification</DialogTitle>
                        <DialogDescription>
                          Send a notification to all tournament participants about an upcoming event or announcement.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitNotification)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Weekly Tournament Night" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Provide details about the event, what to bring, any special instructions..."
                                    className="min-h-[100px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="eventDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Event Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="eventTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Event Time</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Main Court, Community Center" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="requiresResponse"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Require Attendance Response</FormLabel>
                                  <div className="text-sm text-slate-600">
                                    Allow players to confirm their attendance
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsCreateDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createNotificationMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {createNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Notifications List */}
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-800">
                    <Calendar className="h-5 w-5 mr-2 text-green-500" />
                    Tournament Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notificationsLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading notifications...</div>
                  ) : notifications?.length > 0 ? (
                    <div className="space-y-4">
                      {notifications.map((notification: any) => (
                        <div key={notification.id} className="border rounded-lg p-4 bg-gradient-to-r from-white to-slate-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-slate-800">{notification.title}</h3>
                              <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {notification.user_response_status && getStatusBadge(notification.user_response_status)}
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    setIsAttendanceDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Attendance
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                            {notification.event_date && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(notification.event_date).toLocaleDateString()}
                              </div>
                            )}
                            {notification.event_time && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {notification.event_time}
                              </div>
                            )}
                            {notification.location && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                {notification.location}
                              </div>
                            )}
                          </div>

                          {/* Response Section */}
                          {notification.requires_response && !notification.user_response_status && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-800 mb-3">Please confirm your attendance:</p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    responseForm.setValue('status', 'attending');
                                    onSubmitResponse(responseForm.getValues());
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Attending
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    responseForm.setValue('status', 'not_attending');
                                    onSubmitResponse(responseForm.getValues());
                                  }}
                                >
                                  <UserX className="h-4 w-4 mr-1" />
                                  Not Attending
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    responseForm.setValue('status', 'maybe');
                                    onSubmitResponse(responseForm.getValues());
                                  }}
                                >
                                  <HelpCircle className="h-4 w-4 mr-1" />
                                  Maybe
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* User Response Display */}
                          {notification.user_response_status && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {getStatusIcon(notification.user_response_status)}
                                  <span className="ml-2 text-sm font-medium">
                                    Your response: {notification.user_response_status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {new Date(notification.user_response_date).toLocaleDateString()}
                                </div>
                              </div>
                              {notification.user_response_message && (
                                <p className="text-sm text-slate-600 mt-2">{notification.user_response_message}</p>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                            <span>From: {notification.created_by_name}</span>
                            <span>{new Date(notification.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No notifications yet for this tournament.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Dialog */}
          <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Attendance Summary</DialogTitle>
                <DialogDescription>
                  View who's attending "{selectedNotification?.title}"
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {attendanceData?.map((status: any) => (
                  <div key={status.status} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(status.status)}
                        <span className="ml-2 font-medium capitalize">
                          {status.status.replace('_', ' ')} ({status.count})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {status.user_names?.map((name: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}