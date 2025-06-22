
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type LeaveCalendarProps = React.ComponentProps<typeof DayPicker> & {
  isWorkingDay?: (date: Date) => boolean;
  variant?: "vacation" | "permission";
};

function LeaveCalendar({
  className,
  classNames,
  showOutsideDays = true,
  isWorkingDay,
  variant = "vacation",
  ...props
}: LeaveCalendarProps) {
  const variantColors = {
    vacation: {
      selectedBg: "bg-emerald-600",
      selectedText: "text-white",
      selectedHover: "hover:bg-emerald-700",
      todayBg: "bg-emerald-50",
      todayText: "text-emerald-700",
      todayBorder: "border-emerald-200",
      hoverBg: "hover:bg-emerald-50",
      hoverText: "hover:text-emerald-700",
      workingDayBg: "bg-emerald-50",
      workingDayText: "text-emerald-700",
      cellSelected: "bg-emerald-600"
    },
    permission: {
      selectedBg: "bg-orange-600",
      selectedText: "text-white",
      selectedHover: "hover:bg-orange-700",
      todayBg: "bg-orange-50",
      todayText: "text-orange-700",
      todayBorder: "border-orange-200",
      hoverBg: "hover:bg-orange-50",
      hoverText: "hover:text-orange-700",
      workingDayBg: "bg-orange-50",
      workingDayText: "text-orange-700",
      cellSelected: "bg-orange-600"
    }
  };

  const colors = variantColors[variant];

  return (
    <DayPicker
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
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 pointer-events-auto"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative pointer-events-auto",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          `[&:has([aria-selected])]:${colors.cellSelected}`,
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 pointer-events-auto transition-colors",
          colors.hoverBg,
          colors.hoverText
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          colors.selectedBg,
          colors.selectedText,
          colors.selectedHover,
          colors.selectedText,
          `focus:${colors.selectedBg}`,
          colors.selectedText,
          "font-medium"
        ),
        day_today: cn(
          colors.todayBg,
          colors.todayText,
          "font-medium border",
          colors.todayBorder
        ),
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-muted aria-selected:text-muted-foreground aria-selected:opacity-100",
        day_disabled: "text-muted-foreground opacity-30 pointer-events-none",
        day_range_middle: cn(
          `aria-selected:${colors.selectedBg}`,
          colors.selectedText
        ),
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      modifiers={{
        workingDay: isWorkingDay ? (date) => isWorkingDay(date) : () => false,
        ...props.modifiers
      }}
      modifiersStyles={{
        workingDay: {
          backgroundColor: variant === "vacation" ? "#ecfdf5" : "#fff7ed",
          color: variant === "vacation" ? "#047857" : "#c2410c",
          fontWeight: "500"
        },
        ...props.modifiersStyles
      }}
      {...props}
    />
  );
}

LeaveCalendar.displayName = "LeaveCalendar";

export { LeaveCalendar };
