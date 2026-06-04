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
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 40,
            height: 30,
            speed: 300,
            color: '#00ffea',
            lastShot: 0,
            shotDelay: 0.2, // seconds
            invulnerable: 0,
            weaponLevel: 1
        };

        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];

        this.generateLevel(this.level);
    }

    generateLevel(levelNum) {
        this.enemies = [];

        const isBoss = levelNum % 10 === 0;

        if (isBoss) {
            this.enemies.push({
                x: this.canvas.width / 2 - 100,
                y: 50,
                width: 200,
                height: 100,
                hp: 100 + (levelNum * 10),
                speed: 100 + (levelNum * 2),
                color: '#ff003c',
                scoreValue: 1000,
                fireRate: Math.max(0.2, 1.0 - (levelNum * 0.05)),
                lastFire: 0,
                type: 'boss',
                direction: 1
            });
        } else {
            const rows = Math.min(5, 2 + Math.floor(levelNum / 5));
            const cols = Math.min(10, 4 + Math.floor(levelNum / 3));

            const startX = 50;
            const startY = 50;
            const spacingX = 60;
            const spacingY = 50;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this.enemies.push({
                        x: startX + c * spacingX,
                        y: startY + r * spacingY,
                        width: 30,
                        height: 30,
                        hp: 1 + Math.floor(levelNum / 10),
                        speed: 20 + (levelNum * 2),
                        color: r === 0 ? '#ff006a' : '#ff003c',
                        scoreValue: 10 * (rows - r),
                        fireRate: Math.max(0.5, 3.0 - (levelNum * 0.1)),
                        lastFire: Math.random() * 2, // stagger initial fire
                        type: 'normal',
                        direction: 1
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
        return a.x < b.x + (b.width || b.size * 2) &&
               a.x + (a.width || a.size * 2) > b.x &&
               a.y < b.y + (b.height || b.size * 2) &&
               a.y + (a.height || a.size * 2) > b.y;
    }

    checkCollisions() {
        // Player bullets vs Enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let bulletRemoved = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.collides(bullet, enemy)) {
                    enemy.hp -= bullet.damage;
                    if (enemy.hp <= 0) {
                        this.score += enemy.scoreValue;
                        // Chance for powerup
                        if (Math.random() < 0.05) {
                            this.powerups.push({
                                x: enemy.x + enemy.width / 2 - 10,
                                y: enemy.y,
                                width: 20,
                                height: 20,
                                type: Math.random() < 0.2 ? 'life' : 'weapon',
                                color: '#ffff00'
                            });
                        }
                        this.enemies.splice(j, 1);
                    }
                    this.bullets.splice(i, 1);
                    bulletRemoved = true;
                    break;
                }
            }
            if (bulletRemoved) continue;

            // Remove bullets off screen
            if (bullet.y < -10) {
                this.bullets.splice(i, 1);
            }
        }

        // Enemy bullets vs Player
        if (this.player.invulnerable <= 0) {
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const bullet = this.enemyBullets[i];
                if (this.collides(bullet, this.player)) {
                    this.enemyBullets.splice(i, 1);
                    this.lives--;
                    this.player.invulnerable = 2.0; // 2 seconds if hit
                    if (this.lives <= 0) this.gameOver();
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

        // Clamp player
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }

        // Shooting
        if (this.player.invulnerable > 0) {
            this.player.invulnerable -= dt;
        }
        if (this.player.lastShot > 0) {
            this.player.lastShot -= dt;
        }
        if (this.keys.Space && this.player.lastShot <= 0) {
            if (this.player.weaponLevel === 1) {
                this.bullets.push({ x: this.player.x + this.player.width / 2 - 2.5, y: this.player.y, width: 5, height: 15, speed: 600, damage: 1, color: '#00ffea' });
            } else if (this.player.weaponLevel === 2) {
                this.bullets.push({ x: this.player.x + 5, y: this.player.y, width: 5, height: 15, speed: 600, damage: 1, color: '#00ffea' });
                this.bullets.push({ x: this.player.x + this.player.width - 10, y: this.player.y, width: 5, height: 15, speed: 600, damage: 1, color: '#00ffea' });
            } else {
                this.bullets.push({ x: this.player.x + 5, y: this.player.y, width: 5, height: 15, speed: 600, damage: 1, color: '#00ffea' });
                this.bullets.push({ x: this.player.x + this.player.width / 2 - 2.5, y: this.player.y - 10, width: 5, height: 15, speed: 600, damage: 1.5, color: '#00ffea' });
                this.bullets.push({ x: this.player.x + this.player.width - 10, y: this.player.y, width: 5, height: 15, speed: 600, damage: 1, color: '#00ffea' });
            }
            this.player.lastShot = this.player.shotDelay;
        }

        // Update bullets
        this.bullets.forEach(b => b.y -= b.speed * dt);
        this.enemyBullets.forEach(b => b.y += b.speed * dt);
        this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height + 10);

        // Update powerups
        this.powerups.forEach(p => p.y += 100 * dt);

        // Powerups vs Player
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.collides(this.powerups[i], this.player)) {
                if (this.powerups[i].type === 'weapon') {
                    this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
                } else if (this.powerups[i].type === 'life') {
                    this.lives++;
                }
                this.powerups.splice(i, 1);
            }
        }

        // Enemies movement and firing
        let edgeHit = false;
        this.enemies.forEach(e => {
            if (e.type === 'boss') {
                e.x += e.speed * dt * e.direction;
                if (e.x < 0 || e.x + e.width > this.canvas.width) {
                    e.direction *= -1;
                    e.x = Math.max(0, Math.min(e.x, this.canvas.width - e.width));
                }
            } else {
                e.x += e.speed * dt * e.direction;
                if (e.x < 0 || e.x + e.width > this.canvas.width) {
                    edgeHit = true;
                }
            }

            e.lastFire -= dt;
            if (e.lastFire <= 0) {
                if (Math.random() < 0.1 || e.type === 'boss') { // Small chance to fire or boss always fires
                    this.enemyBullets.push({
                        x: e.x + e.width / 2,
                        y: e.y + e.height,
                        size: 4,
                        speed: e.type === 'boss' ? 400 : 200 + this.level * 5,
                        color: '#ff00ea'
                    });
                }
                e.lastFire = e.fireRate;
            }
        });

        if (edgeHit) {
            this.enemies.forEach(e => {
                e.direction *= -1;
                e.y += 30; // Move down
            });
        }

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

        this.checkCollisions();
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
        this.ctx.fillText(`Оружие: Ур.${this.player.weaponLevel}`, this.canvas.width - 20, 50);

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

        if (this.state === 'PLAYING') {
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

            // Enemies
            this.enemies.forEach(e => {
                this.ctx.fillStyle = e.color;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = e.color;
                this.ctx.fillRect(e.x, e.y, e.width, e.height);
                // Inner eye/core
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(e.x + e.width/2 - 2, e.y + e.height/2 - 2, e.type==='boss'?20:4, e.type==='boss'?20:4);
            });
            this.ctx.shadowBlur = 0;

            this.drawUI();
        } else if (this.state === 'GAMEOVER') {
            this.drawGameOver();
        }
    }
}
window.SpaceGame = SpaceGame;
