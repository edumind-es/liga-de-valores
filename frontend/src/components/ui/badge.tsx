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
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-sky/30 bg-sky/15 text-sky",
        secondary:
          "border-sub/30 bg-sub/10 text-sub",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-400",
        success:
          "border-mint/30 bg-mint/15 text-mint",
        warning:
          "border-amber-400/30 bg-amber-400/15 text-amber-400",
        outline:
          "border-lme-border bg-transparent text-ink",
        mental:
          "border-transparent bg-gradient-to-r from-edufis-mental-start to-edufis-mental-end text-white shadow-sm",
        fisico:
          "border-transparent bg-gradient-to-r from-edufis-fisico-start to-edufis-fisico-end text-white shadow-sm",
        interior:
          "border-transparent bg-gradient-to-r from-edufis-interior-start to-edufis-interior-end text-[#040614] shadow-sm",
        emocional:
          "border-transparent bg-gradient-to-r from-vio to-edufis-mental-end text-white shadow-sm",
        accent:
          "border-vio/30 bg-vio/15 text-vio",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
