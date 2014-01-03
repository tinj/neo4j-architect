var _ = require('underscore');

/*
 *  Neo4j results cleaning functions
 *  strips RESTful data from cypher results
 */

// creates a clean results which removes all non _data properties from nodes/rels
function _cleanResults (results, stringify) {
  var clean = _.map(results, function (res) {
    return _.reduce(res, _cleanObject, {});
  });
  if (stringify) return JSON.stringify(clean, '', '  ');
  return clean;
}

// copies only the data from nodes/rels to a new object
function _cleanObject (memo, value, key) {
  if (_hasData(value)) {
    memo[key] = value._data.data;
  } else if (_.isArray(value)) {
    memo[key] = _.reduce(value, _cleanArray, []);
  } else {
    memo[key] = value;
  }
  return memo;
}

// cleans an array of nodes/rels
function _cleanArray (memo, value) {
  if (_hasData(value)) {
    return memo.concat(value._data.data);
  } else if (_.isArray(value)) {
    return memo.concat(_.reduce(value, _cleanArray, []));
  } else {
    return memo.concat(value);
  }
}

function _hasData (value) {
  return _.isObject(value) && value._data;
}

exports.cleanResults = _cleanResults;