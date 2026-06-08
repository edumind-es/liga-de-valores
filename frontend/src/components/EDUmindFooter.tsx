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

import './EDUmindFooter.css';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';

interface NavigationLink {
    href: string;
    label?: string;
}

interface EDUmindFooterProps {
    appName: string;
    version: string;
    versionStage?: 'Alpha' | 'Beta' | 'Stable' | 'RC';
    author?: string;
    year?: number;
    previousPage?: NavigationLink;
    nextPage?: NavigationLink;
    homeHref?: string;
    feedbackUrl?: string;
    feedbackLabel?: string;
    className?: string;
    locale?: 'es' | 'en' | 'zh';
    hideNavigation?: boolean;
    showVersion?: boolean;
    density?: 'full' | 'compact';
}

interface FooterTranslations {
    previous: string;
    next: string;
    copyright: string;
    feedback: string;
    updateApp: string;
    updatingApp: string;
    home: string;
    legal: string;
    version: string;
    appId: string;
    technicalVersion: string;
}

const translations: Record<string, FooterTranslations> = {
    es: {
        previous: 'Anterior',
        next: 'Siguiente',
        copyright: '© {year} EDUmind por',
        feedback: 'Reportar incidencia',
        updateApp: 'Actualizar app',
        updatingApp: 'Actualizando...',
        home: 'Inicio',
        legal: 'Legal y privacidad',
        version: 'Version',
        appId: 'App',
        technicalVersion: 'Version tecnica'
    },
    en: {
        previous: 'Previous',
        next: 'Next',
        copyright: '© {year} EDUmind by',
        feedback: 'Report issue',
        updateApp: 'Update app',
        updatingApp: 'Updating...',
        home: 'Home',
        legal: 'Legal and privacy',
        version: 'Version',
        appId: 'App',
        technicalVersion: 'Technical version'
    },
    zh: {
        previous: '上一页',
        next: '下一页',
        copyright: '© {year} EDUmind 由',
        feedback: '报告问题',
        updateApp: '更新应用',
        updatingApp: '更新中...',
        home: '首页',
        legal: '隐私与法律',
        version: '版本',
        appId: '应用',
        technicalVersion: '技术版本'
    }
};

export default function EDUmindFooter({
    appName,
    version,
    versionStage,
    author = 'Luis Vilela Acuña',
    year = new Date().getFullYear(),
    previousPage,
    nextPage,
    homeHref,
    feedbackUrl,
    feedbackLabel,
    className = '',
    locale = 'es',
    hideNavigation = false,
    showVersion = true,
    density = 'full'
}: EDUmindFooterProps) {
    const t = translations[locale] || translations.es;
    const [isUpdatingApp, setIsUpdatingApp] = useState(false);
    const [canManuallyUpdate, setCanManuallyUpdate] = useState(false);
    const visibleVersion = version.split('+')[0] || version;
    const technicalVersion = versionStage ? `v${version} (${versionStage})` : `v${version}`;
    const versionBadge = versionStage ? `v${visibleVersion} · ${versionStage}` : `v${visibleVersion}`;
    const versionLabel = `${t.version} ${versionBadge}`;
    const appIdentifier = appName;
    const compact = density === 'compact';
    const resolvedFeedbackUrl = useMemo(() => {
        const candidate = feedbackUrl?.trim();
        return candidate && candidate.length > 0 ? candidate : 'mailto:contacto@edumind.es';
    }, [feedbackUrl]);
    const feedbackLinkProps = resolvedFeedbackUrl.startsWith('mailto:')
        ? {}
        : {
            target: '_blank',
            rel: 'noopener noreferrer',
        };

    useEffect(() => {
        setCanManuallyUpdate(typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator);
    }, []);

    const handleManualAppUpdate = async (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        if (isUpdatingApp) return;

        setIsUpdatingApp(true);
        const now = Date.now();

        try {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(async (registration) => {
                        try {
                            await registration.update();
                        } catch {
                            // Ignore update errors and continue with reload strategy.
                        }
                        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                    })
                );
            }
        } finally {
            const url = new URL(window.location.href);
            url.searchParams.set('app_update', String(now));
            window.location.replace(url.toString());
        }
    };

    return (
        <footer className={`edumind-footer ${compact ? 'edumind-footer--compact' : ''} ${className}`} aria-label={`Footer ${appName}`}>
            {!hideNavigation && (previousPage || nextPage || homeHref) && (
                <nav className="footer-nav" aria-label="Navegación de contenido">
                    {previousPage && (
                        <a href={previousPage.href} className="nav-btn nav-btn-prev">
                            {previousPage.label || t.previous}
                        </a>
                    )}

                    {homeHref && (
                        <a href={homeHref} className="nav-btn nav-btn-home">
                            {t.home}
                        </a>
                    )}

                    {nextPage && (
                        <a href={nextPage.href} className="nav-btn nav-btn-next">
                            {nextPage.label || t.next}
                        </a>
                    )}
                </nav>
            )}

            <div className="footer-main">
                <div className="footer-info">
                    <p className="footer-app"><strong>{appName}</strong></p>
                    <p className="footer-copyright">
                        {t.copyright.replace('{year}', year.toString())}{' '}
                        <strong>{author}</strong>
                    </p>
                    {showVersion && (
                        <p
                            className="footer-version-inline"
                            title={`${t.technicalVersion}: ${technicalVersion}`}
                            aria-label={`${t.appId} ${appIdentifier}. ${t.technicalVersion} ${technicalVersion}`}
                        >
                            <span className="footer-version-inline__label">{t.appId}</span>
                            <span className="footer-version-inline__value">{appIdentifier}</span>
                        </p>
                    )}
                </div>

                <div className="footer-links-group">
                    <div className="footer-legal" aria-label={t.legal}>
                        <a href="https://edumind.es/es/legal/privacidad" target="_blank" rel="noopener noreferrer">Privacidad</a>
                        <span aria-hidden="true">·</span>
                        <a href="https://edumind.es/es/legal" target="_blank" rel="noopener noreferrer">Aviso legal</a>
                        <span aria-hidden="true">·</span>
                        <a href="https://edumind.es/es/legal/cookies" target="_blank" rel="noopener noreferrer">Cookies</a>
                        <span aria-hidden="true">·</span>
                        <a href="https://edumind.es/es/legal/ia" target="_blank" rel="noopener noreferrer">Política de IA</a>
                        <span aria-hidden="true">·</span>
                        <a href="/proponer-deporte">Proponer deporte</a>
                        <span aria-hidden="true">·</span>
                        <a href="https://donar.edumind.es" target="_blank" rel="noopener noreferrer" className="footer-support">
                            Apoyar
                        </a>
                    </div>
                    <div className="footer-social" aria-label="Comunidad EDUmind">
                        <a href="https://t.me/EDUmind_es" target="_blank" rel="noopener noreferrer">Telegram</a>
                        <a href="https://instagram.com/edumind_es" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="https://x.com/edumind_es" target="_blank" rel="noopener noreferrer">X</a>
                        <a href="https://mastodon.social/@EDUmind" target="_blank" rel="noopener noreferrer">Mastodon</a>
                        <a href="https://blog.edumind.es" target="_blank" rel="noopener noreferrer">Blog</a>
                    </div>
                </div>
            </div>

            <div className="footer-meta">
                {showVersion && (
                    <span
                        className="badge version-badge"
                        title={`${t.technicalVersion}: ${technicalVersion}`}
                        aria-label={`${appName} ${versionLabel}. ${t.technicalVersion} ${technicalVersion}`}
                    >
                        {versionLabel}
                    </span>
                )}
                {canManuallyUpdate && (
                    <a
                        href="#actualizar-app"
                        className="feedback-link"
                        aria-label={isUpdatingApp ? t.updatingApp : t.updateApp}
                        onClick={handleManualAppUpdate}
                    >
                        {isUpdatingApp ? t.updatingApp : t.updateApp}
                    </a>
                )}
                {resolvedFeedbackUrl && (
                    <a
                        href={resolvedFeedbackUrl}
                        className="feedback-link"
                        aria-label={feedbackLabel || t.feedback}
                        {...feedbackLinkProps}
                    >
                        {feedbackLabel || t.feedback}
                    </a>
                )}
            </div>
        </footer>
    );
}
