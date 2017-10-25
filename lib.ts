import * as fs from "fs";
import * as path from "path";
import * as chalk from "chalk";

var timeLog = /Timeline:\s*(\d*.?\d*ms:\s*)?([^\:]*\:)?(.*)\((\d*.?\d*)ms\.?\s*-\s*(\d*.\d*)ms\.?\)/;

export function toTrace(text) {
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

export function saveReport(timeline, destination) {
    var range = timeline.reduce((acc, line) => {
        return { from: Math.min(acc.from, line.from), to: Math.max(acc.to, line.to)}
    }, { from: Number.POSITIVE_INFINITY, to: Number.NEGATIVE_INFINITY });
    range.name = "ALL";
    timeline.push(range);

    var chart = getChart(timeline);

    var absolutePath = path.resolve(destination);
    console.log("\nTimeline report at: " + chalk.underline("file://" + absolutePath));

    fs.writeFileSync(absolutePath, chart);

}

function getChart(timeline) {
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
${dumpfile("index.js")}
  </script>
</body>
</html>`;
}

function dumpfile(file: string) {
    return fs.readFileSync(path.join(__dirname, file)).toString();
}

