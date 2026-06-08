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

import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import EDUmindFooter from '@/components/EDUmindFooter';
import { APP_BUILD_INFO } from '@/lib/appBuild';

interface PublicEditorialShellProps {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

export default function PublicEditorialShell({
    title,
    description,
    eyebrow = 'Recursos pedagógicos',
    actions,
    children
}: PublicEditorialShellProps) {
    return (
        <div className="app-shell app-shell--public editorial-page min-h-screen flex flex-col">
            <a className="skip-to-content" href="#main-content">Saltar al contenido principal</a>
            <div className="lme-gradient" aria-hidden="true"></div>

            <header className="sticky top-0 z-50 w-full border-b border-[var(--editorial-border)] bg-[rgba(246,242,234,0.93)] backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg border border-[var(--editorial-border)] bg-[var(--editorial-highlight)]">
                                <Shield className="h-5 w-5 text-[#23426f]" />
                            </div>
                            <div>
                                <p className="font-display text-xl leading-tight text-[var(--editorial-ink)]">Liga EDUmind</p>
                                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--editorial-muted)]">Editorial pedagógica</p>
                            </div>
                        </div>
                        <AccessibilityMenu />
                    </div>
                    <nav className="public-subnav mt-3" aria-label="Navegacion pública">
                        <NavLink to="/wiki-juegos">Wiki de juegos</NavLink>
                        <NavLink to="/repositorio-juegos">Repositorio</NavLink>
                        <NavLink to="/faq">Guia</NavLink>
                        <NavLink to="/pin">Acceso PIN</NavLink>
                    </nav>
                </div>
            </header>

            <main id="main-content" className="flex-1 py-8 px-4">
                <div className="max-w-6xl mx-auto space-y-7">
                    <section className="editorial-hero">
                        <div className="context-header mb-0">
                            <div className="context-header__meta">
                                <p className="context-header__eyebrow">{eyebrow}</p>
                                <h1 className="context-header__title">{title}</h1>
                                {description && <p className="context-header__description">{description}</p>}
                            </div>
                            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                        </div>
                    </section>
                    {children}
                </div>
            </main>

            <EDUmindFooter
                appName="Liga EDUmind"
                version={APP_BUILD_INFO.version}
                versionStage={APP_BUILD_INFO.stage}
                feedbackUrl="mailto:contacto@edumind.es"
                homeHref="/dashboard"
                locale="es"
                hideNavigation={true}
            />
        </div>
    );
}
