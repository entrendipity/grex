var _ = require("lodash");

var Graph = require('./objects/graph');
var Pipeline = require('./objects/pipeline');
var Argument = require('./arguments/argument');
var GremlinFunction = require('./functions/function');

module.exports = (function() {
  function GremlinScript(client) {
    this.script = '';
    this.params = {};
    this.client = client;

    // Define a default 'g' getter, returning a Graph
    Object.defineProperty(this, 'g', {
      get: function() {
        var graph = new Graph(this);

        return graph;
      }
    });
  }

  /**
   * Send the script to the server for execution, returning raw results.
   *
   * @param {Function}
   */
  GremlinScript.prototype.exec = function(callback) {
    return this.client.exec(this).nodeify(callback);
  };

  /**
   * Send the script to the server for execution, returning instantiated
   * results.
   *
   * @param {Function}
   */
  GremlinScript.prototype.fetch = function(callback) {
    return this.client.fetch(this).nodeify(callback);
  };

  /**
   * Return a Pipeline object with its own internal GremlinScript object to append
   * string to.
   *
   * @return {Pipeline}
   */
  GremlinScript.prototype._ = function() {
    var gremlin = new GremlinScript(this.client);
    var func = new GremlinFunction('_', arguments);
    gremlin.append(func.toGroovy());

    return new Pipeline(gremlin);
  };

  /**
   * Append an arbitrary string to the script.
   *
   * @private
   * @param {String} script
   */
  GremlinScript.prototype.append = function(script) {
    this.script += script;
  };

  /**
   * Append an arbitrary string to the script as a new line.
   *
   * @public
   * @param {String} line
   */
  GremlinScript.prototype.line = function(line) {
    this.script += '\n'+ line;
  };

  return GremlinScript;
})();