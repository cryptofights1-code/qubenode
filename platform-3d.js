/**
 * QubeNode Platform - Three.js 3D Icons
 * Realistic 3D materials and lighting
 */

class ThreeDIcons {
    constructor() {
        this.scenes = {};
        this.cameras = {};
        this.renderers = {};
        this.objects = {};
        this.init();
    }
    
    init() {
        // Wait for DOM and tiles to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createAllIcons());
        } else {
            setTimeout(() => this.createAllIcons(), 500);
        }
    }
    
    createAllIcons() {
        const tiles = document.querySelectorAll('.app-tile');
        if (tiles.length === 0) {
            console.log('No tiles found, retrying...');
            setTimeout(() => this.createAllIcons(), 500);
            return;
        }
        
        tiles.forEach((tile, index) => {
            const iconContainer = tile.querySelector('.tile-icon');
            if (iconContainer) {
                const iconType = this.getIconType(index);
                this.create3DIcon(iconContainer, iconType, index);
            }
        });
    }
    
    getIconType(index) {
        const types = ['layers', 'briefcase', 'chart', 'check', 'search'];
        return types[index] || 'layers';
    }
    
    create3DIcon(container, type, index) {
        // Clear container
        container.innerHTML = '';
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'icon-3d-canvas';
        container.appendChild(canvas);
        
        // Scene setup
        const scene = new THREE.Scene();
        
        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            1,
            0.1,
            1000
        );
        camera.position.z = 5;
        
        // Renderer
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true
        });
        renderer.setSize(110, 110);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Create 3D object based on type
        const object = this.createObject(type);
        scene.add(object);
        
        // Lighting setup (realistic like S-Trade)
        this.setupLighting(scene);
        
        // Store references
        this.scenes[index] = scene;
        this.cameras[index] = camera;
        this.renderers[index] = renderer;
        this.objects[index] = object;
        
        // Animation loop
        this.animate(index);
        
        // Mouse interaction
        this.setupInteraction(container, index);
    }
    
    createObject(type) {
        const group = new THREE.Group();
        
        // Base geometry - rounded cube/icon
        const geometry = new THREE.BoxGeometry(2, 2, 0.4, 32, 32, 8);
        
        // Round the edges
        geometry.vertices.forEach(vertex => {
            const edgeFactor = 0.15;
            if (Math.abs(vertex.x) > 0.9 && Math.abs(vertex.y) > 0.9) {
                const angle = Math.atan2(vertex.y, vertex.x);
                const radius = 0.9;
                vertex.x = Math.cos(angle) * radius;
                vertex.y = Math.sin(angle) * radius;
            }
        });
        geometry.computeVertexNormals();
        
        // Realistic material (glass + metal)
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x00D4FF,
            metalness: 0.7,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 1.0,
            envMapIntensity: 1.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        
        // Add symbol/icon on top
        const symbol = this.createSymbol(type);
        if (symbol) {
            group.add(symbol);
        }
        
        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(2.2, 2.2, 0.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFF0,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        
        return group;
    }
    
    createSymbol(type) {
        const group = new THREE.Group();
        const material = new THREE.MeshPhongMaterial({
            color: 0x000000,
            shininess: 100
        });
        
        switch(type) {
            case 'layers':
                // Stacking Hub - 3 layers
                for (let i = 0; i < 3; i++) {
                    const geo = new THREE.BoxGeometry(1.2 - i * 0.2, 0.15, 0.1);
                    const layer = new THREE.Mesh(geo, material);
                    layer.position.y = -0.3 + i * 0.3;
                    layer.position.z = 0.25;
                    group.add(layer);
                }
                break;
                
            case 'briefcase':
                // Portfolio - briefcase
                const body = new THREE.BoxGeometry(1, 0.7, 0.1);
                const bodyMesh = new THREE.Mesh(body, material);
                bodyMesh.position.z = 0.25;
                group.add(bodyMesh);
                
                const handle = new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI);
                const handleMesh = new THREE.Mesh(handle, material);
                handleMesh.position.y = 0.5;
                handleMesh.position.z = 0.25;
                handleMesh.rotation.x = Math.PI;
                group.add(handleMesh);
                break;
                
            case 'chart':
                // History - chart bars
                for (let i = 0; i < 4; i++) {
                    const height = 0.3 + i * 0.2;
                    const bar = new THREE.BoxGeometry(0.15, height, 0.1);
                    const barMesh = new THREE.Mesh(bar, material);
                    barMesh.position.x = -0.4 + i * 0.27;
                    barMesh.position.y = -0.3 + height / 2;
                    barMesh.position.z = 0.25;
                    group.add(barMesh);
                }
                break;
                
            case 'check':
                // Governance - checkmark
                const check1 = new THREE.BoxGeometry(0.15, 0.5, 0.1);
                const checkMesh1 = new THREE.Mesh(check1, material);
                checkMesh1.position.set(-0.1, -0.1, 0.25);
                checkMesh1.rotation.z = Math.PI / 4;
                group.add(checkMesh1);
                
                const check2 = new THREE.BoxGeometry(0.15, 0.8, 0.1);
                const checkMesh2 = new THREE.Mesh(check2, material);
                checkMesh2.position.set(0.2, 0.1, 0.25);
                checkMesh2.rotation.z = -Math.PI / 4;
                group.add(checkMesh2);
                break;
                
            case 'search':
                // Explorers - magnifying glass
                const circle = new THREE.TorusGeometry(0.35, 0.08, 16, 32);
                const circleMesh = new THREE.Mesh(circle, material);
                circleMesh.position.z = 0.25;
                group.add(circleMesh);
                
                const handle2 = new THREE.BoxGeometry(0.1, 0.5, 0.1);
                const handleMesh2 = new THREE.Mesh(handle2, material);
                handleMesh2.position.set(0.35, -0.35, 0.25);
                handleMesh2.rotation.z = Math.PI / 4;
                group.add(handleMesh2);
                break;
        }
        
        return group;
    }
    
    setupLighting(scene) {
        // Ambient light (soft overall illumination)
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);
        
        // Main light (key light - top right)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(3, 4, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        scene.add(mainLight);
        
        // Fill light (softer, from left)
        const fillLight = new THREE.DirectionalLight(0x00D4FF, 0.5);
        fillLight.position.set(-3, 2, 3);
        scene.add(fillLight);
        
        // Back light (rim light)
        const backLight = new THREE.DirectionalLight(0x14b8a6, 0.6);
        backLight.position.set(0, -2, -3);
        scene.add(backLight);
        
        // Point light for glow
        const pointLight = new THREE.PointLight(0x00FFF0, 0.8, 10);
        pointLight.position.set(0, 0, 3);
        scene.add(pointLight);
    }
    
    animate(index) {
        const object = this.objects[index];
        const renderer = this.renderers[index];
        const scene = this.scenes[index];
        const camera = this.cameras[index];
        
        const render = () => {
            requestAnimationFrame(render);
            
            // Gentle rotation
            if (object) {
                object.rotation.y += 0.005;
                object.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
            }
            
            renderer.render(scene, camera);
        };
        
        render();
    }
    
    setupInteraction(container, index) {
        const tile = container.closest('.app-tile');
        if (!tile) return;
        
        const object = this.objects[index];
        let targetRotation = { x: 0, y: 0 };
        
        tile.addEventListener('mouseenter', () => {
            // Speed up rotation on hover
            gsap.to(object.rotation, {
                y: object.rotation.y + Math.PI / 4,
                duration: 0.6,
                ease: 'back.out(1.7)'
            });
            
            gsap.to(object.scale, {
                x: 1.1,
                y: 1.1,
                z: 1.1,
                duration: 0.6,
                ease: 'back.out(1.7)'
            });
        });
        
        tile.addEventListener('mouseleave', () => {
            gsap.to(object.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.6,
                ease: 'back.out(1.7)'
            });
        });
        
        tile.addEventListener('mousemove', (e) => {
            const rect = tile.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            gsap.to(object.rotation, {
                x: -y * 0.3,
                duration: 0.3
            });
        });
    }
}

// Initialize when Three.js is loaded
if (typeof THREE !== 'undefined') {
    window.threeDIcons = new ThreeDIcons();
} else {
    console.log('Waiting for Three.js to load...');
    window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') {
            window.threeDIcons = new ThreeDIcons();
        }
    });
}
