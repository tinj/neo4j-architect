/* Architect
 *
 * chainable neo4j query
 *
 */

var neo = require('./lib/neo'),
    Construct = require('./lib/construct'),
    Cypher = require('./lib/cypher')
;

var Architect = function () {
  this.init = neo.init;
  this.neo4j = neo;
  this.neo = neo;

  this.Cypher = Cypher;
  this.Construct = Construct;

  this.getConstruct = function () {
    return this.Construct;
  };

  return this;
};


module.exports = Architect();