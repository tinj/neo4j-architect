var neo4j = require('neo4j');

var db;

var init = function (url) {
  // console.log('neo init');
  db = new neo4j.GraphDatabase(url || process.env.NEO4J_URL || 'http://localhost:7474');
  return db;
};

var getStatus = function () {
  return !!db;
};

var getDb = function () {
  if (!getStatus()) {
    return init();
  }
  return db;
};

module.exports = {
  init: init,
  getStatus: getStatus,
  getDb: getDb
};
