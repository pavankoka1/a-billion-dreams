/**
 * WebGL2 point-sprite renderer: position + optional per-particle size/alpha (scatter “mist vs vein”).
 */

function compileShader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`${type === gl.VERTEX_SHADER ? "vertex" : "fragment"}: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

const FLOATS_PER_VERTEX = 4;

const VS = `#version 300 es
in vec2 a_position;
in vec2 a_style;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_pointDiameterPx;
uniform float u_useParticleStyle;
out float v_alphaScale;

void main() {
  float x = (a_position.x / u_resolution.x) * 2.0 - 1.0;
  float y = 1.0 - (a_position.y / u_resolution.y) * 2.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
  float base = max(1.0, u_pointDiameterPx * u_dpr);
  float sm = u_useParticleStyle > 0.5 ? max(0.18, a_style.x) : 1.0;
  v_alphaScale = u_useParticleStyle > 0.5 ? clamp(a_style.y, 0.12, 2.2) : 1.0;
  gl_PointSize = min(256.0, base * sm);
}
`;

const FS = `#version 300 es
precision highp float;
uniform float u_alpha;
uniform vec3 u_color;
in float v_alphaScale;
out vec4 fragColor;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  /** Softer edge = more overlap glow (reads closer to dense stipple / smoke). */
  float a = u_alpha * v_alphaScale * (1.0 - smoothstep(0.28, 0.5, d));
  if (a < 0.002) discard;
  fragColor = vec4(u_color, a);
}
`;

/**
 * @param {WebGL2RenderingContext} gl
 */
export function createParticleWebGLRenderer(gl) {
  const program = createProgram(gl, VS, FS);
  const aPosition = gl.getAttribLocation(program, "a_position");
  const aStyle = gl.getAttribLocation(program, "a_style");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uDpr = gl.getUniformLocation(program, "u_dpr");
  const uPointDiameterPx = gl.getUniformLocation(program, "u_pointDiameterPx");
  const uUseParticleStyle = gl.getUniformLocation(program, "u_useParticleStyle");
  const uAlpha = gl.getUniformLocation(program, "u_alpha");
  const uColor = gl.getUniformLocation(program, "u_color");

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    FLOATS_PER_VERTEX,
    /**
     * Interleaved: x, y, sizeMul, alphaMul per particle (size of `buffer` = count * 4 floats).
     */
    draw(
      interleavedXYStyle,
      count,
      resolutionCss,
      dpr,
      pointDiameterCssPx,
      alpha,
      colorRgb = [1, 1, 1],
      opts
    ) {
      const blend = opts?.blend ?? "normal";
      const useParticleStyle = opts?.useParticleStyle !== false;
      if (blend === "additive") {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      } else {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }

      gl.useProgram(program);
      gl.uniform2f(uResolution, resolutionCss[0], resolutionCss[1]);
      gl.uniform1f(uDpr, dpr);
      gl.uniform1f(uPointDiameterPx, pointDiameterCssPx);
      gl.uniform1f(uUseParticleStyle, useParticleStyle ? 1 : 0);
      gl.uniform1f(uAlpha, alpha);
      gl.uniform3f(uColor, colorRgb[0], colorRgb[1], colorRgb[2]);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const slice = interleavedXYStyle.subarray(0, count * FLOATS_PER_VERTEX);
      gl.bufferData(gl.ARRAY_BUFFER, slice, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(aStyle);
      gl.vertexAttribPointer(aStyle, 2, gl.FLOAT, false, 16, 8);

      gl.drawArrays(gl.POINTS, 0, count);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export function initWebGLParticles(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) {
    return null;
  }
  const renderer = createParticleWebGLRenderer(gl);
  return { gl, renderer };
}
