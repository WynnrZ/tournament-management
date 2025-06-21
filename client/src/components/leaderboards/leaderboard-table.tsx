import React from 'react';
import { Medal, Trophy, Users, TrendingUp, TrendingDown, Minus, Star, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedTable } from "@/components/ui/enhanced-table";
import { LeaderboardEntry, TeamLeaderboardEntry } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[] | TeamLeaderboardEntry[];
  type: 'player' | 'team';
}

export function LeaderboardTable({ entries, type }: LeaderboardTableProps) {
  // Helper functions for rendering custom elements
  const renderPosition = (value: any, item: any) => {
    const position = item.position || 1;
    
    // Determine medal for top 3 positions
    if (position === 1) {
      return <Medal className="h-5 w-5 text-yellow-500 mx-auto" />;
    } else if (position === 2) {
      return <Medal className="h-5 w-5 text-slate-400 mx-auto" />;
    } else if (position === 3) {
      return <Medal className="h-5 w-5 text-amber-700 mx-auto" />;
    }
    
    return <span className="font-medium">{position}</span>;
  };

  // Get row styling based on position
  const getRowClassName = (item: any, totalEntries: number) => {
    const position = item.position || 1;
    
    if (position === 1) {
      return "bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 hover:from-emerald-100 hover:to-green-100 shadow-sm";
    } else if (position === totalEntries && totalEntries > 1) {
      return "bg-gradient-to-r from-rose-50 to-red-50 border-l-4 border-rose-400 hover:from-rose-100 hover:to-red-100 shadow-sm";
    }
    
    return "";
  };

  const renderPoints = (value: any, item: any) => {
    const points = item.points || item.score || 0;
    const hasSpecialScoring = item.specialEvents && item.specialEvents.length > 0;
    
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold">{Math.round(points * 10) / 10}</span>
        {hasSpecialScoring && (
          <div className="flex gap-1">
            {item.specialEvents.map((event: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200"
                title={`Special Rule: ${event.description} (${event.points} pts vs ${event.opponent})`}
              >
                ⭐ {event.points}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMovement = (value: any, item: any) => {
    const movement = item.movement;
    
    if (movement?.direction === 'up') {
      return (
        <div className="flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
          <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
            {movement.positions}
          </span>
        </div>
      );
    } else if (movement?.direction === 'down') {
      return (
        <div className="flex items-center justify-center">
          <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
          <span className="text-xs bg-red-100 text-red-800 px-1 rounded">
            {movement.positions}
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center">
        <Minus className="h-4 w-4 text-gray-400" />
      </div>
    );
  };

  const renderMembers = (value: any, item: any) => {
    const memberCount = (item as TeamLeaderboardEntry).memberCount;
    return (
      <div className="flex items-center justify-center">
        <Users className="h-4 w-4 mr-1 text-muted-foreground" />
        <span>{memberCount}</span>
      </div>
    );
  };

  const renderPointsWithSpecialEvents = (value: any, item: any) => {
    const entry = item as LeaderboardEntry;
    const hasSpecialEvents = entry.specialEvents && entry.specialEvents.length > 0;
    
    if (!hasSpecialEvents) {
      return <span className="font-semibold">{value}</span>;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <span className="font-semibold">{value}</span>
              <Star className="h-4 w-4 text-amber-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">Special Scoring:</div>
              {entry.specialEvents?.map((event, index) => (
                <div key={index} className="text-sm">
                  {event.description}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Define columns based on type
  const columns = [
    {
      key: 'position',
      label: 'Position',
      sortable: true,
      className: 'w-14 text-center',
      render: renderPosition,
    },
    {
      key: 'name',
      label: type === 'player' ? 'Player' : 'Team',
      sortable: true,
      className: 'font-medium',
    },
    {
      key: 'gamesPlayed',
      label: 'Games Played',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'wins',
      label: 'Wins',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'losses',
      label: 'Losses',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'draws',
      label: 'Draws',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'points',
      label: 'Points',
      sortable: true,
      className: 'text-right',
      render: type === 'player' ? renderPointsWithSpecialEvents : renderPoints,
    },
    {
      key: 'movement',
      label: 'Movement',
      sortable: false,
      className: 'text-center',
      render: renderMovement,
    },
    ...(type === 'team' ? [{
      key: 'memberCount',
      label: 'Members',
      sortable: true,
      className: 'text-center',
      render: renderMembers,
    }] : []),
  ];

  const emptyState = (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
      <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No data yet</h3>
      <p className="text-muted-foreground">
        {type === 'player' 
          ? 'Once players participate in games, they will appear on the leaderboard.'
          : 'Once teams participate in games, they will appear on the leaderboard.'}
      </p>
    </div>
  );

  return (
    <EnhancedTable
      data={entries || []}
      columns={columns}
      searchPlaceholder={`Search ${type === 'player' ? 'players' : 'teams'}...`}
      defaultItemsPerPage={25}
      itemsPerPageOptions={[10, 25, 50, 100]}
      emptyState={emptyState}
      rowClassName={(item) => getRowClassName(item, entries?.length || 0)}
    />
  );
}