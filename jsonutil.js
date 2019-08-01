"use strict";
exports.__esModule = true;
var fs = require("fs");
var fsutil = require("./fsutil");
function fromFile(path) {
    var result = fs.readFileSync(path, 'utf8');
    return eval('(' + result + ')');
}
exports.fromFile = fromFile;
function fromDir(dir) {
    return fsutil.listFile(dir).map(function (path) { return fromFile(path); });
}
exports.fromDir = fromDir;
