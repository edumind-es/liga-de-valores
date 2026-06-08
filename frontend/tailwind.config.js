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

import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-body)", "Space Grotesk", "system-ui", "sans-serif"],
                display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
            },
            colors: {
                // EDUmind Brand Colors — usa canales RGB para que /opacity funcione
                mint: "rgb(var(--mint-ch) / <alpha-value>)",
                sky:  "rgb(var(--sky-ch)  / <alpha-value>)",
                vio:  "rgb(var(--vio-ch)  / <alpha-value>)",
                ink:  "rgb(var(--ink-ch)  / <alpha-value>)",
                sub:  "rgb(var(--sub-ch)  / <alpha-value>)",

                lme: {
                    primary: "var(--lme-primary)",
                    "primary-dark": "var(--lme-primary-dark)",
                    secondary: "var(--lme-secondary)",
                    accent: "var(--lme-accent)",
                    success: "var(--lme-success)",
                    warning: "var(--lme-warning)",
                    danger: "var(--lme-danger)",
                    "bg-start": "var(--lme-bg-start)",
                    "bg-end": "var(--lme-bg-end)",
                    surface: "var(--lme-surface)",
                    "surface-soft": "var(--lme-surface-soft)",
                    border: "var(--lme-border)",
                    text: "var(--lme-text)",
                    muted: "var(--lme-muted)",
                },
                edufis: {
                    "mental-start": "var(--edufis-mental-start)",
                    "mental-end": "var(--edufis-mental-end)",
                    "fisico-start": "var(--edufis-fisico-start)",
                    "fisico-end": "var(--edufis-fisico-end)",
                    "interior-start": "var(--edufis-interior-start)",
                    "interior-end": "var(--edufis-interior-end)",
                },
                // shadcn/ui compatibility
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                xl: "var(--lme-radius-xl)",
                lg: "var(--lme-radius-lg)",
                md: "var(--lme-radius-md)",
                sm: "var(--lme-radius-sm)",
            },
            boxShadow: {
                "lme": "var(--lme-shadow)",
                "glass": "0 24px 46px rgba(4, 10, 28, .55)",
            },
            backdropBlur: {
                "glass": "18px",
            },
            animation: {
                "fade-in": "fadeIn 0.4s ease-out",
                "slide-up": "slideUp 0.4s ease-out",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [animate],
}
