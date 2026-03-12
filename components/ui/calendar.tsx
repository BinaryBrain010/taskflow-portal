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
    weekdays: "grid grid-cols-7 gap-0 border-b border-border pb-2 mb-1",
    weekday: "flex h-8 items-center justify-center text-xs font-medium text-muted-foreground",
    week: "grid grid-cols-7 gap-0",
    day: "relative flex size-9 items-center justify-center p-0",
    day_button: cn(
      buttonVariants({ variant: buttonVariant, size: "icon" }),
      "size-8 rounded-full font-normal transition-colors duration-100 cursor-pointer hover:bg-muted hover:rounded-full aria-selected:opacity-100"
    ),
    selected: "!bg-teal-600 !text-white rounded-full hover:!bg-teal-600 focus:!bg-teal-600",
    today: "", // today indicator is a dot below the date, styled in DayButton
    outside: "text-muted-foreground/50",
    disabled: "text-muted-foreground/50 opacity-50 cursor-not-allowed",
    hidden: "invisible",
    range_middle: "bg-teal-50 text-teal-900 rounded-none",
    range_start: "rounded-l-full",
    range_end: "rounded-r-full",
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
    // When only from is selected (range_start, no range_end), pulse to indicate waiting for "to"
    const isRangeStartOnly = modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;
    return (
      <Button
        ref={ref}
        variant={buttonVariant}
        size="icon"
        type="button"
        className={cn(
          "size-8 font-normal transition-colors duration-100 cursor-pointer",
          "rounded-full",
          !isSelected && !isRangeMiddle && "hover:bg-muted hover:rounded-full",
          isSelected && "!bg-teal-600 !text-white hover:!bg-teal-600 focus:!bg-teal-600 w-8 h-8",
          modifiers.range_start && "rounded-l-full",
          modifiers.range_end && "rounded-r-full",
          isRangeStartOnly && "animate-pulse",
          isRangeMiddle && "!bg-teal-50 !text-teal-900 rounded-none hover:!bg-teal-50",
          modifiers.outside && "text-muted-foreground/50",
          dayClassName
        )}
        data-selected={isSelected ? true : undefined}
        data-today={modifiers.today ? true : undefined}
        data-outside={modifiers.outside ? true : undefined}
        {...rest}
      >
        <span className="flex flex-col items-center justify-center gap-0.5">
          <span>{children}</span>
          {modifiers.today && (
            <span
              className="size-1 rounded-full bg-teal-500 shrink-0"
              aria-hidden
            />
          )}
        </span>
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
