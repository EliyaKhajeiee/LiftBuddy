export function buildCacaHtml(muscle: number, level: number): string {
  const m = Math.max(0, Math.min(1, muscle));
  const lvl = Math.max(1, level);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#080012;overflow:hidden}
canvas{display:block}
#label{
  position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
  font-family:-apple-system,sans-serif;font-size:10px;font-weight:800;
  letter-spacing:3px;color:rgba(255,120,0,0.8);pointer-events:none;
  text-shadow:0 0 10px rgba(255,100,0,0.6);white-space:nowrap;
}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="label">READY</div>
<script>
var M=${m}, LVL=${lvl};
var cv=document.getElementById('c');
var cx=cv.getContext('2d');
var W=window.innerWidth, H=window.innerHeight;
cv.width=W; cv.height=H;

// ── character scale from muscle ──────────────────────────────────────────────
var BASE = Math.min(W,H)*0.38;
var SCALE = 1 + M*0.45;  // body gets bigger with muscle

// ── body proportions (in "character units", scaled) ─────────────────────────
// All sizes relative to BASE
var U = BASE * SCALE;

// limb thickness grows with muscle
var tTorso  = (0.22 + M*0.12) * U;
var tUpperA = (0.10 + M*0.07) * U;
var tForeA  = (0.08 + M*0.05) * U;
var tThigh  = (0.13 + M*0.09) * U;
var tShin   = (0.09 + M*0.06) * U;
var lTorso  = 0.38 * U;
var lUpperA = 0.26 * U;
var lForeA  = 0.22 * U;
var lThigh  = 0.30 * U;
var lShin   = 0.28 * U;
var headR   = (0.13 + M*0.03) * U;

// ── animation poses ──────────────────────────────────────────────────────────
// Each pose: target angles (radians) for each joint
// joints: [lShoulder, lElbow, rShoulder, rElbow, lHip, lKnee, rHip, rKnee, spine]
// positive = forward/down rotation

var POSES = [
  { name:'IDLE',           j:[0.15,-0.2, -0.15,0.2, 0.05,0.1, -0.05,0.1, 0.0],   speed:0.9 },
  { name:'BICEP CURL',     j:[-1.1,2.2,  0.2,-0.3, 0.05,0.1, -0.05,0.1, 0.0],    speed:1.3 },
  { name:'OVERHEAD PRESS', j:[-1.5,0.3, -1.5,0.3,  0.05,0.1, -0.05,0.1, -0.05],  speed:1.1 },
  { name:'SQUAT',          j:[0.4,-0.3,  -0.4,0.3, 0.85,1.6,  0.85,1.6, 0.15],   speed:0.8 },
  { name:'DEADLIFT',       j:[0.5,-0.2, -0.5,0.2,  0.3,0.5,   0.3,0.5,  0.3],    speed:0.7 },
  { name:'LAT RAISE',      j:[-1.3,0.1, 1.3,-0.1,  0.05,0.1, -0.05,0.1, 0.0],    speed:1.2 },
];

var poseIdx = 0;
var poseFade = 0;  // 0-1, how far we are into a new pose
var FADE_SPEED = 0.012;
var poseTimer = 0;
var POSE_HOLD = 220; // frames per pose

// current joint angles (lerp targets)
var cur  = POSES[0].j.slice();
var prev = POSES[0].j.slice();
var next = POSES[0].j.slice();

function advancePose() {
  prev = cur.slice();
  poseIdx = (poseIdx + 1) % POSES.length;
  next = POSES[poseIdx].j.slice();
  poseFade = 0;
  poseTimer = 0;
  document.getElementById('label').textContent = POSES[poseIdx].name;
}

document.body.addEventListener('click', advancePose);

// ── draw helpers ─────────────────────────────────────────────────────────────

function capsule(cx2, x1,y1, x2,y2, r, col, glow) {
  var dx=x2-x1, dy=y2-y1;
  var len=Math.sqrt(dx*dx+dy*dy)||1;
  var nx=-dy/len, ny=dx/len;
  if(glow){
    cx2.shadowColor=col;
    cx2.shadowBlur=18*glow;
  } else {
    cx2.shadowBlur=0;
  }
  cx2.beginPath();
  cx2.moveTo(x1+nx*r, y1+ny*r);
  cx2.lineTo(x2+nx*r, y2+ny*r);
  cx2.arc(x2,y2,r, Math.atan2(ny,nx), Math.atan2(ny,nx)+Math.PI);
  cx2.lineTo(x1-nx*r, y1-ny*r);
  cx2.arc(x1,y1,r, Math.atan2(-ny,-nx), Math.atan2(-ny,-nx)+Math.PI);
  cx2.closePath();
  cx2.fillStyle=col;
  cx2.fill();
  cx2.shadowBlur=0;
}

function circle(cx2,x,y,r,col,glow){
  if(glow){cx2.shadowColor=col;cx2.shadowBlur=22*glow;}else{cx2.shadowBlur=0;}
  cx2.beginPath();
  cx2.arc(x,y,r,0,Math.PI*2);
  cx2.fillStyle=col;
  cx2.fill();
  cx2.shadowBlur=0;
}

// ── color palette ─────────────────────────────────────────────────────────────
var COL = {
  skin:   '#c8845a',
  skinD:  '#a0623a',
  shirt:  '#1a1a2e',
  pants:  '#111122',
  shoe:   '#222233',
  orange: '#ff7a00',
  eye:    M>0.6 ? '#ff6600' : '#ffffff',
  joint:  '#c87040',
};

// ── dumbbell ─────────────────────────────────────────────────────────────────
function drawDumbbell(cx2, x, y, angle, showDB) {
  if(!showDB) return;
  cx2.save();
  cx2.translate(x,y);
  cx2.rotate(angle);
  var bw=tForeA*0.55, bl=tForeA*1.4;
  // handle
  cx2.fillStyle='#888';
  cx2.shadowBlur=0;
  cx2.fillRect(-bl*0.5,-bw*0.18,bl,bw*0.36);
  // plates
  cx2.fillStyle='#555';
  cx2.beginPath(); cx2.arc(-bl*0.5,0,bw*0.5,0,Math.PI*2); cx2.fill();
  cx2.beginPath(); cx2.arc( bl*0.5,0,bw*0.5,0,Math.PI*2); cx2.fill();
  cx2.restore();
}

// ── barbell (for deadlift / squat) ───────────────────────────────────────────
function drawBarbell(cx2, x, y, len) {
  cx2.fillStyle='#666';
  cx2.fillRect(x-len/2, y-4, len, 8);
  cx2.fillStyle='#444';
  cx2.beginPath(); cx2.arc(x-len/2,y,14,0,Math.PI*2); cx2.fill();
  cx2.beginPath(); cx2.arc(x+len/2,y,14,0,Math.PI*2); cx2.fill();
}

// ── background ───────────────────────────────────────────────────────────────
function drawBG(t) {
  // dark gradient
  var bg=cx.createRadialGradient(W/2,H*0.4,0, W/2,H*0.4,H*0.65);
  bg.addColorStop(0,'#110020');
  bg.addColorStop(1,'#050008');
  cx.fillStyle=bg;
  cx.fillRect(0,0,W,H);

  // grid floor
  cx.strokeStyle='rgba(255,100,0,0.08)';
  cx.lineWidth=1;
  var gy=H*0.82, gw=W*0.9, gstep=W*0.07;
  for(var gx=-gw;gx<gw*2;gx+=gstep){
    cx.beginPath(); cx.moveTo(W/2+gx,gy); cx.lineTo(W/2+gx+gw,H+20); cx.stroke();
    cx.beginPath(); cx.moveTo(W/2+gx,gy); cx.lineTo(W/2+gx-gw,H+20); cx.stroke();
  }

  // platform glow
  cx.shadowColor='#ff7a00';
  cx.shadowBlur=40;
  cx.fillStyle='rgba(255,122,0,0.12)';
  cx.beginPath();
  cx.ellipse(W/2,H*0.81, U*0.55, U*0.09, 0, 0, Math.PI*2);
  cx.fill();
  cx.shadowBlur=0;

  // subtle pulse ring
  var pr = (0.5+0.5*Math.sin(t*0.04))*U*0.6;
  cx.strokeStyle='rgba(255,100,0,'+(0.06+0.04*Math.sin(t*0.04))+')';
  cx.lineWidth=2;
  cx.beginPath();
  cx.ellipse(W/2,H*0.81, pr, pr*0.16, 0, 0, Math.PI*2);
  cx.stroke();
}

// ── main character draw ───────────────────────────────────────────────────────
function drawCharacter(j, t) {
  var lShoulder=j[0], lElbow=j[1];
  var rShoulder=j[2], rElbow=j[3];
  var lHip=j[4], lKnee=j[5];
  var rHip=j[6], rKnee=j[7];
  var spine=j[8];

  // add breathing oscillation on top
  var breath = Math.sin(t*0.04)*0.02;
  lShoulder += breath; rShoulder -= breath;

  // ── root position ─────────────────────────────────────────────
  var groundY = H*0.80;
  var rootX = W/2;

  // spine lean
  var spineAngle = spine;

  // ── legs ────────────────────────────────────────────────────
  // left thigh
  var lHipX=rootX - tTorso*0.35;
  var lHipY=groundY - lThigh - lShin;
  var lKneeX=lHipX + Math.sin(lHip)*lThigh;
  var lKneeY=lHipY + Math.cos(lHip)*lThigh;
  var lFootX=lKneeX + Math.sin(lHip+lKnee)*lShin;
  var lFootY=lKneeY + Math.cos(lHip+lKnee)*lShin;

  // right thigh
  var rHipX=rootX + tTorso*0.35;
  var rHipY=lHipY;
  var rKneeX=rHipX - Math.sin(rHip)*rThigh;
  var rKneeY=rHipY + Math.cos(rHip)*lThigh;
  var rFootX=rKneeX - Math.sin(rHip+rKnee)*lShin;
  var rFootY=rKneeY + Math.cos(rHip+rKnee)*lShin;

  // draw back leg first
  capsule(cx,rHipX,rHipY, rKneeX,rKneeY, tThigh*0.48, '#0d0d1f');
  capsule(cx,rKneeX,rKneeY, rFootX,rFootY, tShin*0.46, '#0d0d1f');
  // shoe back
  capsule(cx,rFootX,rFootY, rFootX+tShin*0.9,rFootY+tShin*0.12, tShin*0.46, '#161628');

  // torso
  var torsoTopX=rootX + Math.sin(spineAngle)*lTorso*0.5;
  var torsoTopY=lHipY - lTorso;
  var torsoBotX=rootX - Math.sin(spineAngle)*lTorso*0.5;
  var torsoBotY=lHipY;

  // shoulders (wider with muscle)
  var shoulderW = tTorso*(0.75+M*0.3);
  var lShoulderX=torsoTopX - shoulderW;
  var lShoulderY=torsoTopY + lTorso*0.05;
  var rShoulderX=torsoTopX + shoulderW;
  var rShoulderY=lShoulderY;

  // ── back arms ─────────────────────────────────────────────────
  var lElbowX=lShoulderX + Math.sin(lShoulder-0.2)*lUpperA;
  var lElbowY=lShoulderY + Math.cos(lShoulder-0.2)*lUpperA;
  var lHandX=lElbowX + Math.sin(lShoulder+lElbow-0.2)*lForeA;
  var lHandY=lElbowY + Math.cos(lShoulder+lElbow-0.2)*lForeA;

  capsule(cx,lShoulderX,lShoulderY, lElbowX,lElbowY, tUpperA*0.46, '#1a1a3a');
  capsule(cx,lElbowX,lElbowY, lHandX,lHandY, tForeA*0.44, '#1a1a3a');

  // ── torso ────────────────────────────────────────────────────
  capsule(cx,torsoBotX,torsoBotY, torsoTopX,torsoTopY, tTorso*0.5, COL.shirt, 0);

  // chest highlight
  var chestY=torsoTopY+lTorso*0.25;
  cx.save();
  cx.globalAlpha=0.13+M*0.1;
  cx.fillStyle=COL.orange;
  cx.shadowColor=COL.orange; cx.shadowBlur=12;
  cx.beginPath();
  cx.ellipse(torsoTopX,chestY, tTorso*0.32, lTorso*0.14, 0, 0, Math.PI*2);
  cx.fill();
  cx.restore();

  // ── front legs ────────────────────────────────────────────────
  capsule(cx,lHipX,lHipY, lKneeX,lKneeY, tThigh*0.5, COL.pants);
  capsule(cx,lKneeX,lKneeY, lFootX,lFootY, tShin*0.48, COL.pants);
  capsule(cx,lFootX,lFootY, lFootX-tShin*0.9,lFootY+tShin*0.12, tShin*0.48, COL.shoe);
  capsule(cx,rHipX,rHipY, rKneeX,rKneeY, tThigh*0.48, COL.pants);
  capsule(cx,rKneeX,rKneeY, rFootX,rFootY, tShin*0.46, COL.pants);
  capsule(cx,rFootX,rFootY, rFootX+tShin*0.9,rFootY+tShin*0.12, tShin*0.46, COL.shoe);

  // ── front arms ────────────────────────────────────────────────
  var rElbowX=rShoulderX + Math.sin(rShoulder+0.2)*lUpperA;
  var rElbowY=rShoulderY + Math.cos(rShoulder+0.2)*lUpperA;
  var rHandX=rElbowX + Math.sin(rShoulder+rElbow+0.2)*lForeA;
  var rHandY=rElbowY + Math.cos(rShoulder+rElbow+0.2)*lForeA;

  capsule(cx,rShoulderX,rShoulderY, rElbowX,rElbowY, tUpperA*0.48, COL.skin);
  capsule(cx,rElbowX,rElbowY, rHandX,rHandY, tForeA*0.46, COL.skin);
  capsule(cx,lShoulderX,lShoulderY, lElbowX,lElbowY, tUpperA*0.48, COL.skin);
  capsule(cx,lElbowX,lElbowY, lHandX,lHandY, tForeA*0.46, COL.skin);

  // ── joint dots ────────────────────────────────────────────────
  var jcol=COL.joint;
  circle(cx,lShoulderX,lShoulderY,tUpperA*0.38,jcol,0);
  circle(cx,rShoulderX,rShoulderY,tUpperA*0.38,jcol,0);
  circle(cx,lElbowX,lElbowY,tForeA*0.38,jcol,0);
  circle(cx,rElbowX,rElbowY,tForeA*0.38,jcol,0);
  circle(cx,lKneeX,lKneeY,tShin*0.42,jcol,0);
  circle(cx,rKneeX,rKneeY,tShin*0.42,jcol,0);

  // ── head ─────────────────────────────────────────────────────
  var neckX=torsoTopX, neckY=torsoTopY-headR*0.3;
  var headX=neckX, headY=neckY-headR;
  capsule(cx,torsoTopX,torsoTopY,neckX,neckY,tTorso*0.22,COL.skin,0);
  circle(cx,headX,headY,headR,COL.skin,0);

  // eyes
  var eyeOff=headR*0.3;
  var eyeR=headR*0.15;
  var eyeY=headY-headR*0.05;
  circle(cx,headX-eyeOff,eyeY,eyeR,'#fff',0);
  circle(cx,headX+eyeOff,eyeY,eyeR,'#fff',0);
  // pupils
  var pupR=eyeR*0.55;
  circle(cx,headX-eyeOff+pupR*0.3,eyeY+pupR*0.2,pupR,M>0.6?COL.orange:'#222',M>0.6?1:0);
  circle(cx,headX+eyeOff+pupR*0.3,eyeY+pupR*0.2,pupR,M>0.6?COL.orange:'#222',M>0.6?1:0);

  // mouth — smile
  cx.strokeStyle=COL.skinD;
  cx.lineWidth=headR*0.1;
  cx.beginPath();
  cx.arc(headX,headY+headR*0.25, headR*0.3, 0.2, Math.PI-0.2);
  cx.stroke();

  // hair / top
  cx.fillStyle='#1a0a00';
  cx.beginPath();
  cx.arc(headX,headY-headR*0.1, headR*0.85, Math.PI, 0);
  cx.fill();

  // ── equipment ────────────────────────────────────────────────
  var pose=POSES[poseIdx].name;
  var showDB = pose==='BICEP CURL' || pose==='LAT RAISE' || pose==='OVERHEAD PRESS';
  var showBB = pose==='DEADLIFT' || pose==='SQUAT';

  if(showDB){
    var dbAngleL=Math.atan2(lHandY-lElbowY, lHandX-lElbowX);
    var dbAngleR=Math.atan2(rHandY-rElbowY, rHandX-rElbowX);
    drawDumbbell(cx, lHandX,lHandY, dbAngleL, true);
    drawDumbbell(cx, rHandX,rHandY, dbAngleR, true);
  }
  if(showBB){
    var bbY = pose==='DEADLIFT' ? groundY : groundY;
    var bbX = rootX;
    if(pose==='DEADLIFT') drawBarbell(cx, bbX, groundY-tShin*0.3, U*0.9);
    if(pose==='SQUAT'){
      // barbell on back
      var bbBX=torsoTopX, bbBY=torsoTopY+lTorso*0.1;
      drawBarbell(cx, bbBX, bbBY, U*0.85);
    }
  }

  // shadow on floor
  cx.save();
  cx.globalAlpha=0.25;
  var shG=cx.createRadialGradient(rootX,groundY,0, rootX,groundY,U*0.35);
  shG.addColorStop(0,'rgba(0,0,0,0.7)');
  shG.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=shG;
  cx.beginPath();
  cx.ellipse(rootX,groundY, U*0.35, U*0.06, 0, 0, Math.PI*2);
  cx.fill();
  cx.restore();
}

// ── animation loop ────────────────────────────────────────────────────────────
var rThigh = lThigh; // mirror

var t=0;
function frame(){
  requestAnimationFrame(frame);
  t++;

  // advance pose timer
  poseTimer++;
  if(poseTimer>POSE_HOLD) advancePose();

  // ease pose fade 0→1
  if(poseFade<1) poseFade=Math.min(1,poseFade+FADE_SPEED);

  // interpolate joints
  var pose=POSES[poseIdx];
  var osc=Math.sin(t*0.055)*0.06; // living oscillation

  for(var i=0;i<cur.length;i++){
    var target=prev[i]+(next[i]-prev[i])*poseFade;
    // add oscillation on relevant joints
    if(i===0||i===2) target+=osc; // shoulders breathe
    if(i===1||i===3) target+=Math.sin(t*0.08+i)*0.04; // elbows micro-jitter
    cur[i]+=(target-cur[i])*0.07; // smooth lerp
  }

  cx.clearRect(0,0,W,H);
  drawBG(t);
  drawCharacter(cur, t);
}

document.getElementById('label').textContent=POSES[0].name;
frame();
</script>
</body>
</html>`;
}
