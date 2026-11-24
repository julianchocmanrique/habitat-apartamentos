import initialData from './demo-data.json';
import type { AppState, Unit } from './types';

/** Public UI demonstration. This adapter never sends data to a server. */
const STORAGE_KEY='habitat-public-demo-v1';
type Store={version:1;activeId:string;records:Record<string,AppState>};
type Data=Record<string,unknown>;
class DemoError extends Error {constructor(message:string,public status=400){super(message);}}
const fail=(message:string,status=400):never=>{throw new DemoError(message,status);};
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const now=()=>new Date().toISOString();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const uid=():string=>crypto.randomUUID();
function load():Store {
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw){try{const parsed=JSON.parse(raw);if(parsed.version===1&&parsed.records?.[parsed.activeId]?.settings&&Array.isArray(parsed.records[parsed.activeId].units))return parsed;}catch{/* Discard malformed local demo data. */}}
  return {version:1,activeId:'demo',records:{demo:clone(initialData) as AppState}};
}
function save(store:Store){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store));}catch{fail('No se pudo guardar la demo en este navegador. Revisa el espacio disponible.',507);}}
export function resetDemo(){localStorage.removeItem(STORAGE_KEY);}
function str(d:Data,key:string,max=200,optional=false):string {const value=d[key];if(value==null&&optional)return '';if(typeof value!=='string'||(!value.trim()&&!optional)||value.trim().length>max)fail(`Revisa el campo ${key}.`);return (value as string).trim();}
function money(d:Data,key='amount',zero=false):number {const value=d[key];if(typeof value!=='number'||!Number.isSafeInteger(value)||value<(zero?0:1)||value>1000000000000)fail('El valor debe ser un número entero de pesos válido.');return value as number;}
function date(d:Data,key='date'):string {const value=str(d,key,10);const parsed=new Date(value+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)fail('La fecha no es válida.');return value;}
function choice(d:Data,key:string,values:string[],fallback?:string){const value=d[key]??fallback;if(typeof value!=='string'||!values.includes(value))fail(`Revisa el campo ${key}.`);return value as string;}
function unitFields(data:Data):Omit<Unit,'id'>{
  const email=str(data,'email',254,true).toLowerCase();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('El correo no es válido.');
  return {number:str(data,'number',30),tower:str(data,'tower',30,true),floor:str({...data,floor:String(data.floor??'')},'floor',10,true),resident:str(data,'resident',120,true),email,phone:str(data,'phone',40,true),status:choice(data,'status',['occupied','vacant'],'occupied') as Unit['status'],monthlyRent:money({...data,monthlyRent:data.monthlyRent??0},'monthlyRent',true),monthlyFee:money({...data,monthlyFee:data.monthlyFee??0},'monthlyFee',true)};
}
function present(store:Store):AppState {
  const state=clone(store.records[store.activeId]);
  state.workspaces=Object.values(store.records).map(s=>({id:s.settings!.id,name:s.settings!.name,demo:true}));
  state.charges.sort((a,b)=>b.dueDate.localeCompare(a.dueDate));state.payments.sort((a,b)=>b.date.localeCompare(a.date));state.expenses.sort((a,b)=>b.date.localeCompare(a.date));state.tickets.sort((a,b)=>b.date.localeCompare(a.date));state.announcements.sort((a,b)=>b.date.localeCompare(a.date));state.audit.sort((a,b)=>b.date.localeCompare(a.date));
  return state;
}
function action(store:Store,name:string,data:Data):Record<string,unknown> {
  const state=store.records[store.activeId];let id=uid(),audit='';
  const unit=(key='unitId')=>{const value=str(data,key);if(!state.units.some(u=>u.id===value))fail('Apartamento no encontrado.',404);return value;};
  switch(name){
    case 'createUnit':case 'updateUnit':{
      const fields=unitFields(data);if(name==='updateUnit')id=unit('id');
      if(state.units.some(u=>u.id!==id&&u.number===fields.number&&u.tower===fields.tower))fail('Ya existe un apartamento con esa torre y número.');
      if(name==='createUnit')state.units.push({id,...fields});else state.units=state.units.map(u=>u.id===id?{id,...fields}:u);
      audit=name==='createUnit'?'Apartamento creado':'Apartamento actualizado';break;
    }
    case 'createCharge':{
      const unitId=unit(),period=str(data,'period',7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))fail('El período debe tener formato AAAA-MM.');
      state.charges.push({id,unitId,concept:str(data,'concept',160),amount:money(data),dueDate:date(data,'dueDate'),period});audit='Cobro creado';break;
    }
    case 'reportPayment':{
      const chargeId=str(data,'chargeId'),charge=state.charges.find(c=>c.id===chargeId);if(!charge)fail('Cobro no encontrado.',404);
      const amount=money(data),paymentDate=date(data),reference=str(data,'reference',100),method=str(data,'method',60);
      if(paymentDate>today())fail('La fecha del pago no puede ser futura.');
      if(state.payments.some(p=>p.reference===reference))fail('La referencia de pago ya está registrada.');
      const reserved=state.payments.filter(p=>p.chargeId===chargeId&&p.status!=='rejected').reduce((sum,p)=>sum+p.amount,0);
      if(amount>charge!.amount-reserved)fail('El valor supera el saldo disponible o ya tiene reportes pendientes.');
      state.payments.push({id,unitId:charge!.unitId,chargeId,amount,date:paymentDate,reference,method,status:'pending'});audit='Pago reportado para revisión';break;
    }
    case 'reviewPayment':{
      id=str(data,'id');const status=choice(data,'status',['approved','rejected']) as 'approved'|'rejected',payment=state.payments.find(p=>p.id===id);
      if(!payment||payment.status!=='pending')fail('El pago no existe o ya fue revisado.');
      const charge=state.charges.find(c=>c.id===payment!.chargeId);const paid=state.payments.filter(p=>p.chargeId===payment!.chargeId&&p.status==='approved').reduce((sum,p)=>sum+p.amount,0);
      if(status==='approved'&&(!charge||payment!.amount>charge.amount-paid))fail('El pago supera el saldo pendiente.');
      payment!.status=status;audit=status==='approved'?'Pago aprobado':'Pago rechazado';break;
    }
    case 'createExpense':{
      const expenseDate=date(data);if(expenseDate>today())fail('La fecha del gasto no puede ser futura.');
      state.expenses.push({id,concept:str(data,'concept',160),category:str(data,'category',80),amount:money(data),date:expenseDate});audit='Gasto registrado';break;
    }
    case 'createTicket':state.tickets.push({id,unitId:unit(),title:str(data,'title',160),description:str(data,'description',5000),category:str(data,'category',80),priority:choice(data,'priority',['low','medium','high'],'medium'),status:'open',date:today()});audit='Solicitud creada';break;
    case 'updateTicket':{
      id=str(data,'id');const ticket=state.tickets.find(t=>t.id===id);if(!ticket)fail('Solicitud no encontrada.',404);ticket!.status=choice(data,'status',['open','progress','resolved']) as 'open'|'progress'|'resolved';audit='Estado de solicitud actualizado';break;
    }
    case 'sendMessage':state.messages.push({id,unitId:unit(),senderRole:'admin',senderName:'Administrador',body:str(data,'body',5000),createdAt:now()});audit='Mensaje de demostración enviado';break;
    case 'createAnnouncement':state.announcements.push({id,title:str(data,'title',160),body:str(data,'body',10000),category:str(data,'category',80),date:today()});audit='Comunicado publicado en demo';break;
    case 'updateSettings':state.settings!.name=str(data,'name',120);state.settings!.city=str(data,'city',100);audit='Configuración de demo actualizada';break;
    case 'createWorkspace':{
      const name=str(data,'name',120),city=str(data,'city',100);
      store.records[id]={user:clone(state.user),membership:{role:'admin',unitId:null},settings:{id,name,city,currency:'COP',demo:true},workspaces:[],units:[],charges:[],payments:[],expenses:[],tickets:[],messages:[],announcements:[],audit:[{id:uid(),action:'Espacio de demostración creado',actor:'Administrador',date:now()}]};store.activeId=id;return {ok:true,id};
    }
    case 'switchWorkspace':id=str(data,'id');if(!Object.hasOwn(store.records,id))fail('Edificio no encontrado.',404);store.activeId=id;return {ok:true,id};
    case 'createInvite':case 'claimInvite':return fail('Las invitaciones reales no están disponibles en esta demo pública.');
    default:return fail('Acción no disponible en esta demostración.');
  }
  state.audit.unshift({id:uid(),action:audit,actor:'Administrador',date:now()});return {ok:true,id};
}
export async function demoRequest(input:string,init?:RequestInit):Promise<Response> {
  try {
    const path=new URL(input,'https://demo.local').pathname,method=(init?.method||'GET').toUpperCase(),store=load();
    if(path==='/api/state'&&method==='GET')return Response.json(present(store));
    if(path==='/api/action'&&method==='POST'){
      if(typeof init?.body!=='string'||init.body.length>50000)fail('La solicitud no es válida.');
      let payload;try{payload=JSON.parse(init!.body as string);}catch{fail('La solicitud no es válida.');}
      if(!payload||typeof payload.action!=='string'||!payload.data||typeof payload.data!=='object'||Array.isArray(payload.data))fail('La solicitud no es válida.');
      const result=action(store,payload.action,payload.data);save(store);return Response.json(result);
    }
    return Response.json({error:'Ruta no disponible en la demo.'},{status:404});
  }catch(error){return Response.json({error:error instanceof DemoError?error.message:'No se pudo cargar la demostración local.'},{status:error instanceof DemoError?error.status:500});}
}
