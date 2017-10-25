#!/usr/bin/env node

import * as readline from "readline";

import { toTrace, saveTimeline } from "./lib";

var readlineInterface = readline.createInterface({ input: process.stdin });
var timeline = [];

var firstPoint = undefined;
readlineInterface.on("line", line => {
    var trace = toTrace(line);
    if (trace) {
        console.log(`Timeline: ${trace.name}  (${Math.floor(trace.from - firstPoint)} - ${Math.floor(trace.to - firstPoint)}) [${Math.floor(trace.to - trace.from)}]`);
        firstPoint = firstPoint || trace.from;
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

    saveTimeline(timeline, "times.html");
    process.exit(0);
}

process.on('SIGINT', logOnExit);
process.on('exit', logOnExit);

