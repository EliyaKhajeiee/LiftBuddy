export function buildCacaHtml(muscle: number, level: number): string {
  const m = Math.max(0, Math.min(1, muscle));
  const lvl = Math.max(1, level);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#060010;overflow:hidden}
canvas{display:block;touch-action:none}
#anim-tag{
  position:absolute;bottom:18px;left:50%;transform:translateX(-50%);
  font-family:-apple-system,sans-serif;font-size:10px;font-weight:800;
  letter-spacing:3px;color:rgba(255,122,0,0.75);pointer-events:none;
  text-shadow:0 0 12px rgba(255,122,0,0.5);
}
</style>
</head>
<body>
<div id="anim-tag">READY TO LIFT</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"></script>
<script>
var M = ${m}, LVL = ${lvl};
var W = window.innerWidth, H = window.innerHeight;

// ── Scene ──────────────────────────────────────────────────────────────────
var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060010, 0.09);

var camera = new THREE.PerspectiveCamera(50, W/H, 0.1, 50);
camera.position.set(0, 1.7, 4.6);
camera.lookAt(0, 1.1, 0);

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// ── Lights ─────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a0030, 1.2));

var keyLight = new THREE.SpotLight(0xff8800, 10, 18, Math.PI/5, 0.35);
keyLight.position.set(2.2, 5.5, 3.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = keyLight.shadow.mapSize.height = 1024;
scene.add(keyLight); scene.add(keyLight.target);

var fillLight = new THREE.PointLight(0x4422ff, 2.5, 9);
fillLight.position.set(-3, 2, 1.5);
scene.add(fillLight);

var rimLight = new THREE.PointLight(0xff5500, 3.5, 9);
rimLight.position.set(0, 3, -4);
scene.add(rimLight);

var topLight = new THREE.SpotLight(0xffffff, 3, 10, Math.PI/8, 0.6);
topLight.position.set(0, 7, 0);
topLight.castShadow = false;
scene.add(topLight); scene.add(topLight.target);

// ── Floor / environment ─────────────────────────────────────────────────────
var floorMat = new THREE.MeshStandardMaterial({color:0x050008,roughness:0.95,metalness:0.05});
var floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(30,30), floorMat);
floorMesh.rotation.x = -Math.PI/2; floorMesh.position.y = -0.01;
floorMesh.receiveShadow = true; scene.add(floorMesh);

// Grid
var grid = new THREE.GridHelper(20, 28, 0xff7a00, 0x1a0028);
grid.material.opacity = 0.22; grid.material.transparent = true;
scene.add(grid);

// Platform
var platMat = new THREE.MeshStandardMaterial({color:0x0a0018,roughness:0.6,metalness:0.5});
var plat = new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,0.045,64), platMat);
plat.receiveShadow = true; scene.add(plat);

// Platform rings
var rings = [];
[0.6,0.9,1.15].forEach(function(r,i){
  var mat = new THREE.MeshStandardMaterial({
    color:0xff7a00, emissive:0xff7a00,
    emissiveIntensity: 0.4+i*0.25
  });
  var ring = new THREE.Mesh(new THREE.TorusGeometry(r,0.012,8,80), mat);
  ring.rotation.x = Math.PI/2; ring.position.y = 0.025;
  scene.add(ring); rings.push(ring);
});

// Background spotlights on ceiling (theatrical)
var ceilSpots = [];
[-3,0,3].forEach(function(x){
  var s = new THREE.SpotLight(0xff6600, 1.2, 14, Math.PI/14, 0.8);
  s.position.set(x, 8, -2);
  scene.add(s); scene.add(s.target);
  s.target.position.set(x*0.3, 0, 0);
  ceilSpots.push(s);
});

// Floating dust particles
var dustPts = [], dustMat = new THREE.MeshBasicMaterial({color:0xff8800,transparent:true});
for(var i=0;i<40;i++){
  var p = new THREE.Mesh(new THREE.SphereGeometry(0.012+Math.random()*0.018,4,4), dustMat.clone());
  p.position.set((Math.random()-0.5)*9, Math.random()*5.5, (Math.random()-0.5)*5-1);
  p.userData.vy = 0.003+Math.random()*0.006;
  p.userData.ph = Math.random()*Math.PI*2;
  scene.add(p); dustPts.push(p);
}

// ── Materials ───────────────────────────────────────────────────────────────
function lerp(a,b,t){return a+(b-a)*t;}
function mat(col,rough,metal,emCol,emInt){
  var o={color:col,roughness:rough,metalness:metal};
  if(emCol!=null){o.emissive=emCol;o.emissiveIntensity=emInt||0;}
  return new THREE.MeshStandardMaterial(o);
}
var bodyMat  = mat(0x111111, 0.18, 0.55);
var jointMat = mat(0x0c0c0c, 0.12, 0.65);
var whiteMat = mat(0xeeeeee, 0.45, 0.0);
var darkMat  = mat(0x060606, 0.8,  0.0);
var accMat   = mat(0xff7a00, 0.25, 0.2, 0xff7a00, 0.55);
var glowMat  = mat(0xff7a00, 0.2,  0.1, 0xff7a00, 2.2);
var metalMat = mat(0xaaaaaa, 0.18, 0.9);
var plateMat2= mat(0x1a1a1a, 0.45, 0.75);

// ── Proportions ─────────────────────────────────────────────────────────────
var p = {
  headR:    lerp(0.285, 0.245, M),
  neckR:    lerp(0.09,  0.145, M),
  torsoW:   lerp(0.44,  0.74,  M),
  torsoH:   lerp(0.58,  0.78,  M),
  torsoD:   lerp(0.24,  0.42,  M),
  shldrR:   lerp(0.10,  0.185, M),
  uArmR:    lerp(0.074, 0.142, M),
  uArmH:    lerp(0.36,  0.52,  M),
  lArmR:    lerp(0.058, 0.102, M),
  lArmH:    lerp(0.32,  0.44,  M),
  handR:    lerp(0.054, 0.088, M),
  hipW:     lerp(0.32,  0.44,  M),
  thighR:   lerp(0.095, 0.158, M),
  thighH:   lerp(0.50,  0.60,  M),
  shinR:    lerp(0.074, 0.115, M),
  shinH:    lerp(0.44,  0.52,  M),
};

function mesh(geo, mat2){
  var m2 = new THREE.Mesh(geo, mat2);
  m2.castShadow = true; m2.receiveShadow = true;
  return m2;
}

// ── Root ────────────────────────────────────────────────────────────────────
var root = new THREE.Group();
root.position.y = 0.045;
scene.add(root);

// Hips pivot
var hips = new THREE.Group();
var hipsY = lerp(1.02, 1.18, M);
hips.position.y = hipsY;
root.add(hips);

// ── Legs ────────────────────────────────────────────────────────────────────
var legSideX = p.hipW / 2;

function makeLeg(side){
  var g = new THREE.Group();
  g.position.set(side*legSideX, 0, 0);

  // Thigh
  var th = mesh(new THREE.CylinderGeometry(p.thighR*0.86,p.thighR,p.thighH,14), bodyMat);
  th.position.y = -p.thighH/2; g.add(th);

  // Knee joint sphere
  g.add(mesh(new THREE.SphereGeometry(p.thighR*0.80,10,10), jointMat)).position.y = -p.thighH;

  // Knee pivot
  var kp = new THREE.Group();
  kp.position.y = -p.thighH; g.add(kp);

  // Shin
  var sh = mesh(new THREE.CylinderGeometry(p.shinR*0.80,p.shinR,p.shinH,12), bodyMat);
  sh.position.y = -p.shinH/2; kp.add(sh);

  // Ankle
  kp.add(mesh(new THREE.SphereGeometry(p.shinR*0.75,8,8), jointMat)).position.y = -p.shinH;

  // Foot
  var fw = lerp(0.135,0.20,M);
  var foot = mesh(new THREE.BoxGeometry(fw,0.065,0.27), bodyMat);
  foot.position.set(side*0.018, -p.shinH-0.025, 0.055); kp.add(foot);

  // Orange sole stripe
  var sole = mesh(new THREE.BoxGeometry(fw*0.9,0.01,0.26), accMat);
  sole.position.set(side*0.018, -p.shinH-0.057, 0.055); kp.add(sole);

  hips.add(g);
  return {legG:g, kneePivot:kp};
}

var LL = makeLeg(-1), RL = makeLeg(1);

// ── Spine / Torso ───────────────────────────────────────────────────────────
var spine = new THREE.Group();
hips.add(spine);

// Waist taper
var waist = mesh(new THREE.CylinderGeometry(
  lerp(0.21,0.33,M), lerp(0.23,0.37,M), 0.14, 16), bodyMat);
waist.position.y = 0.07; spine.add(waist);

// Torso box
var torso = mesh(new THREE.BoxGeometry(p.torsoW, p.torsoH, p.torsoD), bodyMat);
torso.position.y = p.torsoH/2 + 0.14; spine.add(torso);

// Chest stripe accent
var stripe = mesh(new THREE.BoxGeometry(lerp(0.045,0.072,M), p.torsoH*0.58, p.torsoD+0.012), accMat);
stripe.position.y = p.torsoH*0.56 + 0.14; spine.add(stripe);

// Pec definition
if(M > 0.25){
  var pecR = lerp(0,0.135,(M-0.25)/0.75);
  [-1,1].forEach(function(s){
    var pec = mesh(new THREE.SphereGeometry(pecR,10,10), bodyMat);
    pec.position.set(s*p.torsoW*0.25, p.torsoH*0.72+0.14, p.torsoD/2);
    spine.add(pec);
  });
}

// Six-pack definition
if(M > 0.5){
  var abR = lerp(0,0.055,(M-0.5)/0.5);
  for(var row=0;row<3;row++){
    [-1,1].forEach(function(s){
      var ab = mesh(new THREE.SphereGeometry(abR,8,8), bodyMat);
      ab.position.set(s*0.07, p.torsoH*0.35-row*0.095+0.14, p.torsoD/2+0.01);
      spine.add(ab);
    });
  }
}

var torsoTopY = p.torsoH + 0.14;

// ── Shoulders & Arms ─────────────────────────────────────────────────────────
var shldrX = p.torsoW/2 + p.shldrR*0.22;
var shldrY = torsoTopY - 0.065;

function makeArm(side){
  var sp2 = new THREE.Group(); // shoulder pivot
  sp2.position.set(side*shldrX, shldrY, 0);
  spine.add(sp2);

  // Shoulder cap
  sp2.add(mesh(new THREE.SphereGeometry(p.shldrR,14,14), jointMat));

  // Upper arm
  var ua = mesh(new THREE.CylinderGeometry(p.uArmR*0.87,p.uArmR,p.uArmH,13), bodyMat);
  ua.position.y = -p.uArmH/2; sp2.add(ua);

  // Bicep peak
  if(M > 0.3){
    var biR = lerp(0,0.095,(M-0.3)/0.7);
    var bi = mesh(new THREE.SphereGeometry(biR,9,9), bodyMat);
    bi.position.set(0,-p.uArmH*0.4, p.uArmR*0.62); sp2.add(bi);
  }

  // Elbow
  sp2.add(mesh(new THREE.SphereGeometry(p.lArmR*1.05,9,9), jointMat)).position.y = -p.uArmH;

  // Forearm pivot
  var fp = new THREE.Group();
  fp.position.y = -p.uArmH; sp2.add(fp);

  var fa = mesh(new THREE.CylinderGeometry(p.lArmR*0.80,p.lArmR,p.lArmH,11), bodyMat);
  fa.position.y = -p.lArmH/2; fp.add(fa);

  // Wrist
  fp.add(mesh(new THREE.SphereGeometry(p.handR*0.88,9,9), jointMat)).position.y = -p.lArmH;

  // Hand
  var hand = mesh(new THREE.SphereGeometry(p.handR,10,10), bodyMat);
  hand.position.y = -p.lArmH - p.handR*0.35; fp.add(hand);

  return {sp2:sp2, fp:fp};
}

var LA = makeArm(-1), RA = makeArm(1);

// Traps
if(M > 0.4){
  var trR = lerp(0,0.115,(M-0.4)/0.6);
  [-1,1].forEach(function(s){
    var tr = mesh(new THREE.SphereGeometry(trR,8,8), bodyMat);
    tr.position.set(s*p.neckR*1.9, torsoTopY+0.01, 0);
    spine.add(tr);
  });
}

// ── Neck & Head ──────────────────────────────────────────────────────────────
var neck = mesh(new THREE.CylinderGeometry(p.neckR,p.neckR*1.18,0.17,11), bodyMat);
neck.position.y = torsoTopY + 0.085; spine.add(neck);

var headG = new THREE.Group();
var headY2 = torsoTopY + 0.25 + p.headR;
headG.position.y = headY2; spine.add(headG);

// Skull
headG.add(mesh(new THREE.SphereGeometry(p.headR,20,20), bodyMat));

// Jaw
var jaw = mesh(new THREE.SphereGeometry(p.headR*0.70,12,12), bodyMat);
jaw.scale.set(1.05,0.52,1.0); jaw.position.set(0,-p.headR*0.56,p.headR*0.06);
headG.add(jaw);

// Brow ridge
var brow = mesh(new THREE.BoxGeometry(p.headR*0.88,0.035,0.032), bodyMat);
brow.position.set(0,p.headR*0.24,p.headR*0.88); headG.add(brow);

// Eyes
var eZ=p.headR*0.87, eX=p.headR*0.365, eY=p.headR*0.09, eR=lerp(0.043,0.035,M);
[-1,1].forEach(function(s){
  headG.add(mesh(new THREE.SphereGeometry(eR,10,10), whiteMat))
    .position.set(s*eX,eY,eZ);
  headG.add(mesh(new THREE.SphereGeometry(eR*0.53,8,8), darkMat))
    .position.set(s*eX,eY,eZ+eR*0.58);
  if(M>0.7){
    headG.add(mesh(new THREE.SphereGeometry(eR*0.3,6,6), glowMat))
      .position.set(s*eX,eY,eZ+eR*0.72);
  }
  // Eyebrow
  var eb = mesh(new THREE.BoxGeometry(eR*2.1,0.013,0.016), darkMat);
  eb.position.set(s*eX,eY+eR*1.6,eZ+0.008);
  eb.rotation.z = s*lerp(0.05,0.28,M);
  headG.add(eb);
});

// Smile
var smM = M>0.6 ? accMat : whiteMat;
for(var si=-2;si<=2;si++){
  var st=si/2;
  var sm2=mesh(new THREE.SphereGeometry(0.013,6,6),smM);
  sm2.position.set(st*p.headR*0.30,-p.headR*0.28-Math.abs(st)*p.headR*0.09,eZ*0.97);
  headG.add(sm2);
}

// Nose
var nose = mesh(new THREE.SphereGeometry(0.022,8,8), bodyMat);
nose.scale.set(0.7,0.55,1.0); nose.position.set(0,-p.headR*0.06,eZ*1.01);
headG.add(nose);

// Ears
[-1,1].forEach(function(s){
  var ear = mesh(new THREE.SphereGeometry(p.headR*0.22,8,8), bodyMat);
  ear.scale.set(0.38,0.7,0.6);
  ear.position.set(s*p.headR,p.headR*0.04,0);
  headG.add(ear);
});

// ── Dumbbell ────────────────────────────────────────────────────────────────
function makeDumbbell(parent, py, showDB){
  var db = new THREE.Group();
  db.visible = showDB;
  db.position.y = py;

  var bar = mesh(new THREE.CylinderGeometry(0.022,0.022,0.30,8), metalMat);
  bar.rotation.z = Math.PI/2; db.add(bar);

  [-0.115,0.115].forEach(function(x){
    var pl = mesh(new THREE.CylinderGeometry(0.072,0.072,0.042,14), plateMat2);
    pl.rotation.z = Math.PI/2; pl.position.x = x; db.add(pl);
    // Orange ring
    var rng = mesh(new THREE.TorusGeometry(0.052,0.007,6,20), accMat);
    rng.rotation.y = Math.PI/2; rng.position.x = x; db.add(rng);
  });
  parent.add(db);
  return db;
}

// Attach dumbbell to right forearm (it follows the arm)
var dbRight = makeDumbbell(RA.fp, -p.lArmH - p.handR*0.7, false);
dbRight.rotation.z = Math.PI/2;

// Left hand dumbbell
var dbLeft = makeDumbbell(LA.fp, -p.lArmH - p.handR*0.7, false);
dbLeft.rotation.z = Math.PI/2;

// ── Barbell ──────────────────────────────────────────────────────────────────
var barbellG = new THREE.Group();
barbellG.visible = false;
scene.add(barbellG);

var bbBar = mesh(new THREE.CylinderGeometry(0.022,0.022,1.55,8), metalMat);
bbBar.rotation.z = Math.PI/2; barbellG.add(bbBar);

[-0.62,-0.48,0.48,0.62].forEach(function(x){
  var pl = mesh(new THREE.CylinderGeometry(0.135,0.135,0.046,18), plateMat2);
  pl.rotation.z = Math.PI/2; pl.position.x = x; barbellG.add(pl);
  var rng = mesh(new THREE.TorusGeometry(0.100,0.009,7,24), accMat);
  rng.rotation.y = Math.PI/2; rng.position.x = x; barbellG.add(rng);
});

// ── Animation System ─────────────────────────────────────────────────────────
var cur = {lSZ:0,rSZ:0,lSX:0,rSX:0,lEX:0,rEX:0,spX:0,lKX:0,rKX:0};
var tgt = {lSZ:0,rSZ:0,lSX:0,rSX:0,lEX:0,rEX:0,spX:0,lKX:0,rKX:0};
var ANIM_TAG = document.getElementById('anim-tag');

function idle(){
  tgt.lSZ=0.18; tgt.rSZ=-0.18; tgt.lSX=0; tgt.rSX=0;
  tgt.lEX=-0.22; tgt.rEX=-0.22; tgt.spX=0; tgt.lKX=0; tgt.rKX=0;
  dbLeft.visible=false; dbRight.visible=false; barbellG.visible=false;
  if(ANIM_TAG) ANIM_TAG.textContent='READY TO LIFT';
}

var ANIMS=[
  {label:'BICEP CURL', dur:4.0,
   setup:function(){
     tgt.lKX=0;tgt.rKX=0;tgt.spX=0;tgt.lSX=0;tgt.rSX=0;
     tgt.lSZ=0.18;tgt.rSZ=-0.18;
     dbLeft.visible=true;dbRight.visible=true;barbellG.visible=false;
   },
   tick:function(t){
     var c=(t%1.5)/1.5;
     if(c<0.5){tgt.rEX=-(Math.PI/2+0.15)*Math.min(1,c*5);tgt.lEX=-(0.22);}
     else{tgt.rEX=-(Math.PI/2+0.15)*Math.max(0,1-(c-0.5)*5);tgt.lEX=-(Math.PI/2+0.15)*Math.min(1,(c-0.5)*5);}
   }
  },
  {label:'OVERHEAD PRESS', dur:4.5,
   setup:function(){
     tgt.lKX=0;tgt.rKX=0;tgt.lEX=-0.25;tgt.rEX=-0.25;
     dbLeft.visible=false;dbRight.visible=false;barbellG.visible=true;
   },
   tick:function(t){
     var press=(Math.sin(t*1.4)*0.5+0.5);
     tgt.lSZ=lerp(0.2,-Math.PI*0.53,press);
     tgt.rSZ=lerp(-0.2,Math.PI*0.53,press);
     tgt.lSX=0; tgt.rSX=0;
     tgt.spX=lerp(0,-0.10,press);
     // barbell follows hands
     var handY = hipsY + torsoTopY + shldrY + lerp(-p.uArmH*0.5,p.uArmH*0.5,press);
     barbellG.position.set(0, handY + lerp(0, p.uArmH, press), lerp(0.3,-0.05,press));
   }
  },
  {label:'SQUATTING', dur:4.5,
   setup:function(){
     tgt.lSZ=0;tgt.rSZ=0;tgt.lSX=-0.20;tgt.rSX=-0.20;
     tgt.lEX=-0.25;tgt.rEX=-0.25;
     dbLeft.visible=false;dbRight.visible=false;barbellG.visible=true;
   },
   tick:function(t){
     var d=Math.sin(t*1.1)*0.5+0.5;
     tgt.lKX=d*1.65;tgt.rKX=d*1.65;tgt.spX=d*0.38;
     // barbell on traps
     barbellG.position.set(0, hipsY+torsoTopY+shldrY*0.9, -0.15);
   }
  },
  {label:'DEADLIFTING', dur:5.0,
   setup:function(){
     tgt.lSZ=0.05;tgt.rSZ=-0.05;tgt.lSX=0;tgt.rSX=0;
     tgt.lEX=0;tgt.rEX=0;
     dbLeft.visible=false;dbRight.visible=false;barbellG.visible=true;
   },
   tick:function(t){
     var pull=Math.sin(t*1.0)*0.5+0.5;
     tgt.spX=lerp(0.90,0,pull);
     tgt.lKX=lerp(0.55,0,pull);tgt.rKX=lerp(0.55,0,pull);
     tgt.lSX=lerp(0.45,0,pull);tgt.rSX=lerp(0.45,0,pull);
     // barbell near floor
     var barH = lerp(0.20, hipsY*0.55, pull);
     barbellG.position.set(0, barH, 0.1);
     barbellG.rotation.x = lerp(0.1, 0, pull);
   }
  },
  {label:'LATERAL RAISE', dur:3.8,
   setup:function(){
     tgt.lSX=0;tgt.rSX=0;tgt.spX=0;tgt.lKX=0;tgt.rKX=0;
     tgt.lEX=-0.08;tgt.rEX=-0.08;
     dbLeft.visible=true;dbRight.visible=true;barbellG.visible=false;
   },
   tick:function(t){
     var r=Math.sin(t*1.3)*0.5+0.5;
     tgt.lSZ=lerp(0.18,-Math.PI*0.46,r);
     tgt.rSZ=lerp(-0.18,Math.PI*0.46,r);
   }
  },
  {label:'VICTORY FLEX', dur:3.5,
   setup:function(){
     tgt.spX=0;tgt.lKX=0;tgt.rKX=0;tgt.lSX=0;tgt.rSX=0;
     dbLeft.visible=false;dbRight.visible=false;barbellG.visible=false;
   },
   tick:function(t){
     var pump=Math.sin(t*3.5)*0.5+0.5;
     tgt.lSZ=lerp(0.68,0.85,pump);
     tgt.rSZ=lerp(-0.68,-0.85,pump);
     tgt.lEX=lerp(-Math.PI*0.50,-Math.PI*0.58,pump);
     tgt.rEX=lerp(-Math.PI*0.50,-Math.PI*0.58,pump);
   }
  },
];

var animIdx=0, animT=0, curAnim=null;
idle();

function nextAnim(){
  var a=ANIMS[animIdx%ANIMS.length]; animIdx++;
  a.setup(); animT=0; curAnim=a;
  if(ANIM_TAG) ANIM_TAG.textContent=a.label;
}
nextAnim();

// Tap skips animation
document.addEventListener('touchstart',function(){animT=curAnim?curAnim.dur:0;});
document.addEventListener('click',function(){animT=curAnim?curAnim.dur:0;});

// Receive updates from React Native
function onMsg(e){
  try{
    var d=JSON.parse(typeof e.data==='string'?e.data:e.data);
    if(d.type==='next') nextAnim();
  }catch(err){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);

// ── Render loop ──────────────────────────────────────────────────────────────
var GT=0;
function animate(){
  requestAnimationFrame(animate);
  GT+=0.016; animT+=0.016;

  // Advance anim
  if(curAnim && animT>=curAnim.dur){ nextAnim(); }
  if(curAnim && curAnim.tick) curAnim.tick(animT);

  // Lerp joints (smooth)
  var LS=0.14;
  for(var k in cur) cur[k]+=(tgt[k]-cur[k])*LS*3;

  // Apply joints
  LA.sp2.rotation.z = cur.lSZ;
  RA.sp2.rotation.z = cur.rSZ;
  LA.sp2.rotation.x = cur.lSX;
  RA.sp2.rotation.x = cur.rSX;
  LA.fp.rotation.x  = cur.lEX;
  RA.fp.rotation.x  = cur.rEX;
  spine.rotation.x  = cur.spX;
  LL.kneePivot.rotation.x = cur.lKX;
  RL.kneePivot.rotation.x = cur.rKX;

  // Idle breathing
  var breath = Math.sin(GT*1.05)*0.013;
  root.scale.y = 1+breath;

  // Gentle sway
  root.rotation.y = Math.sin(GT*0.28)*0.18;

  // Subtle float
  root.position.y = 0.045+Math.sin(GT*0.72)*0.018;

  // Head slight tracking (nod with exertion)
  var exertion = (Math.abs(cur.lEX)+Math.abs(cur.rEX))/2;
  headG.rotation.x = -exertion*0.08;

  // Dynamic lights
  keyLight.intensity = 10+Math.sin(GT*1.3)*1.5;
  rimLight.position.x = Math.sin(GT*0.38)*2.2;
  fillLight.intensity = 2.5+Math.sin(GT*0.9)*0.4;

  // Rings spin
  rings.forEach(function(r,i){
    r.rotation.z = GT*(0.28+i*0.14)*(i%2===0?1:-1);
    r.material.emissiveIntensity=0.35+Math.sin(GT*2.2+i)*0.18;
  });

  // Dust particles
  dustPts.forEach(function(dp){
    dp.position.y+=dp.userData.vy;
    dp.position.x+=Math.sin(GT*0.4+dp.userData.ph)*0.003;
    dp.material.opacity=0.15+Math.sin(GT*1.8+dp.userData.ph)*0.18;
    if(dp.position.y>6) dp.position.y=-0.5;
  });

  // Ceiling spots sweep slowly
  ceilSpots.forEach(function(s,i){
    s.target.position.x=Math.sin(GT*0.22+i*2.1)*1.5;
  });

  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',function(){
  var w=window.innerWidth,h=window.innerHeight;
  camera.aspect=w/h; camera.updateProjectionMatrix();
  renderer.setSize(w,h);
});
</script>
</body>
</html>`;
}
