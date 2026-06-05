class SpaceGame {
    constructor(username) {
        this.username = username;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.backgroundColor = '#050005';
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);

        this.resize();
        this.resizeHandler = this.resize.bind(this);
        window.addEventListener('resize', this.resizeHandler);

        this.isRunning = false;
        this.animationId = null;
        this.lastTime = 0;

        // Game state
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.score = 0;
        this.level = 1;
        this.lives = 3;

        // Entities
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];
        this.stars = [];

        this.initStars();

        // Inputs
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Pillarboxing logic: Fixed 3:4 aspect ratio for gameplay area
        const targetRatio = 3 / 4;
        const currentRatio = this.canvas.width / this.canvas.height;

        if (currentRatio > targetRatio) {
            // Screen is wider than needed, pillarbox sides
            this.gameHeight = this.canvas.height;
            this.gameWidth = this.canvas.height * targetRatio;
            this.offsetX = (this.canvas.width - this.gameWidth) / 2;
            this.offsetY = 0;
        } else {
            // Screen is taller than needed, letterbox top/bottom
            this.gameWidth = this.canvas.width;
            this.gameHeight = this.canvas.width / targetRatio;
            this.offsetX = 0;
            this.offsetY = (this.canvas.height - this.gameHeight) / 2;
        }
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }

    updateStars() {
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });
    }

    drawStars(ctx) {
        ctx.fillStyle = 'white';
        this.stars.forEach(star => {
            ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    start() {
        document.body.style.overflow = 'hidden';
        this.canvas.style.display = 'block';

        // Prevent scrolling with arrows/space during game
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        this.resetGame();
        this.isRunning = true;
        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        document.body.style.overflow = '';

        // Cleanup DOM and Event Listeners to prevent memory leaks
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(e) {
        if (e.code === 'ArrowLeft') { this.keys.ArrowLeft = true; e.preventDefault(); }
        if (e.code === 'ArrowRight') { this.keys.ArrowRight = true; e.preventDefault(); }
        if (e.code === 'Space') { this.keys.Space = true; e.preventDefault(); }
        if (e.code === 'Escape') { this.stop(); }
    }

    handleKeyUp(e) {
        if (e.code === 'ArrowLeft') { this.keys.ArrowLeft = false; }
        if (e.code === 'ArrowRight') { this.keys.ArrowRight = false; }
        if (e.code === 'Space') { this.keys.Space = false; }
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;

        this.player = {
            x: this.offsetX + this.gameWidth / 2 - 20,
            y: this.offsetY + this.gameHeight - 60,
            width: 40,
            height: 30,
            hitboxRatio: 0.3, // Core hitbox is 30% of visual width/height
            speed: 350,
            color: '#ff003c', // Player = Red/Warm
            lastShot: 0,
            shotDelay: 0.2, // seconds
            invulnerable: 0,
            weaponModifier: 'normal', // normal, scatter, piercing, orbital
            modifierTimer: 0
        };

        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];
        this.obelisks = [];

        this.initObelisks();
        // Global Swarm Controller
        this.swarmDirection = 1;
        this.swarmSpeed = 20;
        this.swarmDropAmount = 30;

        this.generateLevel(this.level);
    }

    initObelisks() {
        this.obelisks = [];
        const numObelisks = 4;
        const spacing = this.gameWidth / (numObelisks + 1);

        for (let i = 0; i < numObelisks; i++) {
            this.obelisks.push({
                x: this.offsetX + spacing * (i + 1) - 30,
                y: this.offsetY + this.gameHeight - 150,
                width: 60,
                height: 40,
                hp: 15, // Degrades as it takes damage
                color: '#666'
            });
        }
    }

    generateLevel(levelNum) {
        this.enemies = [];
        this.swarmDirection = 1;
        this.swarmSpeed = 30 + (levelNum * 5);

        const isBoss = levelNum % 10 === 0;

        if (isBoss) {
            this.enemies.push({
                x: this.offsetX + this.gameWidth / 2 - 100,
                y: this.offsetY + 50,
                width: 200,
                height: 100,
                hp: 100 + (levelNum * 10),
                color: '#ff003c',
                scoreValue: 1000,
                fireRate: Math.max(0.2, 1.0 - (levelNum * 0.05)),
                lastFire: 0,
                type: 'boss',
                independent: true, // Bosses move independently of the swarm
                direction: 1,
                speed: 100 + (levelNum * 2)
            });
        } else {
            const rows = Math.min(6, 3 + Math.floor(levelNum / 4));
            const cols = Math.min(10, 5 + Math.floor(levelNum / 3));

            const spacingX = 50;
            const spacingY = 45;

            // Center the swarm
            const swarmWidth = cols * spacingX;
            const startX = this.offsetX + (this.gameWidth - swarmWidth) / 2;
            const startY = this.offsetY + 50;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Determine enemy type based on row and level
                    let type = 'normal'; // Послушники
                    let color = '#ff006a';
                    let hp = 1 + Math.floor(levelNum / 10);

                    if (r === 0 && levelNum > 2) {
                        type = 'shield'; // Щитоносцы (frontal invulnerability handled in collision)
                        color = '#888888';
                        hp = 2 + Math.floor(levelNum / 5);
                    } else if (r === rows - 1 && levelNum > 4 && Math.random() < 0.2) {
                        type = 'kamikaze'; // Ловчие
                        color = '#00ff00';
                    } else if (levelNum > 6 && Math.random() < 0.1) {
                        type = 'phantom'; // Мерцающие Ужасы
                        color = 'rgba(150, 0, 255, 0.8)';
                    }

                    this.enemies.push({
                        x: startX + c * spacingX,
                        y: startY + r * spacingY,
                        width: 30,
                        height: 30,
                        hp: hp,
                        color: color,
                        scoreValue: 10 * (rows - r),
                        fireRate: Math.max(0.5, 3.0 - (levelNum * 0.1)),
                        lastFire: Math.random() * 2, // stagger initial fire
                        type: type,
                        state: 'swarm', // 'swarm', 'diving' (for kamikaze), 'intangible' (for phantom)
                        timer: 0 // generic timer for state changes
                    });
                }
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTime) / 1000; // in seconds
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    collides(a, b) {
        // Handle smaller core hitbox for player
        let aX = a.x, aY = a.y, aW = a.width || a.size * 2, aH = a.height || a.size * 2;
        if (a === this.player) {
            aW *= a.hitboxRatio; aH *= a.hitboxRatio;
            aX += (a.width - aW) / 2; aY += (a.height - aH) / 2;
        }

        let bX = b.x, bY = b.y, bW = b.width || b.size * 2, bH = b.height || b.size * 2;
        if (b === this.player) {
            bW *= b.hitboxRatio; bH *= b.hitboxRatio;
            bX += (b.width - bW) / 2; bY += (b.height - bH) / 2;
        }

        return aX < bX + bW &&
               aX + aW > bX &&
               aY < bY + bH &&
               aY + aH > bY;
    }

    checkCollisions(dt) {
        // Player bullets vs Enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let bulletRemoved = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];

                // Phantoms are immune while intangible
                if (enemy.type === 'phantom' && enemy.state === 'intangible') continue;

                if (this.collides(bullet, enemy)) {
                    // Shield bearers take no damage from front (bottom of enemy)
                    if (enemy.type === 'shield' && bullet.y > enemy.y + enemy.height / 2) {
                        // Deflected! Create a visual spark later, for now just remove bullet
                    } else {
                        enemy.hp -= bullet.damage;
                    }

                    if (enemy.hp <= 0) {
                        this.score += enemy.scoreValue;

                        // Scatter modifier explosion on kill
                        if (bullet.scatter) {
                            const scatLevel = bullet.scatterLevel || 1;
                            const splinters = 2 + scatLevel;
                            for (let s = 0; s < splinters; s++) {
                                const angle = -Math.PI/2 + (Math.PI * s / Math.max(1, splinters - 1)); // Spread out downwards
                                this.bullets.push({
                                    x: enemy.x + enemy.width/2, y: enemy.y + enemy.height,
                                    width: 4, height: 10, speed: 400, damage: 0.5 + (scatLevel * 0.1), color: '#ffaa00',
                                    vx: Math.cos(angle) * 300, vy: Math.abs(Math.sin(angle)) * 300
                                });
                            }
                        }

                        // Chance for powerup
                        if (Math.random() < 0.1) {
                            const pTypes = ['life', 'scatter', 'piercing', 'orbital'];
                            const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
                            this.powerups.push({
                                x: enemy.x + enemy.width / 2 - 10,
                                y: enemy.y,
                                width: 20,
                                height: 20,
                                type: pType,
                                color: pType === 'life' ? '#ff0000' : '#00ffff'
                            });
                        }
                        this.enemies.splice(j, 1);
                    }

                    if (bullet.piercing) {
                        bullet.damage *= 0.5; // Damage reduces after passing through
                        if (bullet.damage < 0.2) {
                            this.bullets.splice(i, 1);
                            bulletRemoved = true;
                        }
                    } else {
                        this.bullets.splice(i, 1);
                        bulletRemoved = true;
                        break;
                    }
                }
            }
            if (bulletRemoved) continue;

            // Bullet vs Obelisks
            if (!bulletRemoved) {
                for (let k = this.obelisks.length - 1; k >= 0; k--) {
                    if (this.collides(bullet, this.obelisks[k])) {
                        this.obelisks[k].hp -= bullet.damage;
                        if (this.obelisks[k].hp <= 0) this.obelisks.splice(k, 1);
                        this.bullets.splice(i, 1);
                        bulletRemoved = true;
                        break;
                    }
                }
            }

            // Remove bullets off screen
            if (bullet.y < -10) {
                this.bullets.splice(i, 1);
            }
        }

        // Enemy bullets vs Player & Obelisks
        if (this.player.invulnerable <= 0) {
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const bullet = this.enemyBullets[i];
                if (this.collides(bullet, this.player)) {
                    this.enemyBullets.splice(i, 1);
                    this.lives--;
                    this.player.invulnerable = 2.0; // 2 seconds if hit
                    if (this.lives <= 0) this.gameOver();
                    continue; // Skip obelisk check if hit player
                }

                for (let k = this.obelisks.length - 1; k >= 0; k--) {
                    if (this.collides(bullet, this.obelisks[k])) {
                        this.obelisks[k].hp -= 1; // Enemy bullets do 1 dmg to cover
                        if (this.obelisks[k].hp <= 0) this.obelisks.splice(k, 1);
                        this.enemyBullets.splice(i, 1);
                        break;
                    }
                }
            }

            // Enemies vs Player
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                if (this.collides(this.enemies[i], this.player)) {
                    this.enemies.splice(i, 1);
                    this.lives--;
                    this.player.invulnerable = 2.0;
                    if (this.lives <= 0) this.gameOver();
                }
            }
        }

        // Powerups vs Player
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.collides(this.powerups[i], this.player)) {
                if (this.powerups[i].type === 'life') {
                    this.lives++;
                } else {
                    if (this.player.weaponModifier === this.powerups[i].type) {
                        this.player.modifierLevel++; // Level up the modifier
                    } else {
                        this.player.weaponModifier = this.powerups[i].type;
                        this.player.modifierLevel = 1;
                    }
                    this.player.modifierTimer = 10.0 + (this.player.modifierLevel * 2); // Time increases with level
                }
                this.powerups.splice(i, 1);
            }
        }

        // Orbital vs Enemy Bullets/Enemies
        if (this.player.weaponModifier === 'orbital') {
            const level = this.player.modifierLevel || 1;
            const orbitalsCount = Math.min(4, level);
            const radius = 40 + (level * 5);

            for (let o = 0; o < orbitalsCount; o++) {
                const angle = (performance.now() / 200) + (o * (Math.PI * 2 / orbitalsCount));
                const orbital = {
                    x: this.player.x + this.player.width/2 + Math.cos(angle) * radius - 10,
                    y: this.player.y + this.player.height/2 + Math.sin(angle) * radius - 10,
                    width: 20, height: 20
                };

                for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                    if (this.collides(orbital, this.enemyBullets[i])) {
                        this.enemyBullets.splice(i, 1);
                    }
                }

                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    if (this.collides(orbital, this.enemies[i])) {
                        this.enemies[i].hp -= (5 + level * 2) * dt; // Continuous damage, scales with level
                        if (this.enemies[i].hp <= 0) {
                            this.score += this.enemies[i].scoreValue;
                            this.enemies.splice(i, 1);
                        }
                    }
                }
            }
        }
    }

    update(dt) {
        this.updateStars();

        if (this.state !== 'PLAYING') return;

        // Player movement
        if (this.keys.ArrowLeft) {
            this.player.x -= this.player.speed * dt;
        }
        if (this.keys.ArrowRight) {
            this.player.x += this.player.speed * dt;
        }

        // Clamp player to gameplay area
        if (this.player.x < this.offsetX) this.player.x = this.offsetX;
        if (this.player.x + this.player.width > this.offsetX + this.gameWidth) {
            this.player.x = this.offsetX + this.gameWidth - this.player.width;
        }

        // Modifiers Timer
        if (this.player.modifierTimer > 0) {
            this.player.modifierTimer -= dt;
            if (this.player.modifierTimer <= 0) {
                this.player.weaponModifier = 'normal';
                this.player.modifierLevel = 1;
            }
        }

        // Shooting
        if (this.player.invulnerable > 0) {
            this.player.invulnerable -= dt;
        }
        if (this.player.lastShot > 0) {
            this.player.lastShot -= dt;
        }
        if (this.keys.Space && this.player.lastShot <= 0) {
            const bx = this.player.x + this.player.width / 2 - 2.5;
            const by = this.player.y;
            const level = this.player.modifierLevel || 1;

            if (this.player.weaponModifier === 'scatter') {
                // Scatter scales with level
                const scatterDmg = 0.5 + (level * 0.1);
                this.bullets.push({ x: bx, y: by, width: 5, height: 15, speed: 600, damage: scatterDmg, color: '#ffaa00', scatter: true, scatterLevel: level });

                // Add more angled projectiles based on level
                for (let i = 1; i <= Math.min(4, level); i++) {
                    const angleSpread = 50 * i;
                    this.bullets.push({ x: bx - 10*i, y: by + 5*i, width: 5, height: 15, speed: 600, damage: scatterDmg, color: '#ffaa00', scatter: true, scatterLevel: level, vx: -angleSpread });
                    this.bullets.push({ x: bx + 10*i, y: by + 5*i, width: 5, height: 15, speed: 600, damage: scatterDmg, color: '#ffaa00', scatter: true, scatterLevel: level, vx: angleSpread });
                }
            } else if (this.player.weaponModifier === 'piercing') {
                // Piercing scales size and damage with level
                const pWidth = 9 + (level * 2);
                const pDmg = 2 + (level * 0.5);
                this.bullets.push({ x: bx - pWidth/2 + 2.5, y: by - 20, width: pWidth, height: 40 + (level * 5), speed: 800, damage: pDmg, color: '#00ffff', piercing: true });
            } else {
                this.bullets.push({ x: bx, y: by, width: 5, height: 15, speed: 600, damage: 1, color: '#ff003c' }); // Warm/Red for standard
            }
            this.player.lastShot = Math.max(0.05, this.player.shotDelay - (level > 1 ? 0.02 * level : 0)); // Slight fire rate boost per level
        }

        // Update bullets
        this.bullets.forEach(b => {
            b.y -= b.speed * dt;
            if (b.vx) b.x += b.vx * dt;
            if (b.vy) b.y += b.vy * dt;
        });
        this.enemyBullets.forEach(b => b.y += b.speed * dt);
        this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height + 10);

        // Update powerups
        this.powerups.forEach(p => p.y += 100 * dt);

        // Global Swarm Movement
        let edgeHit = false;

        // Pre-calculate edge hits for the swarm
        for (const e of this.enemies) {
            if (e.state === 'swarm' && !e.independent) {
                const nextX = e.x + this.swarmSpeed * dt * this.swarmDirection;
                if (nextX < this.offsetX || nextX + e.width > this.offsetX + this.gameWidth) {
                    edgeHit = true;
                    break;
                }
            }
        }

        if (edgeHit) {
            this.swarmDirection *= -1;
            this.enemies.forEach(e => {
                if (e.state === 'swarm' && !e.independent) {
                    e.y += this.swarmDropAmount; // Drop down
                }
            });
        }

        // Enemies update
        this.enemies.forEach(e => {
            if (e.independent) {
                e.x += e.speed * dt * e.direction;
                if (e.x < this.offsetX || e.x + e.width > this.offsetX + this.gameWidth) {
                    e.direction *= -1;
                    e.x = Math.max(this.offsetX, Math.min(e.x, this.offsetX + this.gameWidth - e.width));
                }
            } else if (e.state === 'swarm') {
                e.x += this.swarmSpeed * dt * this.swarmDirection;

                // Kamikaze trigger
                if (e.type === 'kamikaze' && Math.random() < 0.001) { // 0.1% chance per frame to dive
                    e.state = 'diving';
                    // Calculate dive trajectory towards player
                    const dx = (this.player.x + this.player.width/2) - (e.x + e.width/2);
                    const dy = (this.player.y + this.player.height/2) - (e.y + e.height/2);
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    e.vx = (dx / dist) * 400; // Dive speed
                    e.vy = (dy / dist) * 400;
                }

                // Phantom toggle
                if (e.type === 'phantom') {
                    e.timer -= dt;
                    if (e.timer <= 0) {
                        e.state = e.state === 'intangible' ? 'swarm' : 'intangible';
                        e.timer = 2.0; // 2 seconds per state
                        e.color = e.state === 'intangible' ? 'rgba(150, 0, 255, 0.2)' : 'rgba(150, 0, 255, 0.8)';
                    }
                }
            } else if (e.state === 'diving') {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
            }

            // Firing
            if (e.state !== 'diving' && e.state !== 'intangible') {
                e.lastFire -= dt;
                if (e.lastFire <= 0) {
                    // Only lower enemies should fire (simple approximation: randomly fire, boss always fires)
                    if (Math.random() < 0.1 || e.type === 'boss') {
                        this.enemyBullets.push({
                            x: e.x + e.width / 2,
                            y: e.y + e.height,
                            size: e.type === 'boss' ? 6 : 4,
                            speed: e.type === 'boss' ? 400 : 200 + this.level * 5,
                            color: e.type === 'shield' ? '#ffaa00' : '#ff00ea'
                        });
                    }
                    e.lastFire = e.fireRate;
                }
            }
        });

        // Remove enemies that fall off the bottom of the screen
        // Also deduct life if they pass the player
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.y > this.canvas.height) {
                this.enemies.splice(i, 1);
                if (this.lives > 0) {
                    this.lives--;
                    if (this.lives <= 0) this.gameOver();
                }
            }
        }

        // Level progression
        if (this.enemies.length === 0 && this.state === 'PLAYING') {
            this.level++;
            this.generateLevel(this.level);
        }

        this.checkCollisions(dt);
    }

    drawPlayer() {
        if (this.player.invulnerable > 0 && Math.floor(performance.now() / 100) % 2 === 0) {
            return; // blink
        }
        this.ctx.fillStyle = this.player.color;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.player.color;

        // Draw a simple ship shape
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
        this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
        this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height - 10);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
    }

    async gameOver() {
        if (this.state === 'GAMEOVER') return;
        this.state = 'GAMEOVER';

        // Fetch API to submit score
        try {
            await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username || 'Аноним', score: this.score })
            });

            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            this.leaderboard = data.leaderboard || [];
        } catch (e) {
            console.error('Error saving/fetching score:', e);
            this.leaderboard = [];
        }

        // Click to restart
        const restartHandler = () => {
            this.resetGame();
            this.state = 'PLAYING';
            this.canvas.removeEventListener('click', restartHandler);
        };
        setTimeout(() => {
            this.canvas.addEventListener('click', restartHandler);
        }, 500); // Prevent accidental immediate restart
    }

    drawUI() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Cinzel", serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        this.ctx.fillText(`Уровень: ${this.level}`, 20, 20);
        this.ctx.fillText(`Счёт: ${this.score}`, 20, 50);

        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Жизни: ${this.lives}`, this.canvas.width - 20, 20);
        let modText = 'Базовое';
        if (this.player.weaponModifier === 'scatter') modText = 'Осколочное';
        if (this.player.weaponModifier === 'piercing') modText = 'Пронзающее';
        if (this.player.weaponModifier === 'orbital') modText = 'Сфера Затмения';
        const levelText = this.player.weaponModifier !== 'normal' ? ` Ур.${this.player.modifierLevel}` : '';
        this.ctx.fillText(`Оружие: ${modText}${levelText} ${this.player.modifierTimer > 0 ? Math.ceil(this.player.modifierTimer)+'с' : ''}`, this.canvas.width - 20, 50);

        // Controls guide
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '14px "Montserrat", sans-serif';
        this.ctx.fillText('Стрелки - Движение', this.canvas.width - 20, 80);
        this.ctx.fillText('Пробел - Выстрел', this.canvas.width - 20, 100);
        this.ctx.fillText('Escape - Выход', this.canvas.width - 20, 120);
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(5, 0, 5, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#ff003c';
        this.ctx.font = '60px "Cinzel", serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('СЛИЯНИЕ ПРЕРВАНО', this.canvas.width / 2, 100);

        this.ctx.fillStyle = '#00ffea';
        this.ctx.font = '30px "Cinzel", serif';
        this.ctx.fillText(`Твой счёт: ${this.score}`, this.canvas.width / 2, 160);

        // Leaderboard
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px "Montserrat", sans-serif';
        this.ctx.fillText('--- Книга Крови (Топ 10) ---', this.canvas.width / 2, 220);

        if (this.leaderboard) {
            let y = 260;
            this.leaderboard.forEach((entry, idx) => {
                this.ctx.fillText(`${idx + 1}. ${entry.username} - ${entry.score}`, this.canvas.width / 2, y);
                y += 30;
            });
        } else {
            this.ctx.fillText('Загрузка...', this.canvas.width / 2, 260);
        }

        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '16px "Montserrat", sans-serif';
        this.ctx.fillText('Нажми для повторного погружения или Escape для выхода', this.canvas.width / 2, this.canvas.height - 50);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#050005'; // Match var(--bg-dark)
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawStars(this.ctx);

        // Draw gameplay area boundaries (Pillarbox visual cue)
        this.ctx.strokeStyle = 'rgba(255, 0, 60, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.offsetX, this.offsetY, this.gameWidth, this.gameHeight);

        if (this.state === 'PLAYING') {
            // Orbital Shield Render
            if (this.player.weaponModifier === 'orbital') {
                const level = this.player.modifierLevel;
                const orbitalsCount = Math.min(4, level);
                const radius = 40 + (level * 5);

                this.ctx.fillStyle = '#00ffea';
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = '#00ffea';

                for (let o = 0; o < orbitalsCount; o++) {
                    this.ctx.beginPath();
                    const angle = (performance.now() / 200) + (o * (Math.PI * 2 / orbitalsCount));
                    const ox = this.player.x + this.player.width/2 + Math.cos(angle) * radius;
                    const oy = this.player.y + this.player.height/2 + Math.sin(angle) * radius;
                    this.ctx.arc(ox, oy, 10, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.shadowBlur = 0;
            }

            this.drawPlayer();

            // Bullets
            this.bullets.forEach(b => {
                this.ctx.fillStyle = b.color;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = b.color;
                this.ctx.fillRect(b.x, b.y, b.width, b.height);
            });
            this.ctx.shadowBlur = 0;

            // Enemy Bullets
            this.enemyBullets.forEach(b => {
                this.ctx.fillStyle = b.color;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = b.color;
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            this.ctx.shadowBlur = 0;

            // Powerups
            this.powerups.forEach(p => {
                this.ctx.fillStyle = p.color;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#000';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(p.type === 'life' ? 'L' : 'W', p.x + p.width/2, p.y + p.height/2);
            });
            this.ctx.shadowBlur = 0;

            // Obelisks
            this.obelisks.forEach(o => {
                this.ctx.fillStyle = o.color;
                this.ctx.globalAlpha = Math.max(0.2, o.hp / 15); // Fade as damaged
                // Draw jagged obelisk shape
                this.ctx.beginPath();
                this.ctx.moveTo(o.x, o.y + o.height);
                this.ctx.lineTo(o.x + o.width/2, o.y);
                this.ctx.lineTo(o.x + o.width, o.y + o.height);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            });

            // Enemies
            this.enemies.forEach(e => {
                this.ctx.fillStyle = e.color;
                this.ctx.shadowBlur = e.state === 'intangible' ? 0 : 15;
                this.ctx.shadowColor = e.color;

                if (e.type === 'shield') {
                    // Draw shield shape
                    this.ctx.fillRect(e.x, e.y, e.width, e.height * 0.7);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(e.x, e.y + e.height * 0.7, e.width, e.height * 0.3); // Bright shield front
                } else if (e.type === 'kamikaze') {
                    // Triangle shape
                    this.ctx.beginPath();
                    this.ctx.moveTo(e.x + e.width/2, e.y + e.height);
                    this.ctx.lineTo(e.x, e.y);
                    this.ctx.lineTo(e.x + e.width, e.y);
                    this.ctx.closePath();
                    this.ctx.fill();
                } else {
                    this.ctx.fillRect(e.x, e.y, e.width, e.height);
                }

                // Inner eye/core (skip for phantoms when intangible)
                if (e.state !== 'intangible') {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(e.x + e.width/2 - 2, e.y + e.height/2 - 2, e.type==='boss'?20:4, e.type==='boss'?20:4);
                }
            });
            this.ctx.shadowBlur = 0;

            this.drawUI();
        } else if (this.state === 'GAMEOVER') {
            this.drawGameOver();
        }
    }
}
window.SpaceGame = SpaceGame;
