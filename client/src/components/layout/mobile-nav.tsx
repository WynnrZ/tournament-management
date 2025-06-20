import { Link, useLocation } from "wouter";
import { 
  Home, 
  FilePlus, 
  Users, 
  LineChart, 
  Settings,
  Calculator,
  MessageSquare,
  LogOut
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";

export default function MobileNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const routes = useMemo(() => {
    const isAdmin = user?.userType === 'admin' || user?.isAdmin;
    
    const baseRoutes = [
      {
        path: "/",
        name: "Home",
        icon: <Home className="h-6 w-6" />,
      },
      {
        path: "/tournaments",
        name: "Tournaments",
        icon: <FilePlus className="h-6 w-6" />,
      },
      {
        path: "/leaderboards",
        name: "Leaderboards",
        icon: <LineChart className="h-6 w-6" />,
      },
      {
        path: "/feedback",
        name: "Feedback",
        icon: <MessageSquare className="h-6 w-6" />,
      },
      {
        path: "/settings",
        name: "Settings",
        icon: <Settings className="h-6 w-6" />,
      }
    ];
    
    // Admin-only routes
    const adminRoutes = [
      {
        path: "/players",
        name: "Players",
        icon: <Users className="h-6 w-6" />,
      },
      {
        path: "/formula-builder",
        name: "Formula",
        icon: <Calculator className="h-6 w-6" />,
      }
    ];
    
    return isAdmin ? [...baseRoutes, ...adminRoutes] : baseRoutes;
  }, [user]);

  return (
    <div className="fixed bottom-0 inset-x-0 z-10 bg-white border-t border-gray-200 md:hidden">
      <div className="flex overflow-x-auto scrollbar-hide px-2">
        {routes.map((route) => (
          <Link key={route.path} href={route.path}>
            <div
              className={`group flex flex-col items-center p-3 min-w-0 flex-shrink-0 ${
                (route.path === "/" && location === "/") || 
                (route.path !== "/" && location.startsWith(route.path))
                  ? "text-primary-600"
                  : "text-gray-500 hover:text-primary-600"
              }`}
            >
              {route.icon}
              <span className="text-xs mt-1 whitespace-nowrap">{route.name}</span>
            </div>
          </Link>
        ))}
        
        {/* Language Selector */}
        <div className="group flex flex-col items-center p-3 min-w-0 flex-shrink-0">
          <LanguageSelector />
        </div>
        
        {/* Logout Button */}
        <div
          onClick={() => logoutMutation.mutate()}
          className={`group flex flex-col items-center p-3 min-w-0 flex-shrink-0 cursor-pointer ${
            logoutMutation.isPending 
              ? "text-gray-400" 
              : "text-gray-500 hover:text-red-600"
          }`}
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs mt-1 whitespace-nowrap">
            {logoutMutation.isPending ? "..." : "Logout"}
          </span>
        </div>
      </div>
    </div>
  );
}
