import * as T from 'three';

/** Keep the existing articulated models, but submit shared materials together. */
export class CrowdBatch {
  entries:{source:T.Mesh;batch:T.BatchedMesh;id:number}[]=[];
  constructor(public actors:T.Group[],root:T.Group){
    const buckets=new Map<T.Material,T.Mesh[]>();
    for(const actor of actors)actor.traverse(o=>{
      if(!(o instanceof T.Mesh)||Array.isArray(o.material))return;
      const list=buckets.get(o.material)??[];list.push(o);buckets.set(o.material,list);
    });
    for(const [material,sources] of buckets){
      const geometryMap=new Map<T.BufferGeometry,T.BufferGeometry>();
      for(const source of sources)if(!geometryMap.has(source.geometry))geometryMap.set(source.geometry,source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone());
      let vertices=0;for(const geo of geometryMap.values())vertices+=geo.attributes.position.count;
      const batch=new T.BatchedMesh(sources.length,vertices,0,material);batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;root.add(batch);
      const ids=new Map<T.BufferGeometry,number>();
      for(const [original,geo] of geometryMap){ids.set(original,batch.addGeometry(geo));geo.dispose();}
      for(const source of sources){const id=batch.addInstance(ids.get(source.geometry)!);source.updateMatrix();source.matrixAutoUpdate=false;source.visible=false;this.entries.push({source,batch,id});}
    }
    this.update();
  }
  update(){
    for(const actor of this.actors)actor.updateWorldMatrix(true,true);
    for(const {source,batch,id} of this.entries){
      let visible=true;let parent=source.parent;
      while(parent){if(!parent.visible){visible=false;break;}parent=parent.parent;}
      batch.setVisibleAt(id,visible);if(visible)batch.setMatrixAt(id,source.matrixWorld);
    }
  }
}
