/* ============================================================
   Hawih — Hero shader (iter-9)
   Same technique as shfrah's hero (3-octave snoise → palette
   mix → horizontal scanline streaks → vignette → mouse parallax)
   but recoloured into Hawih's cobalt-dominant theme. Deep ink
   base, cobalt mids, cream highlights — no warm amber.
   ============================================================ */

(function () {
  'use strict';

  // Match shfrah's mount id (#webgl-container) so the hero markup
  // is a literal copy-paste from shfrah.com. Old id kept as fallback.
  const mount = document.getElementById('webgl-container') ||
                document.getElementById('heroCanvas');
  if (!mount || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });

  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    varying vec2 vUv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      vec2 mouseInfluence = (u_mouse - 0.5) * 0.15;
      vec2 noisePos = vec2(st.x * 0.6 - u_time * 0.18 + mouseInfluence.x,
                           st.y * 3.2 + mouseInfluence.y);

      float n  = snoise(noisePos) * 0.5 + 0.5;
      float n2 = snoise(noisePos + vec2(5.2, 1.3)) * 0.5 + 0.5;
      float n3 = snoise(noisePos * 2.0 + vec2(3.1, 2.4)) * 0.5 + 0.5;

      // Shfrah's EXACT palette — no modifications.
      // Warm amber contrast against cool teal is what makes the
      // dynamic horizontal streaks visible. Hawih's cobalt brand
      // lives in the rest of the site; the hero is its own moment.
      vec3 colorDeep   = vec3(0.03, 0.05, 0.09);
      vec3 colorTeal   = vec3(0.00, 0.42, 0.52);
      vec3 colorIndigo = vec3(0.22, 0.20, 0.55);
      vec3 colorAmber  = vec3(0.95, 0.42, 0.08);

      vec3 finalColor = mix(colorDeep, colorTeal, n);
      finalColor = mix(finalColor, colorIndigo, n2 * (1.0 - st.y * 0.6));
      finalColor = mix(finalColor, colorAmber, pow(n3, 3.0) * st.x * 0.8);

      // Horizontal scanline streaks — exact shfrah tint and amplitude.
      float streak = snoise(vec2(st.y * 48.0, u_time * 0.45)) * 0.08;
      finalColor += streak * vec3(1.0, 0.6, 0.2);

      // Vignette
      vec2 q = st - 0.5;
      float vignette = 1.0 - dot(q, q) * 1.4;
      finalColor *= clamp(vignette, 0.35, 1.0);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const uniforms = {
    u_time:       { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(mount.clientWidth, mount.clientHeight) },
    u_mouse:      { value: new THREE.Vector2(0.5, 0.5) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthWrite: false,
    depthTest:  false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  // Hide CSS fallback layers
  document.querySelectorAll('.fractal-blob, .fractal-stripes').forEach(el => {
    el.style.display = 'none';
  });

  let time = 0;
  let rafId;
  let running = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = () => {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    time += reduce ? 0.002 : 0.01;
    uniforms.u_time.value = time;
    renderer.render(scene, camera);
  };
  animate();

  // Mouse parallax — same as shfrah
  mount.addEventListener('mousemove', e => {
    const rect = mount.getBoundingClientRect();
    uniforms.u_mouse.value.set(
      (e.clientX - rect.left) / rect.width,
      1.0 - (e.clientY - rect.top) / rect.height
    );
  });

  window.addEventListener('resize', () => {
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    uniforms.u_resolution.value.set(mount.clientWidth, mount.clientHeight);
  });

  // Pause when off-screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      if (visible && !running) { running = true; animate(); }
      else running = visible;
    }, { threshold: 0 });
    io.observe(mount);
  }
})();
