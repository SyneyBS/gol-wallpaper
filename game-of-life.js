'use strict'

//neighbor positions
const nx = [-1, 0, 1, -1, 1, -1, 0, 1];
const ny = [-1, -1, -1, 0, 0, 1, 1, 1];

const cellSize = 6;
const margin = 1;
const framesPerStep = 4;

const gpu = new GPU();

class GameOfLife {
    constructor(id) {
        this.canvas = document.getElementById(id);
        this.ctx = this.canvas.getContext("2d");

        this.width = Math.floor(window.innerWidth / cellSize) + 2;
        this.height =  Math.floor(window.innerHeight / cellSize) + 2;

        this.canvas.width = (this.width-2) * cellSize;
        this.canvas.height = (this.height-2) * cellSize;

        this.run = this.run.bind(this);
        
        this.world = matrix(this.width, this.height, "r");
        this.sinceStep = 0;

        this.renderWorld = gpu.createKernel(function(world, width, height, cellSize, margin) {
            const cellx = Math.floor(this.thread.x / cellSize);
            const celly = Math.floor((this.thread.y) / cellSize);
            var col = [(cellx/width * 0.75 + 0.25), (celly/height * 0.75 + 0.25), 0.75];
            col *= world[celly+1][cellx+1];
            col *= Math.sign(this.thread.x - cellx*cellSize - margin+1);
            col *= Math.sign(this.thread.y - celly*cellSize - margin+1);
            col[0] += 0.045;
            col[1] += 0.045;
            col[2] += 0.08;
            this.color(col[0], col[1], col[2], 1);
        }, {output: [this.canvas.width, this.canvas.height], graphical: true});

        this.logicKernel = gpu.createKernel(function(world, width, height, nx, ny) {
            let n = 0;
            //count neighbors
            for (let i = 0; i < 8; i++) {
                const xp = this.thread.x + nx[i];
                const yp = this.thread.y + ny[i];
                if (xp < width && xp >= 0 && yp < height && yp >= 0 && world[yp][xp] == 1) {
                    n++;
                }
            }
            if (world[this.thread.y][this.thread.x] == 1) {
                return (n > 1 && n < 4) ? 1 : 0;
            }
            return n == 3 ? 1 : 0;
        }, {output: [this.width, this.height]});
    }
    
    step() {
        this.world = this.logicKernel(this.world, this.width, this.height, nx, ny);
    }

    render() {
        this.renderWorld(this.world, this.width, this.height, cellSize, margin);
        this.ctx.putImageData(new ImageData(this.renderWorld.getPixels(), this.canvas.width), 0, 0);
    }

    run() {
        this.sinceStep++;
        if (this.sinceStep >= framesPerStep) {
            this.sinceStep = 0;
            this.step();
            this.randomEdges(0.3);
            this.render();
        }
        window.requestAnimationFrame(this.run);
    }

    randomEdges(weight=0.4) {
        for (let x = 0; x < this.width; x++) {
            this.world[0][x] = Math.random() < weight;
            this.world[this.height - 1][x] = Math.random() < weight;
        }
        for (let y = 0; y < this.height; y++) {
            this.world[y][0] = Math.random() < weight;
            this.world[y][this.width - 1] = Math.random() < weight;
        }
    }
}

function matrix(width, height, fill=false, weight=0.4) {
    let m = [];
    let content = fill;

    for (let y = 0; y < height; y++) {
        let n = [];
        for (let x = 0; x < width; x++) {
            if (fill == "r") {
                content = Math.random() < weight;
            }
            n.push(content);
        }
        m.push(Array.from(n));
    }
    return m;
}

let gameOfLife = new GameOfLife("gol");

gameOfLife.run();

