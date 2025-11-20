class MusicVisualizer {
    constructor() {
        this.audio = document.getElementById('audio');
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.isPlaying = false;
        this.animationId = null;
        this.mode = 'bars';
        this.particles = [];
        
        this.initCanvas();
        this.initEventListeners();
    }

    initCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    initEventListeners() {
        document.getElementById('audioFile').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.updateVolume(e));
        document.getElementById('modeSelect').addEventListener('change', (e) => this.changeMode(e));
        
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.stop());
        
        document.querySelector('.progress-bar').addEventListener('click', (e) => this.seek(e));
        
        window.addEventListener('resize', () => this.initCanvas());
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.audio.src = url;
            document.getElementById('trackName').textContent = file.name;
            
            this.audio.addEventListener('loadedmetadata', () => {
                document.getElementById('duration').textContent = this.formatTime(this.audio.duration);
                document.getElementById('playBtn').disabled = false;
                document.getElementById('pauseBtn').disabled = false;
                document.getElementById('stopBtn').disabled = false;
            });

            if (!this.audioContext) {
                this.initAudioContext();
            }
        }
    }

    initAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width / (window.devicePixelRatio || 1),
                y: Math.random() * this.canvas.height / (window.devicePixelRatio || 1),
                radius: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                hue: Math.random() * 360
            });
        }
    }

    play() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.audio.play();
        this.isPlaying = true;
        this.visualize();
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.clearCanvas();
    }

    updateVolume(event) {
        const volume = event.target.value / 100;
        this.audio.volume = volume;
        document.getElementById('volumeValue').textContent = event.target.value + '%';
    }

    changeMode(event) {
        this.mode = event.target.value;
    }

    updateProgress() {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        document.getElementById('progress').style.width = progress + '%';
        document.getElementById('currentTime').textContent = this.formatTime(this.audio.currentTime);
    }

    seek(event) {
        const progressBar = event.currentTarget;
        const clickX = event.offsetX;
        const width = progressBar.offsetWidth;
        const duration = this.audio.duration;
        this.audio.currentTime = (clickX / width) * duration;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    clearCanvas() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, width, height);
    }

    visualize() {
        if (!this.isPlaying) return;

        this.animationId = requestAnimationFrame(() => this.visualize());
        this.analyser.getByteFrequencyData(this.dataArray);

        switch (this.mode) {
            case 'bars':
                this.drawBars();
                break;
            case 'circle':
                this.drawCircle();
                break;
            case 'wave':
                this.drawWave();
                break;
            case 'particles':
                this.drawParticles();
                break;
        }
    }

    drawBars() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, width, height);

        const barWidth = (width / this.bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            const hue = (i / this.bufferLength) * 360;
            const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.6)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            this.ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.3)`;
            this.ctx.fillRect(x, height - barHeight - 10, barWidth, 5);

            x += barWidth + 1;
        }
    }

    drawCircle() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 4;

        for (let i = 0; i < this.bufferLength; i++) {
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const barHeight = (this.dataArray[i] / 255) * 100;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            
            const hue = (i / this.bufferLength) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawWave() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, width, height);

        const sliceWidth = width / this.bufferLength;
        
        for (let layer = 0; layer < 3; layer++) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 3;
            
            const hue = (Date.now() / 50 + layer * 120) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.6)`;
            
            let x = 0;
            for (let i = 0; i < this.bufferLength; i++) {
                const v = this.dataArray[i] / 255;
                const y = height / 2 + (v * height / 3 * Math.sin((i + layer * 30) * 0.1)) - (layer * 30);

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            this.ctx.stroke();
        }
    }

    drawParticles() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, width, height);

        const average = this.dataArray.reduce((a, b) => a + b) / this.bufferLength;
        const scale = average / 128;

        this.particles.forEach((particle, index) => {
            const dataIndex = Math.floor((index / this.particles.length) * this.bufferLength);
            const intensity = this.dataArray[dataIndex] / 255;
            
            particle.x += particle.speedX * scale;
            particle.y += particle.speedY * scale;
            
            if (particle.x < 0 || particle.x > width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > height) particle.speedY *= -1;
            
            particle.x = Math.max(0, Math.min(width, particle.x));
            particle.y = Math.max(0, Math.min(height, particle.y));
            
            const size = particle.radius * (1 + intensity * 2);
            const hue = (particle.hue + Date.now() / 50) % 360;
            
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, size
            );
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${intensity})`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            for (let j = index + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const dx = other.x - particle.x;
                const dy = other.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100 * intensity) {
                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${intensity * 0.3})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.stroke();
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MusicVisualizer();
});
