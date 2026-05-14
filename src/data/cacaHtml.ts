export function buildCacaHtml(muscle: number, level: number): string {
  const m = Math.max(0, Math.min(1, muscle));
  const scale = (1 + m * 0.6).toFixed(3);
  const lvl = Math.max(1, level);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0a0010;overflow:hidden}
canvas{display:block}
#overlay{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;pointer-events:none;
}
#status{
  font-family:-apple-system,sans-serif;font-size:13px;font-weight:700;
  color:rgba(255,120,0,0.9);letter-spacing:2px;text-shadow:0 0 12px rgba(255,100,0,0.7);
}
#anim{
  position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
  font-family:-apple-system,sans-serif;font-size:10px;font-weight:800;
  letter-spacing:3px;color:rgba(255,120,0,0.75);
  text-shadow:0 0 10px rgba(255,100,0,0.5);white-space:nowrap;
}
</style>
</head>
<body>
<div id="overlay"><div id="status">LOADING...</div></div>
<div id="anim"></div>

<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js"></script>

<script>
var M = ${m}, LVL = ${lvl}, SCALE = ${scale};
var W = window.innerWidth, H = window.innerHeight;

// ── Scene ─────────────────────────────────────────────────────────────────────
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0010);
scene.fog = new THREE.FogExp2(0x0a0010, 0.06);

var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.set(0, 1.4, 4.5);
camera.lookAt(0, 0.9, 0);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.insertBefore(renderer.domElement, document.getElementById('overlay'));

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x221133, 3));

var keyLight = new THREE.SpotLight(0xffa060, 8, 20, Math.PI / 5, 0.4);
keyLight.position.set(2, 6, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
scene.add(keyLight);
scene.add(keyLight.target);

var fillLight = new THREE.PointLight(0x5533ff, 3, 12);
fillLight.position.set(-3, 2, 2);
scene.add(fillLight);

var rimLight = new THREE.PointLight(0xff4400, 4, 10);
rimLight.position.set(0, 3, -3);
scene.add(rimLight);

var topLight = new THREE.DirectionalLight(0xffffff, 1.5);
topLight.position.set(0, 10, 5);
scene.add(topLight);

// ── Floor ─────────────────────────────────────────────────────────────────────
var floorGeo = new THREE.CircleGeometry(6, 48);
var floorMat = new THREE.MeshStandardMaterial({
  color: 0x110020, roughness: 0.9, metalness: 0.1
});
var floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// grid lines
var gridHelper = new THREE.GridHelper(12, 24, 0xff6600, 0x220033);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

// glow ring under character
var ringGeo = new THREE.RingGeometry(0.4, 0.7, 48);
var ringMat = new THREE.MeshBasicMaterial({
  color: 0xff7700, side: THREE.DoubleSide, transparent: true, opacity: 0.35
});
var ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.002;
scene.add(ring);

// ── Animation setup ───────────────────────────────────────────────────────────
var ANIM_NAMES = ['Wave','Idle','Jump','Punch','Dance','ThumbsUp'];
var ANIM_LABELS = ['WAVE','IDLE','JUMP','PUNCH','DANCE','THUMBS UP'];
var animIdx = 0;
var mixer = null;
var currentAction = null;
var clips = {};
var model = null;
var loadError = false;

function playAnim(name, fadeTime) {
  fadeTime = fadeTime || 0.5;
  if (!mixer || !clips[name]) return;
  var next = mixer.clipAction(clips[name]);
  if (currentAction && currentAction !== next) {
    currentAction.fadeOut(fadeTime);
  }
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fadeTime).play();
  currentAction = next;
  var idx = ANIM_NAMES.indexOf(name);
  document.getElementById('anim').textContent = idx >= 0 ? ANIM_LABELS[idx] : name.toUpperCase();
}

var animTimer = 0;
var ANIM_HOLD = 5000; // ms per animation
var lastTime = 0;

function cycleAnim() {
  animIdx = (animIdx + 1) % ANIM_NAMES.length;
  playAnim(ANIM_NAMES[animIdx], 0.6);
}

document.body.addEventListener('click', cycleAnim);

// ── Load model ────────────────────────────────────────────────────────────────
var loader = new THREE.GLTFLoader();
var MODEL_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/r134/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

loader.load(
  MODEL_URL,
  function(gltf) {
    model = gltf.scene;

    // scale based on muscle level
    model.scale.setScalar(SCALE * 0.9);
    model.position.set(0, 0, 0);
    model.castShadow = true;

    model.traverse(function(child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);

    // store clips by name
    gltf.animations.forEach(function(clip) {
      clips[clip.name] = clip;
    });

    mixer = new THREE.AnimationMixer(model);

    // start with Wave
    playAnim('Wave', 0.1);

    document.getElementById('overlay').style.display = 'none';
  },
  function(progress) {
    if (progress.total > 0) {
      var pct = Math.round((progress.loaded / progress.total) * 100);
      document.getElementById('status').textContent = 'LOADING ' + pct + '%';
    }
  },
  function(err) {
    loadError = true;
    document.getElementById('status').textContent = 'LOAD FAILED';
    console.error(err);
  }
);

// ── Render loop ───────────────────────────────────────────────────────────────
var clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  var delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);

    // auto-cycle animations
    animTimer += delta * 1000;
    if (animTimer > ANIM_HOLD) {
      animTimer = 0;
      cycleAnim();
    }
  }

  // gentle model rotation
  if (model) {
    model.rotation.y += delta * 0.25;
  }

  // pulse ring
  var t = clock.elapsedTime;
  ring.material.opacity = 0.2 + 0.2 * Math.sin(t * 2);
  ring.scale.setScalar(1 + 0.08 * Math.sin(t * 1.5));

  // pulse key light
  keyLight.intensity = 7 + 2 * Math.sin(t * 1.2);
  fillLight.intensity = 2.5 + 1.5 * Math.sin(t * 0.8 + 1);

  renderer.render(scene, camera);
}

animate();
</script>
</body>
</html>`;
}
