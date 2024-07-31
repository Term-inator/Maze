import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PointerLockControlsCannon } from './PointerLockControlsCannon.js';
import { Game, GameBlockType } from './game.js';

const game = new Game();

// Three.js variables
let camera, scene, renderer, stats;
let material;

// Cannon.js variables
let world;
let controls;
const timeStep = 1 / 60;
let lastCallTime = performance.now();
let sphereShape;
let sphereBody;
let physicsMaterial;
let wallSize = 3;
let lemon = null;
let tree = null;
let animationId;
let gameAudio = document.querySelector('#game-audio');
gameAudio.loop = true;
let eggAudio = document.querySelector('#egg-audio');
eggAudio.loop = true;
let endAudio = document.querySelector('#end-audio');
endAudio.loop = true;


class Lemon {
  constructor() {
    this.model = null;
    this.floatTime = 0;
    this.position = new THREE.Vector3();
  }

  load() {
    const loader = new GLTFLoader();
    const that = this;

    loader.load(
      './public/models/Lemon.glb',  // 模型文件的路径
      function (gltf) {
        gltf.scene.scale.set(0.1, 0.1, 0.1);
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.material.color.setHex(0xffe640);
            child.material.emissive = new THREE.Color(0xffe640);
            child.material.emissiveIntensity = 1.0; // 设置发光强度
          }
        });
        that.model = gltf.scene;
        scene.add(gltf.scene);
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.log(error);
      }
    );
  }

  setPositon(x, y, z) {
    this.position.set(x, y, z);
  }

  animate() {
    this.model.position.copy(this.position);
    this.model.rotation.y += 0.01;  // 绕 y 轴旋转模型
    this.model.position.y = this.position.y + Math.sin(this.floatTime) * 0.2;  // 模型上下浮动
    this.floatTime += 0.01
  }
}


class Tree {
  constructor() {
    this.model = null;
    this.position = new THREE.Vector3();
  }

  load() {
    const loader = new OBJLoader();
    const that = this;

    loader.load(
      './public/models/Lowpoly_tree_sample.obj',  // 模型文件的路径
      function (object) {
        object.scale.set(0.5, 0.5, 0.5);
        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshLambertMaterial({ color: 0xffffff });
          }
      });
        that.model = object;
        scene.add(object);
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.log(error);
      }
    );
  }

  setPositon(x, y, z) {
    this.position.set(x, y, z);
  }

  animate() {
    this.model.position.copy(this.position);
  }
}

const instructions = document.getElementById('instructions');

initThree();
initCannon();
initPointerLock();
animate();

window.addEventListener("gamepadconnected", function (e) {
  console.log(
    "控制器已连接于 %d 位：%s. %d 个按钮，%d 个坐标方向。",
    e.gamepad.index,
    e.gamepad.id,
    e.gamepad.buttons.length,
    e.gamepad.axes.length,
  );
});


function initThree() {
  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0); // Adjust camera position

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 0, 500);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(scene.fog.color);
  renderer.shadowMap.enabled = true; // Enable shadow maps
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Default is THREE.PCFShadowMap
  document.body.appendChild(renderer.domElement);

  // Stats.js
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 30, 20);
  directionalLight.castShadow = true;

  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;

  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;

  scene.add(directionalLight);

  // Generic material
  material = new THREE.MeshLambertMaterial({ color: 0xdddddd });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(300, 300, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, material);
  floor.receiveShadow = true; // Ensure the floor receives shadows
  scene.add(floor);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initCannon() {
  world = new CANNON.World();

  // Tweak contact properties.
  // Contact stiffness - use to make softer/harder contacts
  world.defaultContactMaterial.contactEquationStiffness = 1e9;

  // Stabilization time in number of timesteps
  world.defaultContactMaterial.contactEquationRelaxation = 4;

  const solver = new CANNON.GSSolver();
  solver.iterations = 7;
  solver.tolerance = 0.1;
  world.solver = new CANNON.SplitSolver(solver);

  world.gravity.set(0, -20, 0);

  // Create a slippery material (friction coefficient = 0.0)
  physicsMaterial = new CANNON.Material('physics');
  const physics_physics = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
    friction: 0.0,
    restitution: 0.3,
  });

  // We must add the contact materials to the world
  world.addContactMaterial(physics_physics);

  // Create the user collision sphere
  const radius = 1.3;
  sphereShape = new CANNON.Sphere(radius);
  sphereBody = new CANNON.Body({ mass: 5, material: physicsMaterial });
  sphereBody.addShape(sphereShape);
  sphereBody.linearDamping = 0.9;

  world.addBody(sphereBody);

  // Create the ground plane
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0, material: physicsMaterial });
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Add boxes both in cannon.js and three.js
  const wallHeight = 4;
  game.maze.grid.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell === GameBlockType.WALL) {
        const halfExtents = new CANNON.Vec3(wallSize / 2, wallHeight / 2, wallSize / 2);
        const boxShape = new CANNON.Box(halfExtents);
        const boxBody = new CANNON.Body({ mass: 0, material: physicsMaterial }); // 静态体，质量为0
        boxBody.addShape(boxShape);
        boxBody.position.set((j - game.maze.width / 2) * wallSize, wallHeight / 2, (i - game.maze.height / 2) * wallSize);
        world.addBody(boxBody);

        const boxGeometry = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.position.copy(boxBody.position);
        boxMesh.quaternion.copy(boxBody.quaternion);
        scene.add(boxMesh);
      }
      else if (cell === GameBlockType.LEMON) {
        lemon = new Lemon();
        lemon.load();
        lemon.setPositon((j - game.maze.width / 2) * wallSize, wallHeight, (i - game.maze.height / 2) * wallSize);
      }
      else if (cell === GameBlockType.TREE) {
        tree = new Tree();
        tree.load();
        tree.setPositon((j - game.maze.width / 2) * wallSize, wallHeight, (i - game.maze.height / 2) * wallSize);
      }
      else if (cell === GameBlockType.START) {
        sphereBody.position.set((j - game.maze.width / 2) * wallSize, wallHeight, (i - game.maze.height / 2) * wallSize);
      }
    });
  });
}

function initPointerLock() {
  controls = new PointerLockControlsCannon(camera, sphereBody);
  scene.add(controls.getObject());

  instructions.addEventListener('click', () => {
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    controls.enabled = true;
    instructions.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    controls.enabled = false;
    instructions.style.display = null;
  });
}


function animate() {
  animationId = requestAnimationFrame(animate);

  const time = performance.now() / 1000;
  const dt = time - lastCallTime;
  lastCallTime = time;

  const gamepads = navigator.getGamepads(); // 获取所有已连接的手柄

  if (controls.enabled) {
    world.step(timeStep, dt);


    if (gameAudio.paused) {
      gameAudio.play();
    }

    if (lemon && sphereBody.position.distanceTo(new THREE.Vector3(lemon.position.x, lemon.position.y, lemon.position.z)) < 1) {
      scene.remove(lemon.model);
      lemon = null;
      console.log('You win!');
      finish();
      showEndScreen();
      return
    }

    if (lemon) {
      lemon.animate();
    }

    if (gamepads[0]) {
      const gp = gamepads[0]; // 假设我们只关心第一个手柄

      if (gp.axes[0] < -0.5) {
        controls.moveLeft = true;
      } else {
        controls.moveLeft = false;
      }

      if (gp.axes[0] > 0.5) {
        controls.moveRight = true;
      } else {
        controls.moveRight = false;
      }

      if (gp.axes[1] < -0.5) {
        controls.moveForward = true;
      } else {
        controls.moveForward = false;
      }

      if (gp.axes[1] > 0.5) {
        controls.moveBackward = true;
      } else {
        controls.moveBackward = false;
      }

      // axes[2] and axes[3] are the right stick, rotate the camera
      if (Math.abs(gp.axes[2]) > 0.1 || Math.abs(gp.axes[3]) > 0.1) {
        controls.yawObject.rotation.y -= gp.axes[2] * 0.05;
        controls.pitchObject.rotation.x -= gp.axes[3] * 0.03;
      }

      if (gp.buttons[0].pressed) {
        if (controls.canJump) {
          controls.velocity.y = controls.jumpVelocity
        }
        controls.canJump = false
      }
    }

    // Update visible maze blocks
    renderMazeBasedOnDistance();
  }
  else {
    gameAudio.pause();
  }

  controls.update(dt);
  renderer.render(scene, camera);
  stats.update();
}

// 玩家视野范围
const viewDistance = 10 * 3;

function renderMazeBasedOnDistance() {
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh) {
      const dist = child.position.distanceTo(new THREE.Vector3(sphereBody.position.x, sphereBody.position.y, sphereBody.position.z));
      child.visible = dist <= viewDistance;
    }
  });
}

function finish() {
  cancelAnimationFrame(animationId);

  while (scene.children.length > 0) {
    let child = scene.children[0];
    scene.remove(child);
    // 如果有几何体和材料，确保也释放它们
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      child.material.dispose();
    }
  }

  while (world.bodies.length > 0) {
    world.removeBody(world.bodies[0]);
  }

  window.removeEventListener('resize', onWindowResize);

  const canvasElement = renderer.domElement;
  canvasElement.parentNode.removeChild(canvasElement);

  scene = null;
  camera = null;
  renderer = null;
  world = null;
  controls.unlock()
  controls.dispose();
  controls = null;

  stats.dom.parentNode.removeChild(stats.dom);
  stats = null;
  material = null;
  sphereShape = null;
  sphereBody = null;
  physicsMaterial = null;
  lemon = null;
  animationId = null;

  gameAudio.pause();
}

function showWinScreen() {
  fetch('./end.html')
    .then(response => response.text())
    .then(text => {
      document.body.innerHTML = text;
      const scripts = document.querySelectorAll('script')
      scripts.forEach(script => {
        eval(script.innerText)
      })
    })
    .then(() => {
      alert("点击任意位置播放音乐");
    });
  document.addEventListener('click', (event) => {
    endAudio.play();
  }, { once: true });
}

function showEggScreen() {
  fetch('./egg.html')
    .then(response => response.text())
    .then(text => {
      document.body.innerHTML = text;
      const scripts = document.querySelectorAll('script')
      scripts.forEach(script => {
        eval(script.innerText)
      })
    })
    .then(() => {
      alert("点击任意位置播放音乐");
    });
  document.addEventListener('click', (event) => {
    eggAudio.play();
  }, { once: true });
}

function showEndScreen() {
  const today = new Date();
  if (today.getFullYear() === 2024 && today.getMonth() === 7 && today.getDate() === 2) {
    showEggScreen();
  }
  else {
    showWinScreen();
  }
}

function backDoor(type) {
  finish();
  if (type === 0) {
    showWinScreen();
  }
  else if (type === 1) {
    showEggScreen();
  }
}

window.backDoor = backDoor;