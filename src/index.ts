import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import ZapparSharing from '@zappar/sharing';
import ZapparWebGLSnapshot from '@zappar/webgl-snapshot';
import * as ZapparVideoRecorder from '@zappar/video-recorder';

import './index.css';

if (ZapparThree.browserIncompatible()) {
  ZapparThree.browserIncompatibleUI();
  throw new Error('Unsupported browser');
}

const manager = new ZapparThree.LoadingManager();

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();

ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start(true);
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;



//=================Face Tracker setup===================//
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
scene.add(faceTrackerGroup);

//================Face Mesh setup=========================//
const faceTextureTemplate = new URL('../assets/ng.png', import.meta.url).href;

const faceMesh = new ZapparThree.FaceMeshLoader(manager).load();
const faceBufferGeometry = new ZapparThree.FaceBufferGeometry(faceMesh);

const textureLoader = new THREE.TextureLoader(manager);
const faceTexture = textureLoader.load(faceTextureTemplate);

faceTexture.flipY = false;

const faceMeshMesh = new THREE.Mesh(faceBufferGeometry, new THREE.MeshStandardMaterial({
  map: faceTexture, transparent: true,
}));
faceTrackerGroup.add(faceMeshMesh);



//====================UI frame begin=================================//
const topLogo = new URL("../assets/logo.png", import.meta.url).href;
const bottomText = new URL("../assets/bottom.png", import.meta.url).href;

const loader = new THREE.TextureLoader(manager);

const texture = loader.load(topLogo);
const fire = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
);
fire.scale.set(0.3, 0.17, 1);
fire.position.set(0, 0.44, -1);
scene.add(fire);

const bottom = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: loader.load(bottomText), transparent: true })
);
bottom.scale.set(.6, .4, .2);
bottom.position.set(0, -0.33, -1);
scene.add(bottom);
//========================UI Frame end========================



faceTrackerGroup.visible = false;
const mask = new ZapparThree.HeadMaskMeshLoader().load();
faceTrackerGroup.add(mask);



//======================3D Model==============================
const headbandSrc = new URL('../assets/India_Band.glb', import.meta.url).href;
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(headbandSrc, (gltf) => {
  gltf.scene.position.set(0, 0.16, 1);
  gltf.scene.scale.set(1, 1, 1);
  // console.log(gltf.scene);
  faceTrackerGroup.add(gltf.scene);
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});

const sunglassSrc = new URL('../assets/sunglass.glb', import.meta.url).href;
gltfLoader.load(sunglassSrc, (gltf) => {
  gltf.scene.position.set(0.015, 0.19, 1);
  gltf.scene.scale.set(0.022, 0.022, 0.03);
  // console.log(gltf.scene);
  faceTrackerGroup.add(gltf.scene);
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});
//=====================3D Model==================================



//=================Lighting======================================
const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.position.set(0, 5, 0);
directionalLight.lookAt(0, 0, 0);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight('white', 0.4);
scene.add(ambientLight);
//=================Lighting======================================



// Hide the 3D content when the face is out of view
faceTrackerGroup.faceTracker.onVisible.bind(() => { faceTrackerGroup.visible = true; });
faceTrackerGroup.faceTracker.onNotVisible.bind(() => { faceTrackerGroup.visible = false; });



//====================Snapshot====================//
const canvas = document.querySelector('canvas') || document.createElement('canvas');

const imageBtn = document.getElementById('image') || document.createElement('div');
imageBtn.addEventListener('click', () => {
  // Convert canvas data to url
  const url = canvas.toDataURL('image/jpeg', 0.8);

  // Take snapshot
  ZapparWebGLSnapshot({
    data: url,
  });
});

// video capture
const videoBtn = document.getElementById('video') || document.createElement('div');
let isRecording = false;
ZapparVideoRecorder.createCanvasVideoRecorder(canvas, {
}).then((recorder) => {
  videoBtn.addEventListener('click', () => {
    if(!isRecording) {
      isRecording = true;
      recorder.start();
    }
    else {
      isRecording = false;
      recorder.stop();
    }
  });

  recorder.onComplete.bind(async (res) => {
    ZapparSharing({
      data: await res.asDataURL(),
    });
  });
});
//====================Snapshot================================================//




// Use a function to render our scene as usual
function render(): void {
  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Update the head mask so it fits the user's head in this frame
  mask.updateFromFaceAnchorGroup(faceTrackerGroup);
  faceBufferGeometry.updateFromFaceAnchorGroup(faceTrackerGroup);
  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Call render() again next frame
  requestAnimationFrame(render);
}

// Start things off
render();
