var inherits = require('util').inherits;

var GremlinMethod = require('../function');

module.exports = (function() {
  function IdxGremlinFunction() {
    GremlinMethod.call(this, 'idx', arguments[0]);
  }

  inherits(IdxGremlinFunction, GremlinMethod);

  IdxGremlinFunction.prototype.toGroovy = function() {
    var str = ".idx('" + this.arguments.rawArgs[0] + "')";
    var properties = this.arguments.rawArgs[1];

    if (properties) {
      var keys = [];

      for (var key in properties) {
        keys.push(key + ":'" + properties[key] + "'");
      }

      str += "[["+ keys.join(',') + "]]";
    }

    return str;
  };

  return IdxGremlinFunction;
})();