'use strict';

const LEFT_MOUSE_PRESSED = 1;
const RIGHT_MOUSE_PRESSED = 2;
const WHEEL_PRESSED = 4;
const WIDTH = 600;
const HEIGHT = 600;

class View {

    get domElement() {
        return this._domElement;
    }

    constructor(name, clickFenceCallback) {
        this._clickFenceCallback = clickFenceCallback;

        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize(WIDTH, HEIGHT);
        this._renderer.domElement.className = 'tree-js-canvas';        
        var container = document.querySelector('.tree-js-container');
        container.appendChild(this._renderer.domElement);
        console.log("cont", container);
        this._canvas = container.querySelector('.tree-js-canvas');
        console.log("_canvas", this._canvas);

        this._scene = new THREE.Scene();
        this._initScene(this._scene);
        this._coordinates(this._scene);

        this._camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 1, 500);
        this._initCamera(this._camera);

        this._mouse = new THREE.Vector2();
        this._cam = {
            angleRadian: Math.PI / 4 - 0.1,
            angleFi: Math.PI / 4 + 0.1,
            distance: 300,
            minDistance: 50,
            maxDistance: 1000,
        };

        this._raycaster = new THREE.Raycaster();
        this._INTERSECTED = null;
        this._userIsWhite = 0;
        this._currentBarrel = this._addUserBarrel(this, this._userIsWhite, this._scene);

        this._initRenderFrameFunction();
        this._initCanvas(this._domElement);
    }

    _coordinates(scene) {
        var size = 100;

        var material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(0, 0, 0));
        geometry.vertices.push(new THREE.Vector3(size, 0, 0));
        var line = new THREE.Line(geometry, material);
        scene.add(line);

        var material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(0, 0, 0));
        geometry.vertices.push(new THREE.Vector3(0, size, 0));
        var line = new THREE.Line(geometry, material);
        scene.add(line);

        var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(0, 0, 0));
        geometry.vertices.push(new THREE.Vector3(0, 0, size));
        var line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    _initScene(scene) {
        scene.position.y -= 20;

        var light1 = new THREE.PointLight(0xffffff, 0.5, 0, 2);
        light1.position.set(500, 500, 500);
        scene.add(light1);

        var light2 = new THREE.PointLight(0xffffff, 0.5, 0, 2);
        light2.position.set(-500, 500, 500);
        scene.add(light2);

        var light2 = new THREE.PointLight(0xffffff, 0.5, 0, 2);
        light2.position.set(-500, 500, -500);
        scene.add(light2);

        var light2 = new THREE.PointLight(0xffffff, 0.5, 0, 2);
        light2.position.set(500, 500, -500);
        scene.add(light2);

        this._bottom(scene);
        this._fence(scene);
    }

    _bottom(scene) {
        var geometry = new THREE.CylinderGeometry(72, 72, 20, 200);
        var material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        var cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.x = 0;
        cylinder.position.z = 0;
        scene.add(cylinder);
    }

    _fence(scene) {
        var diameter = 3;
        var height = 85;
        var centX = 0;
        var centY = 0;
        var step = 28;

        var geometry = new THREE.CylinderGeometry(diameter, diameter, height, 100);

        var startX = centX - 1.5 * step;
        var startY = centY - 1.5 * step;

        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                var material = new THREE.MeshLambertMaterial({ color: 0xA2B72C });
                let cylinder = new THREE.Mesh(geometry, material);
                cylinder.position.x = startX + i * step;
                cylinder.position.z = startY + j * step;
                cylinder.position.y = height / 2 + 10;
                cylinder.userData = {
                    type: "fence",
                    id: i * 4 + j,
                    i: i,
                    j: j,
                    x: cylinder.position.x,
                    z: cylinder.position.z,
                    count: 0
                }
                scene.add(cylinder);
            }
        }
    }

    _initCamera(camera) {
        camera.position.set(200, 200, 200);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    _initRenderFrameFunction() {
        let camera = this._camera;
        let cam = this._cam;
        let scene = this._scene;
        let renderer = this._renderer;
        let self = this;

        var renderFunction = function renderFrame() {
            requestAnimationFrame(renderFrame);

            camera.position.x = cam.distance * Math.sin(cam.angleFi) * Math.sin(cam.angleRadian);
            camera.position.y = cam.distance * Math.cos(cam.angleFi);
            camera.position.z = cam.distance * Math.sin(cam.angleFi) * Math.cos(cam.angleRadian);
            camera.lookAt(new THREE.Vector3(0, 0, 0));
            
            self._raycaster.setFromCamera(self._mouse, self._camera);
            var intersects = self._raycaster.intersectObjects(self._scene.children);
            if (intersects.length > 0) {
                if ((self._INTERSECTED != intersects[0].object)) {
                    self._INTERSECTED = intersects[0].object;
                    if (self._INTERSECTED.userData && self._INTERSECTED.userData.type == "fence") {
                        self._currentBarrel.position.x = self._INTERSECTED.userData.x;
                        self._currentBarrel.position.z = self._INTERSECTED.userData.z;
                    }
                }
            } else {
                if (self._INTERSECTED && (typeof self._INTERSECTED.material.emissive != 'undefined'))
                    self._INTERSECTED.material.emissive.setHex(self._INTERSECTED.currentHex);
                self._INTERSECTED = null;
            }
            renderer.render(scene, self._camera);            
        }

        renderFunction();
    }

    _initCanvas() {
        this._renderer.render(this._scene, this._camera);
        this._initCameraMovement();
        this._initWheelScale();
        this._initFenceClickEvent();
    }

    _initCameraMovement() {
        var mouse = this._mouse;
        var cam = this._cam;

        var onMouseMove = function (event) {
            
            mouse.x = (event.clientX / WIDTH) * 2 - 1;
            mouse.y = -(event.clientY / HEIGHT) * 2 + 1;

            if (event.buttons & LEFT_MOUSE_PRESSED) {
                cam.angleRadian = (cam.angleRadian - event.movementX / WIDTH * 8);
                cam.angleFi = Math.max(0.0000001, cam.angleFi - event.movementY / HEIGHT * 4);
                cam.angleFi = Math.min(cam.angleFi, Math.PI - 0.000001);
            }
            event.stopPropagation();
        }
        this._canvas.addEventListener('mousemove', onMouseMove, false);
    }

    _initWheelScale() {
        var cam = this._cam;
    
        var onMouseWheel = function (event) {
            cam.distance = Math.max(cam.minDistance, cam.distance + event.deltaY / HEIGHT * 50);
            cam.distance = Math.min(cam.distance, cam.maxDistance);
            event.stopPropagation();
        }
        this._canvas.addEventListener('wheel', onMouseWheel, false);
    }

    _initFenceClickEvent() {
        var self = this;
        var mouseDownTimestamp = 0;

        var onMouseDown = function (event) {
            mouseDownTimestamp = event.timeStamp;
        }
        this._canvas.addEventListener('mousedown', onMouseDown, false);

        var onMouseClick = function (event) {
            var clickTimeMs = event.timeStamp - mouseDownTimestamp;
            if (self._INTERSECTED && self._INTERSECTED.userData && self._INTERSECTED.userData.type == "fence"
                && clickTimeMs < 300) {                
                //self.this._clickFenceCallback(i, j);
                if (self._INTERSECTED.userData.count < 4) {
                    self._currentBarrel.position.y = 20 + 20 * self._INTERSECTED.userData.count;
                    self._INTERSECTED.userData.count++;
                    self._userIsWhite = (self._userIsWhite + 1) % 2;

                    self._currentBarrel = self._addUserBarrel(self, self._userIsWhite, self._scene);
                    self._currentBarrel.position.x = self._INTERSECTED.userData.x;
                    self._currentBarrel.position.z = self._INTERSECTED.userData.z;
                }
            }
            event.stopPropagation();
        }
        this._canvas.addEventListener('click', onMouseClick, false);
    }

    _addUserBarrel(self, isWhite, scene) {
        var barrel = self._createBarrel(isWhite);
        barrel.position.y = 110;
        scene.add(barrel);
        return barrel;
    }

    _createBarrel(isWhite) {
        var material = new THREE.MeshLambertMaterial(isWhite ? { color: 0xffff00 } : { color: 0x6B3A19 });
        var singleGeometry = new THREE.Geometry();

        var points = [];
        for (var i = -10; i <= 10; i++) {
            points.push(new THREE.Vector2(Math.sin(i * 0.09 - Math.PI / 2) * 10, i));
        }
        var geometry = new THREE.LatheGeometry(points, 60);
        var mesh = new THREE.Mesh(geometry, material);
        singleGeometry.merge(mesh.geometry, mesh.matrix);

        points = [];
        points.push(new THREE.Vector2(4, 1));
        points.push(new THREE.Vector2(4 + 2.216, 1));
        var geometry1 = new THREE.LatheGeometry(points, 60);
        var up = new THREE.Mesh(geometry1, material);
        up.position.y = 11;
        up.rotateX(Math.PI);
        up.updateMatrix();
        singleGeometry.merge(up.geometry, up.matrix);

        var down = new THREE.Mesh(geometry1, material);
        down.position.y = -11;
        down.updateMatrix();
        singleGeometry.merge(down.geometry, down.matrix);


        points = [];
        points.push(new THREE.Vector2(4, 10));
        points.push(new THREE.Vector2(4, -10));
        var geometry = new THREE.LatheGeometry(points, 60);
        var cylMesh = new THREE.Mesh(geometry, material);
        singleGeometry.merge(cylMesh.geometry, cylMesh.matrix);

        return new THREE.Mesh(singleGeometry, material);
    }



}
