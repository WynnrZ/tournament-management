import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Calendar, User, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const feedbackSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.enum(["bug_report", "feature_request", "general", "complaint"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tournamentId: z.string().min(1, "Please select a tournament"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface Feedback {
  id: string;
  tournament_id: string;
  title?: string;
  message: string;
  category: string;
  priority?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

interface Tournament {
  id: string;
  name: string;
}

function FeedbackForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      message: "",
      category: "general",
      priority: "medium",
      tournamentId: "",
    },
  });

  // Get tournaments where user is a participant
  const { data: tournaments = [] } = useQuery({
    queryKey: ['/api/my-tournaments'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-feedback'] });
      toast({
        title: "Feedback Submitted",
        description: "Your feedback has been sent to the tournament administrators.",
      });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    createFeedbackMutation.mutate(data);
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      bug_report: "Bug Report",
      feature_request: "Feature Request",
      general: "General",
      complaint: "Complaint"
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-red-100 text-red-800"
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Submit Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            Send feedback to tournament administrators about your experience.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tournamentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tournament" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tournaments.map((tournament: Tournament) => (
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of your feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bug_report">Bug Report</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="general">General Feedback</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Please provide detailed feedback..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFeedbackMutation.isPending}>
                {createFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user's feedback
  const { data: myFeedback = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/my-feedback'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Get tournaments for mapping names
  const { data: tournaments = [] } = useQuery({
    queryKey: ['/api/my-tournaments'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const getTournamentName = (tournamentId: string) => {
    const tournament = tournaments.find((t: Tournament) => t.id === tournamentId);
    return tournament?.name || 'Unknown Tournament';
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      bug_report: { label: "Bug Report", color: "bg-red-100 text-red-800" },
      feature_request: { label: "Feature Request", color: "bg-blue-100 text-blue-800" },
      general: { label: "General", color: "bg-gray-100 text-gray-800" },
      complaint: { label: "Complaint", color: "bg-orange-100 text-orange-800" }
    };
    const item = config[category as keyof typeof config] || config.general;
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const getStatusBadge = (feedback: Feedback) => {
    const status = feedback.status || 'pending';
    const config = {
      pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
      resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" }
    };
    const item = config[status as keyof typeof config] || config.pending;
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { label: "Low", color: "bg-green-100 text-green-800" },
      medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
      high: { label: "High", color: "bg-red-100 text-red-800" }
    };
    const item = config[priority as keyof typeof config] || config.medium;
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Loading feedback...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-8 w-8 text-primary" />
                Feedback Center
              </h1>
              <p className="text-slate-600 mt-1">
                Share your thoughts and communicate with tournament administrators
              </p>
            </div>
          </div>
          <FeedbackForm onSuccess={refetch} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{myFeedback.length}</div>
                <div className="text-sm text-slate-600">Total Feedback</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {myFeedback.filter((f: Feedback) => (f.status || 'pending') === 'pending').length}
                </div>
                <div className="text-sm text-slate-600">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {myFeedback.filter((f: Feedback) => f.status === 'resolved').length}
                </div>
                <div className="text-sm text-slate-600">Resolved</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>My Feedback History</CardTitle>
            <CardDescription>
              Track the status of your submitted feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myFeedback.length > 0 ? (
              <div className="space-y-4">
                {myFeedback.map((item: Feedback) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white/50">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-slate-900">
                            {item.title || 'Feedback'}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getCategoryBadge(item.category)}
                            {item.priority && getPriorityBadge(item.priority)}
                            {getStatusBadge(item)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </div>
                            <div>
                              Tournament: {getTournamentName(item.tournament_id)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm text-slate-700">{item.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No feedback yet</h3>
                <p className="text-slate-600 mb-4">
                  Submit your first feedback to communicate with tournament administrators.
                </p>
                <FeedbackForm onSuccess={refetch} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}