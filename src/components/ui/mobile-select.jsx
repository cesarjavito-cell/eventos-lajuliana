import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export function MobileSelect({ value, onValueChange, options = [], placeholder = "Seleccionar...", className = "" }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
