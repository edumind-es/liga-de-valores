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

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Menu, X, LogOut, User, Shield, Wrench, BookOpen, Zap, Layers3, ChevronDown } from 'lucide-react';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import { NetworkStatusIndicator } from '@/components/offline';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DomainLink {
    to: string;
    label: string;
    shortLabel: string;
    icon: ComponentType<{ className?: string }>;
}

export function Navbar() {
    const { t } = useTranslation();
    const { user, logout, isAuthenticated } = useAuthStore();
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const closeMenu = () => setIsOpen(false);
    const toggleMenu = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const domainLinks = useMemo(() => {
        const manage: DomainLink[] = [
            { to: '/ligas', label: t('nav.panel'), shortLabel: t('nav.panel'), icon: Shield },
            { to: '/ligas/crear', label: t('nav.createLeague'), shortLabel: t('nav.createLeague', 'Nueva liga'), icon: Wrench },
            { to: '/express', label: t('nav.express', 'Marcador Express'), shortLabel: t('nav.expressShort', 'Express'), icon: Zap },
        ];

        const content: DomainLink[] = [
            { to: '/wiki-juegos', label: t('nav.wikiGames'), shortLabel: t('nav.wikiGames', 'Wiki'), icon: BookOpen },
            { to: '/faq', label: t('nav.guide'), shortLabel: t('nav.guide', 'Guía'), icon: BookOpen },
            { to: '/pin', label: t('nav.pinAccess'), shortLabel: t('nav.pinAccess', 'PIN'), icon: Shield },
        ];

        const admin: DomainLink[] = user?.is_superuser
            ? [
                { to: '/admin/proposals', label: t('nav.proposals'), shortLabel: t('nav.proposals', 'Propuestas'), icon: Shield },
                { to: '/admin/sports', label: t('nav.sports'), shortLabel: t('nav.sports', 'Deportes'), icon: Shield },
                { to: '/admin/users', label: t('nav.users'), shortLabel: t('nav.users', 'Usuarios'), icon: Shield },
                { to: '/admin/teams', label: t('nav.teams'), shortLabel: t('nav.teams', 'Equipos'), icon: Shield },
            ]
            : [];

        return { manage, content, admin };
    }, [t, user?.is_superuser]);

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `nav-link ${isActive ? 'active' : ''}`;

    const contentActive = pathname.startsWith('/wiki-juegos') || pathname.startsWith('/faq') || pathname.startsWith('/pin');
    const adminActive = pathname.startsWith('/admin/');

    const renderDomainGroup = (title: string, links: DomainLink[], isAdmin = false) => {
        if (links.length === 0) return null;
        return (
            <section className="w-full lg:w-auto">
                <p className={`text-[11px] uppercase tracking-[0.08em] font-semibold mb-1 lg:hidden ${isAdmin ? 'text-orange-300' : 'text-sub/90'}`}>
                    {title}
                </p>
                <div className="flex flex-col lg:flex-row gap-1 w-full lg:w-auto">
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} className={navLinkClass} to={to} onClick={closeMenu}>
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span className={isAdmin ? 'text-orange-200' : ''}>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </section>
        );
    };

    return (
        <nav className="navbar-edufis sticky top-0 z-50">
            <div className="container-xl flex items-center justify-between py-3 gap-3">
                <Link
                    className="flex items-center gap-3 no-underline min-w-0"
                    to={isAuthenticated ? "/ligas" : "/login"}
                    onClick={closeMenu}
                >
                    <img
                        src="/liga_logo_oficial.png"
                        alt="Logo Liga EDUmind"
                        className="lme-logo w-10 h-10 rounded-lg shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-ink text-base leading-tight truncate">Liga EDUmind</span>
                        <small className="text-sub text-xs tracking-wide uppercase">Liga de valores educativos</small>
                    </div>
                </Link>

                <button
                    className="lg:hidden text-sub hover:text-ink p-2 rounded-lg hover:bg-white/5 transition-colors"
                    type="button"
                    onClick={toggleMenu}
                    aria-label="Alternar navegación"
                    aria-expanded={isOpen}
                    aria-controls="mobile-primary-nav"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                <div className={`
                    ${isOpen ? 'flex' : 'hidden'}
                    lg:hidden
                    flex-col lg:flex-row
                    items-start lg:items-center
                    gap-4 lg:gap-3
                    absolute lg:static
                    top-[calc(100%+0.5rem)] left-3 right-3
                    rounded-3xl border border-lme-border bg-[rgba(9,16,34,0.98)] lg:bg-transparent
                    p-4 lg:p-0
                    w-auto lg:w-auto
                    max-h-[calc(100vh-6.5rem)] lg:max-h-none
                    overflow-y-auto
                    shadow-[0_24px_48px_rgba(4,10,28,0.45)] backdrop-blur-xl
                `}>
                    <div id="mobile-primary-nav" className="flex flex-col gap-3 w-full">
                        {isAuthenticated ? (
                            <>
                                {renderDomainGroup(t('nav.groupManage', 'Gestion'), domainLinks.manage)}
                                {renderDomainGroup(t('nav.groupContent', 'Contenido'), domainLinks.content)}
                                {renderDomainGroup(t('nav.groupAdmin', 'Administracion'), domainLinks.admin, true)}
                            </>
                        ) : (
                            <section className="flex flex-col lg:flex-row gap-1 w-full lg:w-auto">
                                <NavLink className={navLinkClass} to="/login" onClick={closeMenu}>
                                    <Shield className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('nav.login')}</span>
                                </NavLink>
                                <NavLink className={navLinkClass} to="/register" onClick={closeMenu}>
                                    <User className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('nav.register')}</span>
                                </NavLink>
                                {domainLinks.content.map(({ to, label, icon: Icon }) => (
                                    <NavLink key={to} className={navLinkClass} to={to} onClick={closeMenu}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                            </section>
                        )}
                    </div>

                    <div className="grid w-full gap-3 border-t border-lme-border/70 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <NetworkStatusIndicator showDetails position="navbar" />
                            <AccessibilityMenu />
                        </div>

                        {isAuthenticated && user ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Link
                                    to="/profile"
                                    onClick={closeMenu}
                                    className="status-chip status-chip--info no-underline justify-center"
                                    title="Mi Perfil e Integraciones"
                                >
                                    <User className="h-4 w-4" aria-hidden="true" />
                                    <span>{user.codigo}</span>
                                </Link>
                                <Link
                                    to="/change-password"
                                    onClick={closeMenu}
                                    className="status-chip status-chip--warning no-underline justify-center"
                                    title={t('nav.changePassword')}
                                    aria-label={t('nav.changePassword')}
                                >
                                    <span>🔑</span>
                                    <span>{t('nav.changePassword')}</span>
                                </Link>
                                <PwaInstallButton className="sm:col-span-2" />
                                <button
                                    onClick={() => { logout(); closeMenu(); }}
                                    className="status-chip status-chip--danger justify-center sm:col-span-2"
                                    aria-label={t('nav.logout')}
                                >
                                    <LogOut className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('nav.logout')}</span>
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="status-chip status-chip--success no-underline justify-center"
                                onClick={closeMenu}
                            >
                                <Shield className="h-4 w-4" aria-hidden="true" />
                                <span>{t('nav.access')}</span>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="hidden lg:flex flex-1 items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                        {isAuthenticated ? (
                            <>
                                {domainLinks.manage.map(({ to, shortLabel, icon: Icon }) => (
                                    <NavLink key={to} className={navLinkClass} to={to} onClick={closeMenu}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        <span>{shortLabel}</span>
                                    </NavLink>
                                ))}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`nav-link flex items-center gap-1.5 ${contentActive ? 'active' : ''}`}
                                            aria-label={t('nav.groupContent', 'Contenido')}
                                        >
                                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                                            <span>{t('nav.groupContent', 'Contenido')}</span>
                                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuLabel>{t('nav.groupContent', 'Contenido')}</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {domainLinks.content.map(({ to, label, icon: Icon }) => (
                                            <DropdownMenuItem key={to} asChild>
                                                <Link to={to}>
                                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                                    <span>{label}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {domainLinks.admin.length > 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`nav-link flex items-center gap-1.5 ${adminActive ? 'active' : ''}`}
                                                aria-label={t('nav.groupAdmin', 'Administracion')}
                                            >
                                                <Layers3 className="h-4 w-4" aria-hidden="true" />
                                                <span>{t('nav.groupAdmin', 'Admin')}</span>
                                                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuLabel>{t('nav.groupAdmin', 'Administración')}</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {domainLinks.admin.map(({ to, label, icon: Icon }) => (
                                                <DropdownMenuItem key={to} asChild>
                                                    <Link to={to}>
                                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                                        <span>{label}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </>
                        ) : (
                            <>
                                <NavLink className={navLinkClass} to="/login" onClick={closeMenu}>
                                    <Shield className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('nav.login')}</span>
                                </NavLink>
                                <NavLink className={navLinkClass} to="/register" onClick={closeMenu}>
                                    <User className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('nav.register')}</span>
                                </NavLink>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="nav-link flex items-center gap-1.5">
                                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                                            <span>{t('nav.groupContent', 'Contenido')}</span>
                                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {domainLinks.content.map(({ to, label, icon: Icon }) => (
                                            <DropdownMenuItem key={to} asChild>
                                                <Link to={to}>
                                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                                    <span>{label}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto mt-1 pt-3 lg:pt-0 border-t lg:border-0 border-lme-border">
                        <NetworkStatusIndicator showDetails position="navbar" />
                        <AccessibilityMenu />
                        <PwaInstallButton variant="icon" />

                        {isAuthenticated && user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="status-chip status-chip--info gap-1.5">
                                        <User className="h-4 w-4" aria-hidden="true" />
                                        <span>{user.codigo}</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[160px]">
                                    <DropdownMenuLabel className="text-xs font-medium text-sub">{user.codigo}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link to="/profile" onClick={closeMenu}>
                                            <User className="mr-2 h-4 w-4" />
                                            {t('nav.profile', 'Mi perfil')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/change-password" onClick={closeMenu}>
                                            <span className="mr-2">🔑</span>
                                            {t('nav.changePassword')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => { logout(); closeMenu(); }}
                                        className="text-red-300 focus:text-red-100"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        {t('nav.logout')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                to="/login"
                                className="status-chip status-chip--success no-underline"
                                onClick={closeMenu}
                            >
                                <Shield className="h-4 w-4" aria-hidden="true" />
                                <span>{t('nav.access')}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav >
    );
}
