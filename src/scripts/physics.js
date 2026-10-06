(function (P) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function segmentContact(ball, ax, ay, bx, by, radius) {
    const dx = bx - ax, dy = by - ay;
    if (dx * dx + dy * dy < 1e-12) return null;
    const t = clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const x = ax + t * dx, y = ay + t * dy;
    const distance = Math.hypot(ball.x - x, ball.y - y);
    if (distance >= ball.r + radius) return null;
    const nx = distance > 0.001 ? (ball.x - x) / distance : -dy / Math.hypot(dx, dy);
    const ny = distance > 0.001 ? (ball.y - y) / distance : dx / Math.hypot(dx, dy);
    return { nx, ny, depth: ball.r + radius - distance, t, x: x + nx * radius, y: y + ny * radius };
  }
  function reflect(ball, contact, restitution, surfaceVx = 0, surfaceVy = 0) {
    ball.x += contact.nx * (contact.depth + (contact.padding ?? 0.1));
    ball.y += contact.ny * (contact.depth + (contact.padding ?? 0.1));
    // Reflect the PRE-impact velocity relative to the moving surface.
    // Tangential velocity is preserved; no fixed launch direction or random aim.
    const dot = (ball.vx - surfaceVx) * contact.nx + (ball.vy - surfaceVy) * contact.ny;
    if (dot < 0) {
      ball.vx -= (1 + restitution) * dot * contact.nx;
      ball.vy -= (1 + restitution) * dot * contact.ny;
    }
    return dot < 0;
  }
  // One-sided walls always push back to the playing surface, even if a moving
  // flipper has pushed the ball across the rail. No outward-facing end caps.
  function wallContact(ball, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    if (length < 1e-6) return null;
    const along = ((ball.x - ax) * dx + (ball.y - ay) * dy) / length;
    if (along < 0 || along > length) return null;
    const nx = dy / length, ny = -dx / length;
    const distance = (ball.x - ax) * nx + (ball.y - ay) * ny;
    return distance < ball.r ? { nx, ny, depth: ball.r - distance } : null;
  }
  function ellipseContact(ball, ellipse) {
    const [cx, cy, rx, ry] = ellipse;
    const dx = ball.x - cx, dy = ball.y - cy;
    const ex = rx + ball.r, ey = ry + ball.r;
    const q = Math.hypot(dx / ex, dy / ey);
    if (q >= 1) return null;
    // Nearest point on the expanded ellipse, including deep/central overlap.
    // Search one quadrant, then refine the best local bracket. This preserves
    // the existing simple ellipse collider while correcting the full overlap.
    const px = Math.abs(dx), py = Math.abs(dy);
    const distance2 = a => (ex * Math.cos(a) - px) ** 2 + (ey * Math.sin(a) - py) ** 2;
    const step = Math.PI / 64;
    let best = 0;
    for (let i = 1; i <= 32; i++) if (distance2(i * step) < distance2(best)) best = i * step;
    let lo = Math.max(0, best - step), hi = Math.min(Math.PI / 2, best + step);
    for (let i = 0; i < 28; i++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (distance2(a) < distance2(b)) hi = b; else lo = a; }
    let angle = (lo + hi) / 2;
    for (const a of [0, Math.PI / 2]) if (distance2(a) < distance2(angle)) angle = a;
    const ox = (ex * Math.cos(angle) - px) * (dx < 0 ? -1 : 1);
    const oy = (ey * Math.sin(angle) - py) * (dy < 0 ? -1 : 1);
    const depth = Math.hypot(ox, oy);
    return { nx: ox / depth, ny: oy / depth, depth };
  }
  function flipperSurfaceVelocity(flipper, contact, transfer = 1) {
    const omega = flipper.velocity * transfer;
    return { vx: -omega * (contact.y - flipper.y), vy: omega * (contact.x - flipper.x) };
  }
  // Contact with the UNION of circles expanded by the ball radius. Only exposed
  // arcs and their intersections are boundaries; internal seams never rebound.
  function circlesContact(ball, circles) {
    const expanded = circles.map(([x, y, r]) => [x, y, r + ball.r + 0.1]);
    const inside = ([x, y, r], px = ball.x, py = ball.y) => Math.hypot(px - x, py - y) < r - 1e-7;
    if (!circles.some(([x, y, r]) => Math.hypot(ball.x - x, ball.y - y) < r + ball.r - 1e-7)) return null;
    let nearest = null;
    function candidate(x, y) {
      if (expanded.some(c => inside(c, x, y))) return;
      const depth = Math.hypot(x - ball.x, y - ball.y);
      // Padding belongs to every circle before finding the union boundary.
      // Extending a displacement past an unpadded intersection could re-enter
      // its neighbour. Other colliders retain the original reflect padding.
      if (depth > 1e-9 && (!nearest || depth < nearest.depth)) nearest = { nx: (x - ball.x) / depth, ny: (y - ball.y) / depth, depth, padding: 0 };
    }
    for (const [x, y, r] of expanded) {
      const dx = ball.x - x, dy = ball.y - y, distance = Math.hypot(dx, dy);
      if (distance > 1e-9) candidate(x + dx / distance * r, y + dy / distance * r);
      else for (const [nx, ny] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) candidate(x + nx * r, y + ny * r);
    }
    for (let i = 0; i < expanded.length; i++) for (let j = i + 1; j < expanded.length; j++) {
      const [ax, ay, ar] = expanded[i], [bx, by, br] = expanded[j];
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
      if (d < 1e-9 || d > ar + br || d < Math.abs(ar - br)) continue;
      const along = (ar * ar - br * br + d * d) / (2 * d);
      const height = Math.sqrt(Math.max(0, ar * ar - along * along));
      const x = ax + dx / d * along, y = ay + dy / d * along;
      candidate(x - dy / d * height, y + dx / d * height);
      candidate(x + dy / d * height, y - dx / d * height);
    }
    return nearest;
  }
  // Legacy exported configurations can still use their single ellipse.
  function characterContact(ball, stage) { return stage.circles ? circlesContact(ball, stage.circles) : ellipseContact(ball, stage.collider); }
  P.Physics = { flipperSurfaceVelocity, clamp, segmentContact, wallContact, reflect, ellipseContact, circlesContact, characterContact };
})(globalThis.Pinball = globalThis.Pinball || {});
