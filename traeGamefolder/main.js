const app = document.getElementById("app");
const debugEl = document.getElementById("debug");
const canvas = document.createElement("canvas");
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
canvas.style.display = "block"; canvas.tabIndex = 0;
app.appendChild(canvas);
const gl = canvas.getContext("webgl");

function compile(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
function program(vs, fs){ const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; }

const vs = `
attribute vec3 aPos; attribute vec2 aUv;
uniform mat4 uProj, uView, uModel;
varying vec2 vUv;
void main(){ vUv=aUv; gl_Position = uProj * uView * uModel * vec4(aPos,1.0); }
`;
const fs = `
precision mediump float;
varying vec2 vUv; uniform sampler2D uTex; uniform vec3 uColor; uniform float uUseTex;
void main(){ vec3 col = mix(uColor, texture2D(uTex, vUv).rgb, uUseTex); gl_FragColor = vec4(col,1.0); }
`;
const prog = program(vs, fs);
gl.useProgram(prog);
const loc = {
  aPos: gl.getAttribLocation(prog, "aPos"),
  aUv: gl.getAttribLocation(prog, "aUv"),
  uProj: gl.getUniformLocation(prog, "uProj"),
  uView: gl.getUniformLocation(prog, "uView"),
  uModel: gl.getUniformLocation(prog, "uModel"),
  uTex: gl.getUniformLocation(prog, "uTex"),
  uColor: gl.getUniformLocation(prog, "uColor"),
  uUseTex: gl.getUniformLocation(prog, "uUseTex"),
};

function mat4(){ return new Float32Array(16); }
function ident(m){ m.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); return m; }
function mul(a,b){ const r=mat4(); for(let i=0;i<4;i++)for(let j=0;j<4;j++){ r[i*4+j]=a[i*4+0]*b[0*4+j]+a[i*4+1]*b[1*4+j]+a[i*4+2]*b[2*4+j]+a[i*4+3]*b[3*4+j]; } return r; }
function perspective(fovy, aspect, near, far){ const f=1/Math.tan(fovy/2); const m=mat4(); m.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,(2*far*near)/(near-far),0]); return m; }
function lookAt(eye,center,up){ const z=[eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]; let zl=Math.hypot(...z); z[0]/=zl;z[1]/=zl;z[2]/=zl; const x=[up[1]*z[2]-up[2]*z[1], up[2]*z[0]-up[0]*z[2], up[0]*z[1]-up[1]*z[0]]; let xl=Math.hypot(...x); x[0]/=xl;x[1]/=xl;x[2]/=xl; const y=[z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]]; const m=mat4(); m.set([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]), -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]), -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]), 1]); return m; }
function translate(tx,ty,tz){ const m=mat4(); m.set([1,0,0,0, 0,1,0,0, 0,0,1,0, tx,ty,tz,1]); return m; }
function rotateY(a){ const c=Math.cos(a), s=Math.sin(a); const m=mat4(); m.set([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); return m; }
function rotateX(a){ const c=Math.cos(a), s=Math.sin(a); const m=mat4(); m.set([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); return m; }
function rotateZ(a){ const c=Math.cos(a), s=Math.sin(a); const m=mat4(); m.set([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); return m; }
function scale(sx,sy,sz){ const m=mat4(); m.set([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, 0,0,0,1]); return m; }

function buffer(data, size, locAttrib){ const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(locAttrib); gl.vertexAttribPointer(locAttrib, size, gl.FLOAT, false, 0, 0); return b; }

const groundSize=1000; const tile=80;
const gPos = [ -groundSize,0,-groundSize,  groundSize,0,-groundSize,  groundSize,0,groundSize,  -groundSize,0,groundSize ];
const gUv = [ 0,0,  tile,0,  tile,tile,  0,tile ];
const gIdx = [0,1,2, 0,2,3];
const gPosBuf = buffer(gPos,3,loc.aPos); const gUvBuf = buffer(gUv,2,loc.aUv);
const gIdxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gIdxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gIdx), gl.STATIC_DRAW);

const cubePos = [
  -0.3,0,-0.3,  0.3,0,-0.3,  0.3,1.6,-0.3,  -0.3,1.6,-0.3,
  -0.3,0,0.3,   0.3,0,0.3,   0.3,1.6,0.3,   -0.3,1.6,0.3
];
const cubeUv = [0,0,1,0,1,1,0,1, 0,0,1,0,1,1,0,1];
const cubeIdx = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2, 3,2,6, 3,6,7, 0,1,5, 0,5,4];
const cPosBuf = buffer(cubePos,3,loc.aPos); const cUvBuf = buffer(cubeUv,2,loc.aUv);
const cIdxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,cIdxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIdx), gl.STATIC_DRAW);

const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
const img = new Image(); img.crossOrigin = "anonymous";
img.src = "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg";
img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img); gl.generateMipmap(gl.TEXTURE_2D); };

gl.clearColor(0.85,0.93,1.0,1.0);
gl.enable(gl.DEPTH_TEST);

const keys=new Set(); let locked=false; const sens=0.0022;
canvas.addEventListener("click", ()=>{ canvas.requestPointerLock(); canvas.focus(); });
document.addEventListener("pointerlockchange", ()=>{ locked = document.pointerLockElement===canvas; });
document.addEventListener("mousemove", e=>{ if(!locked) return; yaw -= e.movementX*sens; pitch -= e.movementY*sens; pitch=Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch)); });
window.addEventListener("keydown", e=>keys.add(e.code));
window.addEventListener("keyup", e=>keys.delete(e.code));

let yaw=0, pitch=0; const player={ pos:[0,0.8,0], vel:[0,0,0], speed:4.5, run:7.5, jump:5.5, onGround:true };
let tAccum=0;

function update(dt){
  const f=[Math.sin(yaw),0,-Math.cos(yaw)];
  const r=[f[2],0,-f[0]]; let dir=[0,0,0];
  if(keys.has("KeyW")) { dir[0]+=f[0]; dir[2]+=f[2]; }
  if(keys.has("KeyS")) { dir[0]-=f[0]; dir[2]-=f[2]; }
  if(keys.has("KeyA")) { dir[0]-=r[0]; dir[2]-=r[2]; }
  if(keys.has("KeyD")) { dir[0]+=r[0]; dir[2]+=r[2]; }
  const len=Math.hypot(dir[0],dir[2]); if(len>0){ dir[0]/=len; dir[2]/=len; }
  const spd = (keys.has("ShiftLeft")||keys.has("ShiftRight")) ? player.run : player.speed;
  player.vel[0] = dir[0]*spd; player.vel[2] = dir[2]*spd; player.vel[1] -= 9.81*dt;
  if(keys.has("Space") && player.onGround){ player.vel[1]=player.jump; player.onGround=false; }
  player.pos[0]+=player.vel[0]*dt; player.pos[1]+=player.vel[1]*dt; player.pos[2]+=player.vel[2]*dt;
  const minY=0.8; if(player.pos[1]<=minY){ player.pos[1]=minY; player.vel[1]=0; player.onGround=true; }
}

function draw(){
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const forward=[Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)];
  const target=[player.pos[0], player.pos[1]+0.9, player.pos[2]];
  const camPos=[ target[0]-forward[0]*4.5, target[1]+1.2, target[2]-forward[2]*4.5 ];
  const proj = perspective(70*Math.PI/180, canvas.width/canvas.height, 0.1, 500);
  const view = lookAt(camPos, target, [0,1,0]);
  gl.uniformMatrix4fv(loc.uProj, false, proj);
  gl.uniformMatrix4fv(loc.uView, false, view);

  gl.bindBuffer(gl.ARRAY_BUFFER, gPosBuf); gl.vertexAttribPointer(loc.aPos,3,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(loc.aPos);
  gl.bindBuffer(gl.ARRAY_BUFFER, gUvBuf); gl.vertexAttribPointer(loc.aUv,2,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(loc.aUv);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gIdxBuf);
  let model = rotateY(0); model = mul(model, translate(0,0,0));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc.uTex,0);
  gl.uniform3f(loc.uColor, 1,1,1); gl.uniform1f(loc.uUseTex, 1.0);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, cPosBuf); gl.vertexAttribPointer(loc.aPos,3,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(loc.aPos);
  gl.bindBuffer(gl.ARRAY_BUFFER, cUvBuf); gl.vertexAttribPointer(loc.aUv,2,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(loc.aUv);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,cIdxBuf);
  const base = mul(translate(player.pos[0], player.pos[1]-0.8, player.pos[2]), rotateY(yaw));
  const torsoS = [0.75, 0.9/1.6, 0.5];
  model = mul(base, scale(torsoS[0], torsoS[1], torsoS[2]));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.23,0.25,0.32); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);

  const torsoTop = 1.6*torsoS[1];
  const headS = [0.5, 0.25/1.6, 0.5];
  model = mul(base, mul(translate(0, torsoTop+0.05, 0), scale(headS[0], headS[1], headS[2])));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.95,0.84,0.76); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);

  const move = Math.hypot(player.vel[0], player.vel[2]);
  const swing = (move>0.01) ? Math.sin(tAccum*6.0)*Math.min(1.0, move/player.speed)*0.35 : 0.0;
  const armS = [0.3, 0.8/1.6, 0.3];
  const armY = torsoTop - 0.2;
  const armX = 0.3*torsoS[0] + 0.3*armS[0];
  model = mul(base, mul(mul(translate(-armX, armY, 0), rotateZ(swing)), scale(armS[0], armS[1], armS[2])));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.95,0.84,0.76); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);
  model = mul(base, mul(mul(translate(armX, armY, 0), rotateZ(-swing)), scale(armS[0], armS[1], armS[2])));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.95,0.84,0.76); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);

  const legS = [0.33, 1.0/1.6, 0.33];
  const legX = 0.22;
  model = mul(base, mul(mul(translate(-legX, 0.0, 0), rotateX(-swing)), scale(legS[0], legS[1], legS[2])));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.15,0.16,0.2); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);
  model = mul(base, mul(mul(translate(legX, 0.0, 0), rotateX(swing)), scale(legS[0], legS[1], legS[2])));
  gl.uniformMatrix4fv(loc.uModel,false,model);
  gl.uniform3f(loc.uColor, 0.15,0.16,0.2); gl.uniform1f(loc.uUseTex, 0.0);
  gl.drawElements(gl.TRIANGLES, cubeIdx.length, gl.UNSIGNED_SHORT, 0);

  const s = `locked=${locked}\npos=(${player.pos[0].toFixed(2)}, ${player.pos[1].toFixed(2)}, ${player.pos[2].toFixed(2)})\nvel=(${player.vel[0].toFixed(2)}, ${player.vel[1].toFixed(2)}, ${player.vel[2].toFixed(2)})\nyaw=${(yaw*180/Math.PI).toFixed(1)} pitch=${(pitch*180/Math.PI).toFixed(1)}`;
  if(debugEl) debugEl.textContent=s;
}

function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
window.addEventListener("resize", resize);

let last=performance.now();
function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; tAccum+=dt; update(dt); draw(); requestAnimationFrame(loop); }
resize(); requestAnimationFrame(loop);
