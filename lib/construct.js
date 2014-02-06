var _ = require('underscore'),
    misc = require('./misc'),
    neo = require('./neo'),
    Promise = require('bluebird')
;

var db;

var cleanResults = misc.cleanResults;

function setDb () {
  db = neo.getDb();
}

// The Architect creates Constructs
var Construct = function () {
  // console.log('Construct');

  if (!this._original) {
    this.init.apply(this, arguments);
  } else {
    // this._exp.apply(this, arguments);
    throw new Error("Didn't create using 'new Construct()'");
  }
  // return this.check;
};

// flag to throw error for Construct()
Construct._original = true;

Construct.prototype.done = function () {
  var that = this;
  if (this._sequence.length === 1) {
    // gotta be a query...
    // console.log('adding a query');
    this._add('query');
  }

  if (_.isFunction(this.fn)) {
    // no need to reevaluate
    return this.fn;
  }

  this.fn = function (params, options, callback) {
    var queries = _.isObject(options) && (options.neo4j || options.queries);
    var ctx = {
      params: params,
      queries: queries ? [] : null
    };

    var p = Promise.resolve(params).bind(ctx);

    // this could probably be done before somehow
    var s = _.reduce(that._sequence, function (p, fn) {
      return p[fn.method](fn.fn);
    }, p);

    // promise/callback compatibility
    var _done;
    if (_.isFunction(callback)) {
      _done = function (err, results) {
        // console.log('done', err, results, this.queries);
        callback(err, results, this.queries);
      };
    }
    return s.nodeify(_done);
  };
  return this.fn;
};


// query promise
function _query (query, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
    // console.log('query');
    // console.log(query, params);
    db.query(query, params, function (err, results) {
      if (that.queries) {
        that.queries.push({
          query: query,
          params: params,
          results: cleanResults(results)
        });
        // console.log(JSON.stringify(that.queries));
      }
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// pass in original params
function _params () {
  return Promise.resolve(this.params);
}

// prototypes

Construct.prototype._add = function () {
  var sequence = this._sequence;
  var that = this;
  var args = _.toArray(arguments);
  _.map(args, function (fn) {
    if (_.isString(fn)) {
      if ('query' === fn) {
        sequence.push({
          method: 'spread',
          fn: _query
        });
      } else if ('params') {
        sequence.push({
          method: 'then',
          fn: _params
        });
      } else {
        throw new Error('Invalid Argument');
      }
    } else if (fn instanceof Construct) {
      that._addConstruct(fn);
    } else if (_.isFunction(fn)) {
      sequence.push({
        method: 'then',
        fn: Promise.promisify(fn)
      });
    } else if (_.isObject(fn) && _.isString(fn.method) && fn.fn) {
      sequence.push(fn);
    }
  });
  return this;
};

Construct.prototype._addConstruct = function (construct, method) {
  if (construct instanceof Construct) {
    var prom = construct.done();
    var fn;

    if ('map' === method || _.isUndefined(method)) {
      fn = function (item) {
        var that = this;
        return prom(item, this).then(function (results) {
          that.queries.push.apply(that.queries, this.queries);
          return results;
        });
      };
    } else if ('mapSeries' === method) {
      // console.log('mapSeries');
      fn = function (params) {
        var that = this;
        return Promise.all(params.map(function (param) {
          return prom(param, that).then(function (results) {
            that.queries.push.apply(that.queries, this.queries);
            return results;
          });
        }));
      };
      method = 'then';
    } else {
      // console.log('add const');
      fn = function (param) {
        var that = this;
        return prom(param, that).then(function (results) {
          that.queries.push.apply(that.queries, this.queries);
          return results;
        });
      };
    }

    return this._add({
      method: method || 'then',
      fn: fn
    });
  } else {
    throw new Error('Not a Construct');
  }
};

// constructor functions
Construct.prototype.query = function (fn) {
  if (arguments.length === 0) {
    return this._add('query');
  } else if (!_.isFunction(fn)) {
    throw new Error('Not a function');
  }
  return this._add(fn, 'query');
};

// for passing params to the next fn/promise
Construct.prototype.params = function () {
  return this._add('params');
};

Construct.prototype.map = function (fn) {
  if (fn instanceof Construct) {
    return this._addConstruct(fn, 'map');
  } else {
    var prom = Promise.promisify(fn);
    return this._add({
      method: 'map',
      fn: function (item) {
        return prom(item).bind(this);
      }
    });
  }
};

// needs to be redone
Construct.prototype.mapSeries = function (fn) {
  if (fn instanceof Construct) {
    return this._addConstruct(fn, 'mapSeries');
  } else {
    var prom = Promise.promisify(fn);
    return this._add({
      method: 'all',
      fn: function (params) {
        var that = this;
        params.map(function (param) {
          return prom(param).bind(that);
        });
      }
    });
  }
};

// can handle constructs, functions, 'query', 'params'
Construct.prototype.then = function (fn) {
  if (!fn) {
    throw new Error('Missing function');
  } else if (_.isObject(fn)) {
    if (!fn instanceof Construct) {
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

Construct.prototype.init = function () {
  var args = Array.prototype.slice.call(arguments);

  this._sequence = [];

  if (!db) {
    setDb();
  }

  if (!args.length) return;

  if (args.length == 2) {
    // assumes the first argument is a query fn and the second is a results fn
    this.query(args[0]);
    this.then(args[1]);
  } else if (args.length == 1) {
    this._add(args[0]);
  } else {
    this._add.apply(this, args);
  }
};


module.exports = Construct;