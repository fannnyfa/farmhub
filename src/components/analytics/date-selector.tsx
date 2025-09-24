"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@heroicons/react/24/outline"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface DateSelectorProps {
  selectedDate: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
}

export default function DateSelector({ 
  selectedDate, 
  onDateChange, 
  placeholder = "날짜를 선택하세요" 
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    onDateChange(date)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          locale={ko}
          disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
        />
      </PopoverContent>
    </Popover>
  )
}