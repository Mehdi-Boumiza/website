class Laptop3DViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.laptopModel = null;
        this.container = document.getElementById('canvas-container');
        this.loadingElement = document.getElementById('loading');
        
        this.init();
        this.addTestCube(); // Add test cube first
        this.loadModel();
        this.animate();
        this.setupEventListeners();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Position camera in front of the laptop screen
        this.camera.position.set(0.05, 1.54, 1.08); 

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        this.container.appendChild(this.renderer.domElement);

        // Add camera coordinates overlay
        this.coordDiv = document.createElement('div');
        this.coordDiv.style.position = 'absolute';
        this.coordDiv.style.top = '10px';
        this.coordDiv.style.left = '10px';
        this.coordDiv.style.color = 'white';
        this.coordDiv.style.fontFamily = 'monospace';
        this.coordDiv.style.zIndex = '1000';
        this.container.appendChild(this.coordDiv);

        // Lighting setup
        this.setupLighting();

        // OrbitControls setup
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 10;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 1;

        // Ensure camera looks at the laptop model (assumed centered at origin)
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xff6b6b, 0.2);
        rimLight.position.set(0, 0, -10);
        this.scene.add(rimLight);
    }

    addTestCube() {
        // Add a test cube to verify 3D scene is working
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5 
        });
        this.testCube = new THREE.Mesh(geometry, material);
        this.testCube.position.set(0, 1, 0);
        this.testCube.castShadow = true;
        this.scene.add(this.testCube);
        console.log('Test cube added - 3D scene is working!');
    }

    loadModel() {
        const loader = new THREE.GLTFLoader();
        
        // First, let's check if the file exists and add more detailed error handling
        console.log('Attempting to load model from: assets/models/laptop.glb');
        
        loader.load(
            'assets/models/laptop.glb',
            (gltf) => {
                this.laptopModel = gltf.scene;
                
                // Enable shadows for all meshes
                this.laptopModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance materials
                        if (child.material) {
                            child.material.needsUpdate = true;
                        }
                    }
                });

                // Scale and position the model
                this.scaleModel();
                
                // Add model to scene
                this.scene.add(this.laptopModel);
                
                // Remove test cube when model loads
                if (this.testCube) {
                    this.scene.remove(this.testCube);
                }
                
                // Hide loading screen
                this.loadingElement.style.display = 'none';
                
                console.log('Laptop model loaded successfully!');
            },
            (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                console.log(`Loading progress: ${percent}%`);
            },
            (error) => {
                console.error('Error loading laptop model:', error);
                console.error('Error details:', {
                    message: error.message,
                    type: error.type,
                    target: error.target?.src || 'Unknown'
                });
                
                // Check if it's a 404 error (file not found)
                if (error.target && error.target.src) {
                    this.showError(`Model file not found: ${error.target.src}<br><br>
                        Please check:<br>
                        1. File exists at: assets/models/laptop.glb<br>
                        2. File path is correct<br>
                        3. Running on a web server (not file://)`);
                } else {
                    this.showError(`Failed to load 3D model.<br><br>
                        Error: ${error.message || 'Unknown error'}<br><br>
                        Please check:<br>
                        1. File exists at: assets/models/laptop.glb<br>
                        2. Running on a web server<br>
                        3. GLB file is valid`);
                }
            }
        );
    }

    scaleModel() {
        if (!this.laptopModel) return;

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(this.laptopModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Scale to fit nicely in view (target size of 3 units)
        const targetSize = 3;
        const scale = targetSize / maxDim;
        this.laptopModel.scale.setScalar(scale);

        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        this.laptopModel.position.sub(center.multiplyScalar(scale));
        
        // Position slightly above the ground
        this.laptopModel.position.y = 0;
    }

    showError(message) {
        this.loadingElement.innerHTML = `<div class="error">${message}</div>`;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Disable auto-rotate on user interaction
        this.controls.addEventListener('start', () => {
            this.controls.autoRotate = false;
        });

        // Re-enable auto-rotate after period of inactivity
        let inactivityTimer;
        this.controls.addEventListener('end', () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.controls.autoRotate = false;
            }, 3000); // 3 seconds of inactivity
        });

        // Handle touch events for mobile
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
        });

        this.renderer.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Update camera coordinates display
        this.coordDiv.innerText = `Camera position: x=${this.camera.position.x.toFixed(2)}, y=${this.camera.position.y.toFixed(2)}, z=${this.camera.position.z.toFixed(2)}`;
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the 3D viewer when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for all scripts to fully load
    setTimeout(() => {
        if (typeof THREE !== 'undefined' && THREE.OrbitControls && THREE.GLTFLoader) {
            new Laptop3DViewer();
        } else {
            console.error('Three.js dependencies not loaded:', {
                THREE: typeof THREE !== 'undefined',
                OrbitControls: !!(THREE && THREE.OrbitControls),
                GLTFLoader: !!(THREE && THREE.GLTFLoader)
            });
            document.getElementById('loading').innerHTML = 
                '<div class="error">Failed to load Three.js libraries. Please refresh the page.</div>';
        }
    }, 500);
});