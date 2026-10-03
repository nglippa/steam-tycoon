/** The opening, as data: the Ordinance at the door, then a masked stranger on the stoop. The scene (world/intro.ts) plays it;
 * nothing branches, but the porch answer is saved for later. The Ordinance says "citizen"; the stranger is not the regime. */
export interface Line { who: string; text: string }
export interface Choice { id: string; label: string; reply: Line[] }
export interface Node { id: 'guard' | 'porch'; lines: Line[]; choices: Choice[] }
const guard = (text: string): Line => ({ who: 'Ordinance', text }), stranger = (text: string): Line => ({ who: 'Stranger', text });
export const SCRIPT: Node[] = [
  { id: 'guard', lines: [guard('Get up, citizen. It’s time to report to work.')], choices: [
    { id: 'up', label: 'I’m up.', reply: [guard('Then be useful. Lowworks bell is at seven.')] },
    { id: 'silent', label: '(Say nothing.)', reply: [guard('Seven, citizen. Don’t make us come back.')] }] },
  { id: 'porch', lines: [stranger('Work, huh.'), stranger('These people think they own everything.'), stranger('My grandparents told me things weren’t always like this.'), stranger('This city used to be beautiful.')], choices: [
    { id: 'point', label: 'What’s the point?', reply: [stranger('Join us, and see the point for yourself.')] },
    { id: 'who', label: 'Who’s asking?', reply: [stranger('Someone who remembers. Join us, and see the point for yourself.')] },
    { id: 'quiet', label: 'Keep your voice down.', reply: [stranger('They hear what they want to. Join us, and see the point for yourself.')] },
    { id: 'act', label: 'Then do something about it.', reply: [stranger('We are. Join us, and see the point for yourself.')] }] },
];
/** The banging that comes back, harder, when the player dawdles in the room, and the voice that goes with it. */
export const DAWDLE = { after: 12, line: guard('Open up, citizen.') };
export const PORCH_ANSWERS: readonly string[] = SCRIPT.find(n => n.id === 'porch')!.choices.map(c => c.id);
/** Seconds a line is held before it moves on by itself. */
export const readTime = (text: string) => Math.max(2, 1.2 + text.length * .06);
export const OBJECTIVE = 'Report to work at Rook & Son Salvage.';
