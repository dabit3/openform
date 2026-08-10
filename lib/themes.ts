import { ThemeConfig, ThemePreset } from './database.types'

export const themes: Record<ThemePreset, ThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'חצות',
    primaryColor: '#8B5CF6',
    backgroundColor: '#0F0F1A',
    textColor: '#FFFFFF',
    accentColor: '#A78BFA',
    fontFamily: "var(--font-heebo), 'Heebo', sans-serif",
  },
  ocean: {
    id: 'ocean',
    name: 'אוקיינוס',
    primaryColor: '#0EA5E9',
    backgroundColor: '#0C1929',
    textColor: '#F0F9FF',
    accentColor: '#38BDF8',
    fontFamily: "var(--font-assistant), 'Assistant', sans-serif",
  },
  sunset: {
    id: 'sunset',
    name: 'שקיעה',
    primaryColor: '#F97316',
    backgroundColor: '#FFFBEB',
    textColor: '#1C1917',
    accentColor: '#FB923C',
    fontFamily: "var(--font-rubik), 'Rubik', sans-serif",
  },
  forest: {
    id: 'forest',
    name: 'יער',
    primaryColor: '#10B981',
    backgroundColor: '#022C22',
    textColor: '#ECFDF5',
    accentColor: '#34D399',
    fontFamily: "var(--font-noto-sans-hebrew), 'Noto Sans Hebrew', sans-serif",
  },
  lavender: {
    id: 'lavender',
    name: 'לבנדר',
    primaryColor: '#A855F7',
    backgroundColor: '#FAF5FF',
    textColor: '#1E1B4B',
    accentColor: '#C084FC',
    fontFamily: "var(--font-varela-round), 'Varela Round', sans-serif",
  },
  minimal: {
    id: 'minimal',
    name: 'מינימלי',
    primaryColor: '#18181B',
    backgroundColor: '#FFFFFF',
    textColor: '#18181B',
    accentColor: '#3F3F46',
    fontFamily: "var(--font-assistant), 'Assistant', sans-serif",
  },
}

export const themeList = Object.values(themes)

export function getTheme(preset: ThemePreset): ThemeConfig {
  return themes[preset] || themes.minimal
}

// Generate CSS variables from theme
export function getThemeCSSVariables(theme: ThemeConfig): React.CSSProperties {
  return {
    '--theme-primary': theme.primaryColor,
    '--theme-background': theme.backgroundColor,
    '--theme-text': theme.textColor,
    '--theme-accent': theme.accentColor,
    '--theme-font': theme.fontFamily,
  } as React.CSSProperties
}

