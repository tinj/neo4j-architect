var _ = require('underscore'),
    async = require('async'),
    misc = require('./misc'),
    neo = require('./neo')
;

var db, Query;

var cleanResults = misc.cleanResults;

function setQuery () {
  db = neo.getDb();
  Query = db.query;
}

// The Architect creates Constructs
var Construct = exports.Construct = function () {

  this.init = function () {
    var args = Array.prototype.slice.call(arguments);

    if (!Query) {
      setQuery();
    }

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
      Query(query, params, function (err, results) {
        if (queries) {
          queries.push({
            query: query,
            params: params,
            results: cleanResults(results)
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