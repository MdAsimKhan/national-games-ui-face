/// Zappar for ThreeJS Examples
/// Face Tracking 3D Model

// In this example we track a 3D model to the user's face

import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import ZapparSharing from '@zappar/sharing';
import * as ZapparVideoRecorder from '@zappar/video-recorder';

import './index.css';

// The SDK is supported on many different browsers, but there are some that
// don't provide camera access. This function detects if the browser is supported
// For more information on support, check out the readme over at
// https://www.npmjs.com/package/@zappar/zappar-threejs
if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

// ZapparThree provides a LoadingManager that shows a progress bar while
// the assets are downloaded. You can use this if it's helpful, or use
// your own loading UI - it's up to you :-)
const manager = new ZapparThree.LoadingManager();

// Construct our ThreeJS renderer (using preserveDrawingBuffer for the snapshot) and scene as usual
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();

// In order to use camera and motion data, we need to ask the users for permission
// The Zappar library comes with some UI to help with that, so let's use it
ZapparThree.permissionRequestUI().then((granted) => {
  // If the user granted us the permissions we need then we can start the camera
  // Otherwise let's them know that it's necessary with Zappar's permission denied UI
  if (granted) camera.start(true); // true parameter for user facing camera
  else ZapparThree.permissionDeniedUI();
});

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Set the background of our scene to be the camera background texture
// that's provided by the Zappar camera
scene.background = camera.backgroundTexture;

// Create a FaceTracker and a FaceAnchorGroup from it to put Three content in
// Pass our loading manager to the loader to ensure that the progress bar
// works correctly
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
// Add our face tracker group into the ThreeJS scene
scene.add(faceTrackerGroup);

// Add some content
const topLogo = new URL("../assets/logo.png", import.meta.url).href;
const bottomText = new URL("../assets/text.png", import.meta.url).href;

const loader = new THREE.TextureLoader(manager);

const texture = loader.load(topLogo); // Replace with the path to your image
const fire = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
);
fire.scale.set(0.3, 0.17, 1);
fire.position.set(0, 0.44, -1);
scene.add(fire);
console.log(fire);

const bottom = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(),
    new THREE.MeshBasicMaterial({ map: loader.load(bottomText), transparent: true })
);
bottom.scale.set(.6, .4, .2);
bottom.position.set(0, -0.33, -1);
scene.add(bottom);

// Start with the content group invisible
faceTrackerGroup.visible = false;

// We want the user's face to appear in the center of the helmet
// so use ZapparThree.HeadMaskMesh to mask out the back of the helmet.
// In addition to constructing here we'll call mask.updateFromFaceAnchorGroup(...)
// in the frame loop later.
const mask = new ZapparThree.HeadMaskMeshLoader().load();
faceTrackerGroup.add(mask);

// Load a 3D model to place within our group (using ThreeJS's GLTF loader)
// Pass our loading manager in to ensure the progress bar works correctly
const helmetSrc = new URL('../assets/z_helmet.glb', import.meta.url).href;
const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(helmetSrc, (gltf) => {
  // Position the loaded content to overlay user's face
  gltf.scene.position.set(0.3, -1.3, 0);
  gltf.scene.scale.set(1.1, 1.1, 1.1);
  // gltf.scene.position.set(0.025, 0.2, 1);
  // gltf.scene.scale.set(0.02, 0.028, 0.03);
  console.log(gltf.scene);
  // Add the scene to the tracker group
  faceTrackerGroup.add(gltf.scene);
}, undefined, () => {
  console.log('An error ocurred loading the GLTF model');
});

// Let's add some lighting, first a directional light above the model pointing down
const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.position.set(0, 5, 0);
directionalLight.lookAt(0, 0, 0);
scene.add(directionalLight);

// And then a little ambient light to brighten the model up a bit
const ambientLight = new THREE.AmbientLight('white', 0.4);
scene.add(ambientLight);

// Hide the 3D content when the face is out of view
faceTrackerGroup.faceTracker.onVisible.bind(() => { faceTrackerGroup.visible = true; });
faceTrackerGroup.faceTracker.onNotVisible.bind(() => { faceTrackerGroup.visible = false; });

// Get a reference to the 'Snapshot' button so we can attach a 'click' listener
const canvas = document.querySelector('canvas') || document.createElement('canvas');

const imageBtn = document.getElementById('image') || document.createElement('div');
imageBtn.addEventListener('click', () => {
  // Convert canvas data to url
  const url = canvas.toDataURL('image/jpeg', 0.8);

  // Take snapshot
  ZapparSharing({
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

// Use a function to render our scene as usual
function render(): void {
  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Update the head mask so it fits the user's head in this frame
  mask.updateFromFaceAnchorGroup(faceTrackerGroup);

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);

  // Call render() again next frame
  requestAnimationFrame(render);
}

// Start things off
render();
