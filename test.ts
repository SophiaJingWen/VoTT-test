import * as fs from "fs";
import * as path from "path";
import { prependOnceListener } from "cluster";
var fsutil = require("./fsutil");
var jsonutil = require("./jsonutil");
var constant = require("./constant");
//import * as collectionutil from "collectionutil";
const frameExtractionRate = 1;



function vott(results:any){

    results.sort(compare);

        const tagRecord : Map<string,Map<string,any>> = new Map<string,Map<string,any>>();
        const folderRecord : Map<string,string> = new Map();

    results.forEach( (assetMetadata:any) => {

        assetMetadata.regions.forEach( (region:any) => {
            
            if(region.tags.length<2){
                region.tags=["error1","error2"];
            }

            const currTagInfoMap = tagRecord.get(region.tags.join("_"));

            if( currTagInfoMap && Math.abs (assetMetadata.asset.timestamp - currTagInfoMap.get("end") 
            - 1/frameExtractionRate) < 1e-5){

                //continuous tag1_tag2 : renew end, regions
                currTagInfoMap.set("end",assetMetadata.asset.timestamp);
                currTagInfoMap.get("regions").push(region.id);

            }else{
                //currTagInfoMap doesn't exist or continuity ends
                
                if( currTagInfoMap ){
                    //continuous tag1_tag2 ends : push regions into folderRecord
                    const arr = currTagInfoMap.get("regions");
                    for(let r of arr){
                        const s = region.tags.join("_") + "_" + currTagInfoMap.get("start") + "_" + 
                        currTagInfoMap.get("end");
                        folderRecord.set(r,s);
                    }
                }
                
                const tagKey = region.tags.join("_");
                const tagValue = new Map<string,any>();
                tagValue.set("start",assetMetadata.asset.timestamp);
                tagValue.set("end",assetMetadata.asset.timestamp);
                tagValue.set("regions", [region.id] );
                tagRecord.set(tagKey,tagValue);

            }


        });

    });


    tagRecord.forEach(function(value, key) {
        const s = key + "_" + value.get("start") + "_" + value.get("end");
        value.get("regions").forEach( (regionId:any) => {
            folderRecord.set(regionId,s);
        });
    }) 

    function compare (a:any, b:any){
        if(a.asset.timestamp<b.asset.timestamp){
            return -1;
        }else if(a.asset.timestamp>b.asset.timestamp){
            return 1;
        }else return 0;
    }

    return folderRecord;
}



function createGt(option,index, outputPath){

    const frameArr:Array<number> = (shuffle(createArray(option.max)).slice(0,2*option.k)).sort(function(a, b) { return a - b;});

    const tag = descartes(option.people,option.action);

    const tagArr = shuffle(createTagArray(option,tag));

    const gtMap = new Map();

    var i=0, j=0, k=0;
    //生成每段的文件夹名
    for(i=0; i<option.k; i++){
        const folderName = tagArr[i] + '_' + frameArr[2*i] + '_' + (frameArr[2*i+1]-1);
        //每段中每帧生成gtMap的条目
        var start = frameArr[2*i], end = frameArr[2*i+1]-1;
        for(k=start; k<=end; k+=(1/frameExtractionRate)){
            const regionId = Math.random().toString(36).substr(2);
            gtMap.set(regionId ,folderName);
        }
    }

    /* if(!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    } */

    fsutil.ensureDirEmpty(outputPath);

    fs.writeFileSync(`${outputPath}/gt.txt`, MapTOJson(gtMap));

    return gtMap;

}

function getOr<K,V>(obj: Map<K,V>, key: K, defaultValue: V){
    const value = obj.get(key);
    if(value!==undefined){
        return value;
    }
    obj.set(key,defaultValue);
    return defaultValue;
}

function MapTOJson(m) {
    var str = '{';
    var i = 1;
    m.forEach(function (item, key, mapObj) {
    	if(mapObj.size == i){
    		str += '"'+ key+'":"'+ item + '"';
    	}else{
    		str += '"'+ key+'":"'+ item + '",';
    	}
    	i++;
    });
    str +='}';
    return str;
}

function timeMapTOJson(m) {
    var str = '{';
    var i = 1;
    m.forEach(function (item, key, mapObj) {
    	if(mapObj.size == i){
    		str += '"'+ key+'":"'+ MapTOJson(item) + '"';
    	}else{
    		str += '"'+ key+'":"'+ MapTOJson(item) + '",';
    	}
    	i++;
    });
    str +='}';
    return str;
}

function createArray(max) {
    const arr = [];
    for(let i = 0; i < max; i++) {
      arr.push(i);
    }
    return arr;
}

function createTagArray(option,tag){
    const arr = new Array(option.k);
    var i = 0;
    option.weight.forEach( (w,idx) => {
        if(idx != option.weight.length-1){
            arr.fill(tag[idx], i, i + Math.floor(w*option.k));
        }else{
            arr.fill(tag[idx], i, option.k);
        }
        i = i + Math.floor(w*option.k);
    });
    return arr;
}

function shuffle(arr) {
    if(arr.length == 1) return arr;
    let i = arr.length;
    while(--i > 1) {
      let j = Math.floor(Math.random() * (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
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



function createAssets(gt,option,index,outputPath){
    // gt => gtTimeMap

    const gtTimeMap = new Map();
    const temp = new Map();

    gt.forEach((folderName,regionId)=>{
        const start = parseInt(folderName.split('_')[2]);
        const timestamp = getOr(temp,folderName,start);
        getOr(gtTimeMap, timestamp, new Map()).set(regionId, folderName);
        temp.set(folderName, timestamp + (1/frameExtractionRate));
    });

    const results = [];
    
    /* if(!fs.existsSync(`${outputPath}/case`)) {
        fs.mkdirSync(`${outputPath}/case`);
    } */
    fsutil.ensureDirEmpty(`${outputPath}/case`);

    var idx = 1;
    gtTimeMap.forEach((folderNameByRegionId, timestamp) =>{
        const regions = getRegions(folderNameByRegionId);
        const obj = {
            "asset": {timestamp},
            "regions": regions,
        }

        const frameFileName = `frame${idx}.txt`;
        const assetFilePath = `${outputPath}/case/${frameFileName}`
        
        // fs.writeFileSync('C:/Users/sophiawen/Desktop/test_pj/'+ eval('`'+option.pattern+'`') + '/case/' + eval('`'+frameFileName+'`'),JSON.stringify(obj,null,4));
        fs.writeFileSync(assetFilePath,JSON.stringify(obj,null,4));
        results.push(obj);
        idx ++;
    },);

    return results;
    
}


function getRegions(v){
    let regions = [];
    v.forEach((folderName, regionId) => {
        regions.push(getRegion(regionId, folderName));
    });
    return regions;
}

function getRegion(regionId, folderName){
    const tags = folderName.split('_').slice(0,2);
    return {'id': regionId, tags};
}


function getGtTimeMap(filepath:string){
    let result = fs.readFileSync(filepath,'utf8');
    return ObjToMap(JSON.parse(result));
}

function ObjToMap(obj){
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
        const v = innerObjToMap(JSON.parse(obj[k]));
        strMap.set(k,v);
    }
    return strMap;
}

function innerObjToMap(obj){
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
        strMap.set(k,obj[k]);
    }
    return strMap;
}
  
function empty(value: string) {
    return ((!!value === false || value.trim().length === 0));
}

function loadCase(filePath) {
    const results = jsonutil.fromDir(`${filePath}/case`);
    const gt = jsonutil.fromFile(`${filePath}/gt.txt`);
    return new Map().set('results',results).set('gt',innerObjToMap(gt));
}


function createCase(optionFilePath, outputPath, index){
    // const option = loadOption(optionFilePath); 
    const option = jsonutil.fromFile(optionFilePath);
    const gt = createGt(option, index, outputPath);
    const ans = createAssets(gt,option,index, outputPath);
    return new Map().set('results',ans).set('gt',gt);
}

function loadCases(option) {
    return option.names.map(name => {
        return {name, "case": loadCase(`${option.root}/${name}`)}
    });
}

function createCases(option){
    return option.optionFilenames.map((name, index) => {
        const optionFilePath = `${option.optionRoot}/${name}.${constant.optionFileExtension}`;
        const caseName = eval("`"+option.pattern+"`");
        let outputFilePath = empty(option.outputRoot) 
                                ? ""
                                : `${option.outputRoot}/${caseName}`;
        
        return {"name": caseName, "case": createCase(optionFilePath, outputFilePath,0)}
    });
}







//测试cases

function testCases(cases) {
    return cases.map(_case => testCase(_case));
}


function testCase(_case) {
    const ans = vott(_case.case.get('results'));
    const gt  = _case.case.get('gt');
    console.log(ans);
    console.log(gt);
    return {"name": _case.name, "result": compareResult(ans, gt)};
}

function compareResult(results:any, gt:any){

    const details = new Map([["0",new Map()],["1",new Map()],["2",new Map()]]);

    results.forEach((fileName,regionID) =>{
        if(!gt.has(regionID)){
            details.get("0").set(regionID,fileName);
        }else if(gt.get(regionID) != fileName){
            details.get("1").set(regionID, [fileName, gt.get(regionID)]);
        }
    });
    

    gt.forEach((fileName,regionID) =>{
        if(!results.has(regionID)){
            details.get("2").set(regionID,fileName);
        }
    });

    let sum = 0;
    details.forEach(errorMap => {
        sum += errorMap.size;
    });

    return {'status':sum==0,'data':details};

}

class Case {
    public static from(option) {
        return {"load": loadCases, "build": createCases}[option.type](option.option);
    }
}

//主函数
function runTest(option) {
    // let cases = createCases(option.case);
    let cases = Case.from(option.case);
    const errors = testCases(cases);
    output(errors, option.test.output);
}



function output(errors, option){

    const objs = [];

    if(errors.reduce((prev,curr,idx)=>{
        if(!curr.result.status){
            console.log( curr.name, curr.result.data );
            objs.push(curr);
            // output
        }
        return prev && curr.result.status;
    },true)){
        console.log("all pass");
    }
    fs.writeFileSync(`${option.resultFilePath}/errors.txt`, JSON.stringify(objs) );
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
    let result = fs.readFileSync(optionFolderPath,'utf8');
    return eval('(' + result + ')'); 
}


const option = loadOption("C:/Users/sophiawen/Desktop/VoTT-test/option/optionBuild.json");

runTest(option);