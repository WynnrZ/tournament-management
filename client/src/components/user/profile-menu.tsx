import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, ChevronDown, Settings, Home, Trophy, Crown, Calendar } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Tournament } from '@shared/schema';

export function ProfileMenu() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch tournaments the user is participating in
  const { data: userTournaments, isLoading } = useQuery({
    queryKey: ['/api/my-tournaments'],
    enabled: !!user,
  });

  // Fetch subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/my-status-debug'],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const switchTournament = (tournamentId: string) => {
    setIsOpen(false);
    setLocation(`/tournaments/${tournamentId}`);
  };

  if (!user) return null;

  // Get user's initials for the avatar
  const initials = user.name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();

  // Get subscription status badge variant
  const getSubscriptionBadge = () => {
    if (!subscriptionData) return null;
    
    const data = subscriptionData as any;
    const { subscriptionStatus, subscriptionType, subscriptionValidUntil, isExpired, needsWarning } = data;
    
    if (subscriptionStatus === 'active') {
      return (
        <Badge variant="default" className="ml-2 text-xs">
          <Crown className="w-3 h-3 mr-1" />
          {subscriptionType === 'monthly' ? 'Monthly' : 'Annual'}
        </Badge>
      );
    }
    
    if (subscriptionStatus === 'free_trial') {
      return (
        <Badge variant="secondary" className="ml-2 text-xs">
          Free Trial
        </Badge>
      );
    }
    
    if (isExpired) {
      return (
        <Badge variant="destructive" className="ml-2 text-xs">
          Expired
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full flex items-center gap-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <div className="flex items-center">
              <span className="text-sm font-medium">{user.name}</span>
              {getSubscriptionBadge()}
            </div>
            <span className="text-xs text-muted-foreground">{user.username}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={5}>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setLocation('/')}>
            <Home className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocation('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>My Tournaments</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : userTournaments && (userTournaments as any[]).length > 0 ? (
          <div className="max-h-40 overflow-y-auto">
            {(userTournaments as any[]).map((tournament: any) => (
              <DropdownMenuItem 
                key={tournament.id} 
                onClick={() => switchTournament(tournament.id)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                <span>{tournament.name}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No tournaments joined
          </div>
        )}
        
        {/* Subscription Info Section */}
        {subscriptionData && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Subscription
            </DropdownMenuLabel>
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Status: {(subscriptionData as any).subscriptionStatus || 'Free Trial'}
              {(subscriptionData as any).subscriptionValidUntil && (
                <div className="text-xs mt-1">
                  Valid until: {new Date((subscriptionData as any).subscriptionValidUntil).toLocaleDateString()}
                </div>
              )}
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600 focus:text-red-600 cursor-pointer" 
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </>
          )}
        </DropdownMenuItem>
        
        {/* Display subscription expiry warning if needed */}
        {subscriptionData && (subscriptionData as any).needsWarning && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-amber-600 bg-amber-50 rounded-sm mx-1">
              {(subscriptionData as any).daysUntilExpiry !== null && (subscriptionData as any).daysUntilExpiry <= 7
                ? `Subscription expires in ${(subscriptionData as any).daysUntilExpiry} days`
                : 'Subscription expiring soon'
              }
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}