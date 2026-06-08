import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { getImageUrl } from '@/utils/url';

interface SportAvatarProps {
    nombre: string;
    logoFile?: string | null;
    className?: string;
}

const getInitials = (nombre: string): string => {
    if (!nombre) return 'D';
    const words = nombre.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

export default function SportAvatar({ nombre, logoFile, className = 'w-14 h-14' }: SportAvatarProps) {
    const [imageError, setImageError] = useState(false);
    const hasLogo = Boolean(logoFile && !imageError);
    const initials = getInitials(nombre);

    if (hasLogo) {
        return (
            <img
                src={getImageUrl(logoFile)}
                alt={`Logo de ${nombre}`}
                className={`${className} object-contain bg-white/10 rounded-lg p-1`}
                loading="lazy"
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div className={`${className} rounded-lg bg-white/10 border border-white/20 flex items-center justify-center gap-1`}>
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-semibold text-ink">{initials}</span>
        </div>
    );
}
