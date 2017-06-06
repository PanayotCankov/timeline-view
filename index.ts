interface Trace {
    name: string;
    from: number;
    to: number;
    domain?: string;
}
interface StackedTrace {
    name: string;
    from: number;
    to: number;
    domain?: string;
    depth: number;
}

function orderStackTraces(traces: Trace[]): StackedTrace[] {
    traces = traces.slice(0).sort((a, b) => {
        if (a.from < b.from) {
            return -1;
        } else if (a.from === b.from) {
            if (a.to > b.to) {
                return -1;
            } else if (a.to === b.to) {
                return 0;
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    });
    const depthTo = [];
    const stackedTraces = traces.map(({ from, to, name, domain }) => {
        var depth;
        for (var i = 0; i <= depthTo.length; i++) {
            if (depthTo[i] === undefined || depthTo[i] <= from) {
                depth = i;
                depthTo[i] = to;
                break;
            }
        }
        return { from, to, name, domain, depth };
    });
    return stackedTraces;
}

// TRICKY: Expected to be injected earlier...
declare var timeline;
const stackTraces = orderStackTraces(timeline);

let min = stackTraces.reduce((min, trace) => Math.min(min, trace.from), Number.POSITIVE_INFINITY);
let max = stackTraces.reduce((max, trace) => Math.max(max, trace.from), Number.NEGATIVE_INFINITY);

let left: number = min;
let pixelPerMs: number = 0.1;

const stackTraceDivs: HTMLDivElement[] = [];
function createStackTraces() {
    stackTraces.forEach(trace => {
        const div = document.createElement('div');
        div.className = "trace " + trace.domain;
        traces.appendChild(div);
        div.innerText = trace.name + " " + Math.round(trace.to - trace.from) + "ms";
        div.title = trace.name + " " + (trace.to - trace.from) + "ms";
        (<any>div).trace = trace;
        stackTraceDivs.push(div);
        div.addEventListener("click", focusTrace);
    });
}
function updateStackTraces() {
    let right = left + (window.innerWidth / pixelPerMs);

    stackTraceDivs.forEach(div => {
        let trace = (<any>div).trace;
        let leftPx = (trace.from - left) * pixelPerMs;
        let rightPx = window.innerWidth - (trace.to - left) * pixelPerMs;
        div.style.left = Math.max(-5, leftPx) + "px";
        div.style.top = 30 + trace.depth * 21 + "px";
        div.style.right = Math.max(-5, rightPx) + "px";
    });
}

function snap(px: number): number {
    return Math.floor(px) + 0.5;
}

const background = document.createElement('canvas');
const context = background.getContext("2d");

const rulerBackgroundPattern = document.createElement('canvas');
const rulerBackgroundPatternContext = rulerBackgroundPattern.getContext("2d");

const timelineBackgroundPattern = document.createElement('canvas');
const timelineBackgroundPatternContext = timelineBackgroundPattern.getContext("2d");

function redrawBackground() {
    rulerBackgroundPatternContext.fillStyle = "#DDD";
    rulerBackgroundPatternContext.fillRect(0, 0, rulerBackgroundPattern.width, rulerBackgroundPattern.height);

    timelineBackgroundPatternContext.fillStyle = "#FFF";
    timelineBackgroundPatternContext.fillRect(0, 0, timelineBackgroundPattern.width, timelineBackgroundPattern.height);

    rulerBackgroundPatternContext.lineWidth = 1;
    rulerBackgroundPatternContext.strokeStyle = "#BBB";
    rulerBackgroundPatternContext.beginPath();
    rulerBackgroundPatternContext.moveTo(snap(0), 0);
    rulerBackgroundPatternContext.lineTo(snap(0), rulerBackgroundPattern.height);
    rulerBackgroundPatternContext.stroke();

    timelineBackgroundPatternContext.lineWidth = 1;
    timelineBackgroundPatternContext.strokeStyle = "#EEE";
    timelineBackgroundPatternContext.beginPath();
    timelineBackgroundPatternContext.moveTo(snap(0), 0);
    timelineBackgroundPatternContext.lineTo(snap(0), timelineBackgroundPattern.height);
    timelineBackgroundPatternContext.stroke();

    // timeline horizontal lines
    timelineBackgroundPatternContext.lineWidth = 1;
    timelineBackgroundPatternContext.strokeStyle = "#EEE";
    timelineBackgroundPatternContext.beginPath();
    timelineBackgroundPatternContext.moveTo(0, snap(timelineBackgroundPattern.height - 1));
    timelineBackgroundPatternContext.lineTo(timelineBackgroundPattern.width, snap(timelineBackgroundPattern.height - 1));
    timelineBackgroundPatternContext.stroke();

    rulerBackgroundPatternContext.strokeStyle = "#CCC";
    timelineBackgroundPatternContext.strokeStyle = "#EEE";
    for (var i = 1; i < 10; i++) {
        const x = rulerBackgroundPattern.width / 1000 * i * 100;
        rulerBackgroundPatternContext.beginPath();
        rulerBackgroundPatternContext.moveTo(snap(x), rulerBackgroundPattern.height - rulerBackgroundPattern.height * 0.25);
        rulerBackgroundPatternContext.lineTo(snap(x), rulerBackgroundPattern.height);
        rulerBackgroundPatternContext.stroke();

        timelineBackgroundPatternContext.beginPath();
        timelineBackgroundPatternContext.moveTo(snap(x), 0);
        timelineBackgroundPatternContext.lineTo(snap(x), timelineBackgroundPattern.height);
        timelineBackgroundPatternContext.stroke();
    }

    const rulerOffset = -Math.round((left - Math.floor(left / 1000) * 1000) * pixelPerMs)

    const rulerPattern = context.createPattern(rulerBackgroundPattern, "repeat");
    context.fillStyle = rulerPattern;
    context.translate(rulerOffset, 0);
    context.fillRect(-rulerOffset, 0, background.width, 30);
    context.translate(-rulerOffset, 0);

    const timelinePattern = context.createPattern(timelineBackgroundPattern, "repeat");
    context.fillStyle = timelinePattern;
    context.translate(rulerOffset, 31);
    context.fillRect(-rulerOffset, 0, background.width, background.height - 30);
    context.translate(-rulerOffset, -31);

    // Separators
    context.lineWidth = 1;
    context.strokeStyle = "#666";
    context.beginPath();
    context.moveTo(0, snap(30));
    context.lineTo(background.width, snap(30));
    context.stroke();
}
function resize() {
    background.width = window.innerWidth;
    background.height = window.innerHeight;
}
function resizeRulers() {
    // Lets try major rules on seconds and minor rules on 100ms.
    const width = 1000 * pixelPerMs;

    rulerBackgroundPattern.width = width;
    rulerBackgroundPattern.height = 30;

    timelineBackgroundPattern.width = width;
    timelineBackgroundPattern.height = 21;
}
function clampViewPort() {
    pixelPerMs = Math.max(window.innerWidth / (max - min), pixelPerMs);
    left = Math.min(Math.max(min, left), max - window.innerWidth / pixelPerMs);
}

const chart = document.createElement('div');
chart.id = "chart";
chart.appendChild(background);

const traces = document.createElement('div');
traces.id = "traces";
chart.appendChild(traces);

document.body.appendChild(chart);

function focusTrace(this: HTMLDivElement, ev: MouseEvent) {
    const trace = (<any>this).trace;
    pixelPerMs = window.innerWidth / (trace.to - trace.from);
    left = trace.from;
    clampViewPort();
    resizeRulers();
    redrawBackground();
    updateStackTraces();
}
window.addEventListener("resize", function () {
    resize();
    resizeRulers();
    clampViewPort();
    updateStackTraces();
    redrawBackground();
});
window.addEventListener("mousewheel", function(e) {
    const mousePoint = left + e.clientX / pixelPerMs;
    pixelPerMs = Math.pow(2, (<any>Math).log2(pixelPerMs) + Math.max(-0.25, Math.min(0.25, e.wheelDelta)));
    left = mousePoint - e.clientX / pixelPerMs;
    clampViewPort();
    resizeRulers();
    redrawBackground();
    updateStackTraces();
});

let dragging = false;
let dragOriginXms: number; // The millisecond at which the chart was grabbed
window.addEventListener("mousedown", function(e) {
    dragging = true;
    dragOriginXms = left + e.clientX / pixelPerMs;
}, true);
window.addEventListener("mouseup", function(e) {
    dragging = false;
}, true);
window.addEventListener("mousemove", function(e) {
    if (dragging) {
        left = dragOriginXms - e.clientX / pixelPerMs;
        clampViewPort();
        redrawBackground();
        updateStackTraces();
    }
});

clampViewPort();
resize();
resizeRulers();
redrawBackground();
createStackTraces();
updateStackTraces();
