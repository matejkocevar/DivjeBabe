// Global variable definitionvar canvas;
var canvas;
var gl;
var shaderProgram;

// Buffers
var starVertexPositionBuffer;
var starVertexTextureCoordBuffer;

// Model-view and projection matrix and model-view matrix stack
var mvMatrixStack = [];
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

// Variables for storing texture and objects
var stars = [];
var starTexture;

// Variable that stores  loading state of textures.
var texturesLoaded = false;

// Keyboard handling helper variable for reading the status of keys
var currentlyPressedKeys = {};

// Variables for storing current position of cube
var zoom = -15.0;

// Variables for storing current rotation of cube
var tilt = 90;
var spin = 0;

// Helper variables for animation
var lastTime = 0;
var effectiveFPMS = 60 / 1000;

//
// Definition of Star object and it's functions
//
function Star(startingDistance, rotationSpeed) {
  this.angle = 0;
  this.dist = startingDistance;
  this.rotationSpeed = rotationSpeed;

  // Set the colors to a starting value.
  this.randomiseColors();
}

// Function draws individual star
Star.prototype.draw = function (tilt, spin, twinkle) {
  mvPushMatrix();

  // Move to the star's position
  mat4.rotate(mvMatrix, degToRad(this.angle), [0.0, 1.0, 0.0]);
  mat4.translate(mvMatrix, [this.dist, 0.0, 0.0]);

  // Rotate back so that the star is facing the viewer
  mat4.rotate(mvMatrix, degToRad(-this.angle), [0.0, 1.0, 0.0]);
  mat4.rotate(mvMatrix, degToRad(-tilt), [1.0, 0.0, 0.0]);

  if (twinkle) {
      // Draw a non-rotating star in the alternate "twinkling" color
      gl.uniform3f(shaderProgram.colorUniform, this.twinkleR, this.twinkleG, this.twinkleB);
      drawStar();
  }

  // All stars spin around the Z axis at the same rate
  mat4.rotate(mvMatrix, degToRad(spin), [0.0, 0.0, 1.0]);

  // Draw the star in its main color
  gl.uniform3f(shaderProgram.colorUniform, this.r, this.g, this.b);
  drawStar()

  mvPopMatrix();
};

// Function animates individual star
Star.prototype.animate = function (elapsedTime) {
  this.angle += this.rotationSpeed * effectiveFPMS * elapsedTime;

  // Decrease the distance, resetting the star to the outside of
  // the spiral if it's at the center.
  this.dist -= 0.01 * effectiveFPMS * elapsedTime;
  if (this.dist < 0.0) {
      this.dist += 5.0;
      this.randomiseColors();
  }
};

// Function for random color of star
Star.prototype.randomiseColors = function () {
  // Give the star a random color for normal
  // circumstances...
  this.r = Math.random();
  this.g = Math.random();
  this.b = Math.random();

  // When the star is twinkling, we draw it twice, once
  // in the color below (not spinning) and then once in the
  // main color defined above.
  this.twinkleR = Math.random();
  this.twinkleG = Math.random();
  this.twinkleB = Math.random();
};

//
// Matrix utility functions
//
// mvPush   ... push current matrix on matrix stack
// mvPop    ... pop top matrix from stack
// degToRad ... convert degrees to radians
//
function mvPushMatrix() {
  var copy = mat4.create();
  mat4.set(mvMatrix, copy);
  mvMatrixStack.push(copy);
}

function mvPopMatrix() {
  if (mvMatrixStack.length == 0) {
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
  
  // store location of aVertexPosition variable defined in shader
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

  // turn on vertex position attribute at specified position
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  // store location of aVertexNormal variable defined in shader
  shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");

  // store location of aTextureCoord variable defined in shader
  gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

  // store location of uPMatrix variable defined in shader - projection matrix 
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

  // store location of uMVMatrix variable defined in shader - model-view matrix 
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

  // store location of uSampler variable defined in shader
  shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

  // store location of uColor variable defined in shader
  shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
}

//
// setMatrixUniforms
//
// Set the uniform values in shaders for model-view,  projection and normal matrix.
//
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//
// initTextures
//
// Initialize the textures we'll be using, then initiate a load of
// the texture images. The handleTextureLoaded() callback will finish
// the job; it gets called each time a texture finishes loading.
//
function initTextures() {
  starTexture = gl.createTexture();
  starTexture.image = new Image();
  starTexture.image.onload = function () {
    handleTextureLoaded(starTexture)
  }
  starTexture.image.src = "./assets/star.gif";
}

function handleTextureLoaded(texture) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Third texture usus Linear interpolation approximation with nearest Mipmap selection
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindTexture(gl.TEXTURE_2D, null);

  // when texture loading is finished we can draw scene.
  texturesLoaded = true;
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just have
// one object -- a simple two-dimensional square placeholder.
//
function initBuffers() {
  // Create a buffer for the square placeholder's vertices.
  starVertexPositionBuffer = gl.createBuffer();
  
  // Select the starVertexPositionBuffer as the one to apply vertex
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
  
  // Now create an array of vertices for the square placeholder.
  vertices = [
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0,
    -1.0,  1.0,  0.0,
     1.0,  1.0,  0.0
  ];
  
  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  starVertexPositionBuffer.itemSize = 3;
  starVertexPositionBuffer.numItems = 4;

  // Map the texture onto the square placeholder's faces.
  starVertexTextureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
  
  // Now create an array of vertex texture coordinates for the quad.
  var textureCoordinates = [
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    1.0,  1.0
  ];

  // Pass the texture coordinates into WebGL
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
  starVertexTextureCoordBuffer.itemSize = 2;
  starVertexTextureCoordBuffer.numItems = 4;
}

//
// drawStar
//
// Function for drawing individual star object.
//
function drawStar() {
  // Activate texture
  gl.activeTexture(gl.TEXTURE0);
  // Bind texture
  gl.bindTexture(gl.TEXTURE_2D, starTexture);
  gl.uniform1i(shaderProgram.samplerUniform, 0);

  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, starVertexTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, starVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw stars by binding the array buffer to the star's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, starVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, starVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Draw the star.
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, starVertexPositionBuffer.numItems);
}

//
// initWorldObjects
//
// Initialisation of objects displayed in the 3D world
//
function initWorldObjects() {
  var numStars = 50;

  for (var i = 0; i < numStars; i++) {
    // Create new star and push it to the stars array
    stars.push(new Star((i / numStars) * 5.0, i / numStars));
  }
}

//
// drawScene
//
// Draw the scene.
//
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the canvas before we start drawing on it.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Establish the perspective with which we want to view the
  // scene. Our field of view is 45 degrees, with a width/height
  // ratio and we only want to see objects between 0.1 units
  // and 100 units away from the camera.
  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

  // Set blending options and enable it
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.BLEND);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  mat4.identity(mvMatrix);

  // Now move the drawing position a bit to where we want to start
  // drawing the cube.
  mat4.translate(mvMatrix, [0.0, 0.0, zoom]);

  // Set rotation along the x axis
  mat4.rotate(mvMatrix, degToRad(tilt), [1, 0, 0]);

  //
  var twinkle = document.getElementById("twinkle").checked;
  for (var i in stars) {
    stars[i].draw(tilt, spin, twinkle);
    spin += 0.1;
  }
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

    for (var i in stars) {
      // rotate the cube for a small amount
      stars[i].animate(elapsed);
    }
  }
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
}

//
// handleKeys
//
// Called every time before redeawing the screen for keyboard
// input handling. Function continuisly updates helper variables.
//
function handleKeys() {
  if (currentlyPressedKeys[33]) {
    // Page Up
    zoom -= 0.05;
  }
  if (currentlyPressedKeys[34]) {
    // Page Down
    zoom += 0.05;
  }
  if (currentlyPressedKeys[38]) {
    // Up cursor key
    tilt -= 1;
  }
  if (currentlyPressedKeys[40]) {
    // Down cursor key
    tilt += 1;
  }
}

//
// start
//
// Called when the canvas is created to get the ball rolling.
//
function start() {
  canvas = document.getElementById("glcanvas");

  gl = initGL(canvas);      // Initialize the GL context

  // Only continue if WebGL is available and working
  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);                      // Set clear color to black, fully opaque
    gl.clearDepth(1.0);                                     // Clear everything
    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing
    gl.depthFunc(gl.LEQUAL);                                // Near things obscure far things

    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    initShaders();
    
    // Here's where we call the routine that builds all the objects
    // we'll be drawing.
    initBuffers();
    
    // Next, load and set up the textures we'll be using.
    initTextures();

    // Initialise world objects
    initWorldObjects();

    // Bind keyboard handling functions to document handlers
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
    // Set up to draw the scene periodically.
    setInterval(function() {
      if (texturesLoaded) { // only draw scene and animate when textures are loaded.
        requestAnimationFrame(animate);
        handleKeys();
        drawScene();
      }
    }, 15);
  }
}