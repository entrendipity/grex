var graphRegex = /^T\.(gt|gte|eq|neq|lte|lt|decr|incr|notin|in)$|^Contains\.(IN|NOT_IN)$|^g\.|^Vertex(?=\.class\b)|^Edge(?=\.class\b)/;
var closureRegex = /^\{.*\}$/;

var toString = Object.prototype.toString;


function isString(o) {
    return toString.call(o) === '[object String]';
}

module.exports = {
    //obj1 over writes obj2
    merge: function (obj1, obj2) {
        for(var p in obj2) {
            try  {
                if(obj1.hasOwnProperty(p)) {
                    obj1[p] = merge(obj1[p], obj2[p]);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                obj1[p] = obj2[p];
            }
        }
        return obj1;
    },

    isRegexId: function (id) {
        return !!this.OPTS.idRegex && isString(id) && this.OPTS.idRegex.test(id);
    },

    isGraphReference: function (val) {
        return isString(val) && graphRegex.test(val);
    },

    isObject: function (o) {
        return toString.call(o) === '[object Object]';
    },

    isClosure: function (val) {
        return isString(val) && closureRegex.test(val);
    },

    isArray: function (o) {
        return toString.call(o) === '[object Array]';
    }
};
