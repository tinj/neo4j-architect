var neo4j = require('neo4j');

var db;

function init (url) {
  console.log('neo init');
  db = new neo4j.GraphDatabase(url || process.env.NEO4J_URL || 'http://localhost:7474');
  return db;
}

function getStatus () {
  return !!db;
}

function getDb () {
  if (!getStatus()) {
    init();
  }
  return db;
}

module.exports = {
  init: init,
  getStatus: getStatus,
  getDb: getDb
};
