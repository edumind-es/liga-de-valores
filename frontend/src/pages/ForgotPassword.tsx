/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, ShieldQuestion, Send, CheckCircle } from 'lucide-react';
import EDUmindFooter from '@/components/EDUmindFooter';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import { APP_BUILD_INFO } from '@/lib/appBuild';
import { apiClient } from '@/api/client';
import { getErrorMessage } from '@/utils/apiUtils';

export default function ForgotPassword() {
    const { t } = useTranslation();
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await apiClient.forgotPassword(identifier);
            setSent(true);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="lme-body min-h-screen flex flex-col">
            <div className="lme-gradient"></div>

            <nav className="navbar-edufis">
                <div className="container-xl flex items-center justify-between">
                    <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
                        <img src="/liga_logo_oficial.png" alt="Logo Liga EDUmind" className="lme-logo" width="40" height="40" />
                        <div className="d-flex flex-column">
                            <span className="fw-semibold text-ink">Liga EDUmind</span>
                            <small className="text-sub" style={{ fontSize: '0.75rem' }}>Los Mundos Edufis</small>
                        </div>
                    </Link>
                    <AccessibilityMenu />
                </div>
            </nav>

            <main className="lme-main flex-grow flex items-center justify-center py-8">
                <div className="container-xl">
                    <section className="lme-shell auth-login-shell max-w-lg mx-auto" aria-labelledby="forgot-title">
                        <div className="auth-login-panel" style={{ maxWidth: '100%' }}>
                            <header className="auth-login-header">
                                <span className="auth-login-kicker">
                                    {t('auth.accountRecovery', 'Recuperar acceso')}
                                </span>
                                <div className="auth-login-title-row">
                                    <div className="auth-login-title-icon" aria-hidden="true">
                                        <ShieldQuestion className="h-5 w-5 text-[#040614]" />
                                    </div>
                                    <h1 id="forgot-title" className="auth-login-title">
                                        {t('auth.forgotPasswordTitle', '¿Olvidaste tu contraseña?')}
                                    </h1>
                                </div>
                            </header>

                            {sent ? (
                                <div className="auth-login-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="p-4 rounded-xl border border-lme-border bg-[rgba(11,20,37,0.5)] text-center">
                                        <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                                        <p className="text-ink text-sm font-semibold mb-2">
                                            {t('auth.resetEmailSent', 'Correo enviado')}
                                        </p>
                                        <p className="text-sub text-sm leading-relaxed">
                                            {t('auth.resetEmailSentDesc', 'Si tu cuenta tiene un email asociado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.')}
                                        </p>
                                    </div>

                                    <Link
                                        to="/login"
                                        className="btn-lme w-100 text-center"
                                        style={{ display: 'block', textDecoration: 'none' }}
                                    >
                                        <ArrowLeft className="h-4 w-4 inline mr-2" aria-hidden="true" />
                                        {t('auth.backToLogin', 'Volver al inicio de sesión')}
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="auth-login-form">
                                    <p className="text-sub text-sm leading-relaxed mb-4">
                                        {t('auth.forgotPasswordDesc', 'Introduce tu nombre de usuario o email y te enviaremos un enlace para restablecer tu contraseña.')}
                                    </p>

                                    {error && (
                                        <div className="alert alert-danger d-flex align-items-center gap-2 auth-login-alert" role="alert" aria-live="assertive">
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="auth-login-field">
                                        <label htmlFor="identifier" className="form-label flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-sub" aria-hidden="true" />
                                            {t('auth.usernameOrEmail', 'Usuario o email')}
                                        </label>
                                        <input
                                            id="identifier"
                                            type="text"
                                            className="form-control"
                                            placeholder={t('auth.forgotPlaceholder', 'Tu nombre de usuario o email')}
                                            required
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            autoComplete="username"
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-lme w-100 auth-login-submit flex items-center justify-center gap-2"
                                    >
                                        <Send className="h-4 w-4" aria-hidden="true" />
                                        {isLoading
                                            ? t('auth.sending', 'Enviando...')
                                            : t('auth.sendResetLink', 'Enviar enlace de recuperación')}
                                    </button>

                                    <Link
                                        to="/login"
                                        className="auth-login-quick-link flex items-center justify-center gap-2 mt-4"
                                    >
                                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                        {t('auth.backToLogin', 'Volver al inicio de sesión')}
                                    </Link>
                                </form>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <EDUmindFooter
                appName="Liga EDUmind"
                version={APP_BUILD_INFO.version}
                versionStage={APP_BUILD_INFO.stage}
                feedbackUrl="mailto:contacto@edumind.es"
                locale="es"
                hideNavigation={true}
            />
        </div>
    );
}
