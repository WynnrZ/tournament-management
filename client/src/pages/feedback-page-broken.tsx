import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Plus, Send, Filter, User, Trophy, Calendar, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Sidebar from "@/components/layout/sidebar";

const feedbackSchema = z.object({
  tournament_id: z.string().min(1, "Please select a tournament"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  title: z.string().optional(),
  priority: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface Feedback {
  id: string;
  tournament_id: string;
  user_id: string;
  title?: string;
  message: string;
  category: string;
  priority?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  tournament_name?: string;
  user_name?: string;
}

interface Tournament {
  id: string;
  name: string;
}

function PlayerFeedbackForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { data: tournaments = [] } = useQuery({
    queryKey: ["/api/my-tournaments"],
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      tournament_id: "",
      message: "",
      category: "",
      title: "",
      priority: "medium",
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. We'll review it shortly.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-feedback"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    feedbackMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tournament_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-blue-900 font-medium">Tournament</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="border-blue-200 focus:border-blue-400">
                    <SelectValue placeholder="Select a tournament" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(tournaments) && tournaments.map((tournament: Tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-blue-900 font-medium">Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="border-blue-200 focus:border-blue-400">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-blue-900 font-medium">Title (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief title for your feedback..."
                  className="border-blue-200 focus:border-blue-400 resize-none"
                  rows={1}
                  {...field}
                />
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
              <FormLabel className="text-blue-900 font-medium">Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  className="min-h-[120px] border-blue-200 focus:border-blue-400"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={feedbackMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
        </Button>
      </form>
    </Form>
  );
}

function PlayerFeedbackHistory() {
  const { data: myFeedback = [] } = useQuery({
    queryKey: ["/api/my-feedback"],
  });

  const getStatusBadge = (feedback: Feedback) => {
    const status = feedback.status || "pending";
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      reviewed: "bg-blue-100 text-blue-800 border-blue-200",
      resolved: "bg-green-100 text-green-800 border-green-200",
      closed: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || colors.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {!Array.isArray(myFeedback) || myFeedback.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>You haven't submitted any feedback yet.</p>
        </div>
      ) : (
        Array.isArray(myFeedback) && myFeedback.map((item: Feedback) => (
          <Card key={item.id} className="border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-blue-900">{item.title || "Feedback"}</CardTitle>
                {getStatusBadge(item)}
              </div>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.tournament_name && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {item.tournament_name}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600 mb-2">
                Category: {item.category}
              </p>
              <p className="whitespace-pre-wrap text-gray-700">{item.message}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function RespondDialog({ feedbackId, feedback }: { feedbackId: string; feedback: Feedback }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendResponse = async () => {
    if (!response.trim()) {
      toast({
        title: "Response required",
        description: "Please enter a response message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Response sent",
        description: "Your response has been sent to the player.",
      });
      
      setResponse("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Failed to send response",
        description: "There was an error sending your response.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
          <Send className="h-3 w-3 mr-1" />
          Respond
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-900">Respond to Feedback</DialogTitle>
          <DialogDescription>
            Responding to feedback from {feedback.user_name} in {feedback.tournament_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Original Message:</p>
            <p className="text-sm">{feedback.message}</p>
          </div>
          <Textarea 
            placeholder="Type your response here..."
            className="min-h-[100px] border-blue-200 focus:border-blue-400"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendResponse}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Sending..." : "Send Response"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminFeedbackDashboard() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: allFeedback = [] } = useQuery({
    queryKey: ["/api/feedback"],
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ["/api/tournaments"],
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    setTimeout(() => setIsRefreshing(false), 1000);
    toast({
      title: "Refreshed",
      description: "Feedback data has been updated.",
    });
  };

  const filteredFeedback = Array.isArray(allFeedback) ? allFeedback.filter((feedback: Feedback) => {
    const matchesStatus = statusFilter === "all" || (feedback.status || "pending") === statusFilter;
    const matchesCategory = categoryFilter === "all" || feedback.category === categoryFilter;
    return matchesStatus && matchesCategory;
  }) : [];

  const totalCount = Array.isArray(allFeedback) ? allFeedback.filter((feedback: Feedback) => 
    (feedback.status || "pending") !== "closed"
  ).length : 0;

  const pendingCount = Array.isArray(allFeedback) ? allFeedback.filter((f: Feedback) => 
    (f.status || "pending") === "pending"
  ).length : 0;

  const resolvedCount = Array.isArray(allFeedback) ? allFeedback.filter((f: Feedback) => 
    (f.status || "pending") === "resolved"
  ).length : 0;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/feedback/${feedbackId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({
        title: "Status updated",
        description: "Feedback status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-600">Total Active</p>
                <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <Filter className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600">Resolved</p>
                <p className="text-2xl font-bold text-green-900">{resolvedCount}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex gap-4 items-center justify-between">
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 border-blue-200">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 border-blue-200">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Auto-refresh every 30s
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.map((item: Feedback) => (
          <Card key={item.id} className="border-blue-100">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-blue-900">{item.title || "Feedback"}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.user_name || "Unknown User"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {item.tournament_name || "Unknown Tournament"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                <Badge className={`${item.category === "bug" ? "bg-red-100 text-red-800" : 
                  item.category === "feature" ? "bg-purple-100 text-purple-800" : 
                  "bg-blue-100 text-blue-800"}`}>
                  {item.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap mb-4 text-gray-700">{item.message}</p>
              <div className="flex gap-2">
                <RespondDialog feedbackId={item.id} feedback={item} />
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  onClick={() => updateStatusMutation.mutate({ 
                    feedbackId: item.id, 
                    status: (item.status || "pending") === "resolved" ? "pending" : "resolved" 
                  })}
                  disabled={updateStatusMutation.isPending}
                >
                  {(item.status || "pending") === "resolved" ? "Mark Pending" : "Mark Resolved"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="container mx-auto py-8 px-4">
          <main className="space-y-8">
            {/* Header */}
            <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-900 mb-4">
              Feedback Center
            </h1>
            <p className="text-lg text-blue-700 max-w-2xl mx-auto">
              Share your thoughts, report issues, and help us improve your tournament experience.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {user?.isAdmin ? (
              <Tabs defaultValue="admin" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-blue-100">
                  <TabsTrigger value="admin" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Admin Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="submit" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Submit Feedback
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admin">
                  <AdminFeedbackDashboard />
                </TabsContent>

                <TabsContent value="submit">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <Card className="border-blue-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-900">
                            <Plus className="h-5 w-5" />
                            Submit Feedback
                          </CardTitle>
                          <CardDescription>
                            Share your thoughts about your tournament experience.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <PlayerFeedbackForm onSuccess={() => {}} />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <Card className="border-blue-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-900">
                            <MessageSquare className="h-5 w-5" />
                            Your Feedback History
                          </CardTitle>
                          <CardDescription>
                            View your previously submitted feedback and responses.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[600px] overflow-y-auto">
                          <PlayerFeedbackHistory />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Plus className="h-5 w-5" />
                        Submit Feedback
                      </CardTitle>
                      <CardDescription>
                        Share your thoughts about your tournament experience.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlayerFeedbackForm onSuccess={() => {}} />
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <MessageSquare className="h-5 w-5" />
                        Your Feedback History
                      </CardTitle>
                      <CardDescription>
                        View your previously submitted feedback and responses.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[600px] overflow-y-auto">
                      <PlayerFeedbackHistory />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}