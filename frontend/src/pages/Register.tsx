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

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, UserPlus, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import EDUmindFooter from '@/components/EDUmindFooter';
import AccessibilityMenu from '@/components/accessibility/AccessibilityMenu';
import { APP_BUILD_INFO } from '@/lib/appBuild';

export default function Register() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();

    const [codigo, setCodigo] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
    const [validationError, setValidationError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setValidationError('');

        if (password.length < 6) {
            setValidationError(t('auth.passwordMinError'));
            return;
        }

        if (password !== passwordConfirm) {
            setValidationError(t('auth.passwordMismatch'));
            return;
        }

        if (!aceptaPrivacidad) {
            setValidationError(t('auth.privacyRequired'));
            return;
        }

        try {
            await register(codigo, email, password, aceptaPrivacidad);
            navigate('/ligas');
        } catch (err) {
            console.error('Registration error:', err);
        }
    };

    return (
        <div className="lme-body min-h-screen flex flex-col">
            <div className="lme-gradient"></div>

            {/* Navbar */}
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
                    <div className="lme-shell max-w-5xl mx-auto">
                        <div className="login-split">
                            {/* Form Section */}
                            <div className="login-split__form">
                                <div className="login-split__form-inner">
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 rounded-lg bg-gradient-to-r from-vio to-edufis-mental-end">
                                                <UserPlus className="h-5 w-5 text-white" aria-hidden="true" />
                                            </div>
                                            <h1 className="text-2xl font-bold text-ink">{t('auth.registerTitle')}</h1>
                                        </div>
                                        <p className="text-sub">{t('auth.registerSubtitle')}</p>
                                    </div>

                                    <form onSubmit={handleSubmit}>
                                        {(error || validationError) && (
                                            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                                                <span>{error || validationError}</span>
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <label htmlFor="codigo" className="form-label flex items-center gap-2">
                                                <User className="h-4 w-4 text-sub" aria-hidden="true" />
                                                {t('auth.usernameLabel')}
                                            </label>
                                            <input
                                                id="codigo"
                                                type="text"
                                                className="form-control"
                                                placeholder={t('auth.usernamePlaceholder')}
                                                required
                                                value={codigo}
                                                onChange={(e) => setCodigo(e.target.value)}
                                                aria-describedby="codigo-hint"
                                            />
                                            <p id="codigo-hint" className="text-sub text-xs mt-1.5">{t('auth.usernameHint')}</p>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="email" className="form-label flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-sub" aria-hidden="true" />
                                                {t('auth.emailOptional')}
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                className="form-control"
                                                placeholder={t('auth.emailPlaceholder')}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                aria-describedby="email-hint"
                                            />
                                            <p id="email-hint" className="text-warning text-xs mt-1.5 flex items-center gap-1">
                                                <span className="text-amber-500" aria-hidden="true">⚠️</span>
                                                {t('auth.emailWarning')}
                                            </p>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="password" className="form-label flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-sub" aria-hidden="true" />
                                                {t('auth.password')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    className="form-control pr-10"
                                                    placeholder="••••••••"
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    aria-describedby="password-hint"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-ink focus:outline-none"
                                                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword
                                                        ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                                                        : <Eye className="h-4 w-4" aria-hidden="true" />}
                                                </button>
                                            </div>
                                            <p id="password-hint" className="text-sub text-xs mt-1.5">{t('auth.passwordHint')}</p>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor="passwordConfirm" className="form-label flex items-center gap-2">
                                                <Lock className="h-4 w-4 text-sub" aria-hidden="true" />
                                                {t('auth.confirmPassword')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="passwordConfirm"
                                                    type={showPasswordConfirm ? 'text' : 'password'}
                                                    className="form-control pr-10"
                                                    placeholder="••••••••"
                                                    required
                                                    value={passwordConfirm}
                                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordConfirm((v) => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sub hover:text-ink focus:outline-none"
                                                    aria-label={showPasswordConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                                                    tabIndex={-1}
                                                >
                                                    {showPasswordConfirm
                                                        ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                                                        : <Eye className="h-4 w-4" aria-hidden="true" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* RGPD Consent Checkbox */}
                                        <div className="mb-5">
                                            <div className="form-check">
                                                <input
                                                    id="acepta_privacidad"
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    required
                                                    checked={aceptaPrivacidad}
                                                    onChange={(e) => setAceptaPrivacidad(e.target.checked)}
                                                />
                                                <label className="form-check-label text-sm" htmlFor="acepta_privacidad">
                                                    <div className="flex items-start gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-edufis-mental mt-0.5 flex-shrink-0" aria-hidden="true" />
                                                        <span>
                                                            {t('auth.privacyConsent')}{' '}
                                                            <a href="https://edumind.es/es/privacidad" target="_blank" rel="noopener noreferrer" className="link-primary fw-semibold">
                                                                {t('auth.privacyPolicy')}
                                                            </a>
                                                            {' '}{t('auth.privacyRgpd')}
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="btn-lme w-100"
                                        >
                                            {isLoading ? t('auth.registering') : t('auth.registerButton')}
                                        </button>

                                        <div className="text-center mt-5 pt-4 border-top">
                                            <p className="mb-0 text-sub">
                                                {t('auth.hasAccount')}{' '}
                                                <Link to="/login" className="link-primary fw-semibold">
                                                    {t('auth.loginHere')}
                                                </Link>
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Panel derecho — identidad visual EDUmind */}
                            <div
                                className="login-split__image"
                                style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem' }}
                            >
                                <img
                                    src="/edumind_logo.png"
                                    alt="EDUmind"
                                    style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
                                />
                                <img
                                    src="/liga_logo_oficial.png"
                                    alt="Liga EDUmind"
                                    style={{ maxWidth: '180px', width: '100%', height: 'auto' }}
                                />
                                <p className="text-center text-sub text-sm" style={{ maxWidth: '220px' }}>
                                    Liga escolar de deportes alternativos con evaluación de valores
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
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
