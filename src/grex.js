var http = require('http');
var querystring = require('querystring');

var Q = require("q"),
    _ = require("lodash");

var Gremlin = require('./gremlin');
var Graph = require("./graph");
var classes = require("./classes");

var ResultFormatter = require("./resultformatter");
var ArgumentHandler = require("./arguments/argumenthandler");


module.exports = (function(){

  var defaultOptions = {
    'host': 'localhost',
    'port': 8182,
    'graph': 'tinkergraph',
    'idRegex': false // OrientDB id regex -> /^[0-9]+:[0-9]+$/
  };

  function Grex(options) {
    this.options = _.defaults(options, defaultOptions);

    this.resultFormatter = new ResultFormatter();
    this.argumentHandler = new ArgumentHandler(this.options);

    _.extend(this, classes);
    this.ClassTypes = classes;
  }

  Grex.prototype.connect = function(options, callback) {
    if(typeof options === 'function'){
      callback = options;
      options = undefined;
    } else if (typeof options === 'object') {
      this.options = _.defaults(options, this.options);
    } else {
      // Set options to previously setup options or switch back to the defaults
      this.options = this.options || defaultOptions;
    }

    return Q.fcall(function() {
      return this;
    }.bind(this))
    .nodeify(callback);
  };

  /**
   * Send a Gremlin script for execution on the server, fetch and format
   * results.
   *
   * @param {String} script A raw Gremlin (Groovy) script to execute
   */
  Grex.prototype.exec = function(script) {
    var deferred = Q.defer();

    var qs = {
      script: script,
      'rexster.showTypes': true
    };

    var options = {
      hostname: this.options.host,
      port: this.options.port,
      path: '/graphs/' + this.options.graph + '/tp/gremlin?' + querystring.stringify(qs),
      headers: {
        'Content-type': 'application/json'
      }
    };

    var req = http.get(options, function(res) {
      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        body = JSON.parse(body);
        var transformedResults = this.transformResults(body.results);
        body.results = transformedResults.results;
        body.typeMap = transformedResults.typeMap;
        return deferred.resolve(body);
      }.bind(this));

    }.bind(this));

    req.on('error', function() {
      return deferred.reject(e);
    });

    return deferred.promise;
  };

  Grex.prototype.gremlin = function(options) {
    var gremlin = new Gremlin(this, options);

    return gremlin;
  };

  Grex.prototype.transformResults = function(results) {
    return this.resultFormatter.formatResults(results);
  };

  return Grex;
})();
