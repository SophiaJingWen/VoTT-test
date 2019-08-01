"use strict";
exports.__esModule = true;
var fs = require("fs");
var fsutil = require("./fsutil");
var jsonutil = require("./jsonutil");
var constant = require("./constant");
//import * as collectionutil from "collectionutil";
var frameExtractionRate = 1;
function vott(results) {
    results.sort(compare);
    var tagRecord = new Map();
    var folderRecord = new Map();
    results.forEach(function (assetMetadata) {
        assetMetadata.regions.forEach(function (region) {
            if (region.tags.length < 2) {
                region.tags = ["error1", "error2"];
            }
            var currTagInfoMap = tagRecord.get(region.tags.join("_"));
            if (currTagInfoMap && Math.abs(assetMetadata.asset.timestamp - currTagInfoMap.get("end")
                - 1 / frameExtractionRate) < 1e-5) {
                //continuous tag1_tag2 : renew end, regions
                currTagInfoMap.set("end", assetMetadata.asset.timestamp);
                currTagInfoMap.get("regions").push(region.id);
            }
            else {
                //currTagInfoMap doesn't exist or continuity ends
                if (currTagInfoMap) {
                    //continuous tag1_tag2 ends : push regions into folderRecord
                    var arr = currTagInfoMap.get("regions");
                    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
                        var r = arr_1[_i];
                        var s = region.tags.join("_") + "_" + currTagInfoMap.get("start") + "_" +
                            currTagInfoMap.get("end");
                        folderRecord.set(r, s);
                    }
                }
                var tagKey = region.tags.join("_");
                var tagValue = new Map();
                tagValue.set("start", assetMetadata.asset.timestamp);
                tagValue.set("end", assetMetadata.asset.timestamp);
                tagValue.set("regions", [region.id]);
                tagRecord.set(tagKey, tagValue);
            }
        });
    });
    tagRecord.forEach(function (value, key) {
        var s = key + "_" + value.get("start") + "_" + value.get("end");
        value.get("regions").forEach(function (regionId) {
            folderRecord.set(regionId, s);
        });
    });
    function compare(a, b) {
        if (a.asset.timestamp < b.asset.timestamp) {
            return -1;
        }
        else if (a.asset.timestamp > b.asset.timestamp) {
            return 1;
        }
        else
            return 0;
    }
    return folderRecord;
}
function createGt(option, index, outputPath) {
    var frameArr = (shuffle(createArray(option.max)).slice(0, 2 * option.k)).sort(function (a, b) { return a - b; });
    var tag = descartes(option.people, option.action);
    var tagArr = shuffle(createTagArray(option, tag));
    var gtMap = new Map();
    var i = 0, j = 0, k = 0;
    //生成每段的文件夹名
    for (i = 0; i < option.k; i++) {
        var folderName = tagArr[i] + '_' + frameArr[2 * i] + '_' + (frameArr[2 * i + 1] - 1);
        //每段中每帧生成gtMap的条目
        var start = frameArr[2 * i], end = frameArr[2 * i + 1] - 1;
        for (k = start; k <= end; k += (1 / frameExtractionRate)) {
            var regionId = Math.random().toString(36).substr(2);
            gtMap.set(regionId, folderName);
        }
    }
    /* if(!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    } */
    fsutil.ensureDirEmpty(outputPath);
    fs.writeFileSync(outputPath + "/gt.txt", MapTOJson(gtMap));
    return gtMap;
}
function getOr(obj, key, defaultValue) {
    var value = obj.get(key);
    if (value !== undefined) {
        return value;
    }
    obj.set(key, defaultValue);
    return defaultValue;
}
function MapTOJson(m) {
    var str = '{';
    var i = 1;
    m.forEach(function (item, key, mapObj) {
        if (mapObj.size == i) {
            str += '"' + key + '":"' + item + '"';
        }
        else {
            str += '"' + key + '":"' + item + '",';
        }
        i++;
    });
    str += '}';
    return str;
}
function timeMapTOJson(m) {
    var str = '{';
    var i = 1;
    m.forEach(function (item, key, mapObj) {
        if (mapObj.size == i) {
            str += '"' + key + '":"' + MapTOJson(item) + '"';
        }
        else {
            str += '"' + key + '":"' + MapTOJson(item) + '",';
        }
        i++;
    });
    str += '}';
    return str;
}
function createArray(max) {
    var arr = [];
    for (var i = 0; i < max; i++) {
        arr.push(i);
    }
    return arr;
}
function createTagArray(option, tag) {
    var arr = new Array(option.k);
    var i = 0;
    option.weight.forEach(function (w, idx) {
        if (idx != option.weight.length - 1) {
            arr.fill(tag[idx], i, i + Math.floor(w * option.k));
        }
        else {
            arr.fill(tag[idx], i, option.k);
        }
        i = i + Math.floor(w * option.k);
    });
    return arr;
}
function shuffle(arr) {
    var _a;
    if (arr.length == 1)
        return arr;
    var i = arr.length;
    while (--i > 1) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr;
}
function descartes(arr1, arr2) {
    var result = [];
    var i = 0, j = 0;
    for (i = 0; i < arr1.length; i++) {
        var item1 = arr1[i];
        for (j = 0; j < arr2.length; j++) {
            var item2 = arr2[j];
            result.push([item1, item2].join('_'));
        }
    }
    return result;
}
function createAssets(gt, option, index, outputPath) {
    // gt => gtTimeMap
    var gtTimeMap = new Map();
    var temp = new Map();
    gt.forEach(function (folderName, regionId) {
        var start = parseInt(folderName.split('_')[2]);
        var timestamp = getOr(temp, folderName, start);
        getOr(gtTimeMap, timestamp, new Map()).set(regionId, folderName);
        temp.set(folderName, timestamp + (1 / frameExtractionRate));
    });
    var results = [];
    /* if(!fs.existsSync(`${outputPath}/case`)) {
        fs.mkdirSync(`${outputPath}/case`);
    } */
    fsutil.ensureDirEmpty(outputPath + "/case");
    var idx = 1;
    gtTimeMap.forEach(function (folderNameByRegionId, timestamp) {
        var regions = getRegions(folderNameByRegionId);
        var obj = {
            "asset": { timestamp: timestamp },
            "regions": regions
        };
        var frameFileName = "frame" + idx + ".txt";
        var assetFilePath = outputPath + "/case/" + frameFileName;
        // fs.writeFileSync('C:/Users/sophiawen/Desktop/test_pj/'+ eval('`'+option.pattern+'`') + '/case/' + eval('`'+frameFileName+'`'),JSON.stringify(obj,null,4));
        fs.writeFileSync(assetFilePath, JSON.stringify(obj, null, 4));
        results.push(obj);
        idx++;
    });
    return results;
}
function getRegions(v) {
    var regions = [];
    v.forEach(function (folderName, regionId) {
        regions.push(getRegion(regionId, folderName));
    });
    return regions;
}
function getRegion(regionId, folderName) {
    var tags = folderName.split('_').slice(0, 2);
    return { 'id': regionId, tags: tags };
}
function getGtTimeMap(filepath) {
    var result = fs.readFileSync(filepath, 'utf8');
    return ObjToMap(JSON.parse(result));
}
function ObjToMap(obj) {
    var strMap = new Map();
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var k = _a[_i];
        var v = innerObjToMap(JSON.parse(obj[k]));
        strMap.set(k, v);
    }
    return strMap;
}
function innerObjToMap(obj) {
    var strMap = new Map();
    for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
        var k = _a[_i];
        strMap.set(k, obj[k]);
    }
    return strMap;
}
function empty(value) {
    return ((!!value === false || value.trim().length === 0));
}
function loadCase(filePath) {
    var results = jsonutil.fromDir(filePath + "/case");
    var gt = jsonutil.fromFile(filePath + "/gt.txt");
    return new Map().set('results', results).set('gt', innerObjToMap(gt));
}
function createCase(optionFilePath, outputPath, index) {
    // const option = loadOption(optionFilePath); 
    var option = jsonutil.fromFile(optionFilePath);
    var gt = createGt(option, index, outputPath);
    var ans = createAssets(gt, option, index, outputPath);
    return new Map().set('results', ans).set('gt', gt);
}
function loadCases(option) {
    return option.names.map(function (name) {
        return { name: name, "case": loadCase(option.root + "/" + name) };
    });
}
function createCases(option) {
    return option.optionFilenames.map(function (name, index) {
        var optionFilePath = option.optionRoot + "/" + name + "." + constant.optionFileExtension;
        var caseName = eval("`" + option.pattern + "`");
        var outputFilePath = empty(option.outputRoot)
            ? ""
            : option.outputRoot + "/" + caseName;
        return { "name": caseName, "case": createCase(optionFilePath, outputFilePath, 0) };
    });
}
//测试cases
function testCases(cases) {
    return cases.map(function (_case) { return testCase(_case); });
}
function testCase(_case) {
    var ans = vott(_case["case"].get('results'));
    var gt = _case["case"].get('gt');
    console.log(ans);
    console.log(gt);
    return { "name": _case.name, "result": compareResult(ans, gt) };
}
function compareResult(results, gt) {
    var details = new Map([["0", new Map()], ["1", new Map()], ["2", new Map()]]);
    results.forEach(function (fileName, regionID) {
        if (!gt.has(regionID)) {
            details.get("0").set(regionID, fileName);
        }
        else if (gt.get(regionID) != fileName) {
            details.get("1").set(regionID, [fileName, gt.get(regionID)]);
        }
    });
    gt.forEach(function (fileName, regionID) {
        if (!results.has(regionID)) {
            details.get("2").set(regionID, fileName);
        }
    });
    var sum = 0;
    details.forEach(function (errorMap) {
        sum += errorMap.size;
    });
    return { 'status': sum == 0, 'data': details };
}
var Case = /** @class */ (function () {
    function Case() {
    }
    Case.from = function (option) {
        return { "load": loadCases, "build": createCases }[option.type](option.option);
    };
    return Case;
}());
//主函数
function runTest(option) {
    // let cases = createCases(option.case);
    var cases = Case.from(option["case"]);
    var errors = testCases(cases);
    output(errors, option.test.output);
}
function output(errors, option) {
    var objs = [];
    if (errors.reduce(function (prev, curr, idx) {
        if (!curr.result.status) {
            console.log(curr.name, curr.result.data);
            objs.push(curr);
            // output
        }
        return prev && curr.result.status;
    }, true)) {
        console.log("all pass");
    }
    fs.writeFileSync(option.resultFilePath + "/errors.txt", JSON.stringify(objs));
}
/* function findSync(startPath) {
    let result=[];

    let files=fs.readdirSync(startPath);
    files.forEach((val) => {
        let fPath=path.join(startPath,val);
        let stats=fs.statSync(fPath);
        if(stats.isFile()) result.push(fPath);
    });
    
    return result;
} */
/* function newJson(filepath:string[]){

    var resultList = [];

    for(var file of filepath){
        let result = fs.readFileSync(file,'utf8');
        resultList.push(eval('(' + result + ')'));
    }
    
    return resultList;
    
} */
function loadOption(optionFolderPath) {
    var result = fs.readFileSync(optionFolderPath, 'utf8');
    return eval('(' + result + ')');
}
var option = loadOption("C:/Users/sophiawen/Desktop/VoTT-test/option/optionBuild.json");
runTest(option);
