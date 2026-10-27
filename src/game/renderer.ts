import { Chamber, GameState, Position, Direction, VisualTheme } from './types.ts';
import { DIRECTION_VECTORS } from './echo_engine.ts';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 150;

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[];
  private playerRenderPos: Position = { x: 0, y: 0 };
  private echoRenderPos: Position = { x: 0, y: 0 };
  private shakeTrauma: number = 0;
  private animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.particles = new Array(MAX_PARTICLES).fill(null).map(() => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#38bdf8',
    }));
  }

  public resetPositions(playerPos: Position, echoPos: Position) {
    this.playerRenderPos = { ...playerPos };
    this.echoRenderPos = { ...echoPos };
  }

  public addCameraTrauma(amount: number) {
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + amount);
  }

  public emitBurst(x: number, y: number, color: string, count: number = 16) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 90;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.3;
        p.size = 2 + Math.random() * 3.5;
        p.color = color;
        spawned++;
      }
    }
  }

  public render(gameState: GameState, theme: VisualTheme, dt: number) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    this.animTime += dt;

    // Decay trauma
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
    const shakeMagnitude = this.shakeTrauma * this.shakeTrauma * 12;
    const shakeX = (Math.random() * 2 - 1) * shakeMagnitude;
    const shakeY = (Math.random() * 2 - 1) * shakeMagnitude;

    // Smoothly interpolate player & echo positions
    const lerpSpeed = 16;
    this.playerRenderPos.x += (gameState.playerPosition.x - this.playerRenderPos.x) * Math.min(1, dt * lerpSpeed);
    this.playerRenderPos.y += (gameState.playerPosition.y - this.playerRenderPos.y) * Math.min(1, dt * lerpSpeed);
    this.echoRenderPos.x += (gameState.echoPosition.x - this.echoRenderPos.x) * Math.min(1, dt * lerpSpeed);
    this.echoRenderPos.y += (gameState.echoPosition.y - this.echoRenderPos.y) * Math.min(1, dt * lerpSpeed);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(shakeX, shakeY);

    // 1. Background gradient
    const bgGrad = ctx.createRadialGradient(
      width / 2, height / 2, 50,
      width / 2, height / 2, Math.max(width, height)
    );
    bgGrad.addColorStop(0, theme.bgLight);
    bgGrad.addColorStop(1, theme.bgDark);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Chamber Grid calculations
    const chamber = gameState.chamber;
    const gridCols = chamber.width;
    const gridRows = chamber.height;

    const maxGridW = width * 0.92;
    const maxGridH = height * 0.76;
    const tileSize = Math.min(maxGridW / gridCols, maxGridH / gridRows, 68);

    const boardWidth = gridCols * tileSize;
    const boardHeight = gridRows * tileSize;
    const offsetX = (width - boardWidth) / 2;
    const offsetY = (height - boardHeight) / 2;

    // Board backdrop glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // 3. Render Tiles
    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        const tx = offsetX + x * tileSize;
        const ty = offsetY + y * tileSize;
        const tileType = chamber.tiles[y][x];
        const tileKey = `${x},${y}`;

        // Base tile cell
        if (tileType === 'WALL') {
          // Sleek geometric barrier
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.roundRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4, 8);
          ctx.fill();
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
          ctx.stroke();

          // Diagonal micro-accent
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
          ctx.beginPath();
          ctx.moveTo(tx + 8, ty + 8);
          ctx.lineTo(tx + tileSize - 8, ty + tileSize - 8);
          ctx.stroke();
        } else {
          // Walkable grid cell
          ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
          ctx.beginPath();
          ctx.roundRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.stroke();

          // Tile center dot
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath();
          ctx.arc(tx + tileSize / 2, ty + tileSize / 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render Inverter
        if (tileType === 'INVERTER') {
          ctx.save();
          ctx.translate(tx + tileSize / 2, ty + tileSize / 2);
          ctx.rotate(this.animTime * 1.5);
          ctx.strokeStyle = '#e879f9';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, tileSize * 0.3, 0, Math.PI * 1.5);
          ctx.stroke();
          ctx.restore();
        }

        // Render Hazards
        if (tileType === 'HAZARD') {
          const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 5);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulse * 0.15})`;
          ctx.beginPath();
          ctx.roundRect(tx + 4, ty + 4, tileSize - 8, tileSize - 8, 6);
          ctx.fill();
          ctx.strokeStyle = theme.hazardColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Spikes icon
          ctx.fillStyle = theme.hazardColor;
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', tx + tileSize / 2, ty + tileSize / 2);
        }

        // Render Switch
        const sw = gameState.switches[tileKey];
        if (sw) {
          const isPressed = sw.isPressed;
          ctx.fillStyle = isPressed ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.15)';
          ctx.beginPath();
          ctx.roundRect(tx + 8, ty + 8, tileSize - 16, tileSize - 16, 8);
          ctx.fill();
          ctx.strokeStyle = theme.switchColor;
          ctx.lineWidth = isPressed ? 2.5 : 1.5;
          ctx.stroke();

          // Concentric trigger ring
          ctx.beginPath();
          ctx.arc(tx + tileSize / 2, ty + tileSize / 2, isPressed ? 6 : 9, 0, Math.PI * 2);
          ctx.fillStyle = isPressed ? '#ffffff' : theme.switchColor;
          ctx.fill();
        }

        // Render Gate
        const gate = gameState.gates[tileKey];
        if (gate) {
          if (gate.isOpen) {
            // Open Gate indicator (laser retracted)
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(tx + 4, ty + 4, tileSize - 8, tileSize - 8);
            ctx.setLineDash([]);
          } else {
            // Closed Gate barrier (pulsing laser beam)
            const laserPulse = 0.8 + 0.2 * Math.sin(this.animTime * 6);
            ctx.fillStyle = `rgba(244, 63, 94, ${0.25 * laserPulse})`;
            ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);
            ctx.strokeStyle = theme.gateColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);

            // Barrier diagonal warning
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty + 8);
            ctx.lineTo(tx + tileSize - 8, ty + tileSize - 8);
            ctx.moveTo(tx + tileSize - 8, ty + 8);
            ctx.lineTo(tx + 8, ty + tileSize - 8);
            ctx.strokeStyle = theme.gateColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Render Energy Core
        if (tileType === 'CORE') {
          const corePulse = 0.85 + 0.15 * Math.sin(this.animTime * 4);
          const cx = tx + tileSize / 2;
          const cy = ty + tileSize / 2;
          const r = tileSize * 0.22 * corePulse;

          // Radiant aura
          const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
          aura.addColorStop(0, 'rgba(250, 204, 21, 0.6)');
          aura.addColorStop(1, 'rgba(250, 204, 21, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Rotating diamond
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(this.animTime * 2);
          ctx.fillStyle = theme.coreColor;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(r, 0);
          ctx.lineTo(0, r);
          ctx.lineTo(-r, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Render Exit Portal
        if (tileType === 'EXIT') {
          const cx = tx + tileSize / 2;
          const cy = ty + tileSize / 2;
          const isUnlocked = gameState.isGoalUnlocked;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(this.animTime * (isUnlocked ? 3 : 0.8));

          const portalColor = isUnlocked ? '#38bdf8' : '#64748b';
          ctx.strokeStyle = portalColor;
          ctx.lineWidth = 2.5;

          // Concentric portal hexagons
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = Math.cos(angle) * (tileSize * 0.32);
            const py = Math.sin(angle) * (tileSize * 0.32);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          if (isUnlocked) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.fill();
          }

          ctx.restore();
        }
      }
    }

    // 4. Render Echo Ghost (Phantom with temporal trail)
    const ex = offsetX + this.echoRenderPos.x * tileSize + tileSize / 2;
    const ey = offsetY + this.echoRenderPos.y * tileSize + tileSize / 2;

    // Echo ghost glow aura
    const echoAura = ctx.createRadialGradient(ex, ey, 2, ex, ey, tileSize * 0.5);
    echoAura.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
    echoAura.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = echoAura;
    ctx.beginPath();
    ctx.arc(ex, ey, tileSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Echo Ghost Ring
    ctx.strokeStyle = theme.echoColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(ex, ey, tileSize * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Predicted Next Vector for Echo (shows player the consequence of their queued move!)
    if (gameState.moveHistory.length >= chamber.echoDelay - 1) {
      const nextEchoMoveIdx = gameState.moveHistory.length - (chamber.echoDelay - 1);
      if (nextEchoMoveIdx >= 0 && nextEchoMoveIdx < gameState.moveHistory.length) {
        const queuedDir = gameState.moveHistory[nextEchoMoveIdx];
        const dirVec = DIRECTION_VECTORS[queuedDir];
        const arrowDist = tileSize * 0.55;

        ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + dirVec.x * arrowDist, ey + dirVec.y * arrowDist);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = theme.echoColor;
        ctx.beginPath();
        ctx.arc(ex + dirVec.x * arrowDist, ey + dirVec.y * arrowDist, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Render Player Spark (Primary Hero)
    const px = offsetX + this.playerRenderPos.x * tileSize + tileSize / 2;
    const py = offsetY + this.playerRenderPos.y * tileSize + tileSize / 2;

    // Player radiant aura
    const playerAura = ctx.createRadialGradient(px, py, 2, px, py, tileSize * 0.6);
    playerAura.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
    playerAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = playerAura;
    ctx.beginPath();
    ctx.arc(px, py, tileSize * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Player Core Prism
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, tileSize * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.playerColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, tileSize * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Update and Draw Particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const alpha = 1 - p.life / p.maxLife;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
    }

    ctx.restore();
  }
}
