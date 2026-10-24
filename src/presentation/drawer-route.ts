// Pure route lookups over the drawer view model: which place holds a page, and which shipped
// milestone owns a place. Type-only import of drawer.ts, so the client bundle never pulls in the
// projection itself.
import type {
  DrawerFileRow,
  DrawerMilestonePlace,
  DrawerPhasePlace,
  DrawerQuickPlace,
  DrawerViewModel,
} from './drawer.ts';

export type DrawerPlace = DrawerPhasePlace | DrawerMilestonePlace | DrawerQuickPlace;

function holdsFile(rows: readonly DrawerFileRow[], pathname: string): boolean {
  return rows.some((row) => row.url === pathname);
}

function phaseHolds(phase: DrawerPhasePlace, pathname: string): boolean {
  return (
    phase.url === pathname ||
    holdsFile(phase.before, pathname) ||
    holdsFile(phase.after, pathname) ||
    holdsFile(phase.other, pathname) ||
    phase.plans.some((plan) => plan.url === pathname || plan.matchUrls.includes(pathname))
  );
}

function milestoneHolds(milestone: DrawerMilestonePlace, pathname: string): boolean {
  return milestone.url === pathname || holdsFile(milestone.documents, pathname);
}

function quickHolds(place: DrawerQuickPlace, pathname: string): boolean {
  return place.months.some((month) =>
    month.tasks.some((task) => holdsFile(task.files, pathname)),
  );
}

/** Every place in the model, in the order the drawer lists them. */
function allPlaces(model: DrawerViewModel): DrawerPlace[] {
  return [
    ...model.current.phases,
    model.current.quick,
    ...model.shipped.flatMap((milestone) => [milestone, ...milestone.phases, milestone.quick]),
  ];
}

/** The key of the first place that holds `pathname`, or null when no place does. */
export function placeKeyForPath(model: DrawerViewModel, pathname: string): string | null {
  for (const place of allPlaces(model)) {
    const holds =
      place.kind === 'phase'
        ? phaseHolds(place, pathname)
        : place.kind === 'milestone'
          ? milestoneHolds(place, pathname)
          : quickHolds(place, pathname);
    if (holds) return place.key;
  }
  return null;
}

export function findPlace(model: DrawerViewModel, placeKey: string | null): DrawerPlace | null {
  if (placeKey === null) return null;
  return allPlaces(model).find((place) => place.key === placeKey) ?? null;
}

/** The key of the shipped milestone that is `placeKey` or contains it, or null for a current place. */
export function shippedOwnerOf(model: DrawerViewModel, placeKey: string | null): string | null {
  if (placeKey === null) return null;
  for (const milestone of model.shipped) {
    if (
      milestone.key === placeKey ||
      milestone.quick.key === placeKey ||
      milestone.phases.some((phase) => phase.key === placeKey)
    ) {
      return milestone.key;
    }
  }
  return null;
}

/** The key of the quick task whose chip row holds `pathname`, or null. */
export function quickTaskKeyForPath(model: DrawerViewModel, pathname: string): string | null {
  for (const place of allPlaces(model)) {
    if (place.kind !== 'quick') continue;
    for (const month of place.months) {
      for (const task of month.tasks) {
        if (holdsFile(task.files, pathname)) return task.key;
      }
    }
  }
  return null;
}
