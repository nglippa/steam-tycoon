/** Everything the regime says to the player. The Ordinance addresses a person as "citizen"; only the player's own role
 * ("Steward") lives in narration, UI and the people who know it. A rule test keeps the word out of these mouths. */
export const VOICE = {
  halt: '“Halt, citizen. Not through here today. Turn back.”',
  excused: '“Next time you stop when you are told, citizen.”',
  released: 'A word from the box. “…Never mind. Go on, citizen.”',
  freight: '“Directorate freight. Through, citizen.”',
  lane: '“Directorate lane. Through, citizen.”',
  papers: '“Papers.” A look, a nod. “Go on, citizen.”',
  closed: (around: string) => `“Closed. Curfew. Turn around, citizen.” The boom is down; ${around} are not watched.`,
  curfewHalt: '“Halt. It is past curfew, citizen. Go home, now.”',
  curfewWarn: '“Curfew, citizen. Home. I will not say it twice.”',
  curfewFine: (fine: number) => `“Out after curfew. That is a fine, citizen, and the next one is a cell.” ${fine} Crowns.`,
  again: (fine: number) => `“Again, citizen?” The Ordinance fines the treasury ${fine} Crowns.`,
};
