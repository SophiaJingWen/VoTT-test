import * as fs from 'fs'
var fsutil = require("./fsutil")

export function fromFile(path){
    let result = fs.readFileSync(path,'utf8');
    return eval('(' + result + ')'); 
}

export function fromDir(dir) {
    return fsutil.listFile(dir).map(path => fromFile(path));
}