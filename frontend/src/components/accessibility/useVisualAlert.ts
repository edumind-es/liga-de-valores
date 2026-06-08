import { useState } from 'react';

type VisualAlertType = 'info' | 'success' | 'warning' | 'error';

interface VisualAlertState {
    show: boolean;
    type: VisualAlertType;
}

export function useVisualAlert() {
    const [alertState, setAlertState] = useState<VisualAlertState>({
        show: false,
        type: 'info',
    });

    const triggerAlert = (type: VisualAlertType = 'info') => {
        setAlertState({ show: true, type });
        setTimeout(() => setAlertState({ show: false, type: 'info' }), 100);
    };

    return {
        alertState,
        triggerAlert,
    };
}
