// Tide: the Tidepool copilot as a 3D character (three.js r128). Spec: DESIGN.md → Copilot 3D.
//
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
//   <script src="tide.js"></script>
//   <canvas id="tide" style="width:100%;height:420px"></canvas>
//   <script>mountTide(document.getElementById("tide"));</script>
//
// A soft pastel blob in a felt coat: calm half-closed eyes and round glasses. It wobbles,
// bounces and watches the pointer. Token coins orbit it. Colours come from tokens.css (--copilot,
// --copilot-hi, --primary, --warning) and follow [data-theme="dark"] on <html>.
// Without WebGL it swaps in a .copilot-avatar.
// Options: { coins: true, sparks: true, glasses: true, followPointer: true, size: 1 }
(function () {
  var R = 1.2;                       // body radius
  var SHAPE = [1.12, 0.88, 1.05];    // squashed, mochi-like
  var FUR = { shells: 18, length: 0.12 };

  // Soft wobble field: a sum of sines is enough for a gentle blob.
  function wob(x, y, z, t) {
    return Math.sin(x * 2.1 + t * 1.3) * Math.sin(y * 1.7 + t * 1.1) * 0.5 +
      Math.sin(y * 2.6 - t * 0.9 + z * 1.3) * 0.3 + Math.sin(z * 2.3 + t * 1.7 + x) * 0.2;
  }

  function canvasTexture(size, draw) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    draw(c.getContext("2d"), size);
    return new THREE.CanvasTexture(c);
  }

  // Powdery speckle for the skin (multiplies the colour, so no lighting artefacts).
  function speckle() {
    var t = canvasTexture(256, function (g, n) {
      var img = g.createImageData(n, n);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 255 - Math.random() * 56;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2);
    return t;
  }

  // Felt strands: each texel is one strand with a random height (used with alphaTest per shell).
  function strands() {
    var t = canvasTexture(256, function (g, n) {
      var img = g.createImageData(n, n);
      for (var i = 0; i < img.data.length; i += 4) {
        var h = Math.pow(Math.random(), 0.6) * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = h; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 7);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }

  // Coin face with a generic token glyph (never a real brand logo).
  function coinFace(glyph) {
    return canvasTexture(128, function (g, n) {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, n, n);
      g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 6; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 10, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "rgba(0,0,0,.28)";
      if (glyph === "diamond") {
        g.beginPath(); g.moveTo(n / 2, 26); g.lineTo(n - 40, n / 2); g.lineTo(n / 2, n - 26); g.lineTo(40, n / 2); g.closePath(); g.fill();
      } else {
        g.font = "700 64px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(glyph, n / 2, n / 2 + 4);
      }
    });
  }

  function mountTide(canvas, opts) {
    opts = Object.assign({ coins: true, sparks: true, glasses: true, followPointer: true, size: 1 }, opts);
    var host = canvas.parentElement;
    var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };

    try {
      if (!window.THREE) throw new Error("three.js not loaded");
      return start();
    } catch (e) {
      var avatar = document.createElement("span");
      avatar.className = "copilot-avatar";
      var side = Math.min(canvas.clientWidth || 200, canvas.clientHeight || 200);
      avatar.style.cssText = "--size:" + Math.round(side * 0.5) + "px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)";
      canvas.replaceWith(avatar);
      return { destroy: function () { avatar.remove(); } };
    }

    function start() {
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
      camera.position.set(0, 0.35, 9.6 / opts.size);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2550, 0.6));
      var key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(2.5, 4, 5); scene.add(key);
      var rim = new THREE.PointLight(0xc9bcff, 1.1, 12); rim.position.set(-3, 2, -2.5); scene.add(rim);
      var under = new THREE.PointLight(0x3fbfa8, 0.6, 12); under.position.set(1.5, -3, 2); scene.add(under);

      // ---- body: a squashed sphere we wobble every frame ----
      var geo = new THREE.SphereGeometry(R, 72, 72);
      var base = geo.attributes.position.array.slice();
      var skin = new THREE.MeshStandardMaterial({ roughness: 1, map: speckle() });
      var tide = new THREE.Group(); scene.add(tide);
      tide.add(new THREE.Mesh(geo, skin));

      // ---- felt coat: shells of the same mesh, sparser strands further out ----
      var fur = strands(), shells = [];
      for (var i = 1; i <= FUR.shells; i++) {
        var k = i / FUR.shells;
        var sh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, alphaMap: fur, alphaTest: 0.08 + k * 0.84 }));
        sh.scale.setScalar(1 + k * FUR.length / R); sh.userData.k = k;
        tide.add(sh); shells.push(sh);
      }

      // ---- face ----
      var face = new THREE.Group(); tide.add(face);
      var ink = new THREE.MeshBasicMaterial({ color: 0x14102e });
      var lift = FUR.length * 0.85;
      // Put a feature on the body surface at (x, y), nudged outward and facing out.
      function onSurface(m, x, y, out) {
        var nx = x / (R * SHAPE[0]), ny = y / (R * SHAPE[1]), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        m.position.set(x, y, nz * R * SHAPE[2] + out);
        m.lookAt(m.position.clone().add(new THREE.Vector3(nx / SHAPE[0], ny / SHAPE[1], nz / SHAPE[2])));
      }
      // Calm, half-closed eyes: a soft downward arc behind the glasses.
      [-0.3, 0.3].forEach(function (x) {
        var e = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 24, Math.PI), ink);
        onSurface(e, x, 0.1, 0.03 + lift); e.rotation.set(0, 0, Math.PI); face.add(e);
      });

      if (opts.glasses) {
        var wire = new THREE.MeshStandardMaterial({ color: 0x14102e, metalness: 0.5, roughness: 0.35 });
        var glasses = new THREE.Group();
        [-0.32, 0.32].forEach(function (x) {
          var ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.022, 12, 48), wire); ring.position.x = x; glasses.add(ring);
        });
        var bridge = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI), wire); bridge.position.y = 0.02; glasses.add(bridge);
        [-1, 1].forEach(function (side) {
          var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.7, 8), wire);
          arm.rotation.x = Math.PI / 2; arm.rotation.y = side * 0.5; arm.position.set(side * 0.64, 0.04, -0.3); glasses.add(arm);
        });
        glasses.position.set(0, 0.12, (SHAPE[2] * R + lift + 0.12) * 0.93); glasses.rotation.x = -0.08;
        face.add(glasses);
      }

      // ---- token coins on a tilted orbit (they dip below the face when passing in front) ----
      var coins = [], coinMats = [];
      if (opts.coins) {
        var coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 48);
        var rimGeo = new THREE.TorusGeometry(0.36, 0.035, 10, 48);
        var rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0.3 });
        ["$", "diamond", "T"].forEach(function (glyph, i) {
          var side = new THREE.MeshStandardMaterial({ metalness: 0.35, roughness: 0.3 });
          var faceMat = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.35, map: coinFace(glyph) });
          coinMats.push([side, faceMat]);
          var g = new THREE.Group();
          var c = new THREE.Mesh(coinGeo, [side, faceMat, faceMat]); c.rotation.x = Math.PI / 2; g.add(c);
          g.add(new THREE.Mesh(rimGeo, rimMat));
          scene.add(g);
          coins.push({ g: g, phase: (i / 3) * Math.PI * 2, r: 2.35 + i * 0.12, tilt: 0.35 - i * 0.2 });
        });
      }

      var sparkMats = [new THREE.MeshStandardMaterial({ roughness: 0.3 }), new THREE.MeshStandardMaterial({ roughness: 0.3 })];
      var sparks = new THREE.Group(); scene.add(sparks);
      if (opts.sparks) for (var s = 0; s < 18; s++) {
        var sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 + Math.random() * 0.05), sparkMats[s % 2]);
        sp.position.set((Math.random() - 0.5) * 6.4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3 - 1);
        sp.userData.speed = 0.3 + Math.random() * 0.6; sparks.add(sp);
      }

      var shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x14102e, transparent: true, opacity: 0.12 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.7; scene.add(shadow);

      // ---- colours from tokens (repaint on theme change) ----
      function paint() {
        var pastel = new THREE.Color(css("--copilot")).lerp(new THREE.Color(css("--copilot-hi")), 0.6);
        skin.color.copy(pastel);
        shells.forEach(function (sh) { sh.material.color.copy(pastel).multiplyScalar(0.7 + sh.userData.k * 0.3); });
        var coinColors = [css("--primary"), css("--copilot-hi"), css("--warning")];
        coinMats.forEach(function (m, i) { m[0].color.set(coinColors[i]); m[1].color.set(coinColors[i]); });
        sparkMats[0].color.set(css("--primary")); sparkMats[1].color.set(css("--copilot-hi"));
      }
      paint();
      var themeWatch = new MutationObserver(function () { requestAnimationFrame(paint); });
      themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      var target = { x: 0, y: 0 };
      function onPointer(e) { target.x = (e.clientX / window.innerWidth - 0.5) * 0.8; target.y = (e.clientY / window.innerHeight - 0.5) * 0.4; }
      if (opts.followPointer) window.addEventListener("pointermove", onPointer);

      function resize() {
        var w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize); resize();

      var pos = geo.attributes.position, v = new THREE.Vector3(), n = new THREE.Vector3();
      var clock = new THREE.Clock(), raf;
      (function tick() {
        var tt = clock.getElapsedTime(), t = tt * 0.6;
        // Wobble, faded out smoothly around the face so the features stay put.
        for (var i = 0; i < base.length; i += 3) {
          v.set(base[i], base[i + 1], base[i + 2]); n.copy(v).normalize();
          var f = THREE.MathUtils.smoothstep(n.z, 0.45, 0.85) * (1 - THREE.MathUtils.smoothstep(Math.abs(n.y), 0.2, 0.55));
          var d = 1 + wob(n.x, n.y, n.z, t) * 0.045 * (1 - 0.7 * f);
          pos.array[i] = base[i] * d * SHAPE[0]; pos.array[i + 1] = base[i + 1] * d * SHAPE[1]; pos.array[i + 2] = base[i + 2] * d * SHAPE[2];
        }
        pos.needsUpdate = true; geo.computeVertexNormals();

        // Squash-and-stretch bounce, shadow breathes with it.
        var bounce = Math.abs(Math.sin(tt * 1.5)), sq = 1 + (bounce - 0.5) * 0.1;
        tide.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
        tide.position.y = bounce * 0.18 - 0.05;
        shadow.scale.set(1.25 - bounce * 0.15, 1, 0.55 - bounce * 0.07); shadow.material.opacity = 0.14 - bounce * 0.05;

        tide.rotation.y += (target.x - tide.rotation.y) * 0.08;
        tide.rotation.x += (target.y - tide.rotation.x) * 0.08;

        coins.forEach(function (c, i) {
          var a = tt * 0.55 + c.phase;
          c.g.position.set(Math.cos(a) * c.r, -Math.sin(a) * 0.95 + c.tilt * 0.4, Math.sin(a) * c.r * 0.55);
          c.g.rotation.y = tt * 1.4 + i;
        });
        sparks.children.forEach(function (s, i) { s.rotation.y = tt * s.userData.speed; s.position.y += Math.sin(tt + i) * 0.002; });

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      })();

      return {
        destroy: function () {
          cancelAnimationFrame(raf); themeWatch.disconnect();
          window.removeEventListener("pointermove", onPointer); window.removeEventListener("resize", resize);
          renderer.dispose();
        },
      };
    }
  }
  window.mountTide = mountTide;
})();
