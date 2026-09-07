// One preference for CSS transitions, camera motion and decorative effects.
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = (requested: boolean) => requested || systemMotion.matches;
