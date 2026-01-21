import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------
// 1. [상태 및 설정]
// ---------------------------------------------------------
let isOpening = true;
let openingStartTime = null;
const INITIAL_CAM_Z = 2.5;
const FINAL_CAM_Z = 45;
const WAIT_DURATION = 0.5;
const ZOOM_DURATION = 4.5;

const COLOR_BLUE = '#0000ff';

let hoveredObject = null;
let clickedObject = null;
let isDragging = false;
let selectedGroupForDrag = null;
let mouseDownPosition = { x: 0, y: 0 };
let previousMousePosition = { x: 0, y: 0 };
const CLICK_THRESHOLD = 5;

const profileModal = document.getElementById('profile-modal');
const modalClose = document.getElementById('modal-close');
const loadingDiv = document.getElementById('loading');

const ORBIT_GROUPS = [
    { radius: 10, planets: ['paint-ing', 'drawing'], speed: 0.003 },
    { radius: 18, planets: ['graphic', 'video', 'web'], speed: 0.002 },
    { radius: 26, planets: ['show', 'con-struct'], speed: 0.001 }
];

// ---------------------------------------------------------
// 2. [유틸리티] 상호작용 및 텍스처
// ---------------------------------------------------------
function openProfile() { profileModal.classList.add('active'); }
function closeProfile() { profileModal.classList.remove('active'); }

modalClose.addEventListener('click', closeProfile);
profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfile(); });

function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath(); context.arc(32, 32, 16, 0, Math.PI * 2);
    context.fillStyle = 'black'; context.fill();
    return new THREE.CanvasTexture(canvas);
}
const dotTexture = createDotTexture();

function createTextTexture(text, colorStr = 'black') {
    const fontSize = (text === '정진성') ? 133 : 200;
    const currentLineWidth = (text === '정진성') ? 20 : 30;
    const canvas = document.createElement('canvas');
    const size = 1024; canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');

    context.beginPath(); context.arc(size / 2, size / 2, (size / 2) - 20, 0, Math.PI * 2);
    context.fillStyle = 'white'; context.fill();
    context.lineWidth = currentLineWidth; context.strokeStyle = colorStr; context.stroke();

    if (text) {
        const lowerText = text.toLowerCase();
        const fontName = 'nanumgothiccoding';
        context.textAlign = 'left'; context.textBaseline = 'middle';
        context.fillStyle = colorStr; context.font = `bold ${fontSize}px "${fontName}"`;

        if (lowerText.includes('-')) {
            const parts = lowerText.split('-');
            const firstLine = parts[0] + '-';
            const secondLine = parts[1].trim();
            const m1 = context.measureText(firstLine);
            const m2 = context.measureText(secondLine);
            const startX = (size - Math.max(m1.width, m2.width)) / 2;
            const yOffset = fontSize * 0.55;
            context.fillText(firstLine, startX, size / 2 - yOffset);
            context.fillText(secondLine, startX, size / 2 + yOffset);
        } else {
            const metrics = context.measureText(lowerText);
            const startX = (size - metrics.width) / 2;
            context.fillText(lowerText, startX, size / 2 + (fontSize * 0.05));
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16; return tex;
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
const planetsData = [];
let controls;

function initSystem() {
    camera.position.z = INITIAL_CAM_Z;

    const sunTexK = createTextTexture('정진성', 'black');
    const sunTexB = createTextTexture('정진성', COLOR_BLUE);
    const sunMatK = new THREE.SpriteMaterial({ map: sunTexK, transparent: true, depthWrite: false, sizeAttenuation: false });
    const sunMatB = new THREE.SpriteMaterial({ map: sunTexB, transparent: true, depthWrite: false, sizeAttenuation: false });

    const sun = new THREE.Sprite(sunMatK);
    sun.scale.set(0.18, 0.18, 1); sun.name = '정진성';
    sun.userData = { matW: sunMatK, matB: sunMatB, parentGroup: null };
    scene.add(sun); clickableObjects.push(sun);

    ORBIT_GROUPS.forEach((group) => {
        const systemGroup = new THREE.Group();
        systemGroup.rotation.x = Math.random() * Math.PI * 2;
        systemGroup.rotation.y = Math.random() * Math.PI * 2;
        scene.add(systemGroup);

        const curve = new THREE.EllipseCurve(0, 0, group.radius, group.radius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(Math.floor(group.radius * 15));
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.PointsMaterial({ color: 0x000000, map: dotTexture, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 1.0, depthWrite: false });
        const orbit = new THREE.Points(orbitGeometry, orbitMaterial);
        orbit.renderOrder = -1; systemGroup.add(orbit);

        group.planets.forEach((name, index) => {
            const texK = createTextTexture(name, 'black');
            const texB = createTextTexture(name, COLOR_BLUE);
            const matK = new THREE.SpriteMaterial({ map: texK, transparent: true, depthWrite: false, sizeAttenuation: false });
            const matB = new THREE.SpriteMaterial({ map: texB, transparent: true, depthWrite: false, sizeAttenuation: false });
            const planet = new THREE.Sprite(matK);
            planet.scale.set(0.12, 0.12, 1); planet.name = name;
            planet.userData = { matW: matK, matB: matB, parentGroup: systemGroup };
            systemGroup.add(planet); clickableObjects.push(planet);

            const angle = (index / group.planets.length) * Math.PI * 2;
            const updatePlanetPos = () => {
                const nowAngle = angle + (Date.now() * 0.001 * group.speed * 10);
                planet.position.x = Math.cos(nowAngle) * group.radius;
                planet.position.y = Math.sin(nowAngle) * group.radius;
            };
            planetsData.push(updatePlanetPos);
        });
    });

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.2; controls.enabled = false;
    setupInteractions();
}

function setupInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerdown', (e) => {
        if (isOpening) { isOpening = false; controls.enabled = true; camera.position.z = FINAL_CAM_Z; }
        mouseDownPosition = { x: e.clientX, y: e.clientY };
        previousMousePosition = { x: e.clientX, y: e.clientY };
        isDragging = false;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjects);
        if (intersects.length > 0 && intersects[0].object.userData.parentGroup) selectedGroupForDrag = intersects[0].object.userData.parentGroup;
    });

    window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        const dist = Math.sqrt(Math.pow(e.clientX - mouseDownPosition.x, 2) + Math.pow(e.clientY - mouseDownPosition.y, 2));
        if (dist > CLICK_THRESHOLD && selectedGroupForDrag) { isDragging = true; controls.enabled = false; }
        if (isDragging && selectedGroupForDrag) {
            selectedGroupForDrag.rotation.y += (e.clientX - previousMousePosition.x) * 0.005;
            selectedGroupForDrag.rotation.x += (e.clientY - previousMousePosition.y) * 0.005;
        } else {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableObjects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                document.body.style.cursor = 'pointer';
                if (hoveredObject !== obj) {
                    if (hoveredObject && hoveredObject !== clickedObject) hoveredObject.material = hoveredObject.userData.matW;
                    hoveredObject = obj; hoveredObject.material = hoveredObject.userData.matB;
                }
            } else {
                document.body.style.cursor = 'default';
                if (hoveredObject && hoveredObject !== clickedObject) hoveredObject.material = hoveredObject.userData.matW;
                hoveredObject = null;
            }
        }
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
        if (!isDragging) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableObjects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.name === '정진성') openProfile();
                if (clickedObject) clickedObject.material = clickedObject.userData.matW;
                clickedObject = obj; clickedObject.material = clickedObject.userData.matB;
                controls.autoRotate = false;
            } else {
                if (clickedObject) clickedObject.material = clickedObject.userData.matW;
                clickedObject = null; controls.autoRotate = true;
            }
        }
        isDragging = false; selectedGroupForDrag = null; if (!isOpening) controls.enabled = true;
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (isOpening && openingStartTime) {
        const elapsed = (Date.now() - openingStartTime) / 1000;
        if (elapsed > WAIT_DURATION) {
            let t = (elapsed - WAIT_DURATION) / ZOOM_DURATION;
            if (t > 1) { t = 1; isOpening = false; controls.enabled = true; }
            const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
            camera.position.z = INITIAL_CAM_Z + (FINAL_CAM_Z - INITIAL_CAM_Z) * ease;
        }
    }
    planetsData.forEach(update => update());
    if (controls) controls.update();
    renderer.render(scene, camera);
}

async function startApp() {
    try { await document.fonts.load('bold 1rem "nanumgothiccoding"'); } catch (err) { }
    if (loadingDiv) loadingDiv.style.opacity = 0;
    initSystem(); openingStartTime = Date.now(); animate();
    setTimeout(() => { renderer.domElement.style.opacity = 1; }, 100);
}
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
startApp();