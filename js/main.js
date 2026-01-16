import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------
// 1. [상태 및 설정] 인트로 및 카테고리 정의
// ---------------------------------------------------------
let isOpening = true;
let openingStartTime = null;
const INITIAL_CAM_Z = 2.5;
const FINAL_CAM_Z = 45;
const WAIT_DURATION = 0.5;
const ZOOM_DURATION = 4.5;

const DEFINITIONS = {
    'paint-ing': { title: 'paint-ing', desc: '회화 및 평면 작업' },
    'drawing': { title: 'drawing', desc: '드로잉 및 스케치 기록' },
    'graphic': { title: 'graphic', desc: '브랜딩 및 타이포그래피' },
    'video': { title: 'video', desc: '영상 및 미디어 아트' },
    'web': { title: 'web', desc: '인터랙티브 웹 프로젝트' },
    'show': { title: 'show', desc: '전시 기획 및 기록' },
    'con-struct': { title: 'con-struct', desc: '설치 및 조각 작업' }
};

const ORBIT_GROUPS = [
    { radius: 10, planets: ['paint-ing', 'drawing'], speed: 0.003 },
    { radius: 18, planets: ['graphic', 'video', 'web'], speed: 0.002 },
    { radius: 26, planets: ['show', 'con-struct'], speed: 0.001 }
];

const captionDiv = document.getElementById('caption');
const loadingDiv = document.getElementById('loading');

// ---------------------------------------------------------
// 2. [유틸리티] 텍스처 생성 및 캡션 제어
// ---------------------------------------------------------
function showCaption(name) {
    const data = DEFINITIONS[name];
    if (data) {
        captionDiv.innerHTML = `<span style="font-weight:bold;">${data.title}</span><br>${data.desc}`;
        captionDiv.style.opacity = 1;
    }
}

function hideCaption() {
    captionDiv.style.opacity = 0;
}

function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(32, 32, 16, 0, Math.PI * 2);
    context.fillStyle = 'white';
    context.fill();
    return new THREE.CanvasTexture(canvas);
}
const dotTexture = createDotTexture();

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    context.beginPath();
    context.arc(size / 2, size / 2, (size / 2) - 20, 0, Math.PI * 2);
    context.fillStyle = 'black';
    context.fill();
    context.lineWidth = 30;
    context.strokeStyle = 'white';
    context.stroke();

    if (text) {
        const lowerText = text.toLowerCase();
        const fontName = 'NanumGothicCoding';
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';

        if (lowerText.includes('-')) {
            const parts = lowerText.split('-');
            const firstLine = parts[0] + '-';
            const secondLine = parts[1].trim();
            context.font = `bold 160px "${fontName}"`;
            const m1 = context.measureText(firstLine);
            const m2 = context.measureText(secondLine);
            const startX = (size - Math.max(m1.width, m2.width)) / 2;
            context.fillText(firstLine, startX, size / 2 - 90);
            context.fillText(secondLine, startX, size / 2 + 110);
        } else {
            context.font = `bold 200px "${fontName}"`;
            const metrics = context.measureText(lowerText);
            const startX = (size - metrics.width) / 2;
            context.fillText(lowerText, startX, size / 2 + 10);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
}

// ---------------------------------------------------------
// 3. 시스템 초기화 로직
// ---------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const planetsData = [];
const clickableObjects = [];
let controls;

function initSystem() {
    camera.position.z = INITIAL_CAM_Z;

    // 중앙 cjs
    const sunTexture = createTextTexture('cjs');
    const sunMaterial = new THREE.SpriteMaterial({ map: sunTexture, color: 0xffffff, transparent: true, depthWrite: false, sizeAttenuation: false });
    const sun = new THREE.Sprite(sunMaterial);
    sun.scale.set(0.18, 0.18, 1);
    sun.renderOrder = 10;
    sun.name = 'cjs';
    scene.add(sun);
    clickableObjects.push(sun);

    // 그룹별 궤도 및 행성
    ORBIT_GROUPS.forEach((group) => {
        const systemGroup = new THREE.Group();
        systemGroup.rotation.x = Math.random() * Math.PI * 2;
        systemGroup.rotation.y = Math.random() * Math.PI * 2;
        scene.add(systemGroup);

        const curve = new THREE.EllipseCurve(0, 0, group.radius, group.radius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(Math.floor(group.radius * 15));
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.PointsMaterial({
            color: 0xffffff, map: dotTexture, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.4, depthWrite: false
        });
        const orbit = new THREE.Points(orbitGeometry, orbitMaterial);
        orbit.renderOrder = -1;
        systemGroup.add(orbit);

        group.planets.forEach((name, index) => {
            const texture = createTextTexture(name);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, sizeAttenuation: false, transparent: true, depthWrite: false });
            const planet = new THREE.Sprite(spriteMaterial);
            planet.scale.set(0.12, 0.12, 1);
            planet.renderOrder = 10;
            planet.name = name;
            planet.userData = { parentGroup: systemGroup };
            systemGroup.add(planet);
            clickableObjects.push(planet);

            const angle = (index / group.planets.length) * Math.PI * 2;
            planetsData.push({ mesh: planet, distance: group.radius, speed: group.speed, angle: angle });
        });
    });

    // 컨트롤 설정
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enabled = false;

    setupInteractions();
}

// ---------------------------------------------------------
// 4. 상호작용 및 애니메이션
// ---------------------------------------------------------
function setupInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let selectedGroupForDrag = null;
    let previousMousePosition = { x: 0, y: 0 };
    let mouseDownPosition = { x: 0, y: 0 };
    const CLICK_THRESHOLD = 5;

    window.addEventListener('pointerdown', (event) => {
        if (isOpening) {
            isOpening = false;
            controls.enabled = true;
            camera.position.z = FINAL_CAM_Z;
        }
        mouseDownPosition = { x: event.clientX, y: event.clientY };
        previousMousePosition = { x: event.clientX, y: event.clientY };
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjects);
        if (intersects.length > 0 && intersects[0].object.userData.parentGroup) {
            selectedGroupForDrag = intersects[0].object.userData.parentGroup;
            controls.enabled = false;
        }
    });

    window.addEventListener('pointermove', (event) => {
        const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
        const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
        if (deltaX > CLICK_THRESHOLD || deltaY > CLICK_THRESHOLD) isDragging = true;

        if (isDragging && selectedGroupForDrag) {
            selectedGroupForDrag.rotation.y += (event.clientX - previousMousePosition.x) * 0.005;
            selectedGroupForDrag.rotation.x += (event.clientY - previousMousePosition.y) * 0.005;
        }
        previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener('pointerup', () => {
        if (!isDragging) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(clickableObjects);
            if (intersects.length > 0) {
                showCaption(intersects[0].object.name);
                controls.autoRotate = false;
            } else {
                hideCaption();
                controls.autoRotate = true;
            }
        }
        isDragging = false;
        selectedGroupForDrag = null;
        if (!isOpening) controls.enabled = true;
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

    planetsData.forEach(p => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.distance;
        p.mesh.position.y = Math.sin(p.angle) * p.distance;
    });

    if (controls) controls.update();
    renderer.render(scene, camera);
}

// ---------------------------------------------------------
// 5. [핵심] 폰트 로딩 대기 후 애플리케이션 시작
// ---------------------------------------------------------
async function startApp() {
    try {
        // 기존 코드의 폰트 로딩 대기 로직
        await document.fonts.load('bold 1rem "NanumGothicCoding"');
    } catch (err) {
        console.log('Font load error', err);
    }

    // 1. 로딩 텍스트 숨기기
    if (loadingDiv) loadingDiv.style.opacity = 0;

    // 2. 시스템 초기화 및 시작
    initSystem();
    openingStartTime = Date.now();
    animate();

    // 3. 캔버스 페이드 인
    setTimeout(() => {
        renderer.domElement.style.opacity = 1;
    }, 100);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 앱 실행
startApp();