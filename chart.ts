// TRICKY: Expected to be injected earlier...
declare var timeline; // Trace[]

interface Trace {
    name: string;
    from: number;
    to: number;
    domain?: string;
}

interface StackedTrace {
    div: HTMLDivElement;
    visible: boolean;

    name: string;

    innerText: string;
    title: string;

    from: number;
    to: number;
    domain?: string;
    depth: number;

    leftPx: number;
    rightPx: number;

    parent: StackedTrace;
    importance: number;
}

const background = document.createElement('canvas');
const context2d = background.getContext("2d");

const rulerBackgroundPattern = document.createElement('canvas');
const rulerBackgroundPatternContext = rulerBackgroundPattern.getContext("2d");

const timelineBackgroundPattern = document.createElement('canvas');
const timelineBackgroundPatternContext = timelineBackgroundPattern.getContext("2d");

const chart = document.createElement('div');
chart.id = "chart";
chart.appendChild(background);

const tracesDiv = document.createElement('div');
tracesDiv.id = "traces";
chart.appendChild(tracesDiv);

document.body.appendChild(chart);

function createStackTraces(traces: Trace[]): StackedTrace[] {
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
    const traceAtDepth = [];
    const stackedTraces = traces.map(original => {
        let { from, to, name, domain } = original;
        let trace: StackedTrace = <any>{ from, to };
        let depth;
        for (let i = 0; i <= traceAtDepth.length; i++) {
            if (traceAtDepth[i] === undefined || traceAtDepth[i].to <= from) {
                depth = i;
                traceAtDepth[i] = trace;
                break;
            }
        }
        let parent: StackedTrace;
        for (let i = depth - 1; i >= 0; i--) {
            let potentialParent = traceAtDepth[i];
            if (potentialParent.from <= trace.from && potentialParent.to >= trace.to) {
                trace.parent = parent = potentialParent;
                break;
            }
        }
        let importance: number;
        if (parent) {
            // If it is very big, or very small - it does not matter, if it is about half its parent then it is important.
            let ratio = (trace.to - trace.from) / (parent.to - parent.from);
            importance = depth <= 1 ? 1 : 0.5 - Math.cos(2 * Math.PI * ratio) * 0.5;
        } else {
            importance = 1;
        }

        let innerText = name + " " + Math.round(to - from) + "ms";
        let title = name + " " + (to - from) + "ms " + importance;
        let visible = false;

        const div = document.createElement('div');
        div.className = "trace " + domain;
        tracesDiv.appendChild(div);
        div.title = title;
        div.innerText = innerText;

        div.style.visibility = "hidden";
        div.style.top = 30 + depth * 21 + "px";
        div.addEventListener("click", focusTrace);

        Object.assign<StackedTrace, StackedTrace>(trace, { from, to, name, domain, depth, innerText, title, div, visible, leftPx: 0, rightPx: 0, parent, importance });
        (<any>div).trace = trace;

        return trace;
    }).sort((a, b) => b.importance - a.importance);
    return stackedTraces;
}

const stackTraces = createStackTraces(timeline);
let visibleStackTraces = new Set();

let min = stackTraces.reduce((min, trace) => Math.min(min, trace.from), Number.POSITIVE_INFINITY);
let max = stackTraces.reduce((max, trace) => Math.max(max, trace.to), Number.NEGATIVE_INFINITY);

let left: number = min;
let pixelPerMs: number = 0.0000001;

const enum LevelOfDetail {
    High,
    Low
}
let levelOfDetail = LevelOfDetail.High;
let debounceLODTimeout;
function highLOD() {
    if (debounceLODTimeout) {
        clearTimeout(debounceLODTimeout);
    }
    levelOfDetail = LevelOfDetail.High;
    tracesDiv.style.pointerEvents = "auto";
    updateStackTraces();
}
function lowLOD() {
    levelOfDetail = LevelOfDetail.Low;
    if (debounceLODTimeout) {
        clearTimeout(debounceLODTimeout);
    }
    debounceLODTimeout = setTimeout(highLOD, 1000);
    tracesDiv.style.pointerEvents = "none";
}
function updateStackTraces() {
    let windowWidth = window.innerWidth;
    let right = left + (windowWidth / pixelPerMs);

    let nextVisible = new Set();
    let showTraces = levelOfDetail === LevelOfDetail.Low ? 64 : 512;
    for (var i = 0; i < stackTraces.length && nextVisible.size < showTraces; i++) {
        let trace = stackTraces[i];
        trace.leftPx = (trace.from - left) * pixelPerMs;
        trace.rightPx = (trace.to - left) * pixelPerMs;
        if (trace.rightPx >= 0 && trace.leftPx <= windowWidth && (trace.rightPx - trace.leftPx >= 2)) {
            nextVisible.add(trace);
        }
    }

    visibleStackTraces.forEach(trace => {
        if (nextVisible.has(trace)) {
            return;
        }
        trace.div.style.visibility = "collapse";
    });
    nextVisible.forEach(trace => {
        let { div, leftPx, rightPx } = trace;
        div.style.left = Math.max(-5, leftPx) + "px";
        div.style.right = Math.max(-5, windowWidth - rightPx) + "px";
        if (!visibleStackTraces.has(trace)) {
            div.style.visibility = "visible";
        }
    });
    visibleStackTraces = nextVisible;
}

function snap(px: number): number {
    return Math.floor(px) + 0.5;
}

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

    const rulerPattern = context2d.createPattern(rulerBackgroundPattern, "repeat");
    context2d.fillStyle = rulerPattern;
    context2d.translate(rulerOffset, 0);
    context2d.fillRect(-rulerOffset, 0, background.width, 30);
    context2d.translate(-rulerOffset, 0);

    const timelinePattern = context2d.createPattern(timelineBackgroundPattern, "repeat");
    context2d.fillStyle = timelinePattern;
    context2d.translate(rulerOffset, 31);
    context2d.fillRect(-rulerOffset, 0, background.width, background.height - 30);
    context2d.translate(-rulerOffset, -31);

    // Separators
    context2d.lineWidth = 1;
    context2d.strokeStyle = "#666";
    context2d.beginPath();
    context2d.moveTo(0, snap(30));
    context2d.lineTo(background.width, snap(30));
    context2d.stroke();
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

function focusTrace(this: HTMLDivElement, ev: MouseEvent) {
    if (suspendClicks) {
        return;
    }
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
    lowLOD();
    clampViewPort();
    resizeRulers();
    redrawBackground();
    updateStackTraces();
});

let dragging = false;
let suspendClicks = false;
let mouseDown = false;
let dragOriginXms: number; // The millisecond at which the chart was grabbed
let dragOriginXpx: number;
window.addEventListener("mousedown", function(e) {
    dragOriginXms = left + e.clientX / pixelPerMs;
    dragOriginXpx = e.clientX;
    mouseDown = true;
}, true);
window.addEventListener("mouseup", function(e) {
    if (dragging) {
        dragging = false;
        // Cant find a way to prevent the click action
        suspendClicks = true;
        setTimeout(() => suspendClicks = false, 1);
    }
    mouseDown = false;
});
window.addEventListener("mousemove", function(e) {
    if (mouseDown && !dragging && Math.abs(e.clientX - dragOriginXpx) > 8) {
        dragging = true;
    }
    if (dragging) {
        left = dragOriginXms - e.clientX / pixelPerMs;
        lowLOD();
        clampViewPort();
        redrawBackground();
        updateStackTraces();
    }
});

clampViewPort();
resize();
resizeRulers();
redrawBackground();
updateStackTraces();
