
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  conflictDates?: {
    [date: string]: {
      type: 'business_trip' | 'approved_leave' | 'existing_permission' | 'sick_leave' | 'existing_attendance';
      description: string;
      severity: 'critical' | 'warning' | 'info';
    };
  };
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  conflictDates = {},
  ...props
}: CalendarProps) {
  const getConflictClass = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const conflict = conflictDates[dateStr];
    
    if (!conflict) return '';
    
    switch (conflict.type) {
      case 'business_trip':
        return 'bg-red-500 text-white hover:bg-red-600 border-red-600';
      case 'approved_leave':
        return 'bg-orange-500 text-white hover:bg-orange-600 border-orange-600';
      case 'existing_permission':
        return 'bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-600';
      case 'sick_leave':
        return 'bg-purple-500 text-white hover:bg-purple-600 border-purple-600';
      case 'existing_attendance':
        return 'bg-blue-400 text-white hover:bg-blue-500 border-blue-500';
      default:
        return '';
    }
  };

  const getConflictTooltip = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const conflict = conflictDates[dateStr];
    return conflict?.description || '';
  };

  return (
    <DayPicker
      locale={it}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 border border-transparent"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "!bg-black !text-white hover:!bg-black hover:!text-white focus:!bg-black focus:!text-white border-black",
        day_today: "bg-blue-100 text-blue-900 border-blue-300",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Day: ({ date, ...dayProps }) => {
          const conflictClass = getConflictClass(date);
          const tooltip = getConflictTooltip(date);
          
          return (
            <button
              {...dayProps}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 border border-transparent",
                conflictClass
              )}
              title={tooltip}
            >
              {date.getDate()}
            </button>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
