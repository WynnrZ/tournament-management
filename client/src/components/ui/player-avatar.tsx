import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  player: {
    id?: string;
    name?: string;
    profileImage?: string;
    isAdmin?: boolean;
    isAppAdmin?: boolean;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg'
};

const nameClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export function PlayerAvatar({
  player,
  size = 'md',
  showBadge = false,
  showName = false,
  className,
  onClick
}: PlayerAvatarProps) {
  const initials = player?.name
    ? player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'P';

  const isClickable = !!onClick;

  const avatarContent = (
    <div className={cn("relative inline-flex items-center", className)}>
      <Avatar 
        className={cn(
          sizeClasses[size],
          isClickable && "cursor-pointer hover:opacity-80 transition-opacity",
          "ring-2 ring-white shadow-sm"
        )}
        onClick={onClick}
      >
        <AvatarImage src={player?.profileImage} alt={player?.name || 'Player'} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Admin Badge */}
      {showBadge && (player?.isAdmin || player?.isAppAdmin) && (
        <Badge 
          variant={player?.isAppAdmin ? "default" : "secondary"}
          className={cn(
            "absolute -top-1 -right-1 px-1 py-0 text-xs border-2 border-white",
            size === 'xs' && "text-[10px] px-0.5",
            size === 'sm' && "text-[10px] px-0.5",
            player?.isAppAdmin 
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" 
              : "bg-blue-100 text-blue-800"
          )}
        >
          {player?.isAppAdmin ? 'SA' : 'A'}
        </Badge>
      )}
    </div>
  );

  if (showName) {
    return (
      <div 
        className={cn(
          "flex items-center space-x-2",
          isClickable && "cursor-pointer hover:opacity-80 transition-opacity"
        )}
        onClick={onClick}
      >
        {avatarContent}
        <span className={cn("font-medium text-slate-700", nameClasses[size])}>
          {player?.name || 'Unknown Player'}
        </span>
      </div>
    );
  }

  return avatarContent;
}

// Specialized variants for common use cases
export function PlayerAvatarWithName(props: Omit<PlayerAvatarProps, 'showName'>) {
  return <PlayerAvatar {...props} showName={true} />;
}

export function AdminPlayerAvatar(props: Omit<PlayerAvatarProps, 'showBadge'>) {
  return <PlayerAvatar {...props} showBadge={true} />;
}

export function PlayerAvatarStack({ 
  players, 
  maxVisible = 3, 
  size = 'sm' 
}: { 
  players: Array<{ id?: string; name?: string; profileImage?: string }>;
  maxVisible?: number;
  size?: PlayerAvatarProps['size'];
}) {
  const visiblePlayers = players.slice(0, maxVisible);
  const remainingCount = Math.max(0, players.length - maxVisible);

  return (
    <div className="flex -space-x-2">
      {visiblePlayers.map((player, index) => (
        <PlayerAvatar
          key={player.id || index}
          player={player}
          size={size}
          className={cn("ring-2 ring-white", index > 0 && "ml-0")}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar className={cn(sizeClasses[size], "ring-2 ring-white bg-slate-100")}>
          <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-medium">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}