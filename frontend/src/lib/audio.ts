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

import { getImageUrl } from '@/utils/url';

const WHISTLE_PATH = '/static/uploads/90743__pablo-f__referee-whistle.wav';
const GOAL_PATH = '/sounds/gol.mp3';

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

export const playGoal = (options: PlayOptions = {}) => {
    return playAudio(GOAL_PATH, options.volume ?? DEFAULT_GOAL_VOLUME);
};
