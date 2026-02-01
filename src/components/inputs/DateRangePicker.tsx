import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  minDate?: Date;
  maxDate?: Date;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Selection state
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to parse YYYY-MM-DD to local Date
  const parseDate = (str: string): Date | null => {
    if (!str) return null;
    const parts = str.split('-').map(Number);
    if (parts.length < 3) return null;
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y === undefined || m === undefined || d === undefined) return null;
    return new Date(y, m - 1, d);
  };

  // Helper to format Date to YYYY-MM-DD
  const toDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const startObj = parseDate(startDate);
  const endObj = parseDate(endDate);

  useEffect(() => {
    // initialize current month to start date if exists, otherwise now
    if (startObj) {
      setCurrentMonth(new Date(startObj));
    } else {
      setCurrentMonth(new Date());
    }
  }, [startDate, isOpen]); // Depend on startDate string

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSelecting(false);
        setTempStart(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const handleDateClick = (date: Date) => {
    if (!isSelecting) {
      // First click - start selection
      setTempStart(date);
      setIsSelecting(true);
      setHoverDate(null);
    } else {
      // Second click - complete selection
      if (tempStart) {
        let newStart = tempStart;
        let newEnd = date;

        if (date < tempStart) {
          // If clicked before start, just reset start
          setTempStart(date);
          return;
        }

        onChange(toDateString(newStart), toDateString(newEnd));
        setIsOpen(false);
        setIsSelecting(false);
        setTempStart(null);
      }
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  const isDateInRange = (date: Date) => {
    // Visualizing the committed range
    if (!isOpen && startObj && endObj) {
      return date >= startObj && date <= endObj;
    }

    // Visualizing selection in progress
    if (isSelecting && tempStart && hoverDate) {
      const start = tempStart < hoverDate ? tempStart : hoverDate;
      const end = tempStart < hoverDate ? hoverDate : tempStart;
      return date >= start && date <= end;
    }

    // Visualizing existing range while picking new start
    if (startObj && endObj && !isSelecting) {
      return date >= startObj && date <= endObj;
    }

    return false;
  };

  const isStartDate = (date: Date) => {
    if (isSelecting && tempStart) return date.getTime() === tempStart.getTime();
    return startObj && date.getTime() === startObj.getTime();
  };

  const renderCalendar = () => {
    const { days, firstDay } = getDaysInMonth(currentMonth);
    const dayElements = [];

    // Day headers
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // Previous month filler
    for (let i = 0; i < firstDay; i++) {
      dayElements.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    for (let d = 1; d <= days; d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      const disabled = isDateDisabled(date);
      const inRange = isDateInRange(date);
      const isStart = isStartDate(date);

      let bgClass = "hover:bg-gray-100";
      let textClass = "text-gray-700";

      if (isSelecting && tempStart && date < tempStart) {
        // Invalid range direction preview
        bgClass = "hover:bg-red-50 cursor-not-allowed text-gray-300";
      }

      if (inRange) {
        bgClass = "bg-indigo-50";
        if (isSelecting && tempStart && date < tempStart) bgClass = ""; // Clear range if invalid
      }

      if (isStart || (isSelecting && tempStart && date.getTime() === tempStart.getTime())) {
        bgClass = "bg-indigo-600 hover:bg-indigo-700";
        textClass = "text-white font-bold";
      }

      if (endObj && date.getTime() === endObj.getTime() && !isSelecting) {
        bgClass = "bg-indigo-600 hover:bg-indigo-700";
        textClass = "text-white font-bold";
      }

      // Hover end preview
      if (isSelecting && hoverDate && date.getTime() === hoverDate.getTime() && tempStart && date >= tempStart) {
        bgClass = "bg-indigo-400"; // Lighter blue for potential end
        textClass = "text-white";
      }

      dayElements.push(
        <button
          key={d}
          onClick={() => !disabled && handleDateClick(date)}
          onMouseEnter={() => isSelecting && setHoverDate(date)}
          disabled={disabled}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors
            ${disabled ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
            ${bgClass}
            ${textClass}
          `}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold">
            {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] text-gray-400 font-bold uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dayElements}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border rounded p-2 cursor-pointer hover:border-indigo-400 bg-white min-h-[38px]"
      >
        <CalendarIcon size={16} className="text-gray-400" />
        <span className="text-sm flex-1">
          {startObj && endObj ? (
            <>
              {formatDateDisplay(startObj)} - {formatDateDisplay(endObj)}
              <span className="ml-2 text-indigo-600 font-bold text-xs bg-indigo-50 px-1 rounded">
                {Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </span>
            </>
          ) : (
            <span className="text-gray-400">Select Dates</span>
          )}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border z-50 w-64 p-2">
          {isSelecting && (
            <div className="mb-2 text-xs text-center text-indigo-600 font-medium bg-indigo-50 py-1 rounded">
              Select end date
            </div>
          )}
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};
