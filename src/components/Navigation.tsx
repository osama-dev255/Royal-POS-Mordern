import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, User } from "lucide-react";

interface NavigationProps {
  title: string;
  onBack?: () => void;
  onLogout: () => void;
  username?: string;
}

export const Navigation = ({ title, onBack, onLogout, username }: NavigationProps) => {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto flex h-14 xs:h-16 sm:h-16 md:h-18 items-center justify-between px-4">
        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="px-2 xs:px-3 sm:px-4 btn-touch"
            >
              <ArrowLeft className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
              <span className="hidden xs:inline">Back</span>
            </Button>
          )}
          <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold truncate max-w-[120px] xs:max-w-[150px] sm:max-w-none">
            {title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4">
          {username && (
            <div className="flex items-center space-x-1 xs:space-x-2 text-xs xs:text-sm sm:text-base text-muted-foreground">
              <User className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{username}</span>
              <span className="sm:hidden max-w-[60px] xs:max-w-[80px] truncate text-xs xs:text-sm">
                {username}
              </span>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLogout} 
            className="px-2 xs:px-3 sm:px-4 btn-touch"
          >
            <LogOut className="h-4 w-4 xs:h-5 xs:w-5 mr-1 xs:mr-2" />
            <span className="hidden xs:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};