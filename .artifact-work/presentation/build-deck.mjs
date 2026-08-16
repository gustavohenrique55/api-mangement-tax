import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "C:/Users/gusta/Documents/ChatGPT/API - MANAGEMNET tAX/deliverables/Management_Tax_LATAM_Caribe_Executivo.pptx";
const PREVIEW = "C:/Users/gusta/Documents/ChatGPT/API - MANAGEMNET tAX/.artifact-work/presentation/rendered";
const COVER = "C:/Users/gusta/Documents/ChatGPT/API - MANAGEMNET tAX/dashboard/public/og.png";
const C = { ink: "#14231D", paper: "#F3F1E9", white: "#FFFEF9", green: "#147353", lime: "#BDDC53", amber: "#C78526", red: "#B64335", muted: "#68756F", line: "#D9D9D0", pale: "#E8EEE8" };

async function writeBlob(path, blob) { await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer())); }
function box(slide, x, y, w, h, fill=C.white, radius="roundRect", line=C.line) {
  const config={ geometry: radius, position:{left:x,top:y,width:w,height:h}, fill, line:{style:"solid",fill:line,width:1} };
  if (["rect","textbox","roundRect"].includes(radius)) config.borderRadius="rounded-xl";
  return slide.shapes.add(config);
}
function text(slide, value, x, y, w, h, size=22, color=C.ink, bold=false, align="left") {
  const s=slide.shapes.add({geometry:"textbox",position:{left:x,top:y,width:w,height:h},fill:"none",line:{style:"solid",fill:"none",width:0}});
  s.text=value; s.text.style={fontSize:size,color,bold,alignment:align,fontFamily:"Arial"}; return s;
}
function eyebrow(slide, value, x=70, y=42) { return text(slide,value.toUpperCase(),x,y,500,24,13,C.green,true); }
function title(slide, value, y=78) { return text(slide,value,70,y,1140,70,40,C.ink,true); }
function footer(slide, n) { text(slide,"EMPRESA CONFIDENCIAL · DADOS SINTÉTICOS",70,681,600,18,11,C.muted,true); text(slide,String(n).padStart(2,"0"),1160,681,50,18,11,C.muted,true,"right"); }
function bullet(slide, value, x, y, w, accent=C.green, textColor=C.ink) { box(slide,x,y+6,10,10,accent,"ellipse",accent); text(slide,value,x+24,y,w-24,54,20,textColor,false); }

const p=Presentation.create({slideSize:{width:1280,height:720}});

// 1 — cover
{
  const s=p.slides.add();
  const bytes=await fs.readFile(COVER);
  s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:"image/png",alt:"Capa do dashboard Management Tax LATAM e Caribe",fit:"cover",position:{left:0,top:0,width:1280,height:720}});
  box(s,0,650,1280,70,"#14231DDD","rect","#14231DDD");
  text(s,"Proposta para discussão com especialista tributário regional",70,671,900,28,18,C.white,false);
  text(s,"2026 Q3",1110,671,100,28,16,C.lime,true,"right");
}

// 2 — mandate
{
  const s=p.slides.add(); s.background.fill=C.paper; eyebrow(s,"O mandato"); title(s,"Governar resultado regional sem substituir o especialista local");
  text(s,"O Management Tax consolida decisões, risco e desempenho. A execução técnica permanece com escritórios habilitados em cada jurisdição.",70,158,1080,60,24,C.muted,false);
  const items=[
    ["01","Reduzir a carga efetiva","ETR, incentivos e créditos com efeito de caixa verificável."],
    ["02","Controlar exposição","Materialidade, apetite de risco, contingências e gates ex ante."],
    ["03","Padronizar a rede","IDE, SLA, reliance e atualização legislativa em 30+ jurisdições."],
  ];
  items.forEach(([n,h,d],i)=>{const y=270+i*112;text(s,n,72,y,50,34,17,C.green,true);text(s,h,140,y,330,36,26,C.ink,true);text(s,d,500,y,650,52,20,C.muted,false);s.shapes.add({geometry:"rect",position:{left:70,top:y+75,width:1140,height:1},fill:C.line,line:{style:"solid",fill:C.line,width:0}})}); footer(s,2);
}

// 3 — regional coverage
{
  const s=p.slides.add(); s.background.fill=C.white; eyebrow(s,"Arquitetura de cobertura"); title(s,"A intensidade de supervisão acompanha materialidade e risco");
  const tiers=[
    ["TIER 1","Brasil · México · Colômbia","Supervisão próxima e scorecard trimestral",C.green],
    ["TIER 2","Argentina · Chile · Peru · outros","Reporte periódico; Argentina com atenção cambial",C.lime],
    ["TIER 3","América Central","Gestão por hub e regime regional",C.amber],
    ["TIER 4","Caribe e territórios","Assessoria por tradição jurídica e substância",C.green],
    ["TIER 5","Venezuela · Cuba · Haiti","Risco reforçado, sanções e continuidade",C.red],
  ];
  tiers.forEach(([tier,countries,mode,color],i)=>{const y=175+i*90; text(s,tier,74,y,120,30,18,color,true); text(s,countries,215,y,345,34,20,C.ink,true); text(s,mode,590,y,570,42,18,C.muted,false); box(s,70,y+54,1090,5,color,"rect",color);}); footer(s,3);
}

// 4 — executive snapshot
{
  const s=p.slides.add(); s.background.fill=C.paper; eyebrow(s,"Visão executiva sintética"); title(s,"O painel equilibra geração de valor e exposição");
  const kpis=[["ETR","16,3%","−2,1 p.p."],["IDE médio","73,6","baseline"],["Créditos","€ 669 mil","83,6% meta"],["Exposição","€ 2,2 mi","2 exceções"]];
  kpis.forEach(([l,v,d],i)=>{const x=70+i*290;text(s,l,x,165,230,24,15,C.muted,true);text(s,v,x,195,240,52,36,C.ink,true);text(s,d,x,249,220,24,15,i===3?C.red:C.green,true)});
  s.charts.add("bar",{position:{left:70,top:330,width:760,height:270},categories:["MX","BR","CO","PA","AR","PR","KY","VE"],series:[{name:"IDE",values:[100,94.2,89.4,81.1,67.8,61.9,55.6,38.4],fill:C.green}],hasLegend:false,dataLabels:{showValue:true,position:"outEnd"},xAxis:{majorGridlines:{style:"solid",fill:C.line,width:1}},yAxis:{min:0,max:100}});
  box(s,875,330,335,270,C.ink); text(s,"LEITURA PARA DECISÃO",905,360,270,24,14,C.lime,true); text(s,"3",905,408,70,55,42,C.white,true); text(s,"escritórios em Atenção",975,419,200,42,19,C.white,true); text(s,"1",905,486,70,55,42,C.red,true); text(s,"escritório Crítico",975,497,200,42,19,C.white,true); footer(s,4);
}

// 5 — scorecard
{
  const s=p.slides.add(); s.background.fill=C.white; eyebrow(s,"Scorecard dos escritórios"); title(s,"Onze indicadores transformam desempenho em evidência comparável");
  const groups=[
    ["Qualidade · 25%",["Êxito em disputas 15%","Retrabalho de pareceres 10%"]],
    ["Prazo · 20%",["Resposta 10%","Prazos legais 10%"]],
    ["Resultado · 30%",["Créditos 15%","Contingências 10%","Economia 5%"]],
    ["Governança · 25%",["Custo-benefício 10%","Falhas 5%","Apetite 5%","Radar legal 5%"]],
  ];
  groups.forEach(([g,items],i)=>{const x=70+i*290;box(s,x,180,265,410,i===3?C.ink:C.paper);text(s,g,x+20,205,225,35,22,i===3?C.white:C.ink,true);items.forEach((item,j)=>bullet(s,item,x+22,270+j*62,215,i===3?C.lime:C.green,i===3?C.white:C.ink));});
  text(s,"IDE = Σ (indicador normalizado × peso)",70,620,550,30,21,C.green,true);text(s,"Baseline calcula, mas não autoriza panel review.",690,620,520,30,18,C.muted,false,"right"); footer(s,5);
}

// 6 — risk governance
{
  const s=p.slides.add(); s.background.fill=C.paper; eyebrow(s,"Gestão de risco"); title(s,"Quatro controles compensam a distância entre gestão e execução técnica");
  const controls=[
    ["Alçadas","Decisão por materialidade e impacto reputacional."],
    ["Gate ex ante","Aprovação antes de posições relevantes."],
    ["Segunda opinião","Parecer independente em matéria de alto impacto."],
    ["Reliance","Questão, parecer, responsável e data documentados."],
  ];
  controls.forEach(([h,d],i)=>{const y=175+i*100;text(s,String(i+1).padStart(2,"0"),72,y,55,28,17,C.green,true);text(s,h,145,y,260,32,25,C.ink,true);text(s,d,425,y,660,48,20,C.muted,false);});
  box(s,70,595,1140,55,C.ink);text(s,"Escalar imediatamente: materialidade excedida · risco reputacional · sanções · posição fora do apetite",95,612,1090,28,18,C.white,true); footer(s,6);
}

// 7 — roadmap
{
  const s=p.slides.add(); s.background.fill=C.white; eyebrow(s,"Plano de implantação"); title(s,"A sequência de 12 meses leva do diagnóstico à cultura regional");
  const phases=[
    ["0","0–30 dias","Diagnóstico e cobertura"],
    ["1","30–90","Governança e rede"],
    ["2","90–180","ETR e recuperação"],
    ["3","90–180+","Risco contínuo"],
    ["4","180–365","Cultura e consolidação"],
  ];
  box(s,95,324,1050,8,C.line,"rect",C.line);
  phases.forEach(([n,t,h],i)=>{const x=80+i*235;box(s,x,280,70,70,i===4?C.lime:C.green,"ellipse",i===4?C.lime:C.green);text(s,n,x,296,70,36,25,i===4?C.ink:C.white,true,"center");text(s,t,x-25,375,120,26,16,C.green,true,"center");text(s,h,x-55,415,180,58,19,C.ink,true,"center")});
  text(s,"Frente paralela desde o dia 1: atendimento às demandas correntes do negócio.",170,535,940,40,24,C.muted,false,"center"); footer(s,7);
}

// 8 — decision
{
  const s=p.slides.add(); s.background.fill=C.ink; eyebrow(s,"Próxima decisão",70,46); text(s,"Validar o modelo antes de calibrar a empresa real",70,88,1080,80,42,C.white,true);
  const questions=["Pesos, metas e limiares são defensáveis?","O scorecard mede processo sem invadir o mérito jurídico?","Quais campos exigem validação obrigatória por país?","Como preservar privilege e reliance em cada tradição jurídica?","Quais parâmetros cabem ao CFO e quais ao Board?"];
  questions.forEach((q,i)=>{text(s,String(i+1).padStart(2,"0"),74,205+i*72,45,28,15,C.lime,true);text(s,q,140,202+i*72,950,42,22,C.white,false)});
  box(s,70,595,1140,54,C.lime);text(s,"Resultado esperado: parâmetros aprovados, lacunas atribuídas e piloto autorizado.",95,611,1090,28,20,C.ink,true); text(s,"EMPRESA CONFIDENCIAL · NÃO CONSTITUI PARECER",70,681,700,18,11,"#A7B4AE",true); text(s,"08",1160,681,50,18,11,"#A7B4AE",true,"right");
}

await fs.mkdir(PREVIEW,{recursive:true});
for (const [i,s] of p.slides.items.entries()) await writeBlob(`${PREVIEW}/slide-${i+1}.png`,await p.export({slide:s,format:"png",scale:1}));
await writeBlob(`${PREVIEW}/montage.webp`,await p.export({format:"webp",montage:true,scale:1}));
const pptx=await PresentationFile.exportPptx(p); await pptx.save(OUT);
