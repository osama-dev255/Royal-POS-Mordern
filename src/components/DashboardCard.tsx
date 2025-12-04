import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  className 
}: DashboardCardProps) => {
  const handleClick = () => {
    console.log("DashboardCard clicked:", title);
    onClick();
  };
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group btn-touch h-full flex flex-col dashboard-card p-4 sm:p-5",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3 flex-shrink-0 px-0 pt-0">
        <div className="dashboard-card-header flex items-start gap-3">
          <div className="flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0 dashboard-card-icon p-2">
            <Icon className="text-primary flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-grow">
            <CardTitle className="text-sm sm:text-base md:text-lg font-semibold card-title">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-2 px-0 dashboard-card-content">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed card-description">{description}</p>
      </CardContent>
    </Card>
  );
};