
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
      selectedBg: "bg-black",
      selectedText: "text-white",
      selectedHover: "hover:bg-gray-800",
      todayBg: "bg-emerald-100",
      todayText: "text-emerald-800",
      todayBorder: "border-emerald-300",
      hoverBg: "hover:bg-emerald-100",
      hoverText: "hover:text-emerald-800",
      workingDayBg: "bg-emerald-50",
      workingDayText: "text-emerald-700",
      cellSelected: "bg-black"
    },
    permission: {
      selectedBg: "bg-black",
      selectedText: "text-white", 
      selectedHover: "hover:bg-gray-800",
      todayBg: "bg-orange-100",
      todayText: "text-orange-800",
      todayBorder: "border-orange-300",
      hoverBg: "hover:bg-orange-100",
      hoverText: "hover:text-orange-800",
      workingDayBg: "bg-orange-50",
      workingDayText: "text-orange-700",
      cellSelected: "bg-black"
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
        caption_label: "text-sm font-medium text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 pointer-events-auto border-gray-300 hover:bg-gray-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-600 rounded-md w-9 font-normal text-[0.8rem] font-medium",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative pointer-events-auto rounded-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal pointer-events-auto transition-all duration-200",
          "text-gray-900 border border-transparent rounded-md",
          colors.hoverBg,
          colors.hoverText,
          "hover:border-gray-300"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          colors.selectedBg,
          colors.selectedText,
          colors.selectedHover,
          "font-semibold border-black",
          `focus:${colors.selectedBg}`,
          "focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
        ),
        day_today: cn(
          colors.todayBg,
          colors.todayText,
          "font-medium border-2",
          colors.todayBorder,
          "shadow-sm"
        ),
        day_outside: "text-gray-400 opacity-50 hover:bg-gray-50 hover:text-gray-500",
        day_disabled: "text-gray-300 opacity-40 pointer-events-none cursor-not-allowed",
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
          fontWeight: "500",
          border: "1px solid " + (variant === "vacation" ? "#10b981" : "#f97316")
        },
        ...props.modifiersStyles
      }}
      {...props}
    />
  );
}

LeaveCalendar.displayName = "LeaveCalendar";

export { LeaveCalendar };
