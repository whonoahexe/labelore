import { type To } from 'react-router';
import { Link } from '../nav.tsx';
import { buttonVariants } from './ui/button.tsx';

export interface LedgerSwitchTab {
  key: string;
  label: string;
  /** The tab's route; null for a file whose route the registry did not resolve (drawn, not linked). */
  to: To | null;
  /** The number of findings the file speaks to. */
  count: number;
}

/** The review ledger's tab strip (Phase 9, 09-12): the plan-pair switch generalised from two fixed halves
 * to the review-family files a folder holds. Each tab is a link to its file's own URL, so a change of tab
 * is an ordinary navigation and the back button walks them. The pressed tab is `aria-current="page"` and
 * takes the `secondary` button look, the rest are `ghost`; the count trails the label in Label size. */
export function LedgerSwitch({
  label,
  tabs,
  active,
}: {
  label: string;
  tabs: LedgerSwitchTab[];
  active: string;
}): React.JSX.Element {
  return (
    <nav className="plan-pair-switch" aria-label={label} data-ledger="true">
      {tabs.map((tab) => {
        const pressed = tab.key === active;
        const look = buttonVariants({ size: 'xs', variant: pressed ? 'secondary' : 'ghost' });
        const body = (
          <>
            {tab.label}
            <span className="view-review-ledger-count">{tab.count}</span>
          </>
        );
        if (tab.to === null) {
          return (
            <span key={tab.key} className={look} aria-current={pressed ? 'page' : undefined}>
              {body}
            </span>
          );
        }
        return (
          <Link key={tab.key} to={tab.to} className={look} aria-current={pressed ? 'page' : undefined}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
