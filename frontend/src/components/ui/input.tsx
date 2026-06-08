/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  "ui-input flex h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-offset-background placeholder:text-sub/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-lme-border bg-[rgba(14,24,44,0.78)] text-ink focus-visible:border-sky file:mr-4 file:rounded-md file:border file:border-lme-border file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer file:transition-colors file:hover:bg-slate-600",
        editorial:
          "surface-public-input border-[var(--editorial-border)] bg-[var(--editorial-paper)] text-[var(--editorial-ink)] placeholder:text-[var(--editorial-muted)] focus-visible:border-[#4f76b6] focus-visible:ring-[#4f76b6] shadow-[0_1px_2px_rgba(24,39,75,0.08)] file:mr-4 file:rounded-md file:border file:border-[#b6c9e5] file:bg-[#eaf2ff] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#234470] file:cursor-pointer file:transition-colors file:hover:bg-[#dce9ff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.ComponentProps<"input">,
  VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          inputVariants({ variant }),
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
