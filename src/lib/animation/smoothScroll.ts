import type Lenis from "lenis";

/**
 * Shared handle to the app's single Lenis instance, set by <SmoothScroll> and
 * read by anything that needs to pause smooth-scroll (e.g. the mobile menu
 * locking the page). Avoids augmenting the global Window type, which Lenis
 * already declares with an incompatible shape.
 */
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function getLenis(): Lenis | null {
  return instance;
}
