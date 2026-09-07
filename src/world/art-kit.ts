import * as T from 'three';
import { palette as P } from './palette';
import { box, cyl, sphere, beam, torus, sign, mats, illustrated, type Material } from './assets';

export const artMats = {
  plaster: new T.MeshStandardMaterial({color:P.neutral.plaster,roughness:.94}),
  fadedPaint: new T.MeshStandardMaterial({color:P.cool.dustyBlue,roughness:.85}),
  coal: new T.MeshStandardMaterial({color:P.metal.steel,roughness:1}),
  mud: new T.MeshStandardMaterial({color:P.warm.leather,roughness:.75}),
  ochre: new T.MeshStandardMaterial({color:P.warm.mustard,roughness:.8}),
  wine: new T.MeshStandardMaterial({color:P.warm.burgundy,roughness:.85}),
  paper: new T.MeshStandardMaterial({color:P.neutral.paper,roughness:1}),
  furnace: new T.MeshBasicMaterial({color:P.warm.furnace}),
  ember: new T.MeshBasicMaterial({color:P.warm.ember}),
  pool: new T.MeshBasicMaterial({color:P.warm.lamp,transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide}),
};
for(const material of [artMats.plaster,artMats.fadedPaint,artMats.ochre,artMats.wine]) illustrated(material);
export const V = (x:number,y:number,z:number) => new T.Vector3(x,y,z);
export function pipe(g:T.Object3D, points:number[][], radius=.12, material:Material=mats.copper) {
  for(let i=1;i<points.length;i++) {
    const a=new T.Vector3(...points[i-1] as [number,number,number]); const b=new T.Vector3(...points[i] as [number,number,number]);
    beam(g,a,b,radius,material);
    const joint=cyl(g,0,0,0,radius*1.38,.13,mats.iron);joint.position.copy(a).lerp(b,.85);joint.quaternion.setFromUnitVectors(V(0,1,0),b.sub(a).normalize());
    sphere(g,...points[i] as [number,number,number],radius*1.1,material);
  }
}
export function cable(g:T.Object3D,a:T.Vector3,b:T.Vector3,sag=.6) {
  const mid=a.clone().lerp(b,.5);mid.y-=sag;
  const curve=new T.QuadraticBezierCurve3(a,mid,b);
  g.add(new T.Mesh(new T.TubeGeometry(curve,12,.018,4,false),mats.iron));return curve;
}
export function railing(g:T.Object3D,x:number,y:number,z:number,width:number) {
  for(let dx=-width/2;dx<=width/2;dx+=.6)box(g,x+dx,y+.5,z,.045,1,.045,mats.iron);
  box(g,x,y+1,z,width+.1,.065,.08,mats.brass);box(g,x,y+.12,z,width,.055,.06,mats.iron);
}
/** Terra's three rising flues inside a pointed civic shield. */
export function crest(g:T.Object3D,x:number,y:number,z:number,size=1,material:Material=mats.brass) {
  const a=[[-.5,.6],[.5,.6],[.5,-.15],[0,-.6],[-.5,-.15],[-.5,.6]];
  for(let i=1;i<a.length;i++)beam(g,V(x+a[i-1][0]*size,y+a[i-1][1]*size,z),V(x+a[i][0]*size,y+a[i][1]*size,z),.035*size,material);
  for(const dx of [-.22,0,.22]){box(g,x+dx*size,y+.06*size,z,.055*size,(dx===0?.72:.45)*size,.05*size,material);box(g,x+dx*size,y+(dx===0?.43:.29)*size,z,.15*size,.05*size,.06*size,material);}
  box(g,x,y-.18*size,z,.48*size,.05*size,.06*size,material);
}
export function gauge(g:T.Object3D,x:number,y:number,z:number,r=.65,label='07') {
  const plate=cyl(g,x,y,z,r,.14,mats.cream);plate.rotation.x=Math.PI/2;torus(g,x,y,z+.1,r,.08,mats.brass);
  for(let i=0;i<9;i++){const a=(i/8*1.5-.75)*Math.PI;const tick=box(g,x+Math.sin(a)*r*.78,y+Math.cos(a)*r*.78,z+.19,.035,r*.14,.025,mats.iron);tick.rotation.z=-a;}
  const needle=box(g,x+r*.17,y+r*.2,z+.22,.035,r*.62,.035,mats.red);needle.rotation.z=-.65;
  sign(g,label,'TMSA',x,y-r*.4,z+.2,r*.64,r*.3);return needle;
}
export function lampHead(g:T.Object3D,x:number,y:number,z:number,rich=false) {
  for(const dx of [-.55,0,.55]) {
    const height=dx===0?.35:0;beam(g,V(x,y-.5,z),V(x+dx,y+height,z),.045,rich?mats.brass:mats.iron);
    box(g,x+dx,y+height+.2,z,.24,.42,.24,rich?mats.glow:mats.cream);
    for(const sx of [-.15,.15])box(g,x+dx+sx,y+height+.2,z,.025,.48,.32,mats.iron);
    const cap=new T.Mesh(new T.ConeGeometry(.27,.23,4),rich?mats.brass:mats.iron);cap.position.set(x+dx,y+height+.55,z);cap.rotation.y=Math.PI/4;g.add(cap);
  }
}
export function roof(g:T.Object3D,x:number,y:number,z:number,width:number,height:number,depth:number,mat:Material=mats.roof) {
  const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(0,height);shape.lineTo(width/2,0);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geo.translate(0,0,-depth/2);
  const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);g.add(mesh);
  for(const dz of [-depth/2,depth/2]) {beam(g,V(x-width/2,y,z+dz),V(x,y+height,z+dz),.055,mats.iron);beam(g,V(x,y+height,z+dz),V(x+width/2,y,z+dz),.055,mats.iron);}
  box(g,x,y+height,z,.12,.14,depth+.4,mats.brass);
}
const canopyMaterials=new Map<Material,Material>();
export function canopy(g:T.Object3D,x:number,y:number,z:number,w:number,d:number,mat:Material=mats.red) {
  let fabric=canopyMaterials.get(mat);if(!fabric){fabric=mat.clone();fabric.side=T.DoubleSide;canopyMaterials.set(mat,fabric);}
  const geo=new T.PlaneGeometry(w,d,10,2),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const xx=pos.getX(i),yy=pos.getY(i);pos.setXYZ(i,xx,Math.cos(xx/w*Math.PI)*.58+yy*.045,yy);}
  geo.computeVertexNormals();const mesh=new T.Mesh(geo,fabric);mesh.position.set(x,y,z);g.add(mesh);
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])cyl(g,x+dx,y/2,z+dz,.035,y,mats.iron);
  const edge=new T.Shape();edge.moveTo(-w/2,0);for(let i=0;i<=10;i++){const xx=-w/2+i*w/10;edge.lineTo(xx,Math.cos(xx/w*Math.PI)*.58);}
  for(let i=10;i>=0;i--){const xx=-w/2+i*w/10;edge.lineTo(xx,Math.cos(xx/w*Math.PI)*.58-.2-(i%2)*.07);}edge.closePath();
  const hem=new T.Mesh(new T.ShapeGeometry(edge),fabric);hem.position.set(x,y,z+d/2);g.add(hem);return mesh;

}

export function refreshCanopyColors(){for(const [source,fabric] of canopyMaterials){if(source instanceof T.MeshStandardMaterial&&fabric instanceof T.MeshStandardMaterial)fabric.color.copy(source.color);}}
