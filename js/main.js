import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------
// 1. [상태 및 설정]
// ---------------------------------------------------------
let isOpening = true;
let openingStartTime = null;
const INITIAL_CAM_Z = 2.5;
const FINAL_CAM_Z = 45;
const ZOOM_DURATION = 4.5;
const COLOR_BLUE = '#0000ff';

let hoveredObject = null;
let clickedObject = null;
let isDragging = false;
let selectedGroupForDrag = null;
let mouseDownPosition = { x: 0, y: 0 };
const CLICK_THRESHOLD = 5;

const ORBIT_GROUPS = [
    { radius: 10, planets: ['paint-ing', 'drawing'], speed: 0.003 },
    { radius: 18, planets: ['graphic', 'video', 'web'], speed: 0.006 },
    { radius: 26, planets: ['show', 'con-struct'], speed: 0.012 }
];

// ---------------------------------------------------------
// 2. [유틸리티] 텍스처 및 재질 생성
// ---------------------------------------------------------
function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.fillStyle = 'black'; ctx.fill();
    return new THREE.CanvasTexture(canvas);
}
const dotTexture = createDotTexture();

function createPlanetMaterials(name, color = 'black') {
    const fontSize = (name === '정진성') ? 133 : 200;
    const canvas = document.createElement('canvas');
    const size = 1024; canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.beginPath(); ctx.arc(size / 2, size / 2, (size / 2) - 20, 0, Math.PI * 2);
    ctx.fillStyle = 'white'; ctx.fill();
    ctx.lineWidth = (name === '정진성') ? 20 : 30;
    ctx.strokeStyle = color; ctx.stroke();

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.font = `bold ${fontSize}px "nanumgothiccoding"`;

    const text = name.toLowerCase();
    if (text.includes('-')) {
        const parts = text.split('-');
        const yOffset = fontSize * 0.55;
        ctx.fillText(parts[0] + '-', (size - ctx.measureText(parts[0] + '-').width) / 2, size / 2 - yOffset);
        ctx.fillText(parts[1], (size - ctx.measureText(parts[1]).width) / 2, size / 2 + yOffset);
    } else {
        ctx.fillText(text, (size - ctx.measureText(text).width) / 2, size / 2 + (fontSize * 0.05));
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;

    // [수정] 원근 오류 해결을 위한 설정
    return new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: true, // 자신의 깊이를 기록하여 뒤의 궤도를 가림
        alphaTest: 0.5,   // 투명한 외곽 영역은 가리지 않도록 설정
        sizeAttenuation: false
    });
}

// ---------------------------------------------------------
// 3. 시스템 초기화
// ---------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const clickableObjects = [];
const planetsUpdateFns = [];
let controls;

function initSystem() {
    camera.position.z = INITIAL_CAM_Z;

    const sunMatK = createPlanetMaterials('정진성', 'black');
    const sunMatB = createPlanetMaterials('정진성', COLOR_BLUE);
    const sun = new THREE.Sprite(sunMatK);
    sun.scale.set(0.18, 0.18, 1); sun.name = '정진성';
    sun.userData = { matK: sunMatK, matB: sunMatB };
    scene.add(sun); clickableObjects.push(sun);

    ORBIT_GROUPS.forEach(group => {
        const systemGroup = new THREE.Group();
        systemGroup.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        scene.add(systemGroup);

        const curve = new THREE.EllipseCurve(0, 0, group.radius, group.radius);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(group.radius * 10));

        // 궤도 재질 설정
        const orbitMat = new THREE.PointsMaterial({
            color: 0x000000,
            map: dotTexture,
            size: 0.35,
            transparent: true,
            depthWrite: false, // 궤도가 행성을 가리지 않게 함
            depthTest: true
        });

        const orbit = new THREE.Points(orbitGeo, orbitMat);
        systemGroup.add(orbit);

        group.planets.forEach((name, i) => {
            const matK = createPlanetMaterials(name, 'black');
            const matB = createPlanetMaterials(name, COLOR_BLUE);
            const planet = new THREE.Sprite(matK);
            planet.scale.set(0.12, 0.12, 1); planet.name = name;
            planet.userData = { matK: matK, matB: matB, parentGroup: systemGroup };
            systemGroup.add(planet); clickableObjects.push(planet);

            const angle = (i / group.planets.length) * Math.PI * 2;
            planetsUpdateFns.push(() => {
                const now = angle + (Date.now() * 0.001 * group.speed * 10);
                planet.position.set(Math.cos(now) * group.radius, Math.sin(now) * group.radius, 0);
            });
        });
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.2;
    setupInteractions();
}

// 상호작용 및 애니메이션 로직 유지
function setupInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerdown', (e) => {
        if (isOpening) { isOpening = false; camera.position.z = FINAL_CAM_Z; }
        mouseDownPosition = { x: e.clientX, y: e.clientY };
        isDragging = false;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjects);
        if (intersects.length > 0) selectedGroupForDrag = intersects[0].object.userData.parentGroup;
    });

    window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        const dist = Math.hypot(e.clientX - mouseDownPosition.x, e.clientY - mouseDownPosition.y);
        if (dist > CLICK_THRESHOLD && selectedGroupForDrag) { isDragging = true; controls.enabled = false; }

        if (isDragging && selectedGroupForDrag) {
            selectedGroupForDrag.rotation.y += (e.movementX || 0) * 0.005;
            selectedGroupForDrag.rotation.x += (e.movementY || 0) * 0.005;
        } else {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableObjects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                document.body.style.cursor = 'pointer';
                if (hoveredObject !== obj) {
                    if (hoveredObject && hoveredObject !== clickedObject) hoveredObject.material = hoveredObject.userData.matK;
                    hoveredObject = obj; hoveredObject.material = hoveredObject.userData.matB;
                }
            } else {
                document.body.style.cursor = 'default';
                if (hoveredObject && hoveredObject !== clickedObject) hoveredObject.material = hoveredObject.userData.matK;
                hoveredObject = null;
            }
        }
    });

    window.addEventListener('pointerup', () => {
        if (!isDragging) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableObjects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.name === '정진성') window.openProfileModal();
                if (clickedObject) clickedObject.material = clickedObject.userData.matK;
                clickedObject = obj; clickedObject.material = clickedObject.userData.matB;
                controls.autoRotate = false;
            } else {
                if (clickedObject) clickedObject.material = clickedObject.userData.matK;
                clickedObject = null; controls.autoRotate = true;
            }
        }
        isDragging = false; selectedGroupForDrag = null; controls.enabled = true;
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (isOpening && openingStartTime) {
        const elapsed = (Date.now() - openingStartTime) / 1000 - 0.5;
        if (elapsed > 0) {
            let t = Math.min(elapsed / ZOOM_DURATION, 1);
            if (t === 1) isOpening = false;
            const ease = t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
            camera.position.z = INITIAL_CAM_Z + (FINAL_CAM_Z - INITIAL_CAM_Z) * ease;
        }
    }
    planetsUpdateFns.forEach(fn => fn());
    controls.update();
    renderer.render(scene, camera);
}

async function startApp() {
    try { await document.fonts.load('bold 1rem "nanumgothiccoding"'); } catch (e) { }
    document.getElementById('loading').style.opacity = 0;
    initSystem(); openingStartTime = Date.now(); animate();
    setTimeout(() => renderer.domElement.style.opacity = 1, 100);
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
startApp();