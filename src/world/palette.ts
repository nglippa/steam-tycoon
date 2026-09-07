/** Shared art contract: colors describe a material or role, never an individual prop. */
export const palette = {
  neutral: { soot:'#252636', slate:'#687d98', ivory:'#e4d8c3', stone:'#ccc4bc', plaster:'#eadac4', industrial:'#829692', ink:'#22283c', paper:'#f2e4c9' },
  metal: { iron:'#293747', steel:'#1c2330', copper:'#c88762', oxidized:'#4b9995', agedBrass:'#bd995c', brass:'#efc66e', rust:'#ab5445' },
  warm: { furnace:'#ff842e', ember:'#ffd18a', lamp:'#ffc773', crimson:'#b94c60', burgundy:'#793d59', mustard:'#d5ac5b', timber:'#a88464', leather:'#775346' },
  cool: { teal:'#236f78', turquoise:'#58a7ad', cyan:'#8caebf', navy:'#334a72', midnight:'#1c294e', emerald:'#277e69', dustyBlue:'#7995b6' },
  aether: { cyan:'#70e7e1', white:'#d1f3f1', glow:'#79dce6' },
  skin: ['#e5bea3','#bd8f7c','#926d67'],
  hair: ['#2d2d42','#74493e','#bd864e','#464253'],
  sky: { clear:'#679dcc', horizon:'#f0d6b6', overcast:'#8d9abb', rain:'#697d9e', lavender:'#b8adbd', night:'#19284d', haze:'#37677c', cloud:'#f7ead7', dusk:'#eeb19f', rose:'#ae718f' },
} as const;
const p=palette;
export const worldColors = {
  brick:[p.neutral.plaster,'#edc7af','#f1d9bf'], darkBrick:[p.neutral.industrial,'#9eafbc','#b9c9cc'],
  stone:[p.neutral.stone,'#d9d2c6','#e5ddd0'], warmStone:[p.neutral.ivory,'#ebdfcb','#f4e6cd'],
  road:[p.neutral.slate,'#657b98','#617894'], dirt:['#909599','#969a9b','#a1a9aa'],
  roof:[p.cool.navy,'#345478','#294665'], iron:[p.metal.iron,p.metal.iron,p.metal.steel],
  rust:[p.metal.rust,'#ae5543','#ba5e49'], brass:[p.metal.agedBrass,'#d7ae60',p.metal.brass],
  copper:[p.metal.copper,'#dc986e','#e4ad7f'], wood:[p.warm.timber,'#b28b66','#bd976e'],
  teal:[p.cool.teal,'#278992','#26989d'], red:[p.warm.crimson,'#c85a65','#cc5366'],
  cream:[p.neutral.ivory,'#eedfc6','#fff0d8'], leaf:['#548578','#49886d','#4d936b'],
} as const;
export type Archetype='worker'|'engineer'|'merchant'|'guard'|'resident'|'courier';
// coat, secondary cloth, accent, restored coat: coherent outfits, not random hues.
export const wardrobes:Record<Archetype,readonly string[][]>={
  worker:[[p.metal.rust,p.neutral.ivory,p.cool.teal,'#c9654d'],[p.neutral.ivory,p.warm.leather,p.warm.crimson,'#f1dfc3']],
  engineer:[[p.cool.navy,p.neutral.ivory,p.warm.burgundy,'#335a89'],[p.cool.teal,p.neutral.ivory,p.warm.mustard,'#298d94']],
  merchant:[[p.warm.mustard,p.warm.burgundy,p.neutral.ivory,'#e1b24b'],[p.warm.burgundy,p.neutral.ivory,p.cool.turquoise,'#923f66']],
  guard:[[p.cool.teal,p.neutral.ink,p.metal.agedBrass,'#225967']],
  resident:[[p.cool.dustyBlue,p.neutral.ivory,p.warm.crimson,'#4d7199'],[p.neutral.ivory,p.cool.navy,p.cool.teal,'#fff0d8']],
  courier:[[p.warm.crimson,p.neutral.ivory,p.cool.navy,'#d55768']],
};
