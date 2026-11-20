const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

let fieldImage = new Image();
let poses = []; // {x, y, theta} in meters/radians

const config = {
    fieldX: 150,
    fieldY: 50,
    fieldW: 1354,
    fieldH: 647,
    realW: 16.72154,
    realH: 8.0264,
};

fieldImage.src = 'field.png';
fieldImage.onload = () => {
    canvas.width = fieldImage.naturalWidth;
    canvas.height = fieldImage.naturalHeight;
    draw();
};


function toCanvasCoords(pose) {
    const px = config.fieldX + (pose.x / config.realW) * config.fieldW;
    const py = config.fieldY + config.fieldH - (pose.y / config.realH) * config.fieldH;
    const canvasTheta = -pose.theta;
    return { px, py, theta: canvasTheta };
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fieldImage.complete) {
        ctx.drawImage(fieldImage, 0, 0);
    }
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(config.fieldX, config.fieldY, config.fieldW, config.fieldH);
    ctx.setLineDash([]);

    if (poses.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.7)';
    ctx.lineWidth = 2;
    poses.forEach((pose, index) => {
        const coords = toCanvasCoords(pose);
        if (index === 0) {
            ctx.moveTo(coords.px, coords.py);
        } else {
            ctx.lineTo(coords.px, coords.py);
        }
    });
    ctx.stroke();
    poses.forEach((pose, index) => {
        const { px, py, theta } = toCanvasCoords(pose);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(theta);
        const robotSizeMeters = 0.9;
        const robotPixelSize = (robotSizeMeters / config.realW) * config.fieldW;
        ctx.fillStyle = 'rgba(0, 200, 0, 0.4)';
        ctx.strokeStyle = 'rgba(0, 100, 0, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(-robotPixelSize / 2, -robotPixelSize / 2, robotPixelSize, robotPixelSize);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(robotPixelSize / 2, 0);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'black';
        ctx.font = '14px Arial';
        ctx.fillText(index.toString(), px + 15, py - 15);
    });
}


document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            if (Array.isArray(parsed)) {
                poses = parsed.filter(p => 
                    typeof p.x === 'number' && 
                    typeof p.y === 'number' && 
                    typeof p.theta === 'number'
                );
                draw();
            } else {
                alert("JSON must be an array of objects.");
            }
        } catch (err) {
            alert("Error parsing JSON: " + err.message);
        }
    };
    reader.readAsText(file);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const dataStr = JSON.stringify(poses, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = "poses.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    poses = [];
    draw();
});