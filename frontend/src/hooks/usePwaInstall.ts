import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isStandaloneDisplay(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return Boolean((navigator as unknown as { standalone?: boolean }).standalone);
}

export function usePwaInstall() {
    const [canInstall, setCanInstall] = useState(() => Boolean(deferredPrompt) && !isStandaloneDisplay());

    useEffect(() => {
        if (isStandaloneDisplay()) return;

        const handler = (e: Event) => {
            e.preventDefault();
            deferredPrompt = e as BeforeInstallPromptEvent;
            setCanInstall(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
            setCanInstall(false);
        }
    };

    return { canInstall, install };
}
