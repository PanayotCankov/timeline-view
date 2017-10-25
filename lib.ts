import * as fs from "fs";
import * as path from "path";

var timeLog = /Timeline:\s*(\d*.?\d*ms:\s*)?([^\:]*\:)?(.*)\((\d*.?\d*)ms\.?\s*-\s*(\d*.\d*)ms\.?\)/;

export interface Trace {
    domain?: string;
    name: string;
    from: number;
    to: number;
}

export function toTrace(text): Trace {
    var result = text.match(timeLog);
    if (!result) {
        return;
    }

    var trace = {
        domain: result[2] && result[2].trim().replace(":", ""),
        name: result[3].trim(),
        from: parseFloat(result[4]),
        to: parseFloat(result[5])
    }

    return trace;
}

export function saveTimeline(timeline: Trace[], destination: string) {
    addRootLine(timeline);
    var chart = createChartHTML(timeline);
    var absolutePath = path.resolve(destination);
    console.log("\nTimeline report at: " + underline("file://" + absolutePath));
    fs.writeFileSync(absolutePath, chart);
}

export function addRootLine(timeline: Trace[]) {
    var { from, to } = timeline.reduce((acc, line) => {
        return { from: Math.min(acc.from, line.from), to: Math.max(acc.to, line.to)}
    }, { from: Number.POSITIVE_INFINITY, to: Number.NEGATIVE_INFINITY });
    timeline.push({ from, to, name: "ALL" });
}

export function underline(text: string): string {
    return "\u001b[4m" + text + "\u001b[0m";
}

export function createChartHTML(timeline: Trace[]): string {
    return `<!DOCTYPE html>
<html>
<head>
<title>Profiling</title>
<style>
${dumpfile("style.css")}
</style>
</head>
<body>
  <script>
var timeline = ${JSON.stringify(timeline)};
${dumpfile("chart.js")}
  </script>
</body>
</html>`;
}

function dumpfile(file: string) {
    return fs.readFileSync(path.join(__dirname, file)).toString();
}

