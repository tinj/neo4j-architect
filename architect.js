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
  this.neo4j = this.neo = neo;

  this.Cypher = this.cypher = Cypher;

  this.Construct = this.construct = Construct;

  this.getConstruct = function () {
    return this.Construct;
  };

  return this;
};


module.exports = Architect();