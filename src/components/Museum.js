import * as THREE from 'three';
import { PointerLockControls } from 'PointerLockControls';
import Dir from './Dir.js';
import Layout from './Layout.js';
import RandomOrder from './RandomOrder.js';

/**
 * 美術館を構築するクラス
 */
export default class Museum {

	/**
	 * コンストラクタ
	 * @param {string} map - 通路の形状を表す罫線文字列
	 */
	constructor(map) {

		/**
		 * 設定項目
		 * @type {object}
		 */
		this.config = {
			backgroundColor  : 0x000000, // sceneの背景色
			cameraHeight     : 1.75,     // カメラの高さ
			ambientLightColor: 0xfffff0, // 環境光の色
			moveSpeed        : 3,        // 移動速度
			size             : 6,        // 通路の幅
			wallHeight       : 4.5,      // 壁の高さ
			wallThickness    : 0.1,      // 壁の厚さ
			playerRadius     : 0.3,      // プレイヤーの半径
			imgDensity       : 2,        // 壁1マス分あたりの画像展示数
			imgHeight        : 1.75,     // 床から画像中心の距離
			imgRatio         : 0.8,      // 区画の横幅のうち画像が占める割合
			imgThickness     : 0.05,     // 画像パネルの厚さ
			lightDistance    : 0.4,      // 壁から光源までの水平距離（通路幅に対する割合）
			wallColor        : 0xaaa0a0, // 壁の色
			floorColor       : 0x444444, // 床と天井の色

		};

		/**
		 * Layoutオブジェクト
		 * @type {Layout}
		 */
		this.layout = new Layout(map);

		this._initialize();
		this._generate();
		this._start();
		
	}
	
	/**
	 * 基本要素の初期化
	 */
	_initialize() {
		const { backgroundColor, cameraHeight, ambientLightColor, moveSpeed, size } = this.config;
	
		// シーン
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(backgroundColor);
		
		// カメラ
		const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
		camera.position.set(0.5, cameraHeight, 0.5);
		
		// レンダラ
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);
		
		// 環境光
		scene.add(new THREE.AmbientLight(ambientLightColor));

		// テクスチャローダー
		this.loader = new THREE.TextureLoader();

		this.scene = scene;
		this.camera = camera;
		
		// コントロール
		const controls = new PointerLockControls(camera, renderer.domElement);
		renderer.domElement.addEventListener('click', () => {
			controls.lock();
		});
		const keys = {};
		document.addEventListener('keydown', e => {
			keys[e.code] = true;
		});
		document.addEventListener('keyup', e => {
			keys[e.code] = false;
		});
		const clock = new THREE.Clock();
		const animate = () => {
			requestAnimationFrame(animate);
			const dt = Math.min(clock.getDelta(), 0.05);
			if (controls.isLocked) {
				if (keys.KeyW) controls.moveForward(moveSpeed * dt);
				if (keys.KeyS) controls.moveForward(-moveSpeed * dt);
				if (keys.KeyA) controls.moveRight(-moveSpeed * dt);
				if (keys.KeyD) controls.moveRight(moveSpeed * dt);
				const {x, z} = this.camera.position;
				if (this.clampPlayer) this.clampPlayer(x / size | 0, z / size | 0);
			}
			renderer.render(scene, camera);
		}
		animate();
		
		// リサイズ対応
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		});

	}

	/**
	 * 静的オブジェクト類の初期化
	 */
	_generate() {
		const scene = this.scene;
		const layout = this.layout;

		const { size, wallHeight, wallThickness, playerRadius, imgDensity, imgHeight, lightDistance, wallColor, floorColor } = this.config;
		
		this.camera.lookAt(size, imgHeight, size);
		
		// 東西方向の壁
		for (const [x, z, s] of layout.hwalls) {
			const wall = new THREE.Mesh(
				new THREE.BoxGeometry(s * size + wallThickness, wallHeight, wallThickness),
				new THREE.MeshStandardMaterial({ color: wallColor })
			);
			wall.position.set((x + s / 2) * size, wallHeight / 2, z * size);
			scene.add(wall);
		}
		
		// 南北方向の壁
		for (const [x, z, s] of layout.vwalls) {
			const wall = new THREE.Mesh(
				new THREE.BoxGeometry(wallThickness, wallHeight, s * size + wallThickness),
				new THREE.MeshStandardMaterial({ color: wallColor })
			);
			wall.position.set(x * size, wallHeight / 2, (z + s / 2) * size);
			scene.add(wall);
		}
		
		// 床と天井
		for (let i = 0; 2 > i; i++) {
			const floor = new THREE.Mesh(
				new THREE.BoxGeometry(layout.lengthX * size, wallThickness, layout.lengthZ * size),
				new THREE.MeshStandardMaterial({ color: floorColor })
			);
			floor.position.set(layout.lengthX * size / 2, wallHeight * i + [-1, 1][i] * wallThickness / 2, layout.lengthZ * size / 2);
			scene.add(floor);
		}
		
		// 壁の衝突判定
		this.clampPlayer = (a, b) => {
			const camera = this.camera;
			const [xs, xe, zs, ze] = layout.motionRange[b][a];
			const d = wallThickness + playerRadius;
			camera.position.x = THREE.MathUtils.clamp(camera.position.x, xs * size + d, xe * size - d);
			camera.position.z = THREE.MathUtils.clamp(camera.position.z, zs * size + d, ze * size - d);
		};
		
		// 画像表示枠の準備
		this.imageFrames = [];
		for (let i = 0; layout.imagePositions.length > i; i++) {
			const [side, ...pos] = layout.imagePositions[i];
			const [a, b] = layout.cellPositions[i];
			for (const dir of pos) {
				// 一つの壁面上のライトや画像をまとめるグループ
				const wallGroup = new THREE.Group();
				for (let j = 0; imgDensity > j; j++) {
					// 壁中央からの相対座標（sideを参照して進行方向に向かう順番にする）
					const p = [-1, 1][+side] * ((j + 0.5) / imgDensity - 0.5);
					// ライト本体
					const lightGroup = new THREE.Group();
					const lightRadius = 0.08;
					const lightLength = 0.2;
					const lightSegments = 24;
					const lightBody = new THREE.Mesh(
						new THREE.CylinderGeometry(lightRadius, lightRadius, lightLength, lightSegments, 1),
						new THREE.MeshStandardMaterial({ color: 0x222222 })
					);
					lightGroup.add(lightBody);
					const lightLens = new THREE.Mesh(
						new THREE.CircleGeometry(lightRadius, lightSegments),
						new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
					);
					lightLens.position.set(0, -lightLength / 2 - 0.01, 0);
					lightLens.rotation.x = Math.PI / 2;
					lightGroup.add(lightLens);
					lightGroup.position.set(p * size, wallHeight - 0.2, (lightDistance - 0.5) * size)
					lightGroup.rotation.x = Math.atan2(lightDistance * size, wallHeight - 0.2 - imgHeight);
					wallGroup.add(lightGroup);
					// 光源
					const light = new THREE.SpotLight(0xffffff, 10, 10, Math.PI / 4, 1, 1);
					light.position.copy(lightGroup.position);
					wallGroup.add(light);
					this.imageFrames.push({
						wallGroup: wallGroup, // この画像枠が所属する壁面
						light    : light,     // この画像枠の光源
						position : p          // この画像枠の壁中央からの相対座標
					});
				}
				// マスの中心を回転中心とする
				wallGroup.position.set((a + 0.5) * size, 0, (b + 0.5) * size);
				// 方角に応じて向きを回転する
				wallGroup.rotation.y = -Dir.angle(dir);
				scene.add(wallGroup);
			}
		}
	
	}

	/**
	 * 画像読み込みの開始
	 */
	async _start() {
		const { size, wallThickness, imgDensity, imgHeight, imgRatio, imgThickness } = this.config;
		const imageSize = size / imgDensity * imgRatio; // 画像長辺の長さ
		const name = 'default';
		const { files } = await (await fetch(`./filelist/${name}`)).json();
		const randomOrder = new RandomOrder(files.length);
		for (const frame of this.imageFrames) {
			const { wallGroup, position, light } = frame;
			// 画像の読み込み
			this.loader.load(files[randomOrder.next()], (texture) => {
				const { width, height } = texture.image;
				const [w, h] = width > height ? [imageSize, imageSize / width * height] : [imageSize / height * width, imageSize];
				// 画像
				const image = new THREE.Mesh(
					new THREE.PlaneGeometry(w, h),
					new THREE.MeshBasicMaterial({ map: texture })
				);
				image.position.set(position * size, imgHeight, (wallThickness - size) / 2 + imgThickness + 0.001);
				wallGroup.add(image);
				// 画像パネル
				const panel = new THREE.Mesh(
					new THREE.BoxGeometry(w, h, imgThickness),
					new THREE.MeshStandardMaterial({ color: 0x006666 })
				);
				panel.position.set(position * size, imgHeight, (wallThickness + imgThickness - size) / 2);
				wallGroup.add(panel);
				light.target = panel;
			});

		}

	}

}
