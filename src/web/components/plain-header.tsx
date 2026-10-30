// The header of a page with no project around it (the landing page, the unknown-project page): the
// mark and wordmark linking to `/` and the theme toggle. No project name, tabs, drawer, search or
// snapshot status. It reuses the shell header's markup and classes, so it reads as the same bar.
import { AppLink } from '../nav.tsx';
import { LabeloreMark } from './labelore-mark.tsx';
import { ThemeToggle } from './theme-toggle.tsx';

export function PlainHeader(): React.JSX.Element {
  return (
    <header className="shell-header">
      <AppLink className="brand" to="/" aria-label="Labelore — all projects">
        <span className="brand-mark" aria-hidden="true">
          <LabeloreMark />
        </span>
        <strong className="brand-wordmark">Labelore</strong>
      </AppLink>
      <div className="shell-controls">
        <ThemeToggle />
      </div>
    </header>
  );
}

/** The plain header over a page's `<main>`, on the same surface the shell gives a project page. */
export function PlainPage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PlainHeader />
      <div className="shell-content">
        <div className="shell-outlet" id="main-content">
          {children}
        </div>
      </div>
    </div>
  );
}
