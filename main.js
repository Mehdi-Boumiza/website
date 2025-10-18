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
        this.container.appendChild(this.webglRenderer.domElement);

        this.css3dScene = new THREE.Scene();

        this.css3dRenderer = new THREE.CSS3DRenderer();
        this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3dRenderer.domElement.style.position = 'absolute';
        this.css3dRenderer.domElement.style.top = '0';
        this.css3dRenderer.domElement.style.left = '0';
        this.css3dRenderer.domElement.style.pointerEvents = 'none'; 
        this.container.appendChild(this.css3dRenderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.webglScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.webglScene.add(directionalLight);

        //controls
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

                // scale
                this.scaleAndCenterModel();

                this.webglScene.add(this.laptopModel);

                this.findScreenMesh();

                this.createAndPositionWebsite();
                //target camera
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

        // position on ground
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
            console.warn('screen mesh not found');
            this.screenMesh = this.laptopModel;
        }
    }

    createAndPositionWebsite() {
        const websiteElement = document.getElementById('laptop-website');
        if (!websiteElement) return;

        this.cssObject = new THREE.CSS3DObject(websiteElement);

        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const size = box.getSize(new THREE.Vector3());

        console.log(` Screen dimensions: width=${size.x.toFixed(3)}, height=${size.y.toFixed(3)}, depth=${size.z.toFixed(3)}`);

        const center = box.getCenter(new THREE.Vector3());

        // screen stuck in between so move it in front a bit
        const screenNormal = new THREE.Vector3(0, 0, 1);
        screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormal.normalize();
        this.cssObject.position.copy(center).add(screenNormal.multiplyScalar(-0.02)); 

        this.screenMesh.updateWorldMatrix(true, false);
        this.cssObject.quaternion.copy(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));

        // calculate scale to match screen size 
        const elementWidth = websiteElement.offsetWidth;
        const elementHeight = websiteElement.offsetHeight;

        if (elementWidth === 0 || elementHeight === 0) {
            console.warn('cant scale');
            this.cssObject.scale.set(1, 1, 1);
        } else {
            const scaleX = (size.x / elementWidth) * 0.99;
            const scaleY = (size.y / elementHeight) * 0.95;
            this.cssObject.scale.set(scaleX, scaleY, 1);
        }

        // flip website toward camera
        const rotationCorrection = new THREE.Quaternion();
        rotationCorrection.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        this.cssObject.quaternion.multiply(rotationCorrection);

        this.css3dScene.add(this.cssObject);

        // black plane directly behind screen (non-transparent, blocks back side)
        const boxBack = new THREE.Box3().setFromObject(this.screenMesh);
        const sizeBack = boxBack.getSize(new THREE.Vector3());
        const centerBack = boxBack.getCenter(new THREE.Vector3());

        // Use a fresh normal for backPlane placement (screenNormal was modified above)
        const screenNormalForBack = new THREE.Vector3(0, 0, 1);
        screenNormalForBack.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormalForBack.normalize();

        const backPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(sizeBack.x, sizeBack.y),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        // Place just behind the screen (very close)
        backPlane.position.copy(centerBack).add(screenNormalForBack.multiplyScalar(-0.001));
        // Match rotation of the screen
        backPlane.quaternion.copy(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        // Only show on front side (blocks view from behind)
        backPlane.material.side = THREE.FrontSide;
        backPlane.material.transparent = false;
        backPlane.material.depthWrite = true;
        // Add to WebGL scene
        this.webglScene.add(backPlane);
    }

    adjustCameraAndControls() {
        if (!this.screenMesh) return;

        // Compute bounding box of the screen mesh in world coordinates
        const box = new THREE.Box3().setFromObject(this.screenMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Set controls target to screen center
        this.controls.target.copy(center);

        // Position the camera so that the screen is fully visible
        // Calculate distance based on screen size and camera FOV
        const maxScreenDimension = Math.max(size.x, size.y);
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = (maxScreenDimension / 2) / Math.tan(fov / 2);

        // Position camera along the screen normal direction
        // Get screen normal vector (Z axis in screen local space)
        const screenNormal = new THREE.Vector3(0, 0, 1);
        screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
        screenNormal.normalize();

        // Position camera at some distance away from screen center along normal
        const cameraPosition = center.clone().add(screenNormal.multiplyScalar(distance * 1.2)); // Slightly further to have margin
        this.camera.position.copy(cameraPosition);

        this.camera.lookAt(center);

        // Update controls to new camera and target positions
        this.controls.update();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();

            this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
            this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        });
        window.addEventListener('mousemove', (event) => {
            console.log(`Mouse position: x=${event.clientX}, y=${event.clientY}`);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();

        // Hide CSS3D website when camera is behind the laptop screen
        if (this.screenMesh && this.cssObject) {
            const screenNormal = new THREE.Vector3(0, 0, 1);
            screenNormal.applyQuaternion(this.screenMesh.getWorldQuaternion(new THREE.Quaternion()));
            const cameraDirection = new THREE.Vector3().subVectors(this.camera.position, this.screenMesh.getWorldPosition(new THREE.Vector3()));
            const dot = screenNormal.dot(cameraDirection.normalize());

            // Hide CSS3DObject when camera is behind or at an angle facing away from the screen
            this.cssObject.element.style.display = dot > 0.25 ? 'block' : 'none';
        }

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