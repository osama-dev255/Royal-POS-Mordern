import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  /** Short uppercase tag rendered in the card footer, e.g. "HR" */
  badge?: string;
  /** Live secondary line in the card footer, e.g. "4 active of 6" */
  footer?: string;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  className,
  badge,
  footer
}: DashboardCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("DashboardCard clicked:", title);
    console.log("onClick function:", onClick);
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
      <CardContent className="flex-grow pt-2 px-0 dashboard-card-content flex flex-col justify-between gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed card-description">{description}</p>
        {(badge || footer) && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <div className="flex min-w-0 items-center gap-2">
              {badge && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {badge}
                </span>
              )}
              {footer && (
                <span className="truncate text-[11px] text-muted-foreground">{footer}</span>
              )}
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};