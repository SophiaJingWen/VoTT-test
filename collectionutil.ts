export function getOr<K,V>(obj: Map<K,V>, key: K, defaultValue: V){
    const value = obj.get(key);
    if(value!==undefined){
        return value;
    }
    obj.set(key,defaultValue);
    return defaultValue;
}