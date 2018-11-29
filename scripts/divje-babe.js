let DEBUG = false;

// Gamification variables
let maxBodyStatus = 100;
let health = 0;
let sprint = 0;
let sprintChargingEnabled = true;
let healthbar;
let sprintbar;
let healthbarBcg;
let distanceTravelled;
let distanceSprinted;
let protagonist;
let volume = 1;
let lastHowled;

// HTMLCollections containing HTML audio
let footsteps;
let dead;
let ouch;
let growl;
let howl;
let hit;
let swoosh;
let oogachaka;

// Global variable definitionvar canvas;
let canvas;
let gl;
let shaderProgram;

// Model-view and projection matrix and model-view matrix stack
let mvMatrixStack = [];
let mvMatrix = mat4.create();
const pMatrix = mat4.create();

// Variables for storing textures
let wallTexture;
let enemyTexture;
let torchTexture;
let flameTexture;

// Variable that stores  loading state of textures.
let texturesLoaded = 0;
let numOfTextures = 4;

// Keyboard handling helper variable for reading the status of keys
const currentlyPressedKeys = {};

// Mouse helper variables
let mouseDown = false;
let lastMouseX = null;
let lastMouseY = null;
const mouseSensitivity = 0.3;

// Variables for storing current position and currentSpeed
let pitch;
let pitchRate = 0;
let yaw = 0;
let yawRate = 0;
let xPosition;
let yPosition;
let zPosition;
let moveForward = 0;
let moveLeft = 0;
let elapsed;

// Speed
let walkingSpeed = 0.0025;
let sprintingSpeed = 0.0035;
let currentSpeed = walkingSpeed;

// Used to makes us "jo" left and right as we change foot
let joggingAdjust = 0;
let joggingPhase;

//Used for acceleration and gravity;
let verticalVelocity = 0;

// how high is our protagonist aka. on what default yPosition is our first person camera?
let protagonistHeight = 0.4;
let protagonistWidth = 0.2;

// HARDCODED
// Where are the limits of our world
const xMin = -5.0;
const zMin = -5.0;
const xMax = 5.0;
const zMax = 5.0;
const yMin = -1.0;
const yMax = 1.0;


// on what Y position are protagonist's feet
let protagonistYPosition = 0.0;
yPosition = protagonistYPosition + protagonistHeight;

// Used to make us "jog" up and down as we move forward.
let joggingAngle = 0;

// Helper variable for animation
let lastTime = 0;
let useTextures = true;

// Pause menu state variable
let paused = false;

// world objects
let objects = [];
let torchObject;
let torchWeapon;
let lightObject;
let worldObject;

//enemies
let enemy; // "good" variable name

//light
let xLight;
let yLight;
let zLight;

// attacking

let torchAttack = 0;

/*
dx, dy, dz = what is the relative position of the weapon to the protagonist?
 */
function Weapon(deltaX, deltaY, deltaZ) {
    this.dx = deltaX;
    this.dy = deltaY;
    this.dz = deltaZ;
    this.swingPitch = 0;
    this.damage = 50;
    this.dzSwing = 0;
}

function Enemy() {
    this.object = new Object2(1 / 8, 1 / 8, 1 / 8, 2, yMin, 2, enemyTexture, 8);
    this.life = 100;
    this.alive = true;
}

Enemy.prototype.inflictDamage = function (damage) {
    this.life -= damage;
    if (this.life < 0) {
        this.alive = false;
        console.log("enemy ded");
    }
}

let readDTO = {
    vertexPositions: [],
    vertexTextureCoords: [],
    vertexNormals: [],
    vertexCount: -1
};

function Object2(scaleX, scaleY, scaleZ, xPosition, yPosition, zPosition, texture, textureScale) {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.scaleZ = scaleZ;
    this.textureScale = textureScale;
    this.width = scaleX;
    this.height = scaleY;
    this.texture = texture;
    this.yaw = 0;
    this.pitch = 0;
    this.verticalVelocity = 0;

    this.vertexPositions = [];
    this.vertexTextureCoords = [];
    this.vertexNormals = [];

    this.vertexPositionBuffer = null;
    this.vertexNormalBuffer = null;
    this.vertexTextureCoordBuffer = null;

    // center of the object coordinates
    this.xPosition = xPosition;
    this.yPosition = yPosition + scaleY;
    this.zPosition = zPosition;

    // used for collision detection with the protagonist
    this.intersectsProt = [false, false, false, false, false, false];
    this.lastIntersectProt = -1;

    // used for collision detection with the enemy
    this.intersectsEnemy = [false, false, false, false, false, false];
    this.lastIntersectEnemy = -1;
}

Object2.prototype.jump = function () {
    if (this.verticalVelocity === 0) {
        this.verticalVelocity = 0.3;
    }
}
Object2.prototype.handleLoadedObject = function (normalDirection) {

    for (let i = 0; i < readDTO.vertexPositions.length; i++) {
        if (i % 3 === 0)
            this.vertexPositions.push(readDTO.vertexPositions[i] * this.scaleX);
        else if (i % 3 === 1)
            this.vertexPositions.push(readDTO.vertexPositions[i] * this.scaleY);
        else if (i % 3 === 2)
            this.vertexPositions.push(readDTO.vertexPositions[i] * this.scaleZ);
        else
            console.log("Error initialising object");
    }

    // fix needed : not correct scaling
    for (let i = 0; i < readDTO.vertexTextureCoords.length; i++) {
        if (i % 2 === 0)
            this.vertexTextureCoords.push(readDTO.vertexTextureCoords[i] * this.scaleX * this.textureScale);
        else if (i % 2 === 1)
            this.vertexTextureCoords.push(readDTO.vertexTextureCoords[i] * this.scaleX * this.textureScale);
        else
            console.log("Error initialising object");
    }
    this.vertexNormals = readDTO.vertexNormals.map(function (element) {
        return element * normalDirection;
    });

    this.vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexPositions), gl.STATIC_DRAW);
    this.vertexPositionBuffer.itemSize = 3;
    this.vertexPositionBuffer.numItems = readDTO.vertexCount;

    this.vertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexTextureCoords), gl.STATIC_DRAW);
    this.vertexTextureCoordBuffer.itemSize = 2;
    this.vertexTextureCoordBuffer.numItems = readDTO.vertexCount;

    this.vertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexNormals), gl.STATIC_DRAW);
    this.vertexNormalBuffer.itemSize = 3;
    this.vertexNormalBuffer.numItems = readDTO.vertexCount;

};

Object2.prototype.loadObject = function (pathToFile) {

    const request = new XMLHttpRequest();
    request.open("GET", pathToFile);
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            handleLoadedObjectData(request.responseText);
        }
    };
    request.send();
};

function handleLoadedObjectData(data) {

    const lines = data.split("\n");

    readDTO.vertexCount = 0;
    readDTO.vertexPositions = [];
    readDTO.vertexTextureCoords = [];
    readDTO.vertexNormals = [];

    for (const i in lines) {
        // noinspection JSUnfilteredForInLoop
        const vals = lines[i].replace(/^\s+/, "").split(/\s+/);
        if (vals.length === 8 && vals[0] !== "//") {
            // It is a line describing a vertex; get X, Y and Z first
            readDTO.vertexPositions.push(parseFloat(vals[0]));
            readDTO.vertexPositions.push(parseFloat(vals[1]));
            readDTO.vertexPositions.push(parseFloat(vals[2]));

            // And then the texture coords
            readDTO.vertexTextureCoords.push(parseFloat(vals[3]));
            readDTO.vertexTextureCoords.push(parseFloat(vals[4]));

            // And the normals
            readDTO.vertexNormals.push(parseFloat(vals[5]));
            readDTO.vertexNormals.push(parseFloat(vals[6]));
            readDTO.vertexNormals.push(parseFloat(vals[7]));

            readDTO.vertexCount += 1;
        }
    }

    worldObject.handleLoadedObject(-1);

    for (let i = 0; i < objects.length; i++) {
        objects[i].handleLoadedObject(1);
    }
    enemy.object.handleLoadedObject(1);
    torchObject.handleLoadedObject(1);
    lightObject.handleLoadedObject(1);


    document.getElementById("loadingtext").textContent = "";
}

Object2.prototype.draw = function () {
    mvPushMatrix();

    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

    mat4.translate(mvMatrix, [this.xPosition, this.yPosition, this.zPosition]);

    mat4.rotate(mvMatrix, degToRad(this.yaw), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(this.pitch), [1, 0, 0]);


    // <FIX> (vertex shader isn't working properly)
    let matrix = [];
    mat4.identity(matrix);
    mat4.rotate(matrix, degToRad(this.yaw), [0, 1, 0]);
    mat4.rotate(matrix, degToRad(this.pitch), [1, 0, 0]);

    let vektor = [xLight - this.xPosition, yLight - this.yPosition, zLight - this.zPosition, 1];
    vektor = matrikaKratVektor(vektor, matrix, vektor);

    gl.uniform3f(shaderProgram.pointLightingLocationUniform, vektor[0], vektor[1], vektor[2]);
    // </FIX>

    // Activate textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world by binding the array buffer to the world's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the normals attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world.
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexPositionBuffer.numItems);

    mvPopMatrix();
};

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//

// noinspection JSUnusedGlobalSymbols
function mvPushMatrix() {
    const copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

// noinspection JSUnusedGlobalSymbols
function mvPopMatrix() {
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function radToDeg(rads) {
    return rads * 180 / Math.PI;
}

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL() {
    let gl = null;
    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}

function initGame() {
    protagonist = true;
    protagonistHeight = 0.4;
    xPosition = -4;
    yPosition = protagonistHeight;
    zPosition = -4;
    moveForward = 0;
    pitch = 0;
    pitchRate = 0;
    yaw = -90;
    joggingPhase = 1;
    distanceTravelled = 0;
    distanceSprinted = 0;
    lastHowled = 0;
    paused = false;

    updateHealth(maxBodyStatus);
    showStats(false);
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
    let shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.
    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.
    let shaderSource = "";
    let currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType === 3) {
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.
    let shader;
    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object
    gl.shaderSource(shader, shaderSource);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
    const fragmentShader = getShader(gl, "per-fragment-lighting-fs");
    const vertexShader = getShader(gl, "per-fragment-lighting-vs");

    // Create the shader program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    // start using shading program for rendering
    gl.useProgram(shaderProgram);

    // store location of aVertexPosition variable defined in shader
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

    // turn on vertex position attribute at specified position
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // store location of aVertexNormal variable defined in shader
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

    // store location of aTextureCoord variable defined in shader
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    // store location of vertex normals variable defined in shader
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");

    // turn on vertex normals attribute at specified position
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    // store location of uPMatrix variable defined in shader - projection matrix
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    // store location of uMVMatrix variable defined in shader - model-view matrix
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    // store location of uNMatrix variable defined in shader - normal matrix
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    // store location of uSampler variable defined in shader
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
    // store location of uUseLighting variable defined in shader
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    // store location of uAmbientColor variable defined in shader
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    // store location of uLightingDirection variable defined in shader
    shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
    // store location of uDirectionalColor variable defined in shader
    shaderProgram.pointLightingColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingColor");
    // emissive color for some material (torch)
    shaderProgram.materialEmissiveColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialEmissiveColor");
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    const normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures(texturePath) {
    let texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function () {
        handleTextureLoaded(texture)
    };
    texture.image.src = texturePath;

    return texture;
}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture usus Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    // suggested either MIRRORED_REPEAT or REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);

    // when texture loading is finished we can draw scene.
    texturesLoaded += 1;
}
//
// drawScene
//
// Draw the scene.
//
function drawScene() {
    // set the rendering environment to full canvas size
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    // If buffers are empty we stop loading the application.
    if (worldObject.vertexTextureCoordBuffer == null || worldObject.vertexPositionBuffer == null) {
        return;
    }


    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    //lighting
    gl.uniform1i(shaderProgram.useLightingUniform, true);
    gl.uniform3f(shaderProgram.ambientColorUniform, 0.1, 0.07, 0.03);
    gl.uniform3f(shaderProgram.pointLightingLocationUniform, xLight, yLight, zLight);
    gl.uniform3f(shaderProgram.pointLightingColorUniform, 1.0, 0.7, 0.3);
    gl.uniform1i(shaderProgram.useTexturesUniform, useTextures);

    gl.uniform3f(shaderProgram.materialEmissiveColorUniform, 0.0, 0.0, 0.0);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);

    // Now move the drawing position a bit to where we want to start
    // drawing the world.

    for (let i = 0; i < objects.length; i++) {
        objects[i].draw();
    }
    worldObject.draw();
    enemy.object.draw();

    gl.uniform3f(shaderProgram.materialEmissiveColorUniform, 0.2, 0.2, 0.2);
    torchObject.draw();

    gl.uniform3f(shaderProgram.materialEmissiveColorUniform, 1.0, 1.0, 1.0);
    lightObject.draw();
}

//
// animate
//
// Called every time before redrawing the screen.
//

function initObjects() {

    worldObject = new Object2(5, 5, 5, 0, yMin, 0, wallTexture, 1);
    //enemy = new Object2(1 / 8, 1 / 8, 1 / 8, 2, yMin, 2, enemyTexture, 8);
    torchObject = new Object2(1 / 96, 1 / 6, 1 / 96, 1, yMin, 1, wallTexture, 1);
    lightObject = new Object2(1 / 96, 1 / 96, 1 / 96, 2, yMin, 2, flameTexture, 96);

    let numObjects = 6;
    for (let i = 0; i < numObjects; i++) {
        // Create new object and push it to the objects array...
        objects.push(new Object2(1 / 4, 1 / 4, 1 / 4, i - 3, yMin, -3, wallTexture, 1));
    }

    objects.push(new Object2(5, 1, 5, 0, 1, 0, wallTexture, 1));

    objects[0].loadObject("./assets/cube.txt");
    objects[numObjects - 1].yaw = 90;

    torchWeapon = new Weapon(0.08, -0.2, -0.18); //-0.18 is stable
    enemy = new Enemy();
}

function animate() {
    const timeNow = new Date().getTime();
    elapsed = 0;

    if (lastTime !== 0) {

        if (!paused)
            elapsed = timeNow - lastTime;

        /* show FPS
        if (elapsed > 0) {
            console.log(Math.floor(1000 / elapsed) + " FPS");
        }
        */
        const temp = Math.sin(degToRad(joggingAngle));

        if (moveForward !== 0 || moveLeft !== 0) {

            xPosition -= Math.sin(degToRad(yaw)) * moveForward * currentSpeed * elapsed - Math.sin(degToRad(yaw - 90)) * moveLeft * walkingSpeed * 0.7 * elapsed - Math.sin(degToRad(yaw - 90)) * moveForward * currentSpeed * elapsed * joggingAdjust;
            zPosition -= Math.cos(degToRad(yaw)) * moveForward * currentSpeed * elapsed - Math.cos(degToRad(yaw - 90)) * moveLeft * walkingSpeed * 0.7 * elapsed - Math.cos(degToRad(yaw - 90)) * moveForward * currentSpeed * elapsed * joggingAdjust;

            joggingAngle += elapsed * 0.5 * currentSpeed / walkingSpeed; // 0.5 "fiddle factor" - makes it feel more realistic :-)
            //temp = Math.sin(degToRad(joggingAngle));

            if (joggingPhase * temp < 0) {
                // the sin would get negative at this point, we detect it to make new step
                joggingPhase = joggingPhase * (-1);
                distanceTravelled++;

                playSoundFootstep(joggingPhase);

                if ((currentSpeed === sprintingSpeed) && sprint) {
                    distanceSprinted++;
                    updateSprint(-8);
                }
            }

            joggingAdjust = temp / 8;
        }
        yPosition = joggingPhase * temp / 14 + protagonistHeight + protagonistYPosition;
        if (currentSpeed !== sprintingSpeed)
            updateSprint((sprintingSpeed - currentSpeed * (moveForward !== 0 || moveLeft !== 0)) * 30);

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;

        //limit the pitch to the front 180 degrees
        if (pitch > 90) {
            pitch = 90;
            pitchRate = 0;
        }
        if (pitch < -90) {
            pitch = -90;
            pitchRate = 0;
        }

    }
    handleGravity(elapsed);
    handleCollisionDetectionWorldBorderProt();
    handleCollisionDetectionWorldBorderEnemy(enemy.object);

    if (enemy.alive) {
        handleCollisionDetectionEnemy(enemy, -12.5, elapsed);
    }

    for (let i = 0; i < objects.length; i++) {
        handleCollisionDetectionObjectProt(objects[i]);
        handleCollisionDetectionObjectEnemy(objects[i], enemy.object)
    }
    lastTime = timeNow;

    // weapons

    // swinging with torch (attacking)
    if (torchAttack !== 0) {
        torchSwing(elapsed);
    }

    // rotacija polozaja centra bakle
    torchObject.yaw = yaw;
    torchObject.pitch = 5 + pitch + torchWeapon.swingPitch; // 5 is base bitch

    let matrix = [];
    mat4.identity(matrix);
    mat4.rotate(matrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(matrix, degToRad(-yaw), [0, 1, 0]);

    let vektor = [torchWeapon.dx, torchWeapon.dy, torchWeapon.dz + torchWeapon.dzSwing, 1];
    vektor = matrikaKratVektor(vektor, matrix, vektor);

    torchObject.xPosition = xPosition + vektor[0];
    torchObject.yPosition = yPosition + vektor[1];
    torchObject.zPosition = zPosition + vektor[2];

    vektor = [0, torchObject.height + torchObject.width, 0, 1];
    mat4.identity(matrix);
    mat4.rotate(matrix, degToRad(-torchObject.pitch), [1, 0, 0]);
    mat4.rotate(matrix, degToRad(-torchObject.yaw), [0, 1, 0]);
    vektor = matrikaKratVektor(vektor, matrix, vektor);

    xLight = torchObject.xPosition + vektor[0];
    yLight = torchObject.yPosition + vektor[1];
    zLight = torchObject.zPosition + vektor[2];

    lightObject.xPosition = xLight;
    lightObject.yPosition = yLight;
    lightObject.zPosition = zLight;

    lightObject.yaw = torchObject.yaw;
    lightObject.pitch = torchObject.pitch;
}


//
// Keyboard handling helper functions
//
// handleKeyDown    ... called on keyDown event
// handleKeyUp      ... called on keyUp event
//
function handleKeyDown(event) {
    // storing the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    // reseting the pressed state for individual key
    currentlyPressedKeys[event.keyCode] = false;

    // events on single keypress
    if (event.keyCode === 27 && health) // Esc
        pausedToogle();

    if (event.keyCode === 82) { // R
        initGame();
        playSound(oogachaka[1]);
    }

    if (event.keyCode === 84) // T
        useTextures = !useTextures;

    if (event.keyCode === 107 && volume < 0.91) { // + key
        volume += 0.1;
        console.info("Volume is now " + volume);
    }

    if (event.keyCode === 109 && volume > 0.01) { // - key
        volume -= 0.1;
        console.info("Volume is now " + volume);
    }
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
    if (currentlyPressedKeys[16]) {
        // Shift
        sprintChargingEnabled = false;
        currentSpeed = sprint ? sprintingSpeed : walkingSpeed;
    } else {
        sprintChargingEnabled = true;
        currentSpeed = walkingSpeed;
    }

    if (currentlyPressedKeys[32] && verticalVelocity === 0.0) {
        // space
        verticalVelocity = 0.4;
        playSound(oogachaka[0]);
    }

    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
        // Left cursor key or A
        moveLeft = 1;
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // Right cursor key or D
        moveLeft = -1;
    } else {
        moveLeft = 0;
    }

    if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
        // Up cursor key or W
        moveForward = 1;
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
        // Down cursor key
        moveForward = -1;
    } else {
        moveForward = 0;
    }

}

function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    if (torchAttack === 0) {
        torchAttack = 1;
    }
}

function handleMouseUp() {
    mouseDown = false;
}

//
// handleMouse
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleMouseMove(event) {
    const newX = event.clientX;
    const newY = event.clientY;

    const deltaX = newX - lastMouseX;
    const deltaY = newY - lastMouseY;

    if (!paused) {
        pitch -= deltaY * mouseSensitivity;
        yaw -= deltaX * mouseSensitivity;
    }

    lastMouseX = newX;
    lastMouseY = newY;
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start(debug = false) {
    DEBUG = debug;
    console.log("Game started" + (DEBUG ? " in debugging mode." : "."));
    canvas = document.getElementById("glcanvas");
    footsteps = document.getElementsByClassName("footsteps") || null;
    dead = document.getElementsByClassName("dead") || null;
    ouch = document.getElementsByClassName("ouch") || null;
    growl = document.getElementsByClassName("growl") || null;
    howl = document.getElementsByClassName("howl") || null;
    swoosh = document.getElementsByClassName("swoosh") || null;
    hit = document.getElementsByClassName("hit") || null;
    oogachaka = document.getElementsByClassName("oogachaka") || null;

    healthbar = document.getElementById("health") || null;
    sprintbar = document.getElementById("sprint") || null;
    healthbarBcg = healthbar.style.backgroundColor;
    initGame();
    setCanvasSize();
    if (!DEBUG) intro();
    gl = initGL();      // Initialize the GL context

    // Only continue if WebGL is available and working
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
        gl.clearDepth(1.0);                                     // Clear everything
        gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
        gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

        // Initialize the shaders; this is where all the lighting for the
        // vertices and so forth is established.
        initShaders();

        // Next, load and set up the textures we'll be using.
        wallTexture = initTextures("./assets/dirtwall.jpg");
        enemyTexture = initTextures("./assets/evil_face.jpg");
        torchTexture = initTextures("./assets/crate.gif");
        flameTexture = initTextures("./assets/flame.jpg");

        // Initialise world objects
        //loadWorld();

        initObjects();

        // Bind keyboard handling functions to document handlers
        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        canvas.onmousedown = handleMouseDown;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;

        // Set up to draw the scene periodically.
        setInterval(function () {
            if (texturesLoaded === numOfTextures) { // only draw scene and animate when textures are loaded.
                if (!paused && health) {
                    handleKeys();
                }
                requestAnimationFrame(animate);
                drawScene();

            }
        }, 15);
    }
}

window.onresize = setCanvasSize;

function torchSwing(elapsed) {
    torchWeapon.swingPitch -= torchAttack * elapsed * 0.5;
    torchWeapon.dzSwing -= torchAttack * elapsed * 0.002;
    playSound(swoosh);

    // we change the direction of swing
    if (torchWeapon.swingPitch < -90) {
        torchAttack = -1;
    }

    // end of swing
    if (torchAttack === -1 && torchWeapon.swingPitch > 0) {
        torchAttack = 0;
        torchWeapon.dzSwing = 0;
        torchWeapon.swingPitch = 0;
    }
}

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initGL();
}

function pausedToogle() {
    if (paused) {
        paused = false;
        showStats(false);
        console.info("Game resumed.");
    } else {
        paused = true;
        showStats(true, "Game paused");
        console.info("Game paused.");
    }
}

function playSoundFootstep(phase) {

    if (!footsteps || !protagonist || verticalVelocity > 0)
        return false;

    if (phase < 0)
        playSound(footsteps[0]);
    else
        playSound(footsteps[footsteps.length - 1]);
}

function handleGravity(elapsedTime) {

    verticalVelocity -= elapsedTime * 0.001;   // from milliseconds to seconds
    protagonistYPosition += elapsedTime * 0.012 * verticalVelocity;   // fiddle factor

    enemy.object.verticalVelocity -= elapsedTime * 0.001;   // from milliseconds to seconds
    enemy.object.yPosition += elapsedTime * 0.012 * enemy.object.verticalVelocity;   // fiddle factor
}

function handleDeath() {
    if (!protagonist)
        return;

    console.info("Game ended.");
    protagonistHeight = 0.2;
    pitchRate = 0.02;
    joggingPhase = 0;
    moveForward = -0.2;
    playSound(dead);
    setTimeout(function () {
        moveForward = 0;
    }, 1500);
    showStats(true, "Wasted", true);
    protagonist = false;
}

function updateHealth(change) {
    let newHealth = health + change;

    if (newHealth > maxBodyStatus)
        newHealth = maxBodyStatus;

    if (newHealth < 0)
        newHealth = 0;

    if (change < 0) {
        playSound(ouch);
        console.info("Ouch " + (-change) + " times! Health is now " + newHealth);
        healthbar.style.background = "rgba(203, 23, 35, 0.6)";
        sprintbar.style.background = "rgba(203, 23, 35, 0.4)";
        healthbar.style.width = newHealth + '%';

        setTimeout(function () {
            updateSprint(change);
            sprintbar.style.background = healthbarBcg;
            healthbar.style.background = healthbarBcg;
        }, 500);

    } else {
        console.info("Healthier " + change + " times! Health is now " + newHealth);
        healthbar.style.background = "rgba(35, 117, 203, 0.6)";
        sprintbar.style.background = "rgba(35, 117, 203, 0.4)";
        healthbar.style.width = newHealth + '%';

        setTimeout(function () {
            updateSprint(change);
            healthbar.style.background = healthbarBcg;
            sprintbar.style.background = healthbarBcg;
        }, 500);
    }

    health = newHealth;

    if (health <= 0) {
        handleDeath();
    }
    return health;
}

function updateSprint(change) {
    if (!sprintChargingEnabled && change > 0) {
        return sprint;
    }

    let newSprint = sprint + change;

    if (newSprint > health)
        newSprint = health;

    if (newSprint < 0)
        newSprint = 0;

    sprintbar.style.width = newSprint + '%';
    sprint = newSprint;

    return sprint;
}

function showStats(show = true, title = "", fade = false) {
    let menu = document.getElementById("menu");
    if (show) {
        if (fade)
            menu.classList.add("fade");

        menu.style.display = "inherit";
        document.getElementById("title").innerText = title;
        document.getElementById("stats").style.display = "inline";
        document.getElementById("distanceTravelled").innerText = distanceTravelled + " steps";
        document.getElementById("distanceSprinted").innerText = distanceSprinted + " steps";
        document.getElementById("hitsWall").innerText = " To be announced";
        document.getElementById("eventsSurvived").innerText = " To be announced";

        setTimeout(function () {
            menu.classList.remove("fade");
        }, 1500);
    } else {
        menu.style.display = "none";
    }
}

function playSound(sound, forced = false, sequential = true) {
    if (!paused || forced) {
        if (HTMLCollection.prototype.isPrototypeOf(sound))
            sound = [...sound]; // Covert from HTMLCollection to array

        if (Array.prototype.isPrototypeOf(sound)) {
            if (!sequential) {
                for (let s in sound)
                    playSound(sound[s], forced, sequential);
            }
            else if (sound[0])
                sound[0].onended = function () { //Play first array element and call recursion for others
                    sound.shift();
                    playSound(sound, forced, sequential);
                };
            playSound(sound[0], forced, sequential);
        }

        else if (sound) {
            sound.volume = volume;
            sound.play();
        }

        return true;
    }
}

/*
This function ensures that we don't fall out of the playable world
 */
function handleCollisionDetectionWorldBorderProt() {
    if (protagonistYPosition < yMin) {
        verticalVelocity = 0.0;
        protagonistYPosition = yMin;
    }
    else if (protagonistYPosition + protagonistHeight + protagonistWidth + 0.02 > yMax) {  // fiddle factor
        verticalVelocity = 0.0;
        protagonistYPosition = yMax - protagonistWidth - protagonistHeight - 0.02;
    }
    if (xPosition + protagonistWidth > xMax) {
        xPosition = xMax - protagonistWidth;
    }
    else if (xPosition - protagonistWidth < xMin) {
        xPosition = xMin + protagonistWidth;
    }
    if (zPosition + protagonistWidth > zMax) {
        zPosition = zMax - protagonistWidth;
    }
    else if (zPosition - protagonistWidth < zMin) {
        zPosition = zMin + protagonistWidth;
    }

    if ((xLight + torchObject.width > xMax) ||
        (xLight - torchObject.width < xMin) ||
        (yLight + torchObject.width > yMax) ||
        (yLight - torchObject.width < yMin) ||
        (zLight + torchObject.width > zMax) ||
        (zLight - torchObject.width < zMin)) {

        if (torchAttack === 1) {
            torchAttack = -1;
            playSound(hit[0]);
        }
    }
}

function handleCollisionDetectionWorldBorderEnemy(enemy) {
    if (enemy.yPosition - enemy.height < yMin) {
        enemy.verticalVelocity = 0.0;
        enemy.yPosition = yMin + enemy.height;
    }
    // uncomment if needed
    /*
    else if (enemy.yPosition + enemy.height > yMax) {
        verticalVelocity = 0.0;
        enemy.yPosition = yMax - enemy.height;
    }
    if (enemy.xPosition + enemy.width > xMax) {
        enemy.xPosition = xMax - enemy.width;
    }
    else if (enemy.xPosition - enemy.width < xMin) {
        enemy.xPosition = xMin + enemy.width;
    }
    if (enemy.zPosition + enemy.width > zMax) {
        enemy.zPosition = zMax - enemy.width;
    }
    else if (enemy.zPosition - enemy.width < zMin) {
        enemy.zPosition = zMin + enemy.width;
    }
    */
}

/*
intersectsEnemy[i]:
i = 0 ... person is left from object on scale X (left means more negative on the scale)
i = 1 ... person is right from object on scale X (right means more positive on the scale)
i = 2 ... person is left from object on scale Y
i = 3 ... person is right from object on scale Y
i = 4 ... person is left from object on scale Z
i = 5 ... person is right from object on scale Z

lastIntersectEnemy: remembers which intersect did we detect the last, so that the person "bounces" the right way (on either of X, Y, Z in either -1 or 1)
 */
function handleCollisionDetectionObjectProt(rock) {

    if (xPosition + protagonistWidth > rock.xPosition - rock.width) {
        if (!rock.intersectsProt[0]) {
            rock.lastIntersectProt = 0;
            rock.intersectsProt[0] = true;
        }
    } else {
        rock.intersectsProt[0] = false;
    }
    if (xPosition - protagonistWidth < rock.xPosition + rock.width) {
        if (!rock.intersectsProt[1]) {
            rock.lastIntersectProt = 1;
            rock.intersectsProt[1] = true;
        }
    } else {
        rock.intersectsProt[1] = false;
    }

    // fix needed perhaps
    if (protagonistYPosition + protagonistHeight > rock.yPosition - rock.height) {
        if (!rock.intersectsProt[2]) {
            rock.lastIntersectProt = 2;
            rock.intersectsProt[2] = true;
        }
    } else {
        rock.intersectsProt[2] = false;
    }
    if (protagonistYPosition < rock.yPosition + rock.height) {
        if (!rock.intersectsProt[3]) {
            rock.lastIntersectProt = 3;
            rock.intersectsProt[3] = true;
        }
    } else {
        rock.intersectsProt[3] = false;
    }

    if (zPosition + protagonistWidth > rock.zPosition - rock.width) {
        if (!rock.intersectsProt[4]) {
            rock.lastIntersectProt = 4;
            rock.intersectsProt[4] = true;
        }
    } else {
        rock.intersectsProt[4] = false;
    }

    if (zPosition - protagonistWidth < rock.zPosition + rock.width) {
        if (!rock.intersectsProt[5]) {
            rock.lastIntersectProt = 5;
            rock.intersectsProt[5] = true;
        }
    } else {
        rock.intersectsProt[5] = false;
    }

    //better use numOfIntersects perhaps???

    if (rock.intersectsProt[0] && rock.intersectsProt[1] && rock.intersectsProt[2] && rock.intersectsProt[3] && rock.intersectsProt[4] && rock.intersectsProt[5]) {
        if (rock.lastIntersectProt === 0) {
            xPosition = rock.xPosition - rock.width - protagonistWidth;
        } else if (rock.lastIntersectProt === 1) {
            xPosition = rock.xPosition + rock.width + protagonistWidth;
        } else if (rock.lastIntersectProt === 2) {
            verticalVelocity = 0.0;
            protagonistYPosition = rock.yPosition - rock.height - protagonistHeight;
        } else if (rock.lastIntersectProt === 3) {
            verticalVelocity = 0.0;
            protagonistYPosition = rock.yPosition + rock.height;
        } else if (rock.lastIntersectProt === 4) {
            zPosition = rock.zPosition - rock.width - protagonistWidth;
        } else if (rock.lastIntersectProt === 5) {
            zPosition = rock.zPosition + rock.width + protagonistWidth;
        } else {
            console.log("Failure calculating lastIntersectProt: " + rock.lastIntersectProt);
        }
    }

    //for the torch

    if ((xLight + torchObject.width > rock.xPosition - rock.width) &&
        (xLight - torchObject.width < rock.xPosition + rock.width) &&
        (yLight + torchObject.width > rock.yPosition - rock.height) &&
        (yLight - torchObject.width < rock.yPosition + rock.height) &&
        (zLight + torchObject.width > rock.zPosition - rock.width) &&
        (zLight - torchObject.width < rock.zPosition + rock.width)) {

        if (torchAttack === 1) {
            torchAttack = -1;
            playSound(hit[0]);
        }
    }
}


function handleCollisionDetectionObjectEnemy(rock, enemy) {

    if (enemy.xPosition + enemy.width > rock.xPosition - rock.width) {
        if (!rock.intersectsEnemy[0]) {
            rock.lastIntersectEnemy = 0;
            rock.intersectsEnemy[0] = true;
        }
    } else {
        rock.intersectsEnemy[0] = false;
    }
    if (enemy.xPosition - enemy.width < rock.xPosition + rock.width) {
        if (!rock.intersectsEnemy[1]) {
            rock.lastIntersectEnemy = 1;
            rock.intersectsEnemy[1] = true;
        }
    } else {
        rock.intersectsEnemy[1] = false;
    }

    // fix needed perhaps
    if (enemy.yPosition + enemy.height > rock.yPosition - rock.height) {
        if (!rock.intersectsEnemy[2]) {
            rock.lastIntersectEnemy = 2;
            rock.intersectsEnemy[2] = true;
        }
    } else {
        rock.intersectsEnemy[2] = false;
    }
    if (enemy.yPosition - enemy.height < rock.yPosition + rock.height) {
        if (!rock.intersectsEnemy[3]) {
            rock.lastIntersectEnemy = 3;
            rock.intersectsEnemy[3] = true;
        }
    } else {
        rock.intersectsEnemy[3] = false;
    }

    if (enemy.zPosition + enemy.width > rock.zPosition - rock.width) {
        if (!rock.intersectsEnemy[4]) {
            rock.lastIntersectEnemy = 4;
            rock.intersectsEnemy[4] = true;
        }
    } else {
        rock.intersectsEnemy[4] = false;
    }

    if (enemy.zPosition - enemy.width < rock.zPosition + rock.width) {
        if (!rock.intersectsEnemy[5]) {
            rock.lastIntersectEnemy = 5;
            rock.intersectsEnemy[5] = true;
        }
    } else {
        rock.intersectsEnemy[5] = false;
    }

    //better use numOfIntersects perhaps???

    if (rock.intersectsEnemy[0] && rock.intersectsEnemy[1] && rock.intersectsEnemy[2] && rock.intersectsEnemy[3] && rock.intersectsEnemy[4] && rock.intersectsEnemy[5]) {
        if (rock.lastIntersectEnemy === 0) {
            enemy.xPosition = rock.xPosition - rock.width - enemy.width;
            enemy.jump();
        } else if (rock.lastIntersectEnemy === 1) {
            enemy.xPosition = rock.xPosition + rock.width + enemy.width;
            enemy.jump();
        } else if (rock.lastIntersectEnemy === 2) {
            enemy.verticalVelocity = 0.0;
            enemy.yPosition = rock.yPosition - rock.height - enemy.height;
        } else if (rock.lastIntersectEnemy === 3) {
            enemy.verticalVelocity = 0.0;
            enemy.yPosition = rock.yPosition + rock.height + enemy.height;
        } else if (rock.lastIntersectEnemy === 4) {
            enemy.jump();
            enemy.zPosition = rock.zPosition - rock.width - enemy.width;
        } else if (rock.lastIntersectEnemy === 5) {
            enemy.jump();
            enemy.zPosition = rock.zPosition + rock.width + enemy.width;
        } else {
            console.log("Failure calculating lastIntersectEnemy: " + rock.lastIntersectEnemy);
        }
    }
}

function handleCollisionDetectionEnemy(enemy, changeHealth, elapsedTime) {

    let distance = Math.sqrt((Math.pow(xPosition - enemy.object.xPosition, 2)) + (Math.pow(zPosition - enemy.object.zPosition, 2))) - protagonistWidth - enemy.object.width;

    if ((xPosition + protagonistWidth > enemy.object.xPosition - enemy.object.width) &&
        (xPosition - protagonistWidth < enemy.object.xPosition + enemy.object.width) &&
        (protagonistYPosition + protagonistHeight > enemy.object.yPosition - enemy.object.height) &&
        (protagonistYPosition < enemy.object.yPosition + enemy.object.height) &&
        (zPosition + protagonistWidth > enemy.object.zPosition - enemy.object.width) &&
        (zPosition - protagonistWidth < enemy.object.zPosition + enemy.object.width)) {
        zPosition -= elapsed * 0.02;
        moveForward = -0.2;
        setTimeout(function () {
            moveForward = 0;
        }, 1500);
        updateHealth(changeHealth);
    }
    if (distance < 2) {
        playSound(growl);
        handleEnemyMovement(enemy.object, elapsedTime);
    } else if (distance < 3.5) {
        if (lastTime - lastHowled > 5000) {
            playSound(howl);
            lastHowled = lastTime;
        }
    }

    if (torchAttack === 1) {
        let distance2 = Math.sqrt((Math.pow(xLight - enemy.object.xPosition, 2)) + (Math.pow(zLight - enemy.object.zPosition, 2)) + (Math.pow(yLight - enemy.object.yPosition, 2))) - enemy.object.width;

        //adjust this factor (should be zero)
        if (distance2 < 0.2) {
            console.log("Enemy hit!");
            enemy.inflictDamage(50);
            playSound(hit, false, false);
        }
    }
}

function handleEnemyMovement(enemy, elapsedTime) {
    let dx = xPosition - enemy.xPosition;
    let dz = zPosition - enemy.zPosition;

    let atan = radToDeg(Math.atan(dx / dz));

    if (dz < 0) {
        atan = -180 + atan;
    }
    enemy.yaw = atan;

    enemy.xPosition += Math.sin(degToRad(enemy.yaw)) * 0.0015 * elapsedTime;
    enemy.zPosition += Math.cos(degToRad(enemy.yaw)) * 0.0015 * elapsedTime;
}

function intro(show = true) {
    let intro = document.getElementById("intro").style;
    if (show) {
        intro.display = "inline";
        paused = true;
    }
    else {
        intro.display = "none";
        paused = !playSound(oogachaka, true);
    }

    //TODO MATEJ: dodaj animacije, ko dobiš layerje
    //TODO MATEJ: dodaj opise gumbov
}

function matrikaKratVektor(out, m, a) {
    let x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[1] * y + m[2] * z + m[3] * w;
    out[1] = m[4] * x + m[5] * y + m[6] * z + m[7] * w;
    out[2] = m[8] * x + m[9] * y + m[10] * z + m[11] * w;
    out[3] = m[12] * x + m[13] * y + m[14] * z + m[15] * w;
    return out;
}