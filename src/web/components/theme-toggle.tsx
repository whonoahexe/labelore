import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button.tsx';

export const THEME_STORAGE_KEY = 'gsd-lore-theme';

export function ThemeToggle(): React.JSX.Element {
  function handleClick(): void {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Storage may be blocked in private mode. The DOM class still owns this page's choice.
    }
  }

  return (
    <Button
      aria-label="Toggle light or dark theme"
      className="theme-toggle"
      onClick={handleClick}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <Moon aria-hidden="true" className="theme-icon moon-icon" />
      <Sun aria-hidden="true" className="theme-icon sun-icon" />
      <span className="sr-only">Toggle light or dark theme</span>
    </Button>
  );
}
