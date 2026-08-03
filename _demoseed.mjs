import { PrismaClient } from "@prisma/client";
const p=new PrismaClient(); let s=42; const rnd=()=>(s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;
const sessions=await p.session.findMany(); const enr=await p.enrollment.findMany();
const byC=new Map(); for(const e of enr){(byC.get(e.courseId)??byC.set(e.courseId,[]).get(e.courseId)).push(e.studentId);}
const base=new Map(); for(const e of enr) if(!base.has(e.studentId)) base.set(e.studentId,0.68+rnd()*0.3);
await p.attendance.deleteMany(); const rows=[];
for(const ses of sessions){const studs=byC.get(ses.courseId)||[]; const sp=parseInt(ses.slot.slice(0,2))>=15?-0.12:0;
 for(const sid of studs){const pr=Math.min(.98,Math.max(.2,base.get(sid)+sp+(rnd()-.5)*.15)); rows.push({sessionId:ses.id,studentId:sid,status:rnd()<pr?"PRESENT":"ABSENT",markedBy:"demo"});}}
for(let i=0;i<rows.length;i+=1000) await p.attendance.createMany({data:rows.slice(i,i+1000)});
console.log("seeded",rows.length); await p.$disconnect();
