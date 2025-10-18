class InteractiveLaptopPortfolio {
    constructor() {
        this.container = document.getElementById('container');
        this.loadingElement = document.getElementById('loading');

        this.camera = null;
        this.webglScene = null;
        this.css3dScene = null;
        this.webglRenderer = null;
        this.css3dRenderer = null;
        this.controls = null;
        this.laptopModel = null;
        this.screenMesh = null;
        this.cssObject = null;

        this.init();
        this.loadModel();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.webglScene = new THREE.Scene();
        this.webglScene.background = new THREE.Color(0x1a1a2e);

        this.webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);
        this.webglRenderer.shadowMap.enabled = true;
        this.webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.webglRenderer.outputEncoding = THREE.sRGBEncoding;
        this.webglRenderer.domElement.style.zIndex = '2';
        this.container.appendChild(this.webglRenderer.domElement);

        this.css3dScene = new THREE.Scene();

        this.css3dRenderer = new THREE.CSS3DRenderer();
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0';
        this.css3dRenderer.domElement.style.left = '0';
        this.css3dRenderer.domElement.style.pointerEvents = 'none';
        this.css3dRenderer.domElement.style.zIndex = '1';
        this.container.appendChild(this.css3dRenderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.webglScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.webglScene.add(directionalLight);

        this.controls = new THREE.OrbitControls(this.camera, this.webglRenderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 10;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.autoRotate = false;
    }

    loadModel() {
        const loader = new THREE.GLTFLoader();
        loader.load(
            'assets/models/laptop.glb',
            (gltf) => {
                this.laptopModel = gltf.scene;

                this.laptopModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.needsUpdate = true;
                        }
                    }
                });

                this.scaleAndCenterModel();
                this.webglScene.add(this.laptopModel);
                this.findScreenMesh();
                this.createAndPositionWebsite();
                this.adjustCameraAndControls();

                this.loadingElement.style.display = 'none';
            },
            undefined,
            (error) => {
                console.error('Error loading:', error);
                this.loadingElement.innerHTML = `<div class="error">Failed to load</div>`;
            }
        );
    }

    scaleAndCenterModel() {
        if (!this.laptopModel) return;

        const box = new THREE.Box3().setFromObject(this.laptopModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim; 

        this.laptopModel.scale.setScalar(scale);

        box.setFromObject(this.laptopModel);
        const center = box.getCenter(new THREE.Vector3());

        this.laptopModel.position.x -= center.x;
        this.laptopModel.position.z -= center.z;
        this.laptopModel.position.y -= box.min.y;
    }

    findScreenMesh() {
        if (!this.laptopModel) return;

        const screenNames = ['screen', 'display', 'monitor'];
        this.screenMesh = null;

        this.laptopModel.traverse((child) => {
            if (child.isMesh) {
                const nameLower = child.name.toLowerCase();
                for (const screenName of screenNames) {
                    if (nameLower.includes(screenName)) {
                        this.screenMesh = child;
                        return;
                    }
                }
            }
        });

        if (!this.screenMesh) {
            console.warn('Screen mesh not found, using entire model as fallback');
            this.screenMesh = this.laptopModel;
        }
    }

    createAndPositionWebsite() {
        const websiteElement = document.getElementById('laptop-website');
        if (!websiteElement) return;

        this.cssObject = new THREE.CSS3DObject(websiteElement);

        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const screenNormal = new THREE.Vector3(0, 0, 1);
        screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormal.normalize();
        
        this.cssObject.position.copy(center).add(screenNormal.multiplyScalar(-0.02));

        this.screenMesh.updateWorldMatrix(true, false);
        this.cssObject.quaternion.copy(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));

        const elementWidth = websiteElement.offsetWidth;
        const elementHeight = websiteElement.offsetHeight;

        if (elementWidth === 0 || elementHeight === 0) {
            console.warn('Website element has no dimensions, using default scale');
            this.cssObject.scale.set(1, 1, 1);
        } else {
            const scaleX = (size.x / elementWidth) * 0.99;
            const scaleY = (size.y / elementHeight) * 0.95;
            this.cssObject.scale.set(scaleX, scaleY, 1);
        }

        const rotationCorrection = new THREE.Quaternion();
        rotationCorrection.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        this.cssObject.quaternion.multiply(rotationCorrection);

        this.css3dScene.add(this.cssObject);

        // Make the actual screen mesh invisible but keep it for collision/depth
        if (this.screenMesh.material) {
            this.screenMesh.material.opacity = 0;
            this.screenMesh.material.transparent = true;
        }
    }

    adjustCameraAndControls() {
        if (!this.screenMesh) return;

        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        this.controls.target.copy(center);

        const maxScreenDimension = Math.max(size.x, size.y);
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = (maxScreenDimension / 2) / Math.tan(fov / 2);

        const screenNormal = new THREE.Vector3(0, 0, 1);
        screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormal.normalize();

        const cameraPosition = center.clone().add(screenNormal.multiplyScalar(distance * 1.2));
        this.camera.position.copy(cameraPosition);
        this.camera.lookAt(center);

        this.controls.update();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
            this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    updateWebsiteVisibility() {
        if (!this.screenMesh || !this.cssObject) return;

        const screenNormal = new THREE.Vector3(0, 0, 1);
        screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormal.normalize();

        const screenWorldPos = new THREE.Vector3();
        this.screenMesh.getWorldPosition(screenWorldPos);

        const cameraDirection = new THREE.Vector3();
        cameraDirection.subVectors(this.camera.position, screenWorldPos);
        cameraDirection.normalize();

        const dotProduct = screenNormal.dot(cameraDirection);

        // Show website only when viewing from the front (dot < -0.1 for this model)
        // Add smooth opacity transition
        if (dotProduct < -0.1) {
            this.cssObject.element.style.display = 'block';
            this.cssObject.element.style.opacity = Math.min(Math.abs(dotProduct) * 2, 1);
        } else {
            this.cssObject.element.style.display = 'none';
            this.cssObject.element.style.opacity = 0;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();
        this.updateWebsiteVisibility();

        this.webglRenderer.render(this.webglScene, this.camera);
        this.css3dRenderer.render(this.css3dScene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof THREE !== 'undefined' && THREE.OrbitControls && THREE.GLTFLoader && THREE.CSS3DRenderer) {
            new InteractiveLaptopPortfolio();
        } else {
            console.error('Three.js dependencies not loaded:', {
                THREE: typeof THREE !== 'undefined',
                OrbitControls: !!(THREE && THREE.OrbitControls),
                GLTFLoader: !!(THREE && THREE.GLTFLoader),
                CSS3DRenderer: !!(THREE && THREE.CSS3DRenderer)
            });
            const loading = document.getElementById('loading');
            if (loading) {
                loading.innerHTML = '<div class="error">Failed to load Three.js libraries. Please refresh the page.</div>';
            }
        }
    }, 500);
});