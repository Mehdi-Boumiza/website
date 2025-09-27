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
        // Camera setup: position in front of laptop screen
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.5, 3);

        // WebGL scene and renderer
        this.webglScene = new THREE.Scene();
        this.webglScene.background = new THREE.Color(0x1a1a2e);

        this.webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
        this.webglRenderer.setPixelRatio(window.devicePixelRatio);
        this.webglRenderer.shadowMap.enabled = true;
        this.webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.webglRenderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.webglRenderer.domElement);

        // CSS3D scene and renderer
        this.css3dScene = new THREE.Scene();

        this.css3dRenderer = new THREE.CSS3DRenderer();
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0';
        this.css3dRenderer.domElement.style.left = '0';
        this.container.appendChild(this.css3dRenderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.webglScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.webglScene.add(directionalLight);

        // Controls always enabled for free movement
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

                // Enable shadows on meshes
                this.laptopModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.needsUpdate = true;
                        }
                    }
                });

                // Scale and center model
                this.scaleAndCenterModel();

                // Add model to scene
                this.webglScene.add(this.laptopModel);

                // Find screen mesh
                this.findScreenMesh();

                // Create and position CSS3D website
                this.createAndPositionWebsite();

                // Hide loading element
                this.loadingElement.style.display = 'none';
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
                this.loadingElement.innerHTML = `<div class="error">Failed to load 3D model. Please check the console for details.</div>`;
            }
        );
    }

    scaleAndCenterModel() {
        if (!this.laptopModel) return;

        const box = new THREE.Box3().setFromObject(this.laptopModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim; // target size ~2.5 units

        this.laptopModel.scale.setScalar(scale);

        // Recompute bounding box after scaling
        box.setFromObject(this.laptopModel);
        const center = box.getCenter(new THREE.Vector3());

        // Center model at origin, and position on ground (y=0)
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
            console.warn('Screen mesh not found. Using laptop model center as fallback.');
            this.screenMesh = this.laptopModel;
        }
    }

    createAndPositionWebsite() {
        const websiteElement = document.getElementById('laptop-website');
        if (!websiteElement) return;

        this.cssObject = new THREE.CSS3DObject(websiteElement);

        // Compute screen bounding box in local space
        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const size = box.getSize(new THREE.Vector3());

        // Size and center of screen in world space
        const center = box.getCenter(new THREE.Vector3());

        // Position CSS3DObject at screen center
        this.cssObject.position.copy(center);

        // Copy rotation from screen mesh
        this.cssObject.quaternion.copy(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));

        // Calculate scale to match screen size
        // CSS3DObject size corresponds to CSS pixels, so scale accordingly
        // We assume the CSS element is sized to match the screen's aspect ratio (width / height)
        // We'll scale the CSS3DObject so that its size matches the screen size in 3D units
        const elementWidth = websiteElement.offsetWidth;
        const elementHeight = websiteElement.offsetHeight;
        if (elementWidth === 0 || elementHeight === 0) {
            console.warn('Website element has zero width or height. Cannot scale properly.');
        } else {
            const screenAspect = size.x / size.y;
            const elementAspect = elementWidth / elementHeight;

            // Scale factor to fit width or height depending on aspect ratio
            let scale;
            if (elementAspect > screenAspect) {
                // Fit height
                scale = size.y / elementHeight;
            } else {
                // Fit width
                scale = size.x / elementWidth;
            }
            this.cssObject.scale.set(scale, scale, scale);
        }

        // Adjust rotation to avoid upside-down display (rotate 180 deg around Y if needed)
        // Check if the CSS3DObject is upside down by comparing its up vector with world up
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.cssObject.quaternion);
        if (upVector.y < 0) {
            // Rotate 180 degrees around screen normal (Z axis)
            const rotationCorrection = new THREE.Quaternion();
            rotationCorrection.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
            this.cssObject.quaternion.multiply(rotationCorrection);
        }

        this.css3dScene.add(this.cssObject);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
            this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();

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