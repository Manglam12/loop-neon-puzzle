import {
  DIR_NORTH,
  DIR_EAST,
  DIR_SOUTH,
  DIR_WEST,
  LoopGameState,
  Vector2i,
  TileData,
} from './loop_types.ts';

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

const MAX_PARTICLES = 120;

export class LoopRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[];
  private animTime: number = 0;
  private shakeTrauma: number = 0;
  public highlightedHintCell: Vector2i | null = null;

  // Cached layout metrics
  private lastBoardMetrics = {
    offsetX: 0,
    offsetY: 0,
    tileSize: 60,
    boardSize: 5,
  };

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

  public addCameraTrauma(amount: number) {
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + amount);
  }

  public emitBurst(x: number, y: number, color: string, count: number = 20) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0;
        p.maxLife = 0.4 + Math.random() * 0.3;
        p.size = 2 + Math.random() * 3;
        p.color = color;
        spawned++;
      }
    }
  }

  public getTileAtScreenCoords(screenX: number, screenY: number): Vector2i | null {
    const { offsetX, offsetY, tileSize, boardSize } = this.lastBoardMetrics;
    const relX = screenX - offsetX;
    const relY = screenY - offsetY;

    if (relX < 0 || relY < 0) return null;

    const tileX = Math.floor(relX / tileSize);
    const tileY = Math.floor(relY / tileSize);

    if (tileX >= 0 && tileX < boardSize && tileY >= 0 && tileY < boardSize) {
      return { x: tileX, y: tileY };
    }
    return null;
  }

  public render(gameState: LoopGameState, dt: number) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    this.animTime += dt;

    // Decay trauma
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
    const shakeMagnitude = this.shakeTrauma * this.shakeTrauma * 10;
    const shakeX = (Math.random() * 2 - 1) * shakeMagnitude;
    const shakeY = (Math.random() * 2 - 1) * shakeMagnitude;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(shakeX, shakeY);

    // 1. Midnight background with radial lighting
    const bgGrad = ctx.createRadialGradient(
      width / 2, height / 2, 40,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );
    bgGrad.addColorStop(0, '#0c152e');
    bgGrad.addColorStop(1, '#050917');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Compute Board Dimensions (centered, responsive)
    const board = gameState.board;
    const size = board.size;

    const maxBoardW = Math.min(width * 0.90, 520);
    const maxBoardH = Math.min(height * 0.65, 520);
    const tileSize = Math.floor(Math.min(maxBoardW / size, maxBoardH / size));

    const boardWidth = size * tileSize;
    const boardHeight = size * tileSize;
    const offsetX = Math.floor((width - boardWidth) / 2);
    const offsetY = Math.floor((height - boardHeight) / 2);

    this.lastBoardMetrics = {
      offsetX,
      offsetY,
      tileSize,
      boardSize: size,
    };

    // Draw board frame backdrop
    ctx.fillStyle = 'rgba(11, 18, 40, 0.75)';
    ctx.strokeStyle = 'rgba(37, 54, 92, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(offsetX - 10, offsetY - 10, boardWidth + 20, boardHeight + 20, 24);
    ctx.fill();
    ctx.stroke();

    // 3. Render Each Tile
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const tx = offsetX + x * tileSize;
        const ty = offsetY + y * tileSize;
        const tile = board.tiles[y][x];

        // Check if tile has an active pending Echo
        const pendingEcho = gameState.echoQueue.find((e) => e.x === x && e.y === y);
        const isHinted = this.highlightedHintCell?.x === x && this.highlightedHintCell?.y === y;

        this.renderTile(ctx, tx, ty, tileSize, tile, pendingEcho, isHinted);
      }
    }

    // 4. Update and Draw Particles (Sparks & Electricity)
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

  private renderTile(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    size: number,
    tile: TileData,
    pendingEcho?: { turnsRemaining: number },
    isHinted?: boolean
  ) {
    const pad = 3;
    const innerW = size - pad * 2;
    const innerH = size - pad * 2;
    const cx = tx + size / 2;
    const cy = ty + size / 2;

    // Tile cell background
    let bgColor = 'rgba(17, 26, 50, 0.65)';
    let borderColor = 'rgba(40, 67, 107, 0.4)';

    if (tile.role === 'START') {
      bgColor = 'rgba(16, 44, 50, 0.9)';
      borderColor = '#10b981';
    } else if (tile.role === 'GOAL') {
      bgColor = 'rgba(51, 42, 26, 0.9)';
      borderColor = '#f59e0b';
    } else if (pendingEcho) {
      bgColor = 'rgba(48, 21, 47, 0.85)';
      borderColor = '#ec4899';
    } else if (tile.isPowered) {
      bgColor = 'rgba(16, 35, 65, 0.85)';
      borderColor = 'rgba(56, 189, 248, 0.6)';
    }

    if (isHinted) {
      borderColor = '#fbbf24';
    }

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = pendingEcho || isHinted ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.roundRect(tx + pad, ty + pad, innerW, innerH, 12);
    ctx.fill();
    ctx.stroke();

    // Draw circuits / wires
    if (tile.role === 'WIRE' || tile.role === 'START' || tile.role === 'GOAL') {
      const isPowered = tile.isPowered;
      const wireColor = isPowered ? '#38bdf8' : '#475569';
      const wireWidth = Math.max(4, size * 0.12);

      ctx.save();
      ctx.lineCap = 'round';

      // If powered, draw luminous glow backdrop
      if (isPowered) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = wireWidth * 2.2;
        this.drawWireArms(ctx, cx, cy, size, tile.mask);
      }

      // Draw primary laser wire
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = wireWidth;
      this.drawWireArms(ctx, cx, cy, size, tile.mask);

      // If powered, draw bright white center line
      if (isPowered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = wireWidth * 0.45;
        this.drawWireArms(ctx, cx, cy, size, tile.mask);
      }

      ctx.restore();
    }

    // Special icons for START & GOAL
    if (tile.role === 'START') {
      const pulse = 0.85 + 0.15 * Math.sin(this.animTime * 5);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.22 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(size * 0.24)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', cx, cy);
    } else if (tile.role === 'GOAL') {
      const rot = this.animTime * 1.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;

      // Rotating gold hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * (size * 0.24);
        const py = Math.sin(a) * (size * 0.24);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#f59e0b';
      ctx.font = `bold ${Math.round(size * 0.24)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G', cx, cy);
    }

    // Echo indicator badge
    if (pendingEcho) {
      const badgeW = size * 0.6;
      const badgeH = 14;
      const bx = tx + size - badgeW - 5;
      const by = ty + 5;

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ECHO ${pendingEcho.turnsRemaining}`, bx + badgeW / 2, by + badgeH / 2);

      // Curved rotation indicator
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.32, -Math.PI / 4, Math.PI / 2);
      ctx.stroke();
    }
  }

  private drawWireArms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    mask: number
  ) {
    const half = size / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.08, 0, Math.PI * 2);
    ctx.stroke();

    if (mask & DIR_NORTH) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - half);
      ctx.stroke();
    }
    if (mask & DIR_EAST) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + half, cy);
      ctx.stroke();
    }
    if (mask & DIR_SOUTH) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + half);
      ctx.stroke();
    }
    if (mask & DIR_WEST) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - half, cy);
      ctx.stroke();
    }
  }
}
