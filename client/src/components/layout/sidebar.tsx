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
  Bell,
  Trophy,
  Mail,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { ProfileMenu } from "@/components/user/profile-menu";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from "@/lib/simple-i18n";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  // Get unread notifications count for all users
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const routes = useMemo(() => {
    const isAdmin = (user as any)?.isAdmin === true || (user as any)?.is_admin === true;
    const isAppAdmin = (user as any)?.isAppAdmin === true || (user as any)?.is_app_admin === true;
    
    const baseRoutes = [
      {
        path: "/",
        name: t('nav.home'),
        icon: <Home className="mr-3 h-5 w-5" />,
      },
      {
        path: "/tournaments",
        name: t('nav.tournaments'),
        icon: <FilePlus className="mr-3 h-5 w-5" />,
      },
      {
        path: "/leaderboards",
        name: t('nav.leaderboards'), 
        icon: <LineChart className="mr-3 h-5 w-5" />,
      },
      {
        path: "/achievements",
        name: "Achievements",
        icon: <Trophy className="mr-3 h-5 w-5" />,
      },
      {
        path: "/feedback",
        name: "Feedback",
        icon: <MessageSquare className="mr-3 h-5 w-5" />,
      },
      {
        path: "/notifications",
        name: t('nav.notifications'),
        icon: (
          <div className="relative mr-3">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        ),
      },
      {
        path: "/settings",
        name: t('nav.settings'),
        icon: <Settings className="mr-3 h-5 w-5" />,
      }
    ];
    
    // Admin-only routes
    const adminRoutes = [
      {
        path: "/players",
        name: t('nav.players'),
        icon: <Users className="mr-3 h-5 w-5" />,
      },
      {
        path: "/formula-builder",
        name: "Formula Builder",
        icon: <Calculator className="mr-3 h-5 w-5" />,
      },
      {
        path: "/email-management",
        name: "Email Management",
        icon: <Mail className="mr-3 h-5 w-5" />,
      }
    ];

    // App Admin-only routes
    const appAdminRoutes = [
      {
        path: "/app-admin",
        name: t('nav.admin'),
        icon: <Shield className="mr-3 h-5 w-5" />,
      }
    ];
    
    let finalRoutes = baseRoutes;
    if (isAdmin) finalRoutes = [...finalRoutes, ...adminRoutes];
    if (isAppAdmin) finalRoutes = [...finalRoutes, ...appAdminRoutes];
    
    return finalRoutes;
  }, [user]);

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

        {/* Navigation with sophisticated animations */}
        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
          <nav className="mt-2 px-3 space-y-2">
            {routes.map((route, index) => {
              const isActive = (route.path === "/" && location === "/") || 
                             (route.path !== "/" && location.startsWith(route.path));
              
              return (
                <motion.div
                  key={route.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  onHoverStart={() => setHoveredRoute(route.path)}
                  onHoverEnd={() => setHoveredRoute(null)}
                  className="relative"
                >
                  <Link
                    href={route.path}
                    className={`group relative flex items-center px-4 py-3 rounded-xl font-medium cursor-pointer transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:transform hover:scale-105"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    {/* Hover effect */}
                    {hoveredRoute === route.path && !isActive && (
                      <motion.div
                        layoutId="hoverTab"
                        className="absolute inset-0 rounded-xl bg-slate-100"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    {/* Content */}
                    <span className="relative z-10 flex items-center">
                      <motion.span
                        animate={{ 
                          rotate: isActive ? 360 : 0,
                          scale: hoveredRoute === route.path ? 1.1 : 1
                        }}
                        transition={{ duration: 0.3 }}
                        className="mr-3"
                      >
                        {route.icon}
                      </motion.span>
                      <span className="font-medium tracking-wide">{route.name}</span>
                    </span>
                    
                    {/* Subtle glow effect for active item */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-sm"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>
        
        {/* Language Selector */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex-shrink-0 px-4 py-2 border-t border-slate-200/60"
        >
          <LanguageSelector />
        </motion.div>

        {/* Enhanced user profile section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex-shrink-0 border-t border-slate-200/60 p-4 bg-gradient-to-r from-slate-50 to-gray-50"
        >
          <ProfileMenu />
        </motion.div>
      </div>
    </motion.div>
  );
}
