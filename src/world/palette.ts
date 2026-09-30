/** Shared art contract: colors describe a material or role, never an individual prop. */
export const palette = {
  neutral: { soot:'#252636', slate:'#687d98', ivory:'#e4d8c3', stone:'#ccc4bc', plaster:'#eadac4', industrial:'#829692', ink:'#22283c', paper:'#f2e4c9' },
  metal: { iron:'#293747', steel:'#1c2330', copper:'#c88762', oxidized:'#4b9995', agedBrass:'#bd995c', brass:'#efc66e', rust:'#ab5445' },
  warm: { furnace:'#ff842e', ember:'#ffd18a', lamp:'#ffc773', crimson:'#b94c60', burgundy:'#793d59', mustard:'#d5ac5b', timber:'#a88464', leather:'#775346' },
  cool: { teal:'#236f78', turquoise:'#58a7ad', cyan:'#8caebf', navy:'#334a72', midnight:'#1c294e', emerald:'#277e69', dustyBlue:'#7995b6' },
  aether: { cyan:'#70e7e1', white:'#d1f3f1', glow:'#79dce6' },
  skin: ['#d8b094','#b08470','#86625a'],
  hair: ['#262a4a','#7c4331','#cf9450','#5a3a5e'],
  sky: { clear:'#8aa6b6', horizon:'#efe0c4', overcast:'#86908f', rain:'#5a6366', lavender:'#9c9d95', night:'#070a18', haze:'#131729', cloud:'#f6ead3', cloudShade:'#b9aa98', dusk:'#f2a67f', rose:'#5d6c9e', smog:'#b7b8ae' },
} as const;
const p=palette;
// Karnaca/Thief key: sandstone, umber, soot and slate, weathered but warm. Values drift
// cleaner with prosperity; saturation stays for accents, signage and glow.
export const worldColors = {
  brick:['#b88a6c','#c29274','#cc9b7c'], darkBrick:['#5e544c','#645a51','#6b6157'],
  stone:['#b9a78c','#c4b295','#cfbe9f'], warmStone:['#cdb892','#d6c29c','#dfcca8'],
  road:['#8a8175','#918879','#998f80'], dirt:['#8d8070','#958877','#9c907f'],
  roof:['#5a626a','#5d6870','#606e77'], iron:['#2e2d2c','#302f2e','#33322f'],
  rust:['#5e3526','#6b3c2a','#78442f'], brass:['#7e6a3e','#96803f','#b09449'],
  copper:['#6e4432','#7d4e38','#8e5a3f'], wood:['#7a5a3f','#846245','#8d6a4b'],
  teal:['#44625b','#4a6d64','#50786e'], red:['#6e332e','#7c3831','#8a3e35'],
  cream:['#a89c86','#b7ab93','#c6baa0'], leaf:['#56603e','#5e6a44','#67754a'],
} as const;
export type Archetype='worker'|'engineer'|'merchant'|'guard'|'resident'|'courier'|'ordinal';
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
  // The Ordinance: dirty green-charcoal and an oxblood armband. Occupiers never dress up for prosperity.
  ordinal:[['#343d35','#1b1c1b','#5e2328','#343d35']],
};
