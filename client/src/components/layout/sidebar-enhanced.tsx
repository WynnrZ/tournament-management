import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  FilePlus, 
  Users, 
  LineChart, 
  Settings, 
  LogOut, 
  Menu,
  Calculator,
  Shield,
  Trophy,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  BarChart3,
  Cog,
  Crown,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { ProfileMenu } from "@/components/user/profile-menu";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from "@/lib/simple-i18n";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  path?: string;
  name: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  isExpanded?: boolean;
}

export default function SidebarEnhanced() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useTranslation();
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['tournaments', 'analytics']);

  // Removed notifications functionality - moved to Settings page

  const toggleSection = (sectionName: string) => {
    const normalizedName = sectionName.toLowerCase().replace(/\s+/g, '');
    setExpandedSections(prev => 
      prev.includes(normalizedName) 
        ? prev.filter(s => s !== normalizedName)
        : [...prev, normalizedName]
    );
  };

  const menuItems = useMemo(() => {
    const isAdmin = (user as any)?.isAdmin === true || (user as any)?.is_admin === true;
    const isAppAdmin = (user as any)?.isAppAdmin === true || (user as any)?.is_app_admin === true;
    
    const baseItems: MenuItem[] = [
      {
        path: "/",
        name: t('nav.home'),
        icon: <Home className="h-5 w-5" />,
      },
      {
        path: "/tournaments",
        name: "Tournaments",
        icon: <Trophy className="h-5 w-5" />,
      },
      {
        path: "/achievements",
        name: "Achievements",
        icon: <Crown className="h-5 w-5" />,
      },
      {
        name: "Analytics",
        icon: <BarChart3 className="h-5 w-5" />,
        children: [
          {
            path: "/analytics",
            name: "My Performance",
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            path: "/leaderboards",
            name: t('nav.leaderboards'), 
            icon: <LineChart className="h-4 w-4" />,
          }
        ]
      },
      {
        path: "/feedback",
        name: "Feedback",
        icon: <MessageSquare className="h-5 w-5" />,
      },
      {
        path: "/settings",
        name: t('nav.settings'),
        icon: <Settings className="h-5 w-5" />,
      }
    ];
    
    // Admin section
    if (isAdmin || isAppAdmin) {
      const adminItems: MenuItem[] = [];
      
      if (isAdmin || isAppAdmin) {
        adminItems.push({
          name: "Tournament Management",
          icon: <Cog className="h-5 w-5" />,
          children: [
            {
              path: "/tournaments",
              name: t('nav.tournaments'),
              icon: <Trophy className="h-4 w-4" />,
            },
            {
              path: "/players",
              name: t('nav.players'),
              icon: <Users className="h-4 w-4" />,
            },
            {
              path: "/formula-builder",
              name: "Formula Builder",
              icon: <Calculator className="h-4 w-4" />,
            },
            ...(isAdmin ? [{
              path: "/email-management",
              name: "Email Management",
              icon: <Mail className="h-4 w-4" />,
            }] : [])
          ]
        });
      }

      if (isAppAdmin) {
        adminItems.push({
          name: "System Administration",
          icon: <Shield className="h-5 w-5" />,
          children: [
            {
              path: "/app-admin",
              name: t('nav.admin'),
              icon: <Shield className="h-4 w-4" />,
            }
          ]
        });
      }

      return [...baseItems, ...adminItems];
    }
    
    return baseItems;
  }, [user, t]);

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const isActive = item.path === location;
    const sectionKey = item.name.toLowerCase().replace(/\s+/g, '');
    const isExpanded = item.children && expandedSections.includes(sectionKey);
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.name} className="mb-1">
          <Collapsible open={isExpanded} onOpenChange={() => toggleSection(item.name)}>
            <CollapsibleTrigger asChild>
              <motion.button
                whileHover={{ x: 4 }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
                  depth > 0 ? 'ml-4' : ''
                } hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-sm`}
                onMouseEnter={() => setHoveredRoute(item.name)}
                onMouseLeave={() => setHoveredRoute(null)}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-slate-600 group-hover:text-indigo-600 transition-colors">
                    {item.icon}
                  </span>
                  <span className="font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                    {item.name}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                )}
              </motion.button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              <AnimatePresence>
                {isExpanded && item.children?.map((child) => (
                  <motion.div
                    key={child.path || child.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderMenuItem(child, depth + 1)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    }

    return (
      <Link key={item.path} href={item.path!}>
        <motion.div
          whileHover={{ x: 4 }}
          className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all duration-200 group mb-1 ${
            depth > 0 ? 'ml-4' : ''
          } ${
            isActive
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-sm'
          }`}
          onMouseEnter={() => setHoveredRoute(item.path!)}
          onMouseLeave={() => setHoveredRoute(null)}
        >
          <span className={`mr-3 transition-colors ${
            isActive 
              ? 'text-white' 
              : 'text-slate-600 group-hover:text-indigo-600'
          }`}>
            {item.icon}
          </span>
          <span className={`font-medium transition-colors ${
            isActive 
              ? 'text-white' 
              : 'text-slate-700 group-hover:text-indigo-700'
          }`}>
            {item.name}
          </span>
          
          {hoveredRoute === item.path && !isActive && (
            <motion.div
              layoutId="hoverIndicator"
              className="absolute right-2 w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <motion.div 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-10 bg-gradient-to-b from-slate-50 to-white shadow-2xl border-r border-slate-200/60"
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with enhanced styling */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center h-16 px-4 border-b border-slate-200/60 bg-gradient-to-r from-indigo-500 to-purple-600"
        >
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="text-xl font-bold text-white tracking-wide"
          >
            WynnrZ
          </motion.h1>
        </motion.div>

        {/* Navigation */}
        <motion.nav 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
        >
          {menuItems.map((item) => renderMenuItem(item))}
        </motion.nav>

        {/* User Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full p-4 h-auto justify-start hover:bg-indigo-50/50 transition-colors"
              >
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-10 w-10 ring-2 ring-indigo-200">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-semibold">
                      {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {(user as any)?.isAppAdmin ? "App Admin" : 
                       (user as any)?.isAdmin ? "Tournament Admin" : "Player"}
                    </p>
                  </div>
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-72 p-0 bg-white border border-slate-200 shadow-lg rounded-lg"
              side="top"
              sideOffset={8}
            >
              {/* User Header */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 ring-2 ring-indigo-200">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-semibold text-lg">
                      {user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {user?.email}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        (user as any)?.isAppAdmin ? 'bg-purple-500' : 
                        (user as any)?.isAdmin ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <p className="text-xs text-slate-500">
                        {(user as any)?.isAppAdmin ? "App Administrator" : 
                         (user as any)?.isAdmin ? "Tournament Admin" : "Player"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                    <Trophy className="h-4 w-4 mr-3 text-slate-500" />
                    My Tournaments
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                    <Settings className="h-4 w-4 mr-3 text-slate-500" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </div>

              {/* Subscription Info */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Subscription</span>
                    <span className="text-xs font-medium text-slate-700 capitalize">
                      {(user as any)?.subscriptionStatus?.replace('_', ' ') || 'Free Trial'}
                    </span>
                  </div>
                  {(user as any)?.subscriptionValidUntil && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Expires</span>
                      <span className="text-xs font-medium text-slate-700">
                        {new Date((user as any).subscriptionValidUntil).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <LanguageSelector />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span className="ml-2 text-sm">Logout</span>
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>
    </motion.div>
  );
}