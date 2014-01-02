// neo4j architect helper module

// TODO: turn into module and rename to neo4j-architect

var neo4j = require('neo4j'),
    db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474'),
    _ = require('underscore'),
    async = require('async')
;

/* Architect
 *
 * chainable neo4j query
 *
 */

// The Architect creates Constructs
var Construct = function () {

  this.init = function () {
    var args = Array.prototype.slice.call(arguments);
    this._construct = true;
    this._sequence = [];
    if (args.length == 2) {
      // assumes the first argument is a query fn and the second is a results fn
      this.query(args[0]);
      this.results(args[1]);
    } else if (args.length == 1) {
      // assumes the first argument is a query fn
      this.query(args[0]);
    } else {
      // this._add.apply(this, args);
    }
  };

  this._add = function () {
    this._sequence.push.apply(this._sequence, arguments);
    // console.log(fn);
    // this._sequence.push(fn);
    return this;
  };

  // constructor functions
  this.query = function (fn) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    return this._add(fn, 'query');
  };

  this.results = function (fn) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    return this._add(fn);
  };

  this.setup = function (fn, initParams) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    if (initParams) {
      return this._add({
        params: true,
        fn: fn
      });
    } else {
      return this._add(fn);
    }
  };

  this.params = function () {
    return this._add('params');
  };

  this.construct = function (fn) {
    if (!fn._construct) {
      throw new Error('Not a Construct function');
    }
    return this._add(fn);
  };

  // can handle constructs, functions, 'query', 'params'
  this.then = function (fn, initParams) {
    if (!fn) {
      throw new Error('Missing function');
    } else if (_.isFunction(fn)) {
      if (true === initParams) {
        return this._add({
          params: true,
          fn: fn
        });
      }
    } else if (_.isObject(fn)) {
      if (!fn._construct) {
        throw new Error('Not a Construct');
      }
    } else if (_.isString(fn)) {
      if ('query' == fn || 'params' == fn) {
        return this._add(fn);
      }
    } else {
      throw new Error('Invalid Argument');
    }

    return this._add(fn);
  };

  function _setAsync (that) {
    function _async (name, fn) {
      return this._add({
        async: name,
        fn: fn
      });
    }
    _.each(['map', 'mapSeries'], function (name) {
      that[name] = _.partial(_async, name);
    });
  }
  _setAsync(this);

  this._exp = function (_sequence, params, options, callback) {
    // console.log('exp');
    var neo4jResponse = _.isObject(options) ? options.neo4j || options.queries : false;
    var queries = neo4jResponse ? [] : null;
    var _query = function (query, params, callback) {
      // console.log('_query');
      db.query(query, params, function (err, results) {
        if (queries) {
          queries.push({
            query: query,
            params: params,
            results: _cleanResults(results)
          });
          // console.log(_.last(queries));
        }
        callback(err, results);
      });
    };

    // pass in original params
    var _params = function () {
      var callback = arguments[arguments.length - 1];
      callback(null, params);
    };

    // run and extract queries from another Construct
    var _construct = function (fn, params, callback) {
      fn.fn()(params, options, function (err, results, theseQueries) {
        if (queries && theseQueries && theseQueries.length) {
          queries.push.apply(queries, theseQueries);
        }
        callback(err, results);
      });
    };

    // run attached fn using an async function (e.g. 'map')
    var _async = function (name, fn, params, callback) {
      if (fn._construct) {
        async[name](params, _.partial(_construct, fn), callback);
      } else {
        async[name](params, fn, callback);
      }
    };

    // pass in initial params
    var _init = function (callback) {
      callback(null, params);
    };

    // console.log(_sequence.length);
    var sequence = [_init].concat(_.map(_sequence, function (fn) {
      if (_.isFunction(fn)) {
        return fn;
      } else if ('query' == fn) {
        return _query;
      } else if ('params' == fn) {
        return _params;
      } else if (fn._construct) {
        return _.partial(_construct, fn);
      } else if (_.isObject(fn)) {
        if (_.isString(fn.async) && fn.fn) {
          return _.partial(_async, fn.async, fn.fn);
        } else if (fn.params && fn.fn) {
          return _.partial(fn.fn, params);
        }
      }
    }));

    // console.log(that._sequence);
    // console.log(sequence);
    async.waterfall(sequence, function (err, results) {
      callback(err, results, queries);
    });
  };

  // call this to export
  this.fn = function () {
    // pass in the fn sequence
    return _.partial(this._exp, this._sequence);
  };

  this.init.apply(this, arguments);

  return this;
};


// attach the neo4j db in case it needs to be accessed
Construct.db = db;



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


/**
 *  Util Functions
 */

var _whereTemplate = function (name, key, paramKey) {
  return name +'.'+key+'={'+(paramKey || key)+'}';
};



/**
 *  Construct Query Helper Functions
 */

Construct.where = function (name, keys) {
  if (_.isArray(name)) {
    _.map(name, function (obj) {
      return _whereTemplate(obj.name, obj.key, obj.paramKey);
    });
  } else if (keys && keys.length) {
    return 'WHERE '+_.map(keys, function (key) {
      return _whereTemplate(name, key);
    }).join(' AND ');
  }
};


module.exports = Construct;