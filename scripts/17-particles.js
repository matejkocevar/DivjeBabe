// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var pointLifetimesBuffer;
var pointStartPositionsBuffer;
var pointEndPositionsBuffer;
var pointOffsetsBuffer;
var pointTextureCoordsBuffer;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Variable for storing textures
var texture;

// Helper varables
var time = 1.0;
var centerPos;
var color;

// Variable that stores  loading state of textures.
var texturesLoaded = false;

// Helper variable for animation
var lastTime = 0;

//
// initGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initGL(canvas) {
  var gl = null;
  try {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch(e) {}

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
  var shaderScript = document.getElementById(id);

  // Didn't find an element with the specified ID; abort.
  if (!shaderScript) {
    return null;
  }
  
  // Walk through the source element's children, building the
  // shader source string.
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) {
        shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
  
  // Now figure out what type of shader script we have,
  // based on its MIME type.
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
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
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");
  
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

  // Set attributer and uniforms
  shaderProgram.pointLifetimeAttribute = gl.getAttribLocation(shaderProgram, "aLifetime");
  gl.enableVertexAttribArray(shaderProgram.pointLifetimeAttribute);

  shaderProgram.pointStartPositionAttribute = gl.getAttribLocation(shaderProgram, "aStartPosition");
  gl.enableVertexAttribArray(shaderProgram.pointStartPositionAttribute);

  shaderProgram.pointEndPositionAttribute = gl.getAttribLocation(shaderProgram, "aEndPosition");
  gl.enableVertexAttribArray(shaderProgram.pointEndPositionAttribute);

  shaderProgram.pointOffsetAttribute = gl.getAttribLocation(shaderProgram, "aOffset");
  gl.enableVertexAttribArray(shaderProgram.pointOffsetAttribute);

  shaderProgram.pointTextureCoordsAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoords");
  gl.enableVertexAttribArray(shaderProgram.pointTextureCoordsAttribute);

  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "sTexture");
  shaderProgram.centerPositionUniform = gl.getUniformLocation(shaderProgram, "uCenterPosition");
  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
  shaderProgram.timeUniform = gl.getUniformLocation(shaderProgram, "uTime");
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures() {
  texture = gl.createTexture();
  texture.image = new Image();
  texture.image.onload = function () {
    handleTextureLoaded(texture)
  }
  texture.image.src = "./assets/smoke.gif";
}

function handleTextureLoaded(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded = true;
}

//
// initBuffers
//
// Initialise buffers
//
function initBuffers() {
  var numParticles = 3000;

  // local variables
  lifetimes = [];
  startPositions = [];
  endPositions = [];
  offsets = [];
  textureCoords = [];
  offsetsCycle = [
    -1,  1,
    -1, -1,
     1,  1,
     1, -1,
    -1, -1,
     1,  1
  ];
  textureCoordsCycle = [
    0, 1,
    0, 0,
    1, 1,
    1, 0,
    0, 0,
    1, 1
  ];
  for (var i=0; i < numParticles; i++)  {
    var lifetime = (Math.random() * 0.75) + 0.25;

    var distance = Math.random() * 0.1 - 0.05;
    var theta = Math.random() * 2 * Math.PI;
    var phi =  Math.random() * 2 * Math.PI;

    var startX = distance * Math.cos(phi) * Math.sin(theta);
    var startY = distance * Math.cos(theta);
    var startZ = distance * Math.sin(phi) * Math.sin(theta);

    var distance = Math.random() * 3 - 1;
    var theta = Math.random() * 2 * Math.PI;
    var phi =  Math.random() * 2 * Math.PI;

    var endX = distance * Math.cos(phi) * Math.sin(theta);
    var endY = distance * Math.cos(theta);
    var endZ = distance * Math.sin(phi) * Math.sin(theta);

    for (var v=0; v < 6; v++) {
      lifetimes.push(lifetime);

      startPositions.push(startX);
      startPositions.push(startY);
      startPositions.push(startZ);

      endPositions.push(endX);
      endPositions.push(endY);
      endPositions.push(endZ);

      offsets.push(offsetsCycle[v * 2]);
      offsets.push(offsetsCycle[v * 2 + 1]);

      textureCoords.push(textureCoordsCycle[v * 2]);
      textureCoords.push(textureCoordsCycle[v * 2 + 1]);
    }
  }

  // Pass the normals into WebGL
  pointLifetimesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointLifetimesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lifetimes), gl.STATIC_DRAW);
  pointLifetimesBuffer.itemSize = 1;
  pointLifetimesBuffer.numItems = numParticles * 6;

  // Pass the vertex position start into WebGL
  pointStartPositionsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointStartPositionsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(startPositions), gl.STATIC_DRAW);
  pointStartPositionsBuffer.itemSize = 3;
  pointStartPositionsBuffer.numItems = numParticles * 6;

  // Pass the vertex positions end into WebGL
  pointEndPositionsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointEndPositionsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(endPositions), gl.STATIC_DRAW);
  pointEndPositionsBuffer.itemSize = 3;
  pointEndPositionsBuffer.numItems = numParticles * 6;

  // Pass the offset into WebGL
  pointOffsetsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointOffsetsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsets), gl.STATIC_DRAW);
  pointOffsetsBuffer.itemSize = 2;
  pointOffsetsBuffer.numItems = numParticles * 6;

  // Pass the texture coordinates into WebGL
  pointTextureCoordsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pointTextureCoordsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
  pointTextureCoordsBuffer.itemSize = 2;
  pointTextureCoordsBuffer.numItems = numParticles * 6;
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

  // Set attributes and enable them
  gl.bindBuffer(gl.ARRAY_BUFFER, pointLifetimesBuffer);
  gl.vertexAttribPointer(shaderProgram.pointLifetimeAttribute, pointLifetimesBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pointStartPositionsBuffer);
  gl.vertexAttribPointer(shaderProgram.pointStartPositionAttribute, pointStartPositionsBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pointEndPositionsBuffer);
  gl.vertexAttribPointer(shaderProgram.pointEndPositionAttribute, pointEndPositionsBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pointOffsetsBuffer);
  gl.vertexAttribPointer(shaderProgram.pointOffsetAttribute, pointOffsetsBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, pointTextureCoordsBuffer);
  gl.vertexAttribPointer(shaderProgram.pointTextureCoordsAttribute, pointTextureCoordsBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // Activate textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(shaderProgram.samplerUniform, 0);

  // Set uniforms
  gl.uniform3f(shaderProgram.centerPositionUniform, centerPos[0], centerPos[1], centerPos[2]);
  gl.uniform4f(shaderProgram.colorUniform, color[0], color[1], color[2], color[3]);
  gl.uniform1f(shaderProgram.timeUniform, time);

  // Draw smoke
  gl.drawArrays(gl.TRIANGLES, 0, pointLifetimesBuffer.numItems);
}

//
// animate
//
// Called every time before redeawing the screen.
//
function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;

    // Calculate next step
    time += elapsed / 10000;
  }
  if (time >= 1.0) {
    time = 0;
    centerPos = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
    color = [Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, Math.random() / 2 + 0.5, 0.5];
    initBuffers();
  }
  lastTime = timeNow;
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
// Figuratively, that is. There's nothing moving in this demo.
//
  function start() {
  canvas = document.getElementById("glcanvas");

  gl = initGL(canvas);      // Initialize the GL context

  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.clearDepth(1.0);                                     // Clear everything

    // Next, load and set up the textures we'll be using.
    initTextures();

    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Set up to draw the scene periodically.
    setInterval(function() {
      if (texturesLoaded) { // only draw scene and animate when textures are loaded.
        animate();
        drawScene();
      }
    }, 15);
  }
  }