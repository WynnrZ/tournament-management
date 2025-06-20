import { ReactNode } from "react";
import { Link } from "wouter";
import { 
  File, 
  Zap, 
  Users, 
  Clock,
  LucideIcon 
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: "file" | "zap" | "users" | "clock";
  color: "primary" | "accent" | "indigo" | "pink";
  link: string;
  linkText: string;
}

const iconMap: Record<string, LucideIcon> = {
  file: File,
  zap: Zap,
  users: Users,
  clock: Clock,
};

const colorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary-100", text: "text-primary-600" },
  accent: { bg: "bg-accent-100", text: "text-accent-600" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600" },
  pink: { bg: "bg-pink-100", text: "text-pink-600" },
};

export default function StatCard({ title, value, icon, color, link, linkText }: StatCardProps) {
  const IconComponent = iconMap[icon];
  const colorClasses = colorMap[color];

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colorClasses.bg} rounded-md p-3`}>
            <IconComponent className={`h-6 w-6 ${colorClasses.text}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <Link href={link}>
            <a className="font-medium text-primary-600 hover:text-primary-900">{linkText}</a>
          </Link>
        </div>
      </div>
    </div>
  );
}
