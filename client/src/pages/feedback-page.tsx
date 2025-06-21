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
import { MessageSquare, Plus, Send, Filter, User, Trophy, Calendar, RefreshCw, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SidebarEnhanced from "@/components/layout/sidebar-enhanced";
import MobileNav from "@/components/layout/mobile-nav";

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
  const { user } = useAuth();
  
  // Use different endpoint based on user permissions
  const tournamentsEndpoint = user?.isAppAdmin ? "/api/tournaments" : "/api/my-tournaments";
  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: [tournamentsEndpoint],
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      tournament_id: "",
      message: "",
      category: "general",
      title: "",
      priority: "medium",
    },
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback! We'll review it shortly.",
      });
      form.reset();
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
    createFeedbackMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  {tournaments.map((tournament) => (
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
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement Suggestion</SelectItem>
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
          disabled={createFeedbackMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
        </Button>
      </form>
    </Form>
  );
}

function PlayerFeedbackHistory() {
  const { data: feedback = [] } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback/my-feedback"],
  });

  if (!Array.isArray(feedback) || feedback.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No feedback submitted yet.</p>
        <p className="text-sm">Your feedback will appear here once submitted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((item: Feedback) => (
        <Card key={item.id} className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-blue-900">{item.title || "Feedback"}</h4>
                <p className="text-sm text-gray-600">{item.tournament_name}</p>
              </div>
              <Badge className={`${item.category === "bug" ? "bg-red-100 text-red-800" : 
                item.category === "feature" ? "bg-purple-100 text-purple-800" : 
                "bg-blue-100 text-blue-800"}`}>
                {item.category}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-2">{item.message}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              <Badge variant="outline" className={`${
                (item.status || "pending") === "resolved" ? "border-green-200 text-green-700" :
                (item.status || "pending") === "pending" ? "border-yellow-200 text-yellow-700" :
                "border-gray-200 text-gray-700"
              }`}>
                {item.status || "pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminFeedbackDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: allFeedback = [], refetch } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback"],
    refetchInterval: 10000,
  });

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  };

  const filteredFeedback = Array.isArray(allFeedback) ? allFeedback.filter((feedback: Feedback) => {
    const statusMatch = statusFilter === "all" || (feedback.status || "pending") === statusFilter;
    const categoryMatch = categoryFilter === "all" || feedback.category === categoryFilter;
    return statusMatch && categoryMatch;
  }) : [];

  const totalCount = Array.isArray(allFeedback) ? allFeedback.filter((feedback: Feedback) => 
    feedback.status !== "archived"
  ).length : 0;

  const pendingCount = Array.isArray(allFeedback) ? allFeedback.filter((f: Feedback) => 
    (f.status || "pending") === "pending"
  ).length : 0;

  const resolvedCount = Array.isArray(allFeedback) ? allFeedback.filter((f: Feedback) => 
    f.status === "resolved"
  ).length : 0;

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFeedback = filteredFeedback.slice(startIndex, startIndex + itemsPerPage);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/feedback/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      refetch();
    },
    onError: (error: Error) => {
      console.error("Failed to update feedback status:", error);
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
          onClick={() => {
            handleStatusFilterChange("all");
            handleCategoryFilterChange("all");
          }}>
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

        <Card className="border-yellow-200 cursor-pointer hover:bg-yellow-50 transition-colors"
          onClick={() => {
            handleStatusFilterChange("pending");
            handleCategoryFilterChange("all");
          }}>
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

        <Card className="border-green-200 cursor-pointer hover:bg-green-50 transition-colors"
          onClick={() => {
            handleStatusFilterChange("resolved");
            handleCategoryFilterChange("all");
          }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600">Resolved</p>
                <p className="text-2xl font-bold text-green-900">{resolvedCount}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-48 border-blue-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
          <SelectTrigger className="w-48 border-blue-200">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {paginatedFeedback.map((item: Feedback) => (
          <Card key={item.id} className="border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-blue-900">{item.title || "Feedback"}</h4>
                    <Badge className={`${item.category === "bug" ? "bg-red-100 text-red-800" : 
                      item.category === "feature" ? "bg-purple-100 text-purple-800" : 
                      "bg-blue-100 text-blue-800"}`}>
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.user_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {item.tournament_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-gray-700">{item.message}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="outline" className={`${
                    (item.status || "pending") === "resolved" ? "border-green-200 text-green-700" :
                    (item.status || "pending") === "pending" ? "border-yellow-200 text-yellow-700" :
                    "border-gray-200 text-gray-700"
                  }`}>
                    {item.status || "pending"}
                  </Badge>
                  <Select
                    value={item.status || "pending"}
                    onValueChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                  >
                    <SelectTrigger className="w-32 h-8 border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="border-blue-200 hover:bg-blue-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={page === currentPage ? "bg-blue-600 text-white" : "border-blue-200 hover:bg-blue-50"}
              >
                {page}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="border-blue-200 hover:bg-blue-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100">
      <SidebarEnhanced />
      
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container mx-auto py-8 px-4">
            <div className="space-y-8">
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
                                Help us improve by sharing your feedback, reporting bugs, or suggesting new features.
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <PlayerFeedbackForm onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
                              }} />
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
                            Help us improve by sharing your feedback, reporting bugs, or suggesting new features.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <PlayerFeedbackForm onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
                          }} />
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
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        <MobileNav />
      </div>
    </div>
  );
}