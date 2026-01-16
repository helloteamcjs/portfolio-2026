import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 카테고리 설정 (작가님의 포트폴리오에 맞게 수정됨)
const DEFINITIONS = {
    'Painting': { title: 'Painting', desc: '회화 작업물' },
    'Drawing': { title: 'Drawing', desc: '드로잉 및 스케치' },
    'Graphic Design': { title: 'Graphic Design', desc: '그래픽 디자인 프로젝트' },
    'Exhibition': { title: 'Exhibition', desc: '전시 기록' },
    'Installation': { title: 'Installation', desc: '설치 및 조각' },
    'Video': { title: 'Video', desc: '영상 작업' },
    'Web Page': { title: 'Web Page', desc: '웹 기반 프로젝트' }
};

// ... (기존의 복잡한 3D 엔진 로직들이 여기에 들어갑니다)
// 중략된 전체 코드는 제가 파일로 만들어 드릴 수도 있습니다.