const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

const fieldImage = new Image();
let poses = [];

const config = {
    fieldX: 150,
    fieldY: 50,
    fieldW: 1354,
    fieldH: 647,
    realW: 16.72154,
    realH: 8.0264,
};

const ROBOT_SIZE_METERS = 0.9;
const ARROW_LEN = 42;
const ARROW_HEAD_LEN = 16;
const ARROW_HEAD_W = 16;
const ARROW_SHAFT_W = 4;

const robotPixelSize = (ROBOT_SIZE_METERS / config.realW) * config.fieldW;
const robotHalf = robotPixelSize / 2;

let selectedIndex = -1;
let dragState = null;

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

function canvasToWorld(px, py) {
    return {
        x: ((px - config.fieldX) / config.fieldW) * config.realW,
        y: ((config.fieldY + config.fieldH - py) / config.fieldH) * config.realH,
    };
}

function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function normalizeAngle(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
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
        const active = dragState !== null && dragState.index === index;
        const selected = selectedIndex === index;
        drawRobot(pose, index, active, selected);
    });
}

function drawRobot(pose, index, active, selected) {
    const { px, py, theta } = toCanvasCoords(pose);
    const highlighted = active || selected;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(theta);

    ctx.fillStyle = highlighted ? 'rgba(0, 200, 0, 0.55)' : 'rgba(0, 200, 0, 0.4)';
    ctx.strokeStyle = highlighted ? 'rgba(0, 90, 255, 1)' : 'rgba(0, 100, 0, 1)';
    ctx.lineWidth = highlighted ? 3 : 2;
    ctx.beginPath();
    ctx.rect(-robotHalf, -robotHalf, robotPixelSize, robotPixelSize);
    ctx.fill();
    ctx.stroke();

    const backX = -robotHalf;
    const tipX = backX - ARROW_LEN;
    const headBaseX = tipX + ARROW_HEAD_LEN;

    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = ARROW_SHAFT_W;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(backX, 0);
    ctx.lineTo(headBaseX, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.lineTo(headBaseX, -ARROW_HEAD_W / 2);
    ctx.lineTo(headBaseX, ARROW_HEAD_W / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = selected ? 'blue' : 'black';
    ctx.font = (selected ? 'bold ' : '') + '14px Arial';
    ctx.fillText(String(index), px + 15, py - 15);
}

function hitTest(px, py) {
    for (let i = poses.length - 1; i >= 0; i--) {
        const coords = toCanvasCoords(poses[i]);
        const dx = px - coords.px;
        const dy = py - coords.py;
        const cos = Math.cos(coords.theta);
        const sin = Math.sin(coords.theta);
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;

        if (
            lx <= -robotHalf &&
            lx >= -(robotHalf + ARROW_LEN + 8) &&
            Math.abs(ly) <= ARROW_HEAD_W / 2 + 6
        ) {
            return { index: i, mode: 'rotate' };
        }

        if (Math.abs(lx) <= robotHalf && Math.abs(ly) <= robotHalf) {
            return { index: i, mode: 'move' };
        }
    }
    return null;
}

function selectPose(index) {
    selectedIndex = (index >= 0 && index < poses.length) ? index : -1;
    syncPosePanel();
    draw();
}

function syncPosePanel() {
    const panel = document.getElementById('pose-panel');

    if (selectedIndex < 0 || selectedIndex >= poses.length) {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    const pose = poses[selectedIndex];
    document.getElementById('poseIndexLabel').textContent = '#' + selectedIndex;

    const indexInput = document.getElementById('poseIndexInput');
    indexInput.max = Math.max(0, poses.length - 1);
    setInputValue(indexInput, selectedIndex);

    setInputValue(document.getElementById('poseXInput'), pose.x.toFixed(2));
    setInputValue(document.getElementById('poseYInput'), pose.y.toFixed(2));
    setInputValue(
        document.getElementById('poseThetaInput'),
        (pose.theta * 180 / Math.PI).toFixed(1)
    );

    document.getElementById('thetaRadHint').textContent = pose.theta.toFixed(3) + ' rad';
}

function setInputValue(el, value) {
    if (document.activeElement !== el) {
        el.value = value;
    }
}

document.getElementById('poseIndexInput').addEventListener('change', (e) => {
    if (selectedIndex < 0) return;

    let newIndex = parseInt(e.target.value, 10);
    if (!isFinite(newIndex)) {
        syncPosePanel();
        return;
    }
    newIndex = Math.max(0, Math.min(poses.length - 1, newIndex));

    if (newIndex !== selectedIndex) {
        const [moved] = poses.splice(selectedIndex, 1);
        poses.splice(newIndex, 0, moved);
        selectedIndex = newIndex;
    }

    syncPosePanel();
    draw();
});

document.getElementById('poseXInput').addEventListener('input', (e) => {
    if (selectedIndex < 0) return;
    const v = parseFloat(e.target.value);
    if (!isFinite(v)) return;
    poses[selectedIndex].x = Math.max(0, Math.min(config.realW, v));
    draw();
});

document.getElementById('poseYInput').addEventListener('input', (e) => {
    if (selectedIndex < 0) return;
    const v = parseFloat(e.target.value);
    if (!isFinite(v)) return;
    poses[selectedIndex].y = Math.max(0, Math.min(config.realH, v));
    draw();
});

document.getElementById('poseThetaInput').addEventListener('input', (e) => {
    if (selectedIndex < 0) return;
    const deg = parseFloat(e.target.value);
    if (!isFinite(deg)) return;
    poses[selectedIndex].theta = normalizeAngle(deg * Math.PI / 180);
    document.getElementById('thetaRadHint').textContent =
        poses[selectedIndex].theta.toFixed(3) + ' rad';
    draw();
});

['poseXInput', 'poseYInput', 'poseThetaInput'].forEach(id => {
    document.getElementById(id).addEventListener('change', syncPosePanel);
});

canvas.addEventListener('pointerdown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
    }

    const pt = getCanvasPoint(e);
    const hit = hitTest(pt.x, pt.y);

    if (!hit) {
        selectPose(-1);
        return;
    }

    selectPose(hit.index);

    const pose = poses[hit.index];
    const coords = toCanvasCoords(pose);

    if (hit.mode === 'move') {
        const world = canvasToWorld(pt.x, pt.y);
        dragState = {
            index: hit.index,
            mode: 'move',
            offsetX: pose.x - world.x,
            offsetY: pose.y - world.y,
        };
    } else {
        dragState = {
            index: hit.index,
            mode: 'rotate',
            startMouseAngle: Math.atan2(pt.y - coords.py, pt.x - coords.px),
            startTheta: pose.theta,
        };
    }

    if (canvas.setPointerCapture) {
        canvas.setPointerCapture(e.pointerId);
    }
    canvas.style.cursor = 'grabbing';
    draw();
    e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
    const pt = getCanvasPoint(e);

    if (!dragState) {
        const hit = hitTest(pt.x, pt.y);
        canvas.style.cursor = hit ? 'grab' : 'default';
        return;
    }

    const pose = poses[dragState.index];

    if (dragState.mode === 'move') {
        const world = canvasToWorld(pt.x, pt.y);
        pose.x = world.x + dragState.offsetX;
        pose.y = world.y + dragState.offsetY;
    } else {
        const coords = toCanvasCoords(pose);
        const mouseAngle = Math.atan2(pt.y - coords.py, pt.x - coords.px);
        const delta = mouseAngle - dragState.startMouseAngle;
        pose.theta = normalizeAngle(dragState.startTheta - delta);
    }

    if (dragState.index === selectedIndex) {
        syncPosePanel();
    }

    draw();
});

function endDrag(e) {
    if (!dragState) return;
    dragState = null;

    if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    canvas.style.cursor = 'default';
    syncPosePanel();
    draw();
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

document.getElementById('addBtn').addEventListener('click', () => {
    const cx = config.realW / 2;
    const cy = config.realH / 2;
    const MIN_GAP = 0.75;

    let x = cx;
    let y = cy;
    for (let i = 0; i < 60; i++) {
        const occupied = poses.some(p => Math.hypot(p.x - x, p.y - y) < MIN_GAP);
        if (!occupied) break;
        const angle = i * 2.399963;
        const radius = MIN_GAP * Math.sqrt(i + 1);
        x = cx + Math.cos(angle) * radius;
        y = cy + Math.sin(angle) * radius;
    }

    const margin = ROBOT_SIZE_METERS / 2;
    x = Math.min(Math.max(x, margin), config.realW - margin);
    y = Math.min(Math.max(y, margin), config.realH - margin);

    poses.push({ x, y, theta: 0 });
    selectPose(poses.length - 1);
});

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
                dragState = null;
                selectedIndex = -1;
                syncPosePanel();
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
    dragState = null;
    selectedIndex = -1;
    syncPosePanel();
    draw();
});