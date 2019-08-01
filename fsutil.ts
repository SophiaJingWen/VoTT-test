import * as fs from "fs";
import * as path from "path";

export function ensureDirEmpty(dir) {
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    } else
    {
        // TODO: 
        // 
    }
}

function findSync(startPath) {
    let result=[];

    let files=fs.readdirSync(startPath);
    files.forEach((val) => {
        let fPath=path.join(startPath,val);
        let stats=fs.statSync(fPath);
        if(stats.isFile()) result.push(fPath);
    });
    
    return result;
}

export function listFile(dir) {
    return fs.readdirSync(dir, {"withFileTypes": true})
    .filter(dirent => dirent.isFile())
    .map(dirent => path.join(dir, dirent.name));
}

console.log(listFile("C:/Users/sophiawen/Desktop/test_pj/case1/case"));
    