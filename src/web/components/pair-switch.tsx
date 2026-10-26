import { type To } from 'react-router';
import { Link } from '../nav.tsx';
import { buttonVariants } from './ui/button.tsx';

/** The Plan / Summary switch, first in whichever page each half of the pair mounts. A phase plan's
 * halves share one `/plans/:planId` URL and switch on `?doc=`; a quick task's halves are its own
 * PLAN and SUMMARY artifact URLs. Either way each half is deep-linkable and the back button walks
 * the tabs. `summaryTo` is null while the plan is still open. */
export function PairSwitch({
  label,
  active,
  planTo,
  summaryTo,
}: {
  label: string;
  active: 'plan' | 'summary';
  planTo: To;
  summaryTo: To | null;
}): React.JSX.Element {
  const tab = (doc: 'plan' | 'summary', to: To, text: string): React.JSX.Element => {
    // The same button treatment as the View/Source toggle beside it in the header.
    const look = buttonVariants({ size: 'xs', variant: active === doc ? 'secondary' : 'ghost' });
    return (
      <Link key={doc} to={to} className={look} aria-current={active === doc ? 'page' : undefined}>
        {text}
      </Link>
    );
  };
  return (
    <nav className="plan-pair-switch" aria-label={label}>
      {tab('plan', planTo, 'Plan')}
      {summaryTo !== null ? (
        tab('summary', summaryTo, 'Summary')
      ) : (
        <span
          className="status-chip"
          data-tone="quiet"
          title="Outcome not recorded yet: this plan is still open, so there is no paired summary."
        >
          No summary yet
        </span>
      )}
    </nav>
  );
}
