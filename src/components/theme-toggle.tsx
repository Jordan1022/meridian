'use client';

import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full border border-border/60"
    >
      <Sun
        className={`h-4 w-4 transition-all ${
          isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0 text-amber-400'
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all ${
          isDark ? 'opacity-100 rotate-0 text-blue-300' : 'opacity-0 rotate-90'
        }`}
      />
    </Button>
  );
}

