// Global variable definitionvar canvas;
let canvas;
let gl;
let shaderProgram;

// Buffers
let worldVertexPositionBuffer = null;
let worldVertexNormalBuffer = null;
let worldVertexTextureCoordBuffer = null;

// Model-view and projection matrix and model-view matrix stack
let mvMatrixStack = [];
let mvMatrix = mat4.create();
const pMatrix = mat4.create();

// Variables for storing textures
let wallTexture;

// Variable that stores  loading state of textures.
let texturesLoaded = false;

// Keyboard handling helper variable for reading the status of keys
const currentlyPressedKeys = {};

// Mouse helper variables
var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
const mouseSensitivity = 0.3;

// Variables for storing current position and currentSpeed
let pitch = 0;
let pitchRate = 0;
let yaw = 0;
let yawRate = 0;
let xPosition = 0;
let yPosition = 0.4;
let zPosition = 0;
let moveForward = 0;
let moveLeft = 0;

// Speed
let walkingSpeed = 0.0025;
let sprintingSpeed = 0.0035;
let currentSpeed = walkingSpeed;

// Used to makes us "jo" left and right as we change foot
let joggingAdjust = 0;
let joggingPhase = 1;

//Used for acceleration and gravity;
let verticalVelocity = 0;
const floorLevel = 0.0;

// how high is our protagonist aka. on what default yPosition is our first person camera?
const protagonistHeight = 0.4;
yPosition = protagonistHeight;

// on what Y position are protagonist's feet
let protagonistYPosition = 0.0;
yPosition = protagonistYPosition + protagonistHeight;

// Used to make us "jog" up and down as we move forward.
let joggingAngle = 0;

// Helper variable for animation
let lastTime = 0;

// Pause menu state variable
let paused = false;
let distanceTravelled = 0;

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
}

//
// setMatrixUniforms
//
// Set the uniforms in shaders.
//
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
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
function initTextures() {
    wallTexture = gl.createTexture();
    wallTexture.image = new Image();
    wallTexture.image.onload = function () {
        handleTextureLoaded(wallTexture)
    };
    wallTexture.image.src = "./assets/wall_cave.jpg";
}

function handleTextureLoaded(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Third texture usus Linear interpolation approximation with nearest Mipmap selection
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    // suggested either MIRRORED_REPEAT or REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);

    // when texture loading is finished we can draw scene.
    texturesLoaded = true;
}

//
// handleLoadedWorld
//
// Initialisation of world
//
function handleLoadedWorld(data) {
    const lines = data.split("\n");
    let vertexCount = 0;
    const vertexPositions = [];
    const vertexTextureCoords = [];
    const vertexNormals = [];

    for (const i in lines) {
        // noinspection JSUnfilteredForInLoop
        const vals = lines[i].replace(/^\s+/, "").split(/\s+/);
        if (vals.length === 8 && vals[0] !== "//") {
            // It is a line describing a vertex; get X, Y and Z first
            vertexPositions.push(parseFloat(vals[0]));
            vertexPositions.push(parseFloat(vals[1]));
            vertexPositions.push(parseFloat(vals[2]));

            // And then the texture coords
            vertexTextureCoords.push(parseFloat(vals[3]));
            vertexTextureCoords.push(parseFloat(vals[4]));

            // And the normals
            vertexNormals.push(parseFloat(vals[5]));
            vertexNormals.push(parseFloat(vals[6]));
            vertexNormals.push(parseFloat(vals[7]));

            vertexCount += 1;
        }
    }
    console.log(vertexCount);

    worldVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions), gl.STATIC_DRAW);
    worldVertexPositionBuffer.itemSize = 3;
    worldVertexPositionBuffer.numItems = vertexCount;

    worldVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords), gl.STATIC_DRAW);
    worldVertexTextureCoordBuffer.itemSize = 2;
    worldVertexTextureCoordBuffer.numItems = vertexCount;

    worldVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
    worldVertexNormalBuffer.itemSize = 3;
    worldVertexNormalBuffer.numItems = vertexCount;

    document.getElementById("loadingtext").textContent = "";
}

//
// loadWorld
//
// Loading world
//
function loadWorld() {
    const request = new XMLHttpRequest();
    request.open("GET", "./assets/world_cave.txt");
    request.onreadystatechange = function () {
        if (request.readyState === 4) {
            handleLoadedWorld(request.responseText);
        }
    };
    request.send();
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
    if (worldVertexTextureCoordBuffer == null || worldVertexPositionBuffer == null) {
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
    gl.uniform3f(shaderProgram.pointLightingLocationUniform, xPosition, yPosition + 0.5, zPosition);
    gl.uniform3f(shaderProgram.pointLightingColorUniform, 1.0, 0.7, 0.3);
    gl.uniform1i(shaderProgram.useTexturesUniform, true);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    mat4.identity(mvMatrix);

    // Now move the drawing position a bit to where we want to start
    // drawing the world.
    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPosition, -yPosition, -zPosition]);

    // Activate textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wallTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, worldVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the world by binding the array buffer to the world's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, worldVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Set the normals attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, worldVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, worldVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Draw the cube.
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, worldVertexPositionBuffer.numItems);
}

//
// animate
//
// Called every time before redrawing the screen.
//
function animate() {
    const timeNow = new Date().getTime();
    let elapsed = 0;

    if (lastTime !== 0) {

        elapsed = timeNow - lastTime;

        var temp = Math.sin(degToRad(joggingAngle));

        if (moveForward !== 0 || moveLeft !== 0) {

            xPosition -= Math.sin(degToRad(yaw)) * moveForward * currentSpeed * elapsed - Math.sin(degToRad(yaw - 90)) * moveLeft * walkingSpeed * 0.7 * elapsed - Math.sin(degToRad(yaw - 90)) * moveForward * currentSpeed * elapsed * joggingAdjust;
            zPosition -= Math.cos(degToRad(yaw)) * moveForward * currentSpeed * elapsed - Math.cos(degToRad(yaw - 90)) * moveLeft * walkingSpeed * 0.7 * elapsed - Math.cos(degToRad(yaw - 90)) * moveForward * currentSpeed * elapsed * joggingAdjust;

            joggingAngle += elapsed * 0.5 * currentSpeed / walkingSpeed; // 0.5 "fiddle factor" - makes it feel more realistic :-)

            //temp = Math.sin(degToRad(joggingAngle));
            if (joggingPhase * temp < 0) {
                // the sin would get negative at this point, we detect it to make new step
                joggingPhase = joggingPhase * (-1);

                distanceTravelled++;
                playSoundFootstep();
            }

            joggingAdjust = temp / 8;
        }

        yPosition = joggingPhase * temp / 14 + protagonistHeight + protagonistYPosition;

        yaw += yawRate * elapsed;
        pitch += pitchRate * elapsed;

    }
    handleGravity(elapsed);
    handleCollisionDetectionFloor();

    lastTime = timeNow;
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
    if (event.keyCode === 27)
        pausedToogle();
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
        currentSpeed = sprintingSpeed;
    } else {
        currentSpeed = walkingSpeed;
    }
    if (currentlyPressedKeys[32] && verticalVelocity == 0.0) {
        // space
        verticalVelocity = 0.4;
    } else {
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
}

function handleMouseUp(event) {
    mouseDown = false;
}

//
// handleMouse
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleMouseMove(event) {
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    pitch -= deltaY * mouseSensitivity;
    yaw -= deltaX * mouseSensitivity;


    //limit the pitch to the front 180 degrees
    if (pitch > 90)
        pitch = 90;
    if (pitch < -90)
        pitch = -90;

    lastMouseX = newX;
    lastMouseY = newY;
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
function start() {
    canvas = document.getElementById("glcanvas");
    setCanvasSize();
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
        initTextures();

        // Initialise world objects
        loadWorld();

        // Bind keyboard handling functions to document handlers
        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;

        canvas.onmousedown = handleMouseDown;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;

        // Set up to draw the scene periodically.
        setInterval(function () {
            if (texturesLoaded) { // only draw scene and animate when textures are loaded.
                handleKeys();
                if (!paused) {
                    requestAnimationFrame(animate);
                    drawScene();
                }
            }
        }, 15);
    }
}

window.onresize = setCanvasSize;

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initGL();
}

function pausedToogle() {
    if (paused) {
        paused = false;
        document.getElementById("overlay").style.display = "none";
        console.log("Game resumed.");
    }
    else {
        paused = true;
        document.getElementById("overlay").style.display = "inherit";
        console.log("Game paused.");
        document.getElementById("distanceTravelled").innerText = distanceTravelled + " steps";
        document.getElementById("hitsWall").innerText = " To be announced";
        document.getElementById("eventsSurvived").innerText = " To be announced";

    }
}

function playSoundFootstep() {

}

function handleGravity(elapsedTime) {

    verticalVelocity -= elapsedTime * 0.001;
    protagonistYPosition += elapsedTime * 0.012 * verticalVelocity;   // fiddle factor
}

/*
This function needs to be switched with a proper hit detection method
 */
function handleCollisionDetectionFloor() {
    if (protagonistYPosition < floorLevel) {
        verticalVelocity = 0.0;
        protagonistYPosition = floorLevel;
    }
}
