import * as T from 'three';

const IDENTITY=new T.Matrix4(),PLAIN=new T.Color(0,0,0),scratch=new T.Color();
/** Keep the existing articulated models, but submit shared materials together. */
export class CrowdBatch {
  holder=new T.Group();
  entries:{source:T.Mesh;batch:T.BatchedMesh;id:number;actor:T.Object3D;face?:number;hidden?:boolean}[]=[];
  constructor(public actors:T.Group[],root:T.Group){
    const buckets=new Map<T.Material,T.Mesh[]>(),owner=new Map<T.Mesh,T.Object3D>();
    for(const actor of actors)actor.traverse(o=>{
      if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
      const list=buckets.get(o.material)??[];list.push(o);buckets.set(o.material,list);owner.set(o,actor);
    });
    for(const [material,sources] of buckets){
      const geometryMap=new Map<T.BufferGeometry,T.BufferGeometry>();
      for(const source of sources)if(!geometryMap.has(source.geometry)){const geo=source.geometry.clone();if(!geo.index){const n=geo.attributes.position.count,index=new Array<number>(n);for(let i=0;i<n;i++)index[i]=i;geo.setIndex(index);}geometryMap.set(source.geometry,geo);}
      let vertices=0,indices=0;for(const geo of geometryMap.values()){vertices+=geo.attributes.position.count;indices+=geo.index!.count;}
      const batch=new T.BatchedMesh(sources.length,vertices,indices,material);batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;batch.sortObjects=false;root.add(batch);
      const ids=new Map<T.BufferGeometry,number>();
      for(const [original,geo] of geometryMap){ids.set(original,batch.addGeometry(geo));geo.dispose();}
      for(const source of sources){const id=batch.addInstance(ids.get(source.geometry)!);source.updateMatrix();source.matrixAutoUpdate=false;source.visible=false;if(material.userData.faceAtlas)batch.setColorAt(id,PLAIN);this.entries.push({source,batch,id,actor:owner.get(source)!});}
    }
    // An articulated person is ~40 nodes and none of them draws any more: the batches do. Left in the scene,
    // 192 people are 7,800 nodes the renderer walks twice a frame (matrices, then visibility) for nothing.
    // Hold them outside the scene instead; update() below is the only thing that needs their matrices.
    for(const actor of actors){const parent=actor.parent;if(!parent)continue;parent.updateWorldMatrix(true,false);if(parent.matrixWorld.equals(IDENTITY))this.holder.add(actor);}
    this.update();
  }
  update(){
    // Story-staged actors are often hidden (a liberated square has no patrol): skip their matrices.
    for(const actor of this.actors)if(actor.visible)actor.updateWorldMatrix(true,true);
    for(const entry of this.entries){
      const {source,batch,id}=entry;
      if(!entry.actor.visible){if(!entry.hidden){batch.setVisibleAt(id,false);entry.hidden=true;}continue;}entry.hidden=false;
      const face=source.userData.face as number|undefined;if(face!==undefined&&entry.face!==face){entry.face=face;batch.setColorAt(id,scratch.setRGB(face&15,face>>4&15,face>>8));}
      let visible=true;let parent=source.parent;
      while(parent){if(!parent.visible){visible=false;break;}parent=parent.parent;}
      batch.setVisibleAt(id,visible);if(visible)batch.setMatrixAt(id,source.matrixWorld);
    }
  }
}
