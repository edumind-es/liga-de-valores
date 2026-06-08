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

import { NavLink, Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';
import EDUmindFooter from '@/components/EDUmindFooter';
import { APP_BUILD_INFO } from '@/lib/appBuild';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';

export default function PublicLayout() {
    return (
        <div className="app-shell app-shell--public min-h-screen flex flex-col">
            <a className="skip-to-content" href="#main-content">Saltar al contenido principal</a>
            <div className="lme-gradient" aria-hidden="true"></div>
            <header className="sticky top-0 z-50 w-full border-b border-[var(--editorial-border)] bg-[rgba(246,242,234,0.92)] backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-[var(--editorial-highlight)] p-1.5 rounded-lg shadow-sm border border-[var(--editorial-border)]">
                                <Shield className="h-6 w-6 text-[#27456f]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-semibold text-[var(--editorial-ink)] leading-tight font-display">
                                    Liga EDUmind
                                </span>
                                <span className="text-[11px] font-semibold text-[var(--editorial-muted)] tracking-[0.08em] uppercase">
                                    Espacio Publico y Pedagogico
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <AccessibilityMenu />
                        </div>
                    </div>
                    <nav className="public-subnav" aria-label="Navegacion publica">
                        <NavLink to="/wiki-juegos">Wiki de juegos</NavLink>
                        <NavLink to="/repositorio-juegos">Repositorio</NavLink>
                        <NavLink to="/faq">Guia</NavLink>
                        <NavLink to="/pin">Acceso PIN</NavLink>
                    </nav>
                </div>
            </header>
            <main id="main-content" className="pb-12 px-4 flex-1">
                <div className="max-w-7xl mx-auto py-7">
                    <Outlet />
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
