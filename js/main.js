import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------
// [데이터] 포트폴리오 카테고리 정의
// ---------------------------------------------------------
const DEFINITIONS = {
    'Painting': { title: 'Painting', desc: '회화 및 평면 작업' },
    'Drawing': { title: 'Drawing', desc: '드로잉 및 스케치 기록' },
    'Graphic Design': { title: 'Graphic Design', desc: '브랜딩, 타이포그래피 디자인' },
    'Exhibition': { title: 'Exhibition', desc: '전시 기획 및 참여 기록' },
    'Installation': { title: 'Installation', desc: '설치 미술 및 조각 작업' },
    'Video': { title: 'Video', desc: '영상 및 미디어 아트' },
    'Web Page': { title: 'Web Page', desc: '웹 기반 인터랙티브 프로젝트' }
};

// 각 카테고리 간의 관계 (연결선) - 필요에 따라 수정 가능
const RELATION_NAMES = {
    'Painting-Drawing': '기초 연구',
    'Graphic Design-Web Page': '매체 확장',
    'Installation-Exhibition': '공간 구성',
    'Video-Web Page': '디지털 연동'
};

const captionDiv = document.getElementById('caption');
const loadingDiv = document.getElementById('loading');

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

// ---------------------------------------------------------
// 0. 유틸리티 함수들
// ---------------------------------------------------------
function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    context.beginPath();
    const radius = (size / 2) - 20;
    context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    context.fillStyle = 'black';
    context.fill();
    context.lineWidth = 30;
    context.strokeStyle = 'white';
    context.stroke();

    if (text) {
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const fontName = 'NanumGothicCoding';
        context.font = `bold 160px "${fontName}"`;

        if (text.includes(' ')) {
            const words = text.split(' ');
            context.fillText(words[0], size / 2, size / 2 - 80);
            context.fillText(words[1], size / 2, size / 2 + 100);
        } else {
            context.font = `bold 200px "${fontName}"`;
            context.fillText(text, size / 2, size / 2 + 10);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

function createDotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(32, 32, 16, 0, Math.PI * 2);
    context.fillStyle = 'white'; context.fill();
    return new THREE.CanvasTexture(canvas);
}
const dotTexture = createDotTexture();

// ---------------------------------------------------------
// 1. Scene & Camera & Renderer 설정
// ---------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 30;

// ---------------------------------------------------------
// 2. 객체 생성 및 배치
// ---------------------------------------------------------
const planetsData = [];
const clickableObjects = [];
const orbitMeshes = [];

function createPlanet(name, distance, color = 0xffffff) {
    const systemGroup = new THREE.Group();
    systemGroup.rotation.x = Math.random() * Math.PI;
    systemGroup.rotation.y = Math.random() * Math.PI;
    scene.add(systemGroup);

    // 궤도 생성
    const curve = new THREE.EllipseCurve(0, 0, distance, distance);
    const points = curve.getPoints(100);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.3 });
    const orbit = new THREE.Points(orbitGeo, orbitMat);
    systemGroup.add(orbit);
    orbitMeshes.push(orbit);

    // 행성(스프라이트) 생성
    const texture = createTextTexture(name);
    const material = new THREE.SpriteMaterial({ map: texture, color: color });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 2.5, 1);
    sprite.name = name;
    sprite.userData = { parentGroup: systemGroup };
    systemGroup.add(sprite);

    const angle = Math.random() * Math.PI * 2;
    planetsData.push({ mesh: sprite, distance: distance, speed: 0.002 + Math.random() * 0.002, angle: angle });
    clickableObjects.push(sprite);
}

// 중앙의 'PORTFOLIO' 태양
const sunTexture = createTextTexture('PORTFOLIO');
const sunMaterial = new THREE.SpriteMaterial({ map: sunTexture });
const sun = new THREE.Sprite(sunMaterial);
sun.scale.set(5, 5, 1);
sun.name = 'SUN';
scene.add(sun);

// 7개 카테고리 행성 배치
createPlanet('Painting', 8);
createPlanet('Drawing', 11);
createPlanet('Graphic Design', 14);
createPlanet('Exhibition', 17);
createPlanet('Installation', 20);
createPlanet('Video', 23);
createPlanet('Web Page', 26);

// ---------------------------------------------------------
// 3. 컨트롤 및 애니메이션
// ---------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

function animate() {
    requestAnimationFrame(animate);

    planetsData.forEach(p => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.distance;
        p.mesh.position.y = Math.sin(p.angle) * p.distance;
    });

    controls.update();
    renderer.render(scene, camera);
}

// ---------------------------------------------------------
// 4. 이벤트 리스너 (클릭 및 리사이즈)
// ---------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        showCaption(obj.name);
        controls.autoRotate = false;
    } else {
        hideCaption();
        controls.autoRotate = true;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 시작!
animate();
renderer.domElement.style.opacity = 1;
if (loadingDiv) loadingDiv.style.opacity = 0;