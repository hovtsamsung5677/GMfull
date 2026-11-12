import { PrismaClient, RouteNodeType, RouteEdgeType } from '@prisma/client';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();
const source = 'model-verified-corridors-2026-11-12';
type Plan = { floor: number; floorId: string; moves: {id: string; name: string; type: string; x: number; y: number}[]; disabled: string[]; points: [number,number][]; edges: [[number,number],[number,number]][] };
const key = (p: number[]) => p.join('_');
async function main() {
  const directory = resolve(process.cwd(), '../route-audit');
  const plans: Plan[] = JSON.parse(await readFile(resolve(directory, 'verified-plan.json'), 'utf8'));
  if(plans.length!==4 || new Set(plans.map(p=>p.floor)).size!==4)throw new Error('Expected four distinct reviewed floors');
  for(const p of plans){
    const mask:number[][][]=JSON.parse(await readFile(resolve(directory,`floor-${p.floor}-walkable.json`),'utf8'));
    const keys=new Set(p.points.map(key));
    for(const n of p.moves)if(!keys.has(key([n.x,n.y])))throw new Error(`Missing connector for ${n.name}`);
    for(const [a,b] of p.edges){
      if(!keys.has(key(a))||!keys.has(key(b)))throw new Error('Unknown edge endpoint');
      const steps=Math.max(1,Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))*4);
      for(let t=0;t<=steps;t++){
        const x=Math.round(a[0]+(b[0]-a[0])*t/steps),y=Math.round(a[1]+(b[1]-a[1])*t/steps);
        if(!mask[y]?.some(([lo,hi])=>x>=lo&&x<=hi))throw new Error(`Edge outside corridor: floor ${p.floor}, ${x},${y}`);
      }
    }
  }
  const floors = plans.map(p => p.floorId);
  const snapshot = {
    nodes: await prisma.routeNode.findMany({ where: { floorId: { in: floors } } }),
    edges: await prisma.routeEdge.findMany({ where: { OR: [{ floorId: { in: floors } }, { fromNode: {floorId:{in:floors}} }, {toNode:{floorId:{in:floors}}}] } }),
  };
  const objects = await prisma.mapObject.findMany({where:{floorId:{in:floors}},include:{store:true}});
  const byObject = new Map(objects.map(o=>[o.id,o]));
  const disabled = new Set(plans.flatMap(p=>p.disabled));
  const duplicates: string[]=[];
  const orphans: string[]=[];
  const plannedIds = new Set(plans.flatMap(p=>p.moves.map(n=>n.id)));
  const seen = new Map<string,string>();
  // Prefer the reviewed anchor; deactivate duplicate and obsolete anchors without
  // deleting their records or any stores, history, or analytics.
  const activeAnchors=snapshot.nodes.filter(n=>n.isActive && n.type===RouteNodeType.STORE_ANCHOR)
    .sort((a,b)=>Number(plannedIds.has(b.id))-Number(plannedIds.has(a.id)));
  for(const n of activeAnchors) {
    const object=n.mapObjectId ? byObject.get(n.mapObjectId):undefined;
    if(!object?.isActive || !object.store?.isActive || object.store.floorId!==n.floorId) {orphans.push(n.id);disabled.add(n.id);continue;}
    if(seen.has(object.store.id)){duplicates.push(n.id);disabled.add(n.id);}else seen.set(object.store.id,n.id);
  }
  for(const p of plans) {
    const floor=await prisma.floor.findUniqueOrThrow({where:{id:p.floorId}});
    if(floor.number!==p.floor)throw new Error('Floor changed since audit');
    for(const n of p.moves) {
      const old=snapshot.nodes.find(v=>v.id===n.id);
      if(!old || old.floorId!==p.floorId || old.name!==n.name || disabled.has(n.id))throw new Error(`Stale or invalid reviewed node: ${n.name}`);
    }
    const storeIds=new Set(objects.filter(o=>o.isActive && o.store?.isActive && o.floorId===p.floorId).map(o=>o.storeId).filter(Boolean));
    for(const id of storeIds)if(!seen.has(id!))throw new Error(`Active store has no valid anchor: ${id}`);
  }
  console.log(JSON.stringify({mode:process.env.APPLY_VERIFIED_ROUTES==='YES'?'apply':'dry-run',floors:plans.map(p=>({number:p.floor,points:p.points.length,edges:p.edges.length})),duplicates:duplicates.length,orphans:orphans.length,disabled:[...disabled]},null,2));
  if(process.env.APPLY_VERIFIED_ROUTES!=='YES')return;
  await mkdir(directory,{recursive:true});
  const backup=resolve(directory,`route-backup-${Date.now()}.json`);
  await writeFile(backup,JSON.stringify(snapshot,null,2),{flag:'wx'});
  await prisma.$transaction(async tx=>{
    await tx.routeEdge.updateMany({where:{OR:[{fromNodeId:{in:[...disabled]}},{toNodeId:{in:[...disabled]}}]},data:{isActive:false}});
    await tx.routeNode.updateMany({where:{id:{in:[...disabled]}},data:{isActive:false}});
    for(const p of plans){
      const oldPoints=snapshot.nodes.filter(n=>n.floorId===p.floorId && n.type===RouteNodeType.ROUTE_POINT).map(n=>n.id);
      await tx.routeEdge.updateMany({where:{OR:[{floorId:p.floorId,type:RouteEdgeType.WALKWAY},{fromNodeId:{in:oldPoints}},{toNodeId:{in:oldPoints}}]},data:{isActive:false}});
      await tx.routeNode.updateMany({where:{id:{in:oldPoints}},data:{isActive:false}});
      for(const n of p.moves)await tx.routeNode.update({where:{id:n.id},data:{x:n.x,y:n.y,isActive:true}});
      const ids=new Map<string,string>();
      for(const xy of p.points){
        const code=`${source}:${p.floor}:${key(xy)}`;
        const existing=await tx.routeNode.findFirst({where:{floorId:p.floorId,code}});
        const data={floorId:p.floorId,code,name:`Точка коридора ${p.floor}: ${xy.join(', ')}`,type:RouteNodeType.ROUTE_POINT,x:xy[0],y:xy[1],z:0,isActive:true,metadata:{source}};
        const node=existing?await tx.routeNode.update({where:{id:existing.id},data}):await tx.routeNode.create({data});ids.set(key(xy),node.id);
      }
      async function edge(a:string,b:string,distance:number){
        const data={floorId:p.floorId,type:RouteEdgeType.WALKWAY,isActive:true,isBidirectional:true,distance,weight:distance,metadata:{source}};
        await tx.routeEdge.upsert({where:{fromNodeId_toNodeId:{fromNodeId:a,toNodeId:b}},update:data,create:{...data,fromNodeId:a,toNodeId:b}});
      }
      for(const [a,b] of p.edges)await edge(ids.get(key(a))!,ids.get(key(b))!,Math.max(1,Math.round(Math.hypot(a[0]-b[0],a[1]-b[1]))));
      for(const n of p.moves){const id=ids.get(key([n.x,n.y]));if(!id)throw new Error(`Unconnected destination ${n.name}`);await edge(n.id,id,1);}
    }
  },{timeout:120000});
  console.log(`Applied. Recoverable snapshot: ${backup}`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
