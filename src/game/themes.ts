import { VisualTheme } from './types.ts';

export const VISUAL_THEMES: VisualTheme[] = [
  {
    id: 'cyber_cyan',
    name: 'Cyber Cyan',
    description: 'High-tech neon cyan and electric violet on deep space midnight.',
    requiredSectors: 0,
    isUnlocked: true,
    bgDark: '#050814',
    bgLight: '#0d1527',
    playerColor: '#38bdf8', // Sky 400
    echoColor: '#c084fc', // Purple 400
    coreColor: '#facc15', // Amber 400
    gateColor: '#f43f5e', // Rose 500
    switchColor: '#06b6d4', // Cyan 500
    hazardColor: '#ef4444', // Red 500
    accentColor: '#38bdf8',
  },
  {
    id: 'solar_amber',
    name: 'Solar Amber',
    description: 'Luminescent solar gold and deep volcanic slate.',
    requiredSectors: 3,
    isUnlocked: false,
    bgDark: '#120d04',
    bgLight: '#261b0a',
    playerColor: '#fbbf24', // Amber 400
    echoColor: '#fb923c', // Orange 400
    coreColor: '#38bdf8', // Sky 400
    gateColor: '#e11d48', // Rose 600
    switchColor: '#f59e0b', // Amber 500
    hazardColor: '#dc2626',
    accentColor: '#fbbf24',
  },
  {
    id: 'matrix_emerald',
    name: 'Matrix Emerald',
    description: 'Cybernetic phosphor green and terminal obsidian.',
    requiredSectors: 6,
    isUnlocked: false,
    bgDark: '#041208',
    bgLight: '#092410',
    playerColor: '#34d399', // Emerald 400
    echoColor: '#a7f3d0', // Emerald 200
    coreColor: '#38bdf8',
    gateColor: '#f87171',
    switchColor: '#10b981',
    hazardColor: '#ef4444',
    accentColor: '#10b981',
  },
  {
    id: 'astral_amethyst',
    name: 'Astral Amethyst',
    description: 'Cosmic amethyst and radiant starlight.',
    requiredSectors: 10,
    isUnlocked: false,
    bgDark: '#0e0618',
    bgLight: '#1f0d36',
    playerColor: '#c084fc', // Purple 400
    echoColor: '#818cf8', // Indigo 400
    coreColor: '#fde047',
    gateColor: '#f43f5e',
    switchColor: '#a855f7',
    hazardColor: '#e11d48',
    accentColor: '#c084fc',
  },
  {
    id: 'monochrome_pro',
    name: 'Monochrome Pro',
    description: 'Pure high-contrast OLED black and surgical white laser lines.',
    requiredSectors: 15,
    isUnlocked: false,
    bgDark: '#000000',
    bgLight: '#111111',
    playerColor: '#ffffff',
    echoColor: '#94a3b8',
    coreColor: '#f8fafc',
    gateColor: '#64748b',
    switchColor: '#cbd5e1',
    hazardColor: '#ef4444',
    accentColor: '#ffffff',
  },
];
