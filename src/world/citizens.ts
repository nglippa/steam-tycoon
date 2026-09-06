import * as T from 'three';
import { box, cyl, sphere, torus, bake, mats, type Material } from './assets';

// Three discrete lighting bands keep moving characters legible against the city.
const ramp = new T.DataTexture(new Uint8Array([75, 155, 255]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
const toon = (color: T.ColorRepresentation) => new T.MeshToonMaterial({ color, gradientMap: ramp });
const skin = [toon('#e7b08c'), toon('#af7557'), toon('#8f5946')];
const hair = [toon('#262334'), toon('#724230'), toon('#d4a25f')];
const boot = toon('#263044');
const brass = toon('#e4b65e');
const ivory = toon('#f5dec1');
const scarves = [toon('#c14e42'), toon('#35a6a3'), toon('#dcac52')];
const ink = new T.MeshBasicMaterial({ color: '#202532', side: T.BackSide });
const coloredToon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
// Collapse the character palette into vertex colors, retaining the same cel bands.
// This avoids a separate draw call for every button, cuff, skin and hair color.
function bakeCharacter(group: T.Group) {
  group.traverse(object => {
    if (!(object instanceof T.Mesh) || !(object.material instanceof T.MeshToonMaterial)) return;
    const geometry = object.geometry.clone();
    const color = object.material.color;
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    object.geometry = geometry; object.material = coloredToon;
  });
  return bake(group);
}
const coats = new Map<Material, T.MeshToonMaterial>();

function faceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const c = canvas.getContext('2d')!;
  // Original illustrated eyes: upper lash, warm iris, small reflected light.
  for (const x of [76, 180]) {
    c.fillStyle = '#fff4de'; c.beginPath(); c.ellipse(x, 57, 30, 16, -.06, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#477c85'; c.beginPath(); c.ellipse(x, 58, 12, 15, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#182331'; c.beginPath(); c.ellipse(x, 58, 6, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#352c32'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 32, 54); c.quadraticCurveTo(x, 32, x + 31, 51); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(x - 26, 29); c.lineTo(x + 20, 25); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - 4, 52, 4, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = '#9b6554'; c.lineWidth = 3; c.beginPath(); c.moveTo(128, 71); c.lineTo(124, 83); c.lineTo(131, 84); c.stroke();
  c.strokeStyle = '#7c4542'; c.beginPath(); c.moveTo(115, 104); c.quadraticCurveTo(128, 110, 141, 103); c.stroke();
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
}
const face = faceTexture();

export function citizen(coat: Material = mats.rust, seed = 0) {
  const group = new T.Group();
  let cloth = coats.get(coat);
  if (!cloth) { cloth = toon((coat as T.MeshStandardMaterial).color.clone().lerp(new T.Color('#d3c7b3'), .16)); coats.set(coat, cloth); }
  const body = new T.Group(); group.add(body);
  const shape = new T.LatheGeometry([
    new T.Vector2(.28, .79), new T.Vector2(.24, 1.02),
    new T.Vector2(.3, 1.32), new T.Vector2(.19, 1.42),
  ], 10);
  const jacket = new T.Mesh(shape, cloth); body.add(jacket);
  const outline = new T.Mesh(shape, ink); outline.scale.set(1.045, 1, 1.045); body.add(outline);
  cyl(body, 0, 1.42, 0, .095, .2, skin[seed % 3]);
  box(body, 0, 1.1, .242, .04, .47, .04, ivory);
  for (const y of [.92, 1.08, 1.24]) sphere(body, .055, y, .259, .026, brass);
  cyl(body, 0, .91, 0, .267, .075, boot);
  box(body, 0, .91, .266, .12, .09, .035, brass);
  const scarf = scarves[seed % 3];
  cyl(body, 0, 1.4, 0, .18, .13, scarf);
  const tail = box(body, -.12, 1.2, .27, .13, .36, .055, scarf); tail.rotation.z = -.18;
  if (seed % 4 === 0) { box(body, .3, 1.02, 0, .16, .38, .3, boot); box(body, .39, 1.05, .02, .04, .12, .1, brass); }
  bakeCharacter(body);

  const head = new T.Group(); head.position.y = 1.67; group.add(head);
  const headShape = new T.SphereGeometry(.225, 16, 12);
  const skull = new T.Mesh(headShape, skin[seed % 3]); skull.scale.set(.88, 1.12, .88); head.add(skull);
  const contour = new T.Mesh(headShape, ink); contour.scale.copy(skull.scale).multiplyScalar(1.025); head.add(contour);
  const locks = new T.Mesh(new T.SphereGeometry(.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * .52), hair[seed % 3]); locks.position.y = .04; locks.scale.z = .93; head.add(locks);
  for (let i = 0; i < 5; i++) { const fringe = new T.Mesh(new T.ConeGeometry(.06, .17 + (i % 2) * .06, 3), hair[seed % 3]); fringe.position.set((i - 2) * .065, .09, .16); fringe.rotation.z = Math.PI + (i - 2) * .14; head.add(fringe); }
  for (const x of [-.205, .205]) sphere(head, x, -.005, 0, .047, skin[seed % 3]);
  // Flat face artwork sits just in front of the head's front hemisphere.
  const eyes = new T.Mesh(new T.PlaneGeometry(.34, .17), face); eyes.position.set(0, -.025, .202); head.add(eyes);
  if (seed % 3 !== 2) {
    cyl(head, 0, .22, -.015, .235, .065, boot);
    cyl(head, 0, .28, -.015, .18, seed % 3 === 0 ? .16 : .08, cloth);
    for (const x of [-.085, .085]) { torus(head, x, .25, .177, .057, .014, brass); const lens = sphere(head, x, .25, .177, .045, mats.teal); lens.scale.z = .3; }
  }
  bakeCharacter(head);

  // Hip and shoulder pivots move the complete limb, including hands and boots.
  const legs: T.Group[] = []; const knees: T.Group[] = []; const arms: T.Group[] = [];
  for (const x of [-.13, .13]) {
    const hip = new T.Group(); hip.position.set(x, .84, 0); group.add(hip); legs.push(hip);
    box(hip, 0, -.17, 0, .17, .36, .19, boot);
    const knee = new T.Group(); knee.position.y = -.34; hip.add(knee); knees.push(knee);
    const lower = new T.Group(); knee.add(lower);
    box(lower, 0, -.17, 0, .15, .34, .18, boot);
    box(lower, 0, -.35, .065, .19, .18, .34, boot);
    box(lower, 0, -.23, .105, .17, .045, .035, brass); bakeCharacter(lower);
    const shoulder = new T.Group(); shoulder.position.set(x < 0 ? -.32 : .32, 1.32, 0); group.add(shoulder); arms.push(shoulder);
    box(shoulder, 0, -.21, 0, .16, .44, .18, cloth);
    box(shoulder, 0, -.4, .015, .17, .1, .19, brass);
    sphere(shoulder, 0, -.49, .025, .085, skin[seed % 3]); bakeCharacter(shoulder);
  }
  const worn = new T.Group();group.add(worn);
  box(worn,-.15,1.13,.272,.16,.18,.012,boot);box(worn,.17,.82,.22,.14,.1,.02,ivory);
  if(seed%3===0)box(worn,0,1.05,.28,.38,.46,.025,toon('#77604c'));
  bakeCharacter(worn);
  const finery = new T.Group();group.add(finery);
  if(seed%2===0){box(finery,0,1.18,.27,.34,.28,.025,scarves[(seed+1)%3]);for(const x of [-.2,.2])box(finery,x,1.28,.27,.08,.25,.04,ivory).rotation.z=x*2;}
  else {torus(finery,.17,1.09,.28,.06,.015,brass);box(finery,.17,1.19,.275,.012,.16,.02,brass);}
  if(seed%4===1){box(finery,.31,1,0,.12,.38,.28,cloth);box(finery,.38,1.1,.04,.035,.05,.12,brass);}
  bakeCharacter(finery);finery.visible=false;
  group.scale.set(1+(seed%4-1.5)*.045, .91+(seed%5)*.035,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  return { group, legs, knees, arms, head, worn, finery, phase: seed * 1.7 };
}
