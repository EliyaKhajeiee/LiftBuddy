export function buildCacaHtml(muscle: number, level: number): string {
  const m = Math.max(0, Math.min(1, muscle));
  const lvl = Math.max(1, level);
  const isJacked = m > 0.75;
  const orangeEyes = isJacked ? 'true' : 'false';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#0A0A0A; overflow:hidden; }
canvas { display:block; touch-action:none; }
#level-badge {
  position:absolute; top:16px; left:50%; transform:translateX(-50%);
  background:rgba(255,122,0,0.15); border:1px solid rgba(255,122,0,0.4);
  border-radius:20px; padding:4px 16px;
  font-family:-apple-system,sans-serif; font-size:12px; font-weight:800;
  color:#ff7a00; letter-spacing:2px; pointer-events:none;
}
#tap-hint {
  position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
  font-family:-apple-system,sans-serif; font-size:11px; font-weight:600;
  color:rgba(255,255,255,0.2); letter-spacing:1px; pointer-events:none;
}
</style>
</head>
<body>
<div id="level-badge">CACA LVL ${lvl}</div>
<div id="tap-hint">TAP TO FLEX</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"></script>
<script>
var MUSCLE = ${m};
var ORANGE_EYES = ${orangeEyes};

var W = window.innerWidth, H = window.innerHeight;
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0A0A0A);

var camera = new THREE.PerspectiveCamera(52, W/H, 0.1, 50);
camera.position.set(0, 2.0, 4.2);
camera.lookAt(0, 0.9, 0);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

var keyLight = new THREE.PointLight(0xff8800, 3.5, 14);
keyLight.position.set(1.8, 3.5, 2.8);
keyLight.castShadow = true;
scene.add(keyLight);

var fillLight = new THREE.PointLight(0x5533ff, 1.2, 10);
fillLight.position.set(-2, 1.5, 1);
scene.add(fillLight);

var rimLight = new THREE.PointLight(0xff6600, 1.0, 8);
rimLight.position.set(0, 2.5, -3);
scene.add(rimLight);

// Materials
var bodyMat  = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.2, metalness:0.35 });
var whiteMat = new THREE.MeshStandardMaterial({ color:0xeeeeee, roughness:0.5 });
var pupilMat = new THREE.MeshStandardMaterial({ color:0x080808, roughness:0.8 });
var glowMat  = new THREE.MeshStandardMaterial({ color:0xff7a00, emissive:0xff7a00, emissiveIntensity:1.0 });
var glowEyeMat = new THREE.MeshStandardMaterial({ color:0xff7a00, emissive:0xff7a00, emissiveIntensity:2.0 });

// Platform
var platform = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.1, 0.05, 64),
  new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.9 })
);
platform.receiveShadow = true;
scene.add(platform);

// Orange ring
var ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.018, 8, 80),
  glowMat
);
ring.rotation.x = Math.PI/2;
ring.position.y = 0.03;
scene.add(ring);

// Outer ring (subtle)
var ring2 = new THREE.Mesh(
  new THREE.TorusGeometry(1.0, 0.008, 6, 80),
  new THREE.MeshStandardMaterial({ color:0xff7a00, emissive:0xff7a00, emissiveIntensity:0.3 })
);
ring2.rotation.x = Math.PI/2;
ring2.position.y = 0.03;
scene.add(ring2);

// Character
var character = new THREE.Group();
scene.add(character);

function lerp(a, b, t) { return a + (b-a) * t; }

function add(geo, mat, x, y, z, rx, ry, rz) {
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if(rx) mesh.rotation.x = rx;
  if(ry) mesh.rotation.y = ry;
  if(rz) mesh.rotation.z = rz;
  mesh.castShadow = true;
  character.add(mesh);
  return mesh;
}

function buildChar(m) {
  while(character.children.length) character.remove(character.children[0]);

  // Proportions
  var headR    = lerp(0.29, 0.25, m);
  var torsoW   = lerp(0.40, 0.70, m);
  var torsoH   = lerp(0.56, 0.72, m);
  var torsoD   = lerp(0.22, 0.36, m);
  var armRT    = lerp(0.068, 0.130, m);
  var armRB    = lerp(0.055, 0.100, m);
  var armH     = lerp(0.38, 0.52, m);
  var foreRT   = lerp(0.052, 0.092, m);
  var foreH    = lerp(0.34, 0.44, m);
  var legR     = lerp(0.088, 0.145, m);
  var legH     = lerp(0.54, 0.62, m);
  var neckR    = lerp(0.088, 0.135, m);
  var shldW    = lerp(0.27, 0.46, m);
  var armSprd  = lerp(0.14, 0.28, m);

  // Heights
  var legBase  = 0.055;
  var legMid   = legBase + legH/2;
  var legTop   = legBase + legH;
  var torsoMid = legTop + torsoH/2;
  var torsoTop = legTop + torsoH;
  var neckMid  = torsoTop + 0.07;
  var headY    = neckMid + 0.08 + headR;

  // Feet
  var footW = lerp(0.12, 0.19, m);
  add(new THREE.BoxGeometry(footW, 0.07, 0.23), bodyMat, -0.13, legBase+0.03, 0.04);
  add(new THREE.BoxGeometry(footW, 0.07, 0.23), bodyMat,  0.13, legBase+0.03, 0.04);

  // Legs
  add(new THREE.CylinderGeometry(legR*0.88, legR, legH, 12), bodyMat, -0.13, legMid, 0);
  add(new THREE.CylinderGeometry(legR*0.88, legR, legH, 12), bodyMat,  0.13, legMid, 0);

  // Torso
  add(new THREE.BoxGeometry(torsoW, torsoH, torsoD), bodyMat, 0, torsoMid, 0);

  // Chest pecs (muscular only)
  if(m > 0.25) {
    var pecR = lerp(0, 0.13, (m-0.25)/0.75);
    add(new THREE.SphereGeometry(pecR, 10, 10), bodyMat, -torsoW*0.27, torsoMid+torsoH*0.22, torsoD*0.48);
    add(new THREE.SphereGeometry(pecR, 10, 10), bodyMat,  torsoW*0.27, torsoMid+torsoH*0.22, torsoD*0.48);
  }

  // Shoulders
  var shldR = lerp(0.095, 0.17, m);
  var shldY = torsoTop - 0.04;
  add(new THREE.SphereGeometry(shldR, 12, 12), bodyMat, -shldW, shldY, 0);
  add(new THREE.SphereGeometry(shldR, 12, 12), bodyMat,  shldW, shldY, 0);

  // Upper arms
  var armAng = lerp(0.14, 0.32, m);
  var uarmY  = shldY - armH*0.42;
  add(new THREE.CylinderGeometry(armRT, armRB, armH, 10), bodyMat, -(shldW+armSprd), uarmY, 0, 0, 0,  armAng);
  add(new THREE.CylinderGeometry(armRT, armRB, armH, 10), bodyMat,  (shldW+armSprd), uarmY, 0, 0, 0, -armAng);

  // Bicep peak (muscular)
  if(m > 0.4) {
    var biR = lerp(0, 0.08, (m-0.4)/0.6);
    add(new THREE.SphereGeometry(biR, 8, 8), bodyMat, -(shldW+armSprd+0.02), uarmY+0.05, armRT*0.6);
    add(new THREE.SphereGeometry(biR, 8, 8), bodyMat,  (shldW+armSprd+0.02), uarmY+0.05, armRT*0.6);
  }

  // Forearms
  var foreAng = lerp(0.38, 0.58, m);
  var foreY   = uarmY - armH*0.56;
  add(new THREE.CylinderGeometry(foreRT*0.82, foreRT, foreH, 10), bodyMat, -(shldW+armSprd+0.07), foreY, 0, 0, 0,  foreAng);
  add(new THREE.CylinderGeometry(foreRT*0.82, foreRT, foreH, 10), bodyMat,  (shldW+armSprd+0.07), foreY, 0, 0, 0, -foreAng);

  // Hands
  var handR = lerp(0.052, 0.082, m);
  add(new THREE.SphereGeometry(handR, 8, 8), bodyMat, -(shldW+armSprd+0.14), foreY-foreH*0.5, 0);
  add(new THREE.SphereGeometry(handR, 8, 8), bodyMat,  (shldW+armSprd+0.14), foreY-foreH*0.5, 0);

  // Neck
  add(new THREE.CylinderGeometry(neckR, neckR*1.1, 0.15, 10), bodyMat, 0, neckMid, 0);

  // Head
  add(new THREE.SphereGeometry(headR, 18, 18), bodyMat, 0, headY, 0);

  // Eyes
  var eyeZ  = headR * 0.89;
  var eyeX  = headR * 0.38;
  var eyeY  = headY + headR * 0.08;
  var eyeR  = lerp(0.040, 0.033, m);
  var pupR  = eyeR * 0.55;
  add(new THREE.SphereGeometry(eyeR, 10, 10), whiteMat, -eyeX, eyeY, eyeZ);
  add(new THREE.SphereGeometry(eyeR, 10, 10), whiteMat,  eyeX, eyeY, eyeZ);
  add(new THREE.SphereGeometry(pupR, 8, 8), pupilMat, -eyeX, eyeY, eyeZ + eyeR*0.65);
  add(new THREE.SphereGeometry(pupR, 8, 8), pupilMat,  eyeX, eyeY, eyeZ + eyeR*0.65);

  // Orange glowing eyes when jacked
  if(ORANGE_EYES) {
    var glowPupR = pupR * 0.6;
    add(new THREE.SphereGeometry(glowPupR, 6, 6), glowEyeMat, -eyeX, eyeY, eyeZ + eyeR*0.75);
    add(new THREE.SphereGeometry(glowPupR, 6, 6), glowEyeMat,  eyeX, eyeY, eyeZ + eyeR*0.75);
  }

  // Smile
  var smileY = headY - headR * 0.28;
  var smileZ = headR * 0.9;
  var smileMat2 = m > 0.65 ? glowMat : whiteMat;
  for(var i = -2; i <= 2; i++) {
    var tx = i / 2;
    add(
      new THREE.SphereGeometry(0.013, 6, 6), smileMat2,
      tx * headR * 0.32,
      smileY - Math.abs(tx) * headR * 0.09,
      smileZ
    );
  }

  // Trap muscles on neck area
  if(m > 0.5) {
    var trapR = lerp(0, 0.10, (m-0.5)/0.5);
    add(new THREE.SphereGeometry(trapR, 8, 8), bodyMat, -neckR*1.5, torsoTop - 0.01, 0);
    add(new THREE.SphereGeometry(trapR, 8, 8), bodyMat,  neckR*1.5, torsoTop - 0.01, 0);
  }
}

buildChar(MUSCLE);
character.position.y = 0.055;

// Particle pool
var particles = [];
function burst() {
  for(var i = 0; i < 24; i++) {
    var geo = new THREE.SphereGeometry(Math.random()*0.055+0.015, 4, 4);
    var mat = new THREE.MeshBasicMaterial({ color:0xff7a00, transparent:true, opacity:1 });
    var p   = new THREE.Mesh(geo, mat);
    var ang = Math.random() * Math.PI * 2;
    var spd = Math.random() * 0.09 + 0.04;
    p.position.set((Math.random()-0.5)*0.6, 0.7+Math.random()*1.1, (Math.random()-0.5)*0.6);
    p.userData = {
      vx: Math.cos(ang)*spd, vy: Math.random()*0.13+0.05, vz: Math.sin(ang)*spd,
      life: 1.0,
    };
    scene.add(p);
    particles.push(p);
  }
}

// Interaction
var flexing = false, flexT = 0, globalT = 0;
function startFlex() {
  if(flexing) return;
  flexing = true; flexT = 0;
  burst();
}
document.addEventListener('touchstart', startFlex);
document.addEventListener('click', startFlex);

// Receive live metric updates from React Native
document.addEventListener('message', function(e) {
  try {
    var d = JSON.parse(e.data);
    if(d.type === 'metrics' && typeof d.muscle === 'number') {
      MUSCLE = Math.max(0, Math.min(1, d.muscle));
      buildChar(MUSCLE);
    }
  } catch(err) {}
});
window.addEventListener('message', function(e) {
  try {
    var d = JSON.parse(e.data);
    if(d.type === 'metrics' && typeof d.muscle === 'number') {
      MUSCLE = Math.max(0, Math.min(1, d.muscle));
      buildChar(MUSCLE);
    }
  } catch(err) {}
});

function animate() {
  requestAnimationFrame(animate);
  globalT += 0.016;

  var breathe = Math.sin(globalT * 1.1) * 0.013;

  if(flexing) {
    flexT += 0.038;
    var pump = Math.sin(flexT * Math.PI);
    character.scale.set(1+pump*0.14, 1+breathe+pump*0.08, 1+pump*0.14);
    character.rotation.y = Math.sin(globalT*0.5)*0.28 + Math.sin(flexT*Math.PI*2)*0.18;
    if(flexT >= 1) { flexing = false; }
  } else {
    character.scale.set(1, 1+breathe, 1);
    character.rotation.y = Math.sin(globalT*0.35)*0.22;
  }

  character.position.y = 0.055 + Math.sin(globalT*0.75)*0.022;
  keyLight.intensity = 3.5 + Math.sin(globalT*1.3)*0.4;
  ring.material.emissiveIntensity = 0.8 + Math.sin(globalT*2.0)*0.25;
  ring.rotation.z = globalT * 0.4;

  // Update particles
  for(var i = particles.length-1; i >= 0; i--) {
    var p = particles[i];
    p.userData.life -= 0.022;
    p.userData.vy   -= 0.005;
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;
    p.material.opacity = Math.max(0, p.userData.life);
    p.scale.setScalar(Math.max(0, p.userData.life));
    if(p.userData.life <= 0) { scene.remove(p); particles.splice(i,1); }
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', function() {
  var w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
</script>
</body>
</html>`;
}
