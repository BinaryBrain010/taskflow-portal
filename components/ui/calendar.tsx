"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Use "dropdown" for month/year selects; "label" for arrows only. */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  /** Button variant for nav and day cells. */
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  /** Optional extra classNames merged with defaults. */
  classNames?: Partial<React.ComponentProps<typeof DayPicker>["classNames"]>;
};

/**
 * Shadcn/Radix-style Calendar (see https://ui.shadcn.com/docs/components/radix/calendar).
 * Built on react-day-picker; supports --cell-size, dropdown caption, and full customization.
 */
function Calendar({
  className,
  classNames: classNamesProp,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters: formattersProp,
  components: componentsProp,
  ...props
}: CalendarProps) {
  const classNames = {
    root: "rdp p-0",
    months: "relative flex flex-col gap-5 sm:flex-row",
    month: "flex w-full flex-col gap-4",
    month_caption: "flex h-10 w-full items-center justify-center gap-1 relative",
    nav: "absolute inset-x-0 top-0 flex items-center justify-between pointer-events-none [&>button]:pointer-events-auto",
    button_previous: cn(
      buttonVariants({ variant: buttonVariant, size: "icon" }),
      "size-7 shrink-0 rounded-full p-0 hover:bg-muted transition-colors duration-100"
    ),
    button_next: cn(
      buttonVariants({ variant: buttonVariant, size: "icon" }),
      "size-7 shrink-0 rounded-full p-0 hover:bg-muted transition-colors duration-100"
    ),
    weekdays: "grid grid-cols-7 gap-0 border-none pb-2 mb-1",
    weekday: "flex h-9 w-9 items-center justify-center text-sm font-medium text-muted-foreground border-none",
    week: "grid grid-cols-7 gap-0 border-none",
    day: "rdp-day relative flex size-9 w-9 h-9 items-center justify-center p-0 border-none text-center text-sm",
    day_button: cn(
      "rdp-day_button",
      buttonVariants({ variant: buttonVariant, size: "icon" }),
      "size-8 w-8 h-8 rounded-full font-normal transition-colors duration-100 cursor-pointer",
      "flex items-center justify-center mx-auto"
    ),
    // Omit selected, range_start, range_end, range_middle so DayPicker defaults (rdp-selected, etc.) apply; globals.css overrides them
    today: "",
    outside: "text-muted-foreground/50",
    disabled: "text-muted-foreground/50 opacity-50 cursor-not-allowed",
    hidden: "invisible",
    ...classNamesProp,
  };

  const formatters = {
    formatMonthDropdown: (date: Date) => date.toLocaleString("default", { month: "short" }),
    formatYearDropdown: (date: Date) => date.getFullYear().toString(),
    ...formattersProp,
  };

  const ChevronComponent = ({
    orientation = "left",
    className: chevronClassName,
    size = 16,
    ...rest
  }: {
    orientation?: "left" | "right" | "up" | "down";
    className?: string;
    size?: number;
    disabled?: boolean;
  }) => {
    const style = { width: size, height: size };
    if (orientation === "down") {
      return <ChevronDown className={cn("size-4", chevronClassName)} style={style} {...rest} />;
    }
    if (orientation === "up") {
      return <ChevronRight className={cn("size-4 rotate-[-90deg]", chevronClassName)} style={style} {...rest} />;
    }
    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
    return <Icon className={cn("size-4", chevronClassName)} style={style} {...rest} />;
  };

  const DayButtonComponent = ({
    day,
    modifiers,
    className: dayClassName,
    children,
    ...rest
  }: {
    day: { date: Date };
    modifiers: {
      selected?: boolean;
      today?: boolean;
      outside?: boolean;
      focused?: boolean;
      range_start?: boolean;
      range_end?: boolean;
      range_middle?: boolean;
    };
    className?: string;
    children?: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const ref = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => {
      if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);
    const isRangeEnd = modifiers.range_start || modifiers.range_end;
    const isSelected = modifiers.selected || isRangeEnd;
    const isRangeMiddle = modifiers.range_middle && !isRangeEnd;
    const isRangeStartOnly = modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;
    return (
      <Button
        ref={ref}
        variant={buttonVariant}
        size="icon"
        type="button"
        className={cn(
          "size-8 w-8 h-8 rounded-full font-normal transition-colors duration-100 cursor-pointer",
          "flex items-center justify-center mx-auto",
          modifiers.range_start && "rounded-l-full",
          modifiers.range_end && "rounded-r-full",
          isRangeStartOnly && "animate-pulse",
          modifiers.outside && "text-muted-foreground/50",
          dayClassName
        )}
        data-selected={isSelected ? true : undefined}
        data-today={modifiers.today ? true : undefined}
        data-outside={modifiers.outside ? true : undefined}
        {...rest}
      >
        {children}
      </Button>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      formatters={formatters}
      className={cn(
        "[[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        className
      )}
      classNames={classNames}
      components={{
        Chevron: ChevronComponent,
        DayButton: DayButtonComponent,
        ...componentsProp,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
