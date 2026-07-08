import * as React from "react"

import { cn } from "~/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const suppressOutline = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
  e.currentTarget.style.outline = "none"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onFocus, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[5px] border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#0285D3] focus:ring-2 focus:ring-[#0285D3]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        className
      )}
      style={{ outline: "none", ...style }}
      ref={ref}
      onMouseDown={suppressOutline}
      onFocus={(e) => {
        e.currentTarget.style.outline = "none"
        onFocus?.(e)
      }}
      {...props}
    />
  )
)

Input.displayName = "Input"

export { Input }
