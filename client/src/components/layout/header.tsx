import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showNewButton?: boolean;
  onNewClick?: () => void;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
}

export default function Header({
  title,
  subtitle,
  showNewButton = false,
  onNewClick,
  searchPlaceholder = "Search...",
  onSearch
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-10 pr-4 py-2 w-64"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
          {/* New Button */}
          {showNewButton && (
            <Button onClick={onNewClick} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Job</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
