/** Shared art contract: colors describe a material or role, never an individual prop. */
export const palette = {
  neutral: { soot:'#252636', slate:'#687d98', ivory:'#e4d8c3', stone:'#ccc4bc', plaster:'#eadac4', industrial:'#829692', ink:'#22283c', paper:'#f2e4c9' },
  metal: { iron:'#293747', steel:'#1c2330', copper:'#c88762', oxidized:'#4b9995', agedBrass:'#bd995c', brass:'#efc66e', rust:'#ab5445' },
  warm: { furnace:'#ff842e', ember:'#ffd18a', lamp:'#ffc773', crimson:'#b94c60', burgundy:'#793d59', mustard:'#d5ac5b', timber:'#a88464', leather:'#775346' },
  cool: { teal:'#236f78', turquoise:'#58a7ad', cyan:'#8caebf', navy:'#334a72', midnight:'#1c294e', emerald:'#277e69', dustyBlue:'#7995b6' },
  aether: { cyan:'#70e7e1', white:'#d1f3f1', glow:'#79dce6' },
  skin: ['#d8b094','#b08470','#86625a'],
  hair: ['#262a4a','#7c4331','#cf9450','#5a3a5e'],
  sky: { clear:'#5b93c8', horizon:'#ecdcbc', overcast:'#8b97a0', rain:'#5d6870', lavender:'#aeb0a8', night:'#0b1430', haze:'#1a2440', cloud:'#f6ead3', cloudShade:'#b9aa98', dusk:'#f2a67f', rose:'#5d6c9e', smog:'#b7b8ae' },
} as const;
const p=palette;
// Material condition by prosperity: [Lowworks, mid Terra, Grand Terra]. Every family keeps its
// hue in the Lowworks (faded teal is still teal); Grand Terra is repainted, polished and clean.
export const worldColors = {
  brick:['#96765f','#b0846a','#c48c6a'], darkBrick:['#524a44','#5b4f47','#66554a'],
  stone:['#a69884','#bba98e','#d3c09e'], warmStone:['#b5a382','#cbb690','#e2cda2'],
  road:['#6e6964','#77716a','#817a70'], dirt:['#857a6c','#8e8373','#978b79'],
  roof:['#4f5b61','#4a6770','#43737f'], iron:['#2f2e2d','#2c3035','#283039'],
  rust:['#5e3526','#6e3a2a','#7c4030'], brass:['#6f6238','#9c8340','#cda24a'],
  copper:['#6a4a3a','#8e5838','#b46a3e'], wood:['#6e5642','#83603f','#966b41'],
  teal:['#52655f','#3e7168','#2c7b72'], red:['#5c3533','#7b3434','#912e37'],
  cream:['#a29885','#c3b597','#e2d3ae'], leaf:['#5e6444','#58733f','#4a8442'],
} as const;
export type Archetype='worker'|'engineer'|'merchant'|'guard'|'resident'|'courier';
// coat, secondary cloth, accent, restored coat: coherent outfits, not random hues.
// Karnaca/Thief cloth: worn, dyed and patched. Oxblood, umber, soot, grey-green, bone,
// with one muted accent each. The fourth color is the same garment in better times.
export const wardrobes:Record<Archetype,readonly string[][]>={
  worker:[['#7a4a36','#c9b89a','#4e6358','#8c563c'],['#b3a283','#5a4636','#7a3a33','#c7b590']],
  engineer:[['#3e4a55','#bfb193','#7a3a33','#465868'],['#4e6358','#c9b89a','#a88a4e','#557466']],
  merchant:[['#9a7a42','#6e3430','#c9b89a','#ad8a48'],['#6e3430','#c9b89a','#4e6f6a','#7e3a35']],
  guard:[['#2f3a3e','#1d1c1c','#a88a4e','#34454b']],
  resident:[['#5d6a70','#c9b89a','#7a3a33','#687880'],['#b8a888','#3e4a55','#4e6358','#cbb997']],
  courier:[['#7e3a35','#c9b89a','#3e4a55','#8e4038']],
};
