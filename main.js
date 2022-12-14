import * as glMatrix from './lib/gl-matrix/esm/index.js';
import Box2DFactory from './lib/liquidfun-wasm/dist/es/entry.js';
/**
 * Make a copy of the Box2DFactory variable (this is a workaround to change its type).
 * Tell our IDE that the typings for this variable can be found inside node_modules/box2d-wasm
 * @type {import('box2d-wasm')}
 */
const Box2DFactory_ = Box2DFactory;
Box2DFactory_().then(box2D => {
  // console.log(box2D);

  class SOD {
    #xp
    #y
    #yd
    #_w
    #_z
    #_d
    #k1
    #k2
    #k3
    constructor(f, z, r, x0) {

      this.#_w = 2.0 * Math.PI * f;
      this.#_z = z;
      this.#_d = this.#_w * Math.sqrt( Math.abs( z * z - 1.0 ) );
      this.#k1 = z / ( Math.PI * f );
      this.#k2 = 1.0 / ( this.#_w * this.#_w );
      this.#k3 = r * z / this.#_w;

      this.#xp = x0;
      this.#y = x0;
      this.#yd = 0;
    }

    update(T, x, xd) {
      if( xd == null ) {
        xd = ( x - this.#xp ) / T;
        this.#xp = x;
      }
      let k1_stable
      let k2_stable
      if(this.#_w * T < this.#_z) {
        k1_stable = this.#k1;
        k2_stable = Math.max( this.#k2, T * T / 2.0 + T * this.#k1 / 2.0, T * this.#k1);
      }else {
        let t1 = Math.exp( -this.#_z * this.#_w * T );
        let alpha = 2.0 * t1 * (this.#_z <= 1.0 ? Math.cos(T * this.#_d) : Math.cosh( T * this.#_d));
        let beta = t1 * t1;
        let t2 = T / ( 1.0 + beta - alpha );
        k1_stable = (1.0 - beta) * t2;
        k2_stable = T * t2;
      }
      this.#y = this.#y + T * this.#yd;
      this.#yd = this.#yd + T * ( x + this.#k3 * xd - this.#y - this.#k1 * this.#yd ) / k2_stable;
      return this.#y
    }
  }
  
  (function () {
    
    var mouseState = {
      x:-1, 
      y: -1,
      button: 0
    };
    
    function handleMouseMove(e) {
      mouseState.x  = e.pageX;
      mouseState.y  = e.pageY;
      //console.log("MOUSE: " + mouseState.x + "   " + mouseState.y + "   " + mouseState.button );
    }

    function handleMouseDown(e) {
      mouseState.x  = e.pageX;
      mouseState.y  = e.pageY;
      switch (e.button) {
        case 0:
          mouseState.button |= 0b00000001;
          break;
        case 1:
          mouseState.button |= 0b00000010;
          break;
        case 2:
          mouseState.button |= 0b00000100;
          break;
        default:
      }
      console.log("MOUSE: " + mouseState.x + "   " + mouseState.y + "   " + mouseState.button );
  }

  function handleMouseUp(e) {
    mouseState.x  = e.pageX;
    mouseState.y  = e.pageY;
    switch (e.button) {
      case 0:
        mouseState.button &= 0b11111110;
        break;
      case 1:
        mouseState.button &= 0b11111101;
        break;
      case 2:
        mouseState.button &= 0b11111011;
        break;
      default:
    }
    console.log("MOUSE: " + mouseState.x + "   " + mouseState.y + "   " + mouseState.button );
}

    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl2');

    window.addEventListener('mousemove', handleMouseMove, false);
    window.addEventListener('mousedown', handleMouseDown, false);
    window.addEventListener('mouseup', handleMouseUp, false);
    window.addEventListener('resize', resizeCanvas, false);
          
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        render(); 
    }
    
    resizeCanvas();
    
    function loadShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
          gl.deleteShader(shader);
          return null;
        }
      
        return shader;
    }

    function initShaderProgram(vsSource, fsSource) {
        const vertexShader = loadShader( gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader( gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
          alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
          return null;
        }
      
        return shaderProgram;
    }
      

    function render() {
        if (gl === null) {
          alert("Unable to initialize WebGL. Your browser or machine may not support it.");
          return;
        }
        const vsSource = `#version 300 es
            precision highp float;

            in vec4 aVertexPosition;

            in vec4 aInstacePosition;

            out vec2 vTextCoord;

            uniform mat4 uWorldViewProjectionMatrix;
            uniform vec2 uMousePosition;
            uniform vec2 uWidthHeight;
            uniform float uTime;
            
                        
            void main() {
              vec4 pos = aVertexPosition;
              vec2 mousePosition = uMousePosition;
              mousePosition.y = uWidthHeight.y - mousePosition.y;
              vec2 normalizeMousePos = ( mousePosition / uWidthHeight );
              // normalizeMousePos.x = 1.0 - normalizeMousePos.x;
              // normalizeMousePos.y = 1.0 - normalizeMousePos.y;
              pos.xy *=  vec2(aInstacePosition.w * 15.0) + 3.0;
              pos.xy += 
              mix(aInstacePosition.xy,  aInstacePosition.zw, vec2( 
                cos( uTime * 100.0 * (aInstacePosition.x + 1.0) ), 
                sin( uTime * 100.0 * (aInstacePosition.w + 1.0) ) ) * 0.1 ) 
                * uWidthHeight - uWidthHeight * 0.5;
              //pos.xy = mix(vec2(0.0), pos.xy, aInstacePosition.xy * uTime * 10.0);
              // pos.xy *= normalizeMousePos + 1.0;
              vTextCoord = max(vec2(0, 0), aVertexPosition.xy);
              gl_Position = uWorldViewProjectionMatrix * pos;
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;

            in vec2 vTextCoord;
            out vec4 oColor;
            
            void main() {
              float r = 1.0 - smoothstep(0.45, 0.5, length(vTextCoord - vec2(0.5)));
              if( r < 0.1 )
                discard;
              oColor = vec4(vTextCoord, r , r );
            }
        `;
        const shaderProgram = initShaderProgram(vsSource, fsSource);
        const programInfo = {
            program: shaderProgram,
            attribLocations: {
              vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
              instancePosition: gl.getAttribLocation(shaderProgram, 'aInstacePosition'),
            },
            uniformLocations: {
              worldViewProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uWorldViewProjectionMatrix'),
              mousePosition: gl.getUniformLocation(shaderProgram, 'uMousePosition'),
              widthHeight: gl.getUniformLocation(shaderProgram, 'uWidthHeight'),
              time: gl.getUniformLocation(shaderProgram, 'uTime')
            },
        };
        
        const instanceCount = 100000;

        function initPhysic() {
          var gravity = new box2D.b2Vec2(0.0, -10.0);
    
          var world = new box2D.b2World(gravity);
    
          var bd_ground = new box2D.b2BodyDef();
          var ground = world.CreateBody(bd_ground);
    
          var shape0 = new box2D.b2EdgeShape();
          shape0.SetOneSided(new box2D.b2Vec2(-40.0, -6.0), new box2D.b2Vec2(40.0, -6.0));
          ground.CreateFixture(shape0, 0.0);
      }
    
      initPhysic();

        function initBuffers() {
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = [
              -1.0,  -1.0,  1.0, 1.0,
              1.0,  -1.0,  1.0,  1.0,
              -1.0,   1.0,  1.0, 1.0,
              1.0,   1.0,  1.0,  1.0,
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            const indices = [
              0,  1,  2,  2,  1,  3,
            ];
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
          
            const instanceBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
            const instaceData = new Float32Array(instanceCount * 4);
            let it;
            for( it = 0.0; it < instanceCount; ++it ) {
              instaceData.set([Math.random() * 1.0, Math.random() * 1.0, Math.random() * 1.0, Math.random() * 1.0], it * 4);
              ++it;
            }
            gl.bufferData(gl.ARRAY_BUFFER, instaceData, gl.DYNAMIC_DRAW);
            return {
              position: positionBuffer,
              index: indexBuffer,
              instance: instanceBuffer,
              instancesData: instaceData
            };
        }          
        const buffers = initBuffers();
        var time = 0.0
        function drawScene(deltaTime ) {
          gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
          gl.clearColor(0.0, 0.5, 1.0, 1.0);
          gl.clearDepth(1.0);
          gl.enable(gl.DEPTH_TEST);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthFunc(gl.LEQUAL);
          gl.enable(gl.CULL_FACE);
  
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          const projectionMatrix = glMatrix.mat4.create();

          const halfW = gl.canvas.clientWidth / 2.0;
          const halfH = gl.canvas.clientHeight / 2.0;
          glMatrix.mat4.ortho(projectionMatrix, -halfW, halfW, -halfH, halfH, 0.1, 1000.0);
          //glMatrix.mat4.perspective(projectionMatrix, 60.0, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 1000.0);

          const viewMatrix = glMatrix.mat4.create();
          glMatrix.mat4.lookAt( viewMatrix, [0.0, 0.0, 10.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0] );

          const viewProjectionMatrix = glMatrix.mat4.create();
          
          glMatrix.mat4.multiply( viewProjectionMatrix, projectionMatrix, viewMatrix );
          const worldMatrix = glMatrix.mat4.create();

          const worldViewProjectionMatrix = glMatrix.mat4.create();

          glMatrix.mat4.multiply( worldViewProjectionMatrix, viewProjectionMatrix, worldMatrix );
  
          {
              gl.enableVertexAttribArray( programInfo.attribLocations.vertexPosition );
              gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
              const numComponents = 4;
              const type = gl.FLOAT;
              const normalize = false;
              const stride = 0;
              const offset = 0;
              gl.vertexAttribPointer(
                  programInfo.attribLocations.vertexPosition,
                  numComponents,
                  type,
                  normalize,
                  stride,
                  offset);
          }

          {
            gl.enableVertexAttribArray( programInfo.attribLocations.instancePosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instance);
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = numComponents * 4;
            const offset = 0;
            gl.vertexAttribPointer(
                programInfo.attribLocations.instancePosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.vertexAttribDivisor(programInfo.attribLocations.instancePosition, 1);
           
             gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffers.instancesData);
        }
        
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

          gl.useProgram(programInfo.program);
  
          gl.uniformMatrix4fv( programInfo.uniformLocations.worldViewProjectionMatrix, false, worldViewProjectionMatrix); 
          gl.uniform2f( programInfo.uniformLocations.mousePosition, mouseState.x, mouseState.y); 
          gl.uniform2f( programInfo.uniformLocations.widthHeight, gl.canvas.clientWidth, gl.canvas.clientHeight);
          time += 0.00001 * deltaTime;
          gl.uniform1f( programInfo.uniformLocations.time, time );
          
          {
            
            const vertexCount = 6;
            const type = gl.UNSIGNED_INT;
            const offset = 0;
            gl.drawElementsInstanced(gl.TRIANGLES, vertexCount, type, offset, instanceCount);
          }  
        }

        let then = Date.now();
        let now = 0;

        function draw() {
          now = Date.now();
          const deltaTime = now - then;
          then = now;
      
          drawScene(deltaTime);
          
          requestAnimationFrame(draw);
        }
        requestAnimationFrame(draw);
    }
  })();
 
});

