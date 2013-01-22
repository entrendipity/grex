
(function (definition) {

    definition(exports);

})(function (exports) {
    var q = require('q');
    var http = require('http');

    var toString = Object.prototype.toString,
        push = Array.prototype.push;
        
    //default options
    var OPTS = {
        'host': 'localhost',
        'port': 8182,
        'graph': 'tinkergraph',
        'idRegex': false // OrientDB id regex -> /^[0-9]+:[0-9]+$/
    };

    var _pathBase = '/graphs/';
    var _gremlinExt = '/tp/gremlin?script=';
    var _batchExt = '/tp/batch/tx'

    var txArray = [];
    var graphRegex = /^g\./;
    var TRegex = /^T\.(gt|gte|eq|neq|lte|lt)$/;
    var closureRegex = /^\{\[?\s*\bit(\w|\W)*\s*\]?\}$/;

    function Grex(qryString) {
        if(!!qryString){
            this.params = qryString;
        } else {
            this.params = 'g';    
        };

    }
 
    exports.setOptions= _setOptions();
    exports._ = _qryMain('_', true);
    exports.E = _qryMain('E', true); 
    exports.V =  _qryMain('V', true); 
   
    //Methods
    exports.e = _qryMain('e', true); 
    exports.idx = _qryMain('idx', true); 
    exports.v = _qryMain('v', true); 

    exports.addVertex = _cud('create', 'vertex');
    exports.addEdge = _cud('create', 'edge');
    exports.removeVertex = _cud('delete', 'vertex');
    exports.removeEdge = _cud('delete', 'edge');
    exports.updateVertex = _cud('update', 'vertex');
    exports.updateEdge = _cud('update', 'edge');

    exports.commit = post();
    exports.rollback = rollback();

    function _setOptions (){
        return function (options){
            if(!!options){
                for (var k in OPTS){
                    if(options.hasOwnProperty(k)){
                        OPTS[k] = options[k];
                    }
                }
            }
        }
    }

    function _isIdString(id) {
        return !!OPTS.idRegex && _isString(id) && id.search(OPTS.idRegex) > -1;
    }

    function _isString(o) {
        return toString.call(o) === '[object String]';
    }

    function _isGraphReference (val) {
        return _isString(val) && (val.search(graphRegex) > -1 || val.search(TRegex) > -1);
    }

    function _isObject(o) {
        return toString.call(o) === '[object Object]';
    }

    function _isClosure(val) {
        return _isString(val) && val.search(closureRegex) > -1;   
    }

    function _isArray(o) {
        return toString.call(o) === '[object Array]';
    }

    function _parseArgs(val) {
        //check to see if the arg is referencing the graph ie. g.v(1)
        if(_isObject(val) && val.hasOwnProperty('params') && _isGraphReference(val.params)){
            return val.params.toString();
        }
        if(_isGraphReference(val)) {
            return val.toString();
        }
        //Cater for ids that are not numbers but pass parseFloat test
        if(_isIdString(val) || isNaN(parseFloat(val))) {
            return "'" + val + "'";
        }
        if(!isNaN(parseFloat(val))) {
             return val.toString();    
        }
        return val;
    }

    function _qryMain(method, reset){
        return function(){
            var gremlin,
                args = _isArray(arguments[0]) ? arguments[0] : arguments,
                appendArg = '';

            gremlin = reset ? new Grex() : new Grex(this.params);
                     
            //cater for idx param 2
            if(method == 'idx' && args.length > 1){
                for (var k in args[1]){
                    appendArg = k + ":";
                    appendArg += _parseArgs(args[1][k])
                }
                appendArg = "[["+ appendArg + "]]";
                args.length = 1;
            }
            gremlin.params += '.' + method + _args(args);
            gremlin.params += appendArg;
            return gremlin;
        }
    }

    //[i] => index & [1..2] => range
    //Do not pass in method name, just string arg
    function _qryIndex(){
        return function(arg) {
            var gremlin = new Grex(this.params);
            gremlin.params += '['+ arg.toString() + ']';
            return gremlin;
        }
    }

    //and | or | put  => g.v(1).outE().or(g._().has('id', 'T.eq', 9), g._().has('weight', 'T.lt', '0.6f'))
    function _qryPipes(method){
        return function() {
            var gremlin = new Grex(this.params),
                args = [],
                isArray = _isArray(arguments[0]),
                argsLen = isArray ? arguments[0].length : arguments.length;

            gremlin.params += "." + method + "("
            for (var _i = 0; _i < argsLen; _i++) {
                gremlin.params += isArray ? arguments[0][_i].params || _parseArgs(arguments[0][_i]) : arguments[_i].params || _parseArgs(arguments[_i]);
                gremlin.params += ",";
            }
            gremlin.params = gremlin.params.substr(0, gremlin.params.length - 1);
            gremlin.params += ")";
            return gremlin;
        }
    }

    //retain & except => g.V().retain([g.v(1), g.v(2), g.v(3)])
    function _qryCollection(method){
        return function() {
            var gremlin = new Grex(this.params),
                args = [];

            gremlin.params += "." + method + "(["
            for (var _i = 0, argsLen = arguments[0].length; _i < argsLen; _i++) {
                gremlin.params += arguments[0][_i].params;
                gremlin.params += ",";
            }
            gremlin.params = gremlin.params.substr(0, gremlin.params.length - 1);
            gremlin.params += "])";
            return gremlin;
        }
    }

    function _args(array) {
        var argList = '',
            append = '',
            jsonString = '';
            
        for (var _i = 0, l = array.length; _i < l; _i++) {
            if(_isClosure(array[_i])){
                append += array[_i];
            } else if (_isObject(array[_i]) && !(array[_i].hasOwnProperty('params') && _isGraphReference(array[_i].params))) {
                jsonString = JSON.stringify(array[_i]);
                jsonString = jsonString.replace('{', '[');
                argList += jsonString.replace('}', ']') + ",";
            } else {
                argList += _parseArgs(array[_i]) + ",";
            }
        }
        argList = argList.substr(0, argList.length - 1);
        return '(' + argList + ')' + append;
    }

    function _cud(action, type) {
        return function() {
            var o = {},
                argLen = arguments.length,
                i = 0;

            if (!!argLen) {
                if(action == 'delete'){
                    o._id = arguments[0];
                    if (argLen > 1) {
                        o._keys = arguments[1];
                    }
                } else {
                    if (type == 'edge') {
                        o = _isObject(arguments[argLen - 1]) ? arguments[argLen - 1] : {};
                        if (argLen == 5 || (argLen == 4 && !_isObject(o))) {
                            i = 1;
                            o._id = arguments[0];
                        }
                        o._outV = arguments[0 + i];
                        o._inV = arguments[1 + i];
                        o._label = arguments[2 + i];
                    } else {
                        if (_isObject(arguments[0])) {
                            o = arguments[0];
                        } else {
                            if(argLen == 2){
                                o = arguments[1];
                            }
                            o._id = arguments[0];
                        }
                    }
                }
            }
            o._action = action;
            o._type = type;
            push.call(txArray, o);
        }
    }

    function rollback(){
        txArray = [];
    };

    Grex.prototype = {
        
        /*** Transform ***/
        both: _qryMain('both'),
        bothE: _qryMain('bothE'),
        bothV: _qryMain('bothV'),
        cap: _qryMain('cap'),
        gather: _qryMain('gather'),
        id: _qryMain('id'),
        'in': _qryMain('in'),
        inE: _qryMain('inE'),
        inV: _qryMain('inV'),
        property: _qryMain('property'),
        label: _qryMain('label'),
        map: _qryMain('map'),
        memoize: _qryMain('memoize'),
        order: _qryMain('order'),
        out: _qryMain('out'),
        outE: _qryMain('outE'),
        outV: _qryMain('outV'),
        path: _qryMain('path'),
        scatter: _qryMain('scatter'),
        select: _qryMain('select'),
        transform: _qryMain('transform'),
        
        /*** Filter ***/
        index: _qryIndex(), //index(i)
        range: _qryIndex(), //range('[i..j]')
        and:  _qryPipes('and'),
        back:  _qryMain('back'),
        dedup: _qryMain('dedup'),
        except: _qryCollection('except'),
        filter: _qryMain('filter'),
        has: _qryMain('has'),
        hasNot: _qryMain('hasNot'),
        interval: _qryMain('interval'),
        or: _qryPipes('or'),
        random: _qryMain('random'),
        retain: _qryCollection('retain'),
        simplePath: _qryMain('simplePath'),
        
        /*** Side Effect ***/ 
        // aggregate //Not implemented
        as: _qryMain('as'),
        groupBy: _qryMain('groupBy'),
        groupCount: _qryMain('groupCount'), //Not Fully Implemented ??
        optional: _qryMain('optional'),
        sideEffect: _qryMain('sideEffect'),
        // store //Not implemented
        // table //Not implemented
        // tree //Not implemented

        /*** Branch ***/
        copySplit: _qryPipes('copySplit'),
        exhaustMerge: _qryMain('exhaustMerge'),
        fairMerge: _qryMain('fairMerge'),
        ifThenElse: _qryMain('ifThenElse'), //g.v(1).out().ifThenElse('{it.name=='josh'}','{it.age}','{it.name}')
        loop: _qryMain('loop'),

        /*** Methods ***/
        //fill //Not implemented
        count: _qryMain('count'),
        iterate: _qryMain('iterate'),
        next: _qryMain('next'),
        toList: _qryMain('toList'),
        createIndex: _qryMain('createIndex'),
        put: _qryPipes('put'),

        getPropertyKeys: _qryMain('getPropertyKeys'),
        setProperty: _qryMain('setProperty'),
        getProperty: _qryMain('getProperty'),

        /*** http ***/
        get: get()
    }

    function get() {
        return function(headers) {
            var deferred = q.defer();

            var options = {
                'host': OPTS.host,
                'port': OPTS.port,
                'path': _pathBase + OPTS.graph + _gremlinExt + encodeURIComponent(this.params),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                'method': 'GET'
            };

            for (var h in headers) {
                if (headers.hasOwnProperty(h)) {
                    options.headers[h] = headers[h];
                }
            }
            http.get(options, function(res) {
                console.log("Response: " + res.statusCode);
                res.setEncoding('utf8');
                var body = '';
                res.on('data', function(results) {
                    body += results + "\n";
                });

                res.on('end', function() {
                    deferred.resolve(body);
                });
            }).on('error', function(e) {
                deferred.reject("Got error: " + e.message);
            });
            
            console.log(this.params);
            return deferred.promise;
        }
    }

    function post() {
        return function(headers) {
            var deferred = q.defer();
            var data = { tx: txArray };
            var payload = JSON.stringify(data);
            
            var options = {
                'host': OPTS.host,
                'port': OPTS.port,
                'path': _pathBase + OPTS.graph + _batchExt,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': payload.length
                },
                'method': 'POST'
            };

            for (var h in headers) {
                if (headers.hasOwnProperty(h)) {
                    options.headers[h] = headers[h];
                }
            }
            var body = '';
            var req = http.request(options, function(res) {
                res.setEncoding('utf-8');
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));

                //Need to check this.
                if(res.statusCode == 200){
                    //reset array
                    txArray = [];
                }
                
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    body += chunk;
                });
                res.on('end', function() {
                    deferred.resolve(JSON.parse(body));
                });
            });

            req.on('error', function(e) {
              txArray = [];
              console.log('problem with request: ' + e.message);
              deferred.reject("Got error: " + e.message);
            });

            // write data to request body
            req.write(payload);
            req.end();
            return deferred.promise;
        }
    }
});