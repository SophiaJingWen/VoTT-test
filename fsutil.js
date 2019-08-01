"use strict";
exports.__esModule = true;
var fs = require("fs");
var path = require("path");
function ensureDirEmpty(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    else {
        // TODO: 
        // 
    }
}
exports.ensureDirEmpty = ensureDirEmpty;
function findSync(startPath) {
    var result = [];
    var files = fs.readdirSync(startPath);
    files.forEach(function (val) {
        var fPath = path.join(startPath, val);
        var stats = fs.statSync(fPath);
        if (stats.isFile())
            result.push(fPath);
    });
    return result;
}
function listFile(dir) {
    return fs.readdirSync(dir, { "withFileTypes": true })
        .filter(function (dirent) { return dirent.isFile(); })
        .map(function (dirent) { return path.join(dir, dirent.name); });
}
exports.listFile = listFile;
console.log(listFile("C:/Users/sophiawen/Desktop/test_pj/case1/case"));
