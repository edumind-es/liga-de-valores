/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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

import { getImageUrl } from '@/utils/url';

// Silbato: «referee-whistle.wav» de Pablo-F (Freesound #90743, CC BY 3.0),
// servido desde las subidas del backend; si no está, suena el sintetizado.
const WHISTLE_PATH = '/static/uploads/90743__pablo-f__referee-whistle.wav';

const DEFAULT_WHISTLE_VOLUME = 0.95;
const DEFAULT_GOAL_VOLUME = 0.7;

type PlayOptions = {
    volume?: number;
};

const audioCache = new Map<string, HTMLAudioElement>();

const clampVolume = (value: number | undefined) => {
    if (value === undefined) return undefined;
    return Math.min(1, Math.max(0, value));
};

const getAudioElement = (url: string) => {
    const cached = audioCache.get(url);
    if (cached) return cached;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(url, audio);
    return audio;
};

const playAudio = (url: string, volume?: number) => {
    if (typeof Audio === 'undefined') return Promise.resolve();
    const base = getAudioElement(url);
    const audio = base.cloneNode(true) as HTMLAudioElement;
    const clamped = clampVolume(volume);
    if (clamped !== undefined) {
        audio.volume = clamped;
    }
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
        return promise.catch(() => undefined);
    }
    return Promise.resolve();
};

const playOscillatorWhistle = () => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.frequency.value = 2400;
    oscillator2.frequency.value = 2450;
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.02);
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.5);
    oscillator2.stop(audioContext.currentTime + 0.5);
};

export const playWhistle = async (options: PlayOptions = {}) => {
    const url = getImageUrl(WHISTLE_PATH);
    try {
        await playAudio(url, options.volume ?? DEFAULT_WHISTLE_VOLUME);
    } catch {
        playOscillatorWhistle();
    }
};

// Gol: tres notas ascendentes sintetizadas con WebAudio. Sin fichero ni
// licencia que rastrear: el antiguo gol.mp3 no tenía origen conocido.
export const playGoal = (options: PlayOptions = {}) => {
    if (typeof window === 'undefined') return Promise.resolve();
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return Promise.resolve();
    const volumen = clampVolume(options.volume) ?? DEFAULT_GOAL_VOLUME;
    const audioContext = new AudioContextCtor();
    const t0 = audioContext.currentTime;
    const notas = [523.25, 659.25, 783.99]; // do5, mi5, sol5
    notas.forEach((frecuencia, i) => {
        const oscilador = audioContext.createOscillator();
        const ganancia = audioContext.createGain();
        oscilador.type = 'triangle';
        oscilador.frequency.value = frecuencia;
        oscilador.connect(ganancia);
        ganancia.connect(audioContext.destination);
        const inicio = t0 + i * 0.12;
        const fin = inicio + (i === notas.length - 1 ? 0.45 : 0.14);
        ganancia.gain.setValueAtTime(0, inicio);
        ganancia.gain.linearRampToValueAtTime(volumen, inicio + 0.015);
        ganancia.gain.exponentialRampToValueAtTime(0.001, fin);
        oscilador.start(inicio);
        oscilador.stop(fin);
    });
    return Promise.resolve();
};
