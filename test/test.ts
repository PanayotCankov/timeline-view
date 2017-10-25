// Reference mocha-typescript's global definitions:
/// <reference path="../node_modules/mocha-typescript/globals.d.ts" />
import { assert } from "chai";

// import * as chart from "../chart";
import * as lib from "../lib";

describe("lib", () => {
    describe("toTrace", () => {
        it("trace 1", () => {
            const trace = lib.toTrace("JS: Timeline: Runtime: loadLibrary NativeScript  (1497350872497ms. - 1497350872526ms.)");
            assert.deepEqual(trace, {
                domain: "Runtime",
                name: "loadLibrary NativeScript",
                from: 1497350872497,
                to: 1497350872526
            });
        });
        it("trace 2", () => {
            const trace = lib.toTrace("JS: Timeline: Modules: NativeScriptRenderer.appendChild  (1497350886979.168ms. - 1497350886979.248ms.)");
            assert.deepEqual(trace, {
                domain: "Modules",
                name: "NativeScriptRenderer.appendChild",
                from: 1497350886979.168,
                to: 1497350886979.248
            });
        });
        it("trace 3", () => {
            const trace = lib.toTrace("1:59:56 PM - Compilation complete. Watching for file changes.");
            assert.deepEqual(trace, undefined);
        });
    });

    describe("addRootLine", () => {
        it("add to single trace", () => {
            const trace = [{ from: 10, to: 20, name: "one" }];
            lib.addRootLine(trace);
            assert.deepEqual(trace, [
                { from: 10, to: 20, name: "one" },
                { from: 10, to: 20, name: "ALL" }
            ]);
        });
        it("add to multiple traces", () => {
            const trace = [
                { from: 10, to: 20, name: "one" },
                { from: 15, to: 25, name: "two" }
            ];
            lib.addRootLine(trace);
            assert.deepEqual(trace, [
                { from: 10, to: 20, name: "one" },
                { from: 15, to: 25, name: "two" },
                { from: 10, to: 25, name: "ALL" }
            ]);
        })
    });

    describe("createChartHTML", () => {
        it("from a single trace", () => {
            const html = lib.createChartHTML([{ from: 10, to: 20, name: "one" }]);
            assert.isTrue(html.indexOf(`var timeline = [{"from":10,"to":20,"name":"one"}];`) >= 0, "The chart html contains the trace");
            assert.isTrue(html.indexOf(`function createStackTraces(traces) {`) >= 0, "The chart contains some functions from chart.ts");
            assert.isTrue(html.indexOf(`.trace.Modules {
    background-color: #BFF;
}`) >= 0, "The chart contains some content from style.css");
        });
    });

    describe("underline", () => {
        it("wraps content in underlying chars", () => {
            const actual = lib.underline("Hello World");
            assert.equal(actual, "\u001b[4m" + "Hello World" + "\u001b[0m");
        });
    });
});
