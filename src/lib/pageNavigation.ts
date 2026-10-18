export const PAGE_LOADING_DELAY_MS = 150;

interface PageNavigationState {
  state: string;
  location?: { pathname: string } | null;
}

export function pendingPathname(pathname: string, navigation: PageNavigationState): string {
  if (navigation.state === "loading" && navigation.location) {
    return navigation.location.pathname;
  }
  return pathname;
}

export function isPathnameNavigation(pathname: string, navigation: PageNavigationState): boolean {
  return (
    navigation.state === "loading" &&
    navigation.location != null &&
    navigation.location.pathname !== pathname
  );
}
