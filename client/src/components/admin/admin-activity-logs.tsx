import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Shield, ClipboardCheck, UserX, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminActivityLogsProps {
  tournamentId: number;
}

type ActivityLog = {
  id: number;
  adminId: number;
  adminName: string;
  tournamentId: number;
  actionType: string;
  targetPlayerId: number | null;
  details: any;
  createdAt: string;
};

export function AdminActivityLogs({ tournamentId }: AdminActivityLogsProps) {
  // Fetch admin activity logs
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: [`/api/tournaments/${tournamentId}/admin-logs`],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        No administrator activity has been recorded yet.
      </div>
    );
  }

  function renderActionIcon(actionType: string) {
    switch (actionType) {
      case 'permission_change':
        return <Shield className="h-4 w-4 text-amber-500" />;
      case 'player_removed':
        return <UserX className="h-4 w-4 text-red-500" />;
      case 'game_record_access':
        return <ClipboardCheck className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-primary" />;
    }
  }

  function getActionLabel(actionType: string) {
    switch (actionType) {
      case 'permission_change':
        return 'Permission Change';
      case 'player_removed':
        return 'Player Removed';
      case 'game_record_access':
        return 'Recording Access';
      default:
        return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  function renderActionDetails(log: ActivityLog) {
    if (log.actionType === 'permission_change') {
      return (
        <div className="space-y-2">
          <p className="text-sm">
            {log.adminName} changed permissions for <strong>{log.details?.playerName}</strong>
          </p>
          {log.details?.changes?.map((change: any, index: number) => (
            <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-medium">{change.field}:</span>
              <Badge variant={change.old ? "default" : "outline"} className="text-[10px] h-4">
                {change.old ? "Yes" : "No"}
              </Badge>
              <span className="mx-1">→</span>
              <Badge variant={change.new ? "default" : "outline"} className="text-[10px] h-4">
                {change.new ? "Yes" : "No"}
              </Badge>
            </div>
          ))}
        </div>
      );
    }

    if (log.actionType === 'player_removed') {
      return (
        <div>
          <p className="text-sm">
            {log.adminName} removed <strong>{log.details?.playerName}</strong> from the tournament
          </p>
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        {JSON.stringify(log.details)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map(log => (
        <Card key={log.id} className="overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {renderActionIcon(log.actionType)}
                {getActionLabel(log.actionType)}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-3">
            {renderActionDetails(log)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}