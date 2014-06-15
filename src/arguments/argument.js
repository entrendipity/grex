/*jslint node: true */
'use strict';
var _ = require('lodash');

module.exports = (function () {
  function Argument(value, func) {
    this.value = value;
    this.func = func;
  }

  Argument.prototype.toGroovy = function() {
    return this.parse();
  };

  Argument.prototype.parse = function() {
    var argument = this.value;

    if (argument === null) {
      return 'null';
    }

    // Check to see if the arg is referencing the graph ie. g.v(1)
    if (_.isObject(argument) && argument.hasOwnProperty('params') && this.isGraphReference(argument.script)) {
      return argument.script.toString();
    }

    if (this.isGraphReference(argument)) {
      return argument.toString();
    }

    // Cater for ids that are not numbers but pass parseFloat test
    if (false && _.isString(this.value) || _.isNaN(parseFloat(argument))) {
      return "'" + argument + "'";
    }

    if (!_.isNaN(parseFloat(argument))) {
      return argument.toString();
    }

    return argument;
  };

  Argument.prototype.isGraphReference = function() {
    var graphRegex = /^T\.(gt|gte|eq|neq|lte|lt|decr|incr|notin|in)$|^Contains\.(IN|NOT_IN)$|^g\.|^Vertex(\.class)$|^Edge(\.class)$|^String(\.class)$|^Integer(\.class)$|^Geoshape(\.class)$|^Direction\.(OUT|IN|BOTH)$|^TitanKey(\.class)$|^TitanLabel(\.class)$/;

    return _.isString(this.value) && graphRegex.test(this.value);
  };

  return Argument;
})();