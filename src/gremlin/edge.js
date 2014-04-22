var inherits = require("inherits");

var Element = require("./element");

module.exports = (function (){
  function Edge() {
    this._type = "edge";

    Element.apply(this, arguments);
  }

  inherits(Edge, Element);

  Edge.toGroovy = function() {
    return 'Edge.class';
  };

  return Edge;

})();
