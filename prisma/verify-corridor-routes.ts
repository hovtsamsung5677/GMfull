import { PrismaClient, RouteNodeType } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const prisma=new PrismaClient();
async function main(){
  const root=resolve(process.cwd(),'../route-audit');
  const floors=await prisma.floor.findMany({where:{number:{in:[1,2,3,4]}}});
  const floorById=new Map(floors.map(f=>[f.id,f.number]));
  const masks=new Map<string,number[][][]>();
  for(const f of floors)masks.set(f.id,JSON.parse(await readFile(resolve(root,`floor-${f.number}-walkable.json`),'utf8')));
  const nodes=await prisma.routeNode.findMany({where:{isActive:true,floorId:{in:floors.map(f=>f.id)}}},);
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const edges=await prisma.routeEdge.findMany({where:{isActive:true,floorId:{in:floors.map(f=>f.id)}}});
  function checkLine(a:{x:number;y:number;floorId:string},b:{x:number;y:number;floorId:string}){
    if(a.floorId!==b.floorId)return;
    const mask=masks.get(a.floorId)!;
    const steps=Math.max(1,Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))*4);
    for(let t=0;t<=steps;t++){
      const x=Math.round(a.x+(b.x-a.x)*t/steps),y=Math.round(a.y+(b.y-a.y)*t/steps);
      if(!mask[y]?.some(([lo,hi])=>x>=lo&&x<=hi))throw new Error(`Outside corridor on floor ${floorById.get(a.floorId)}: ${x},${y}`);
    }
  }
  for(const e of edges){const a=byId.get(e.fromNodeId),b=byId.get(e.toNodeId);if(!a||!b)throw new Error('Active edge has inactive endpoint');checkLine(a,b);}
  const anchors=nodes.filter(n=>n.type===RouteNodeType.STORE_ANCHOR);
  const storeIds=new Set<string>();
  for(const n of anchors){
    const o=n.mapObjectId?await prisma.mapObject.findUnique({where:{id:n.mapObjectId},include:{store:true}}):null;
    if(!o?.isActive||!o.store?.isActive||storeIds.has(o.store.id))throw new Error(`Duplicate/orphan anchor: ${n.name}`);
    storeIds.add(o.store.id);
  }
  const base='http://localhost:3000/api/public/routes/build';
  async function build(from:string,to:string,floorId?:string){
    return fetch(base+'?'+new URLSearchParams({fromNodeId:from,toNodeId:to,...(floorId?{floorId}:{})}));
  }
  const start=anchors.find(n=>floorById.get(n.floorId)===4)!;
  let tested=0;
  for(const end of anchors){
    if(start.id===end.id)continue;
    const response=await build(start.id,end.id);if(!response.ok)throw new Error(`Route failed ${end.name}: ${response.status}`);
    const result=await response.json();
    for(let i=1;i<result.nodes.length;i++)checkLine(result.nodes[i-1],result.nodes[i]);
    tested++;
  }
  const west=anchors.find(n=>n.name==='Вход: Спортмастер')!,east=anchors.find(n=>n.name==='Вход: Мажор')!;
  const sameFloor=await build(west.id,east.id,west.floorId);
  if(sameFloor.status!==404)throw new Error('Floor 2 blocks must be disconnected');
  const cross=await (await build(west.id,east.id)).json();
  const sequence=cross.nodes.map((n:any)=>floorById.get(n.floorId)).filter((n:number,i:number,a:number[])=>!i||a[i-1]!==n);
  if(JSON.stringify(sequence)!=='[2,1,2]')throw new Error(`Unexpected cross-block route ${sequence}`);
  const result={anchors:anchors.length,duplicateAnchors:0,orphanAnchors:0,walkwayEdgesChecked:edges.length,outsideCorridor:0,publicRoutesTested:tested+1,floor2BlockRoute:sequence};
  await writeFile(resolve(root,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
