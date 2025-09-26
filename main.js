/* ==========================================================================
   DevOne Portfolio 2025 - JavaScript Logic
   ========================================================================== */

// ==========================================================================
// Theme Toggle Functionality
// ==========================================================================
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Check for saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.classList.toggle('dark', savedTheme === 'dark');
    
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        const newTheme = html.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
    });
}

// ==========================================================================
// Three.js 3D Models Animation
// ==========================================================================
// Helper function to initialize Three.js for a section
function initThreeJSForSection(containerId, modelPath, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    const pointLight = new THREE.PointLight(0x4f46e5, 0.5, 100);
    pointLight.position.set(-10, -10, -5);
    scene.add(pointLight);

    // Model(s) for animation
    let model = null;
    let models = [];
    const loader = new THREE.GLTFLoader();

    // Utility for fallback geometry, per model type
    function addFallback() {
        // Fallback for brain.glb
        if (modelPath.includes('brain')) {
            const brainGeometry = new THREE.SphereGeometry(1, 16, 16);
            const brainMaterial = new THREE.MeshLambertMaterial({
                color: 0x8b5cf6,
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });
            model = new THREE.Mesh(brainGeometry, brainMaterial);
            model.scale.set(options.scale || 1, options.scale || 1, options.scale || 1);
            if (options.position) {
                model.position.set(options.position.x, options.position.y, options.position.z);
            }
            scene.add(model);
        }
        // Fallback for shapes.glb
        else if (modelPath.includes('shapes')) {
            const geometries = [
                new THREE.BoxGeometry(0.5, 0.5, 0.5),
                new THREE.SphereGeometry(0.3, 8, 8),
                new THREE.ConeGeometry(0.3, 0.8, 6),
                new THREE.TetrahedronGeometry(0.4),
                new THREE.OctahedronGeometry(0.3)
            ];
            for (let i = 0; i < 5; i++) {
                const geometry = geometries[i % geometries.length];
                const material = new THREE.MeshLambertMaterial({
                    color: Math.random() * 0xffffff,
                    transparent: true,
                    opacity: 0.8
                });
                const shape = new THREE.Mesh(geometry, material);
                // Randomize position if requested
                if (options.randomize) {
                    shape.position.set(
                        (Math.random() - 0.5) * 15,
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10
                    );
                } else if (options.position) {
                    shape.position.set(options.position.x, options.position.y, options.position.z);
                }
                shape.scale.set(options.scale || 1, options.scale || 1, options.scale || 1);
                models.push(shape);
                scene.add(shape);
            }
        }
        // Fallback for python.glb
        else if (modelPath.includes('python')) {
            const pythonGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
            const pythonMaterial = new THREE.MeshLambertMaterial({
                color: 0x3776ab,
                transparent: true,
                opacity: 0.9
            });
            model = new THREE.Mesh(pythonGeometry, pythonMaterial);
            model.scale.set(options.scale || 1, options.scale || 1, options.scale || 1);
            if (options.position) {
                model.position.set(options.position.x, options.position.y, options.position.z);
            }
            scene.add(model);
        }
    }

    // Load model(s)
    loader.load(
        modelPath,
        (gltf) => {
            // Special handling for shapes.glb (multiple shapes)
            if (modelPath.includes('shapes')) {
                for (let i = 0; i < 5; i++) {
                    const shape = gltf.scene.clone();
                    shape.scale.set(options.scale || 1, options.scale || 1, options.scale || 1);
                    if (options.randomize) {
                        shape.position.set(
                            (Math.random() - 0.5) * 15,
                            (Math.random() - 0.5) * 10,
                            (Math.random() - 0.5) * 10
                        );
                    } else if (options.position) {
                        shape.position.set(options.position.x, options.position.y, options.position.z);
                    }
                    shape.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    models.push(shape);
                    scene.add(shape);
                }
            } else {
                model = gltf.scene;
                model.scale.set(options.scale || 1, options.scale || 1, options.scale || 1);
                if (options.position) {
                    model.position.set(options.position.x, options.position.y, options.position.z);
                }
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                scene.add(model);
            }
        },
        undefined,
        (error) => {
            console.warn(`⚠️ Could not load ${modelPath} - using fallback geometry`);
            addFallback();
        }
    );

    // Camera position
    camera.position.set(0, 1, 5);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        // Animate brain.glb
        if (modelPath.includes('brain') && model) {
            model.rotation.y += 0.005;
            model.rotation.x += 0.002;
            model.position.y = (options.position ? options.position.y : 0) + Math.sin(Date.now() * 0.001) * 0.3;
        }
        // Animate shapes.glb
        if (modelPath.includes('shapes') && models.length > 0) {
            models.forEach((shape, index) => {
                shape.rotation.y += 0.01 + (index * 0.002);
                shape.rotation.x += 0.008;
                shape.position.y += Math.sin(Date.now() * 0.001 + index) * 0.002;
            });
        }
        // Animate python.glb
        if (modelPath.includes('python') && model) {
            model.rotation.y += 0.015;
            model.rotation.z += 0.005;
            model.position.y = (options.position ? options.position.y : 0) + Math.sin(Date.now() * 0.0015) * 0.2;
        }
        renderer.render(scene, camera);
    }
    animate();

    // Handle resize for this section's renderer
    function handleResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);
}

// Initialize Three.js for each section
function initThreeJS() {
    // Hero section: brain.glb
    initThreeJSForSection('three-hero', 'assets/models/brain.glb', { scale: 2, position: {x:0, y:-0.5, z:0} });
    // Projects section: shapes.glb
    initThreeJSForSection('three-projects', 'assets/models/shapes.glb', { scale: 0.5, randomize: true });
    // Skills section: python.glb
    initThreeJSForSection('three-skills', 'assets/models/python.glb', { scale: 1.2, position: {x:0, y:0, z:0} });
}

// ==========================================================================
// Smooth Scrolling Navigation
// ==========================================================================
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ==========================================================================
// Intersection Observer for Animations
// ==========================================================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.animate-fade-in, .project-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
}

// ==========================================================================
// AI Chat Easter Egg Functionality
// ==========================================================================
function initAIChat() {
    const chatTrigger = document.getElementById('ai-chat-trigger');
    const chatModal = document.getElementById('ai-chat-modal');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendChat = document.getElementById('send-chat');
    const chatMessages = document.getElementById('chat-messages');

    // AI Response Database
    const aiResponses = {
        'projects': "DevOne has worked on several exciting projects including a Titanic survival prediction model, an AI emotional journal app, and a plant disease detection system using computer vision!",
        'skills': "DevOne is proficient in Python, TensorFlow, PyTorch, and React. Currently learning Three.js and advanced computer vision techniques!",
        'ai': "DevOne is passionate about AI and machine learning, particularly in applications like healthcare, agriculture, and mental wellness. The goal is to pursue AI research at MIT!",
        'hackathon': "This portfolio was built for the DevOne Hackathon 2025! It showcases real projects and serves as an MIT application portfolio.",
        'tunisia': "DevOne is from Tunisia and is passionate about bringing AI innovation to North Africa and the broader MENA region!",
        'mit': "DevOne dreams of studying at MIT to advance AI research and work on projects that can make a global impact!",
        'kaggle': "DevOne started with the Titanic competition and learned valuable lessons about data preprocessing, feature engineering, and model validation!",
        'default': "That's a great question! DevOne is focused on AI research, machine learning projects, and building innovative solutions. Feel free to explore the portfolio sections above!"
    };

    // Event Listeners
    if (chatTrigger) {
        chatTrigger.addEventListener('click', () => {
            chatModal.classList.remove('hidden');
            chatModal.classList.add('flex');
            chatInput.focus();
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatModal.classList.add('hidden');
            chatModal.classList.remove('flex');
        });
    }

    if (chatModal) {
        chatModal.addEventListener('click', (e) => {
            if (e.target === chatModal) {
                chatModal.classList.add('hidden');
                chatModal.classList.remove('flex');
            }
        });
    }

    // Add chat message function
    function addChatMessage(message, isUser = false) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `mb-4 p-3 rounded-lg ${isUser ? 'bg-blue-100 dark:bg-blue-900 ml-8' : 'bg-gray-100 dark:bg-gray-600 mr-8'}`;
        messageDiv.innerHTML = `<p class="text-sm">${isUser ? '👤' : '🤖'} ${message}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Get AI response function
    function getAIResponse(input) {
        const lowerInput = input.toLowerCase();
        for (const [key, response] of Object.entries(aiResponses)) {
            if (lowerInput.includes(key)) {
                return response;
            }
        }
        return aiResponses.default;
    }

    // Send chat message
    if (sendChat) {
        sendChat.addEventListener('click', () => {
            const message = chatInput.value.trim();
            if (message) {
                addChatMessage(message, true);
                chatInput.value = '';
                
                // Show typing indicator
                const typingDiv = document.createElement('div');
                typingDiv.className = 'mb-4 p-3 bg-gray-100 dark:bg-gray-600 mr-8 rounded-lg';
                typingDiv.innerHTML = '<p class="text-sm"> <em>Typing...</em></p>';
                typingDiv.id = 'typing-indicator';
                chatMessages.appendChild(typingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                setTimeout(() => {
                    document.getElementById('typing-indicator').remove();
                    const response = getAIResponse(message);
                    addChatMessage(response);
                }, 1000);
            }
        });
    }

    // Enter key support
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChat.click();
            }
        });
    }
}

// ==========================================================================
// Contact Form Handling
// ==========================================================================
function initContactForm() {
    const contactForm = document.querySelector('#contact form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            
            // Enhanced validation
            if (!name) {
                showFormMessage('Please enter your name.', 'error');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                showFormMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            if (!message) {
                showFormMessage('Please enter a message.', 'error');
                return;
            }
            
            // Show success message
            showFormMessage('Thank you for your message! DevOne will get back to you soon.', 'success');
            e.target.reset();
        });
    }
}

// ==========================================================================
// Form Utilities
// ==========================================================================
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFormMessage(message, type) {
    // Remove existing message
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message p-4 rounded-lg mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`;
    messageDiv.textContent = message;
    
    // Insert before form
    const form = document.querySelector('#contact form');
    form.parentNode.insertBefore(messageDiv, form);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// ==========================================================================
// Mobile Menu Toggle
// ==========================================================================
function initMobileMenu() {
    // Create mobile menu button if not exists
    const nav = document.querySelector('nav .flex');
    const mobileButton = document.createElement('button');
    mobileButton.id = 'mobile-menu-button';
    mobileButton.className = 'md:hidden p-2 rounded-lg bg-gray-200 dark:bg-gray-800';
    mobileButton.innerHTML = '☰';
    
    // Insert mobile button
    nav.insertBefore(mobileButton, nav.lastElementChild);
    
    // Create mobile menu
    const mobileMenu = document.createElement('div');
    mobileMenu.id = 'mobile-menu';
    mobileMenu.className = 'hidden md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-t';
    
    const menuItems = document.querySelector('nav .hidden.md\\:flex').cloneNode(true);
    menuItems.className = 'flex flex-col space-y-4 space-x-0 p-4';
    mobileMenu.appendChild(menuItems);
    
    document.querySelector('nav > div').appendChild(mobileMenu);
    
    // Toggle functionality
    mobileButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
    
    // Close menu when clicking links
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// ==========================================================================
// Loading Animation
// ==========================================================================
function initLoadingAnimation() {
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
        document.body.classList.add('loaded');
        
        // Add stagger animation to elements
        const elements = document.querySelectorAll('.animate-fade-in');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animationDelay = `${index * 0.1}s`;
                el.classList.add('animate-fade-in');
            }, index * 100);
        });
    });
}

// ==========================================================================
// Initialize All Functions on DOM Content Loaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initThemeToggle();
    initSmoothScrolling();
    initScrollAnimations();
    initAIChat();
    initContactForm();
    initMobileMenu();
    initLoadingAnimation();
    
    // Initialize Three.js when page loads
    window.addEventListener('load', initThreeJS);
    
    console.log('🚀 DevOne Portfolio 2025 - All systems loaded!');
});

// ==========================================================================
// Utility Functions
// ==========================================================================

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Smooth scroll to element
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Get current theme
function getCurrentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Animate counter numbers
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        element.textContent = Math.floor(start);
        
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, 16);
}

// ==========================================================================
// Performance Monitoring
// ==========================================================================
if ('performance' in window && 'measure' in window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`⚡ Page load time: ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('🐌 Page load time is over 3 seconds. Consider optimizing.');
            } else {
                console.log('✅ Good page load performance!');
            }
        }, 0);
    });
}

// ==========================================================================
// Error Handling & Debugging
// ==========================================================================
window.addEventListener('error', function(e) {
    console.error('❌ JavaScript Error:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
});

// Debug mode (can be enabled via console)
window.enableDebugMode = function() {
    document.body.style.border = '5px solid red';
    console.log('🔧 Debug mode enabled');
    
    // Show element boundaries
    document.querySelectorAll('*').forEach(el => {
        el.style.outline = '1px solid rgba(255,0,0,0.2)';
    });
};

window.disableDebugMode = function() {
    document.body.style.border = 'none';
    console.log('🔧 Debug mode disabled');
    
    document.querySelectorAll('*').forEach(el => {
        el.style.outline = 'none';
    });
};