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

const tableVariants = cva(
  "relative w-full overflow-auto rounded-lg border [--table-border:var(--lme-border)] [--table-head-bg:rgba(74,132,255,0.16)] [--table-head-text:var(--ink)] [--table-cell-text:var(--sub)] [--table-row-hover:rgba(90,177,255,0.08)] [--table-footer-bg:rgba(90,177,255,0.05)]",
  {
    variants: {
      variant: {
        default: "border-lme-border bg-[rgba(14,24,44,0.55)]",
        editorial:
          "surface-public-table border-[var(--editorial-border)] bg-[var(--editorial-card)] shadow-[0_1px_2px_rgba(24,39,75,0.06)] [--table-border:var(--editorial-border)] [--table-head-bg:rgba(74,132,255,0.08)] [--table-head-text:#294b7c] [--table-cell-text:var(--editorial-muted)] [--table-row-hover:rgba(74,132,255,0.06)] [--table-footer-bg:rgba(74,132,255,0.08)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
  VariantProps<typeof tableVariants> {}

const Table = React.forwardRef<
  HTMLTableElement,
  TableProps
>(({ className, variant, ...props }, ref) => (
  <div className={cn(tableVariants({ variant }), "max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain [-webkit-overflow-scrolling:touch]")}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-[var(--table-border)]", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--table-border)] bg-[var(--table-footer-bg)] font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--table-border)] transition-colors hover:bg-[var(--table-row-hover)] data-[state=selected]:bg-[var(--table-row-hover)]",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-3 py-3 text-left align-middle font-semibold text-[var(--table-head-text)] bg-[var(--table-head-bg)] sm:h-12 sm:px-4 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-3 align-middle text-[var(--table-cell-text)] sm:p-4 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-[var(--table-cell-text)]", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
