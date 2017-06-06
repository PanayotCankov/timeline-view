#!/usr/bin/env node

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as chalk from "chalk";

var timeLog = /Timeline:\s*(\d*.?\d*ms:\s*)?([^\:]*\:)?(.*)\((\d*.?\d*)ms\.?\s*-\s*(\d*.\d*)ms\.?\)/;

var readlineInterface = readline.createInterface({ input: process.stdin });
var timeline = [];

var firstPoint = undefined;
readlineInterface.on("line", line => {
    var result = line.match(timeLog);
    if (result) {
        var trace = {
            domain: result[2] && result[2].trim().replace(":", ""),
            name: result[3].trim(),
            from: parseFloat(result[4]),
            to: parseFloat(result[5])
        }
        firstPoint = firstPoint || trace.from;
        console.log(`Timeline: ${trace.name}  (${Math.floor(trace.from - firstPoint)} - ${Math.floor(trace.to - firstPoint)}) [${Math.floor(trace.to - trace.from)}]`);
        timeline.push(trace);
    } else {
        console.log(line);
    }
});

var once = false;
function logOnExit() {
    if (once) return;
    once = true;

    console.log("Exiting... Print charts...");
    var range = timeline.reduce((acc, line) => {
        return { from: Math.min(acc.from, line.from), to: Math.max(acc.to, line.to)}
    }, { from: Number.POSITIVE_INFINITY, to: Number.NEGATIVE_INFINITY });
    range.name = "ALL";
    timeline.push(range);

    function dumpfile(file: string) {
        return fs.readFileSync(path.join(__dirname, file)).toString();
    }

    var file = `<!DOCTYPE html>
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

    var absolutePath = path.resolve("times.html");
    fs.writeFileSync(absolutePath, file);
    console.log();
    console.log("Timeline report at: " + chalk.underline("file://" + absolutePath));
}

process.on('SIGINT', logOnExit);
process.on('exit', logOnExit);
