import * as fs from "fs";
import * as path from "path";

const frameExtractionRate = 30;

function xxx(results:any){

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





function compare2(a:any, b:any){
    if(a.size == b.size){
        for(const [k,v] of a.entries()){
            if(v !== b.get(k)) return false;
        }
        return true;
    }else{
        return false;
    }
}


//输出result[]
function newJson(filepath:string[]){

    var resultList = [];

    for(var file of filepath){
        let result = fs.readFileSync(file,'utf8');
        resultList.push(eval('(' + result + ')')); 
    }

    return resultList;
    
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





const case1 = new Map<string,any>();
const gt1  = new Map<string,string>();
gt1.set("hK9eSVVuA","球员2_站立_25.5_25.5");
gt1.set("hK9eSVVuA1","球员2_站立_26_26");
case1.set('results',newJson(findSync("C:/Users/sophiawen/Desktop/test_pj/case1/case"))).set('gt',gt1);


const cases = [case1];

//traverse cases
for(let c of cases){
    console.log(test(c));
}

//run xxx to test case1, return if the same with gt
function test(case1){
    const ans = xxx(case1.get('results'));
    const gt  = case1.get('gt');
    return compare2(ans, gt);
}
    


