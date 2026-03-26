"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

interface MonthPickerProps {
    value: string
    onChange: (v: string) => void
    id?: string
    className?: string
}

export default function MonthPicker({ value, onChange, id, className }: MonthPickerProps) {
    function handleChange(raw: string) {
        let digits = raw.replace(/\D/g, "")
        if (digits.length > 6) digits = digits.slice(0, 6)
        let mm = digits.slice(0, 2)
        let yyyy = digits.slice(2)
        if (mm.length === 2) {
            const m = parseInt(mm, 10)
            if (!Number.isNaN(m)) {
                if (m < 1) mm = "01"
                else if (m > 12) mm = "12"
            }
        }
        const out = mm + (yyyy ? `/${yyyy}` : "")
        onChange(out)
    }

    return (
        <Input
            id={id}
            type="text"
            inputMode="numeric"
            placeholder="MM/AAAA"
            maxLength={7}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={className}
        />
    )
}
