import * as T from 'three';

/** Terra's one lighting language: a hard painted terminator between a warm lit
 * side and a colored (never gray) shadow side. World and characters share it. */
export const tone = {
  ambient: { value: .6 },            // expected light ratio of a surface in full shadow
  lit: { value: new T.Color('#fff4e2') },
  shade: { value: new T.Color('#8c95d0') },
  rim: { value: new T.Color('#ffd9a8') },
};

const chunk = `
  vec3 inkLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) / max(diffuseColor.rgb, vec3(.02));
  float inkValue = dot(inkLight, vec3(.2126, .7152, .0722));
  float inkLit = smoothstep(toneAmbient * 1.22, toneAmbient * 1.34, inkValue);
  float inkForm = clamp(inkValue / (toneAmbient * 2.2), .0, 1.25);
  vec3 inkTone = mix(toneShade * (.9 + .12 * inkForm), toneLit * (.92 + .1 * inkForm), inkLit);
  // Bright local light (lamps, furnaces) pushes past the sunlit tone into a warm pool.
  inkTone += toneRim * smoothstep(toneAmbient * 3.2, toneAmbient * 7.5, inkValue) * .34;
  outgoingLight = diffuseColor.rgb * inkTone + totalEmissiveRadiance;
`;

export function painted<M extends T.Material>(material: M, key = 'terra-paint'): M {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.toneAmbient = tone.ambient; shader.uniforms.toneLit = tone.lit;
    shader.uniforms.toneShade = tone.shade; shader.uniforms.toneRim = tone.rim;
    shader.fragmentShader = 'uniform float toneAmbient; uniform vec3 toneLit, toneShade, toneRim;\n' +
      shader.fragmentShader.replace('#include <opaque_fragment>', chunk + '#include <opaque_fragment>');
  };
  // Capture the previous program identity now; the default key would read the wrapper.
  const base = material.customProgramCacheKey === T.Material.prototype.customProgramCacheKey ? previous.toString() : material.customProgramCacheKey();
  material.customProgramCacheKey = () => base + key;
  return material;
}
