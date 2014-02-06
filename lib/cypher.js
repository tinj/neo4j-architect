var _ = require('underscore');
// var _s = require('underscore.string');
var Promise = require('bluebird');

// template config
// interpolation: << prop >>
// evaluate: <% expression %>
_.templateSettings = {
  evaluate    : /<%([\s\S]+?)%>/g,
  interpolate: /<<([\s\S]+?)>>/g
};

var propRegex = /\{(.+?)\}/g;

/**
 *  Util Functions
 */

function _whereTemplate (name, key, paramKey) {
  return name +'.'+key+'={'+(paramKey || key)+'}';
}

// function _matchTemplate (name, label, paramKey) {
//   return '('+name+'.'+key+'={'+(paramKey || key)+'}';
// }

var QueryStrings = {
  matchNode: "(<< n_name >>:<< label >><% if (_.isString(props)) {%> {<< props >>}<% } %>)",
  props: "<< key >>: << val >>"
};


var _nodeTemplate = _.template(QueryStrings.matchNode);
var _propsTemplate = _.template(QueryStrings.props);
var _patternTemplate = _.template("(<< n_name >>)-[<< r_name >>]-()");

var Template = function () {

};

Template._props = function (props, callback) {
  var err;
  var propString = _.map(props, function (val, key) {
    var v;
    if (_.isString(val)) {
      v = propRegex.test(val) ? val : '"'+val+'"';
    } else {
      err = new Error('Invalid Property');
    }
    return _propsTemplate({val: v, key: key});
  }).compact().join(', ');

  callback(err, propString);
};

var Cypher = function () {
  this._init();
};

Cypher.isCypher = function (obj) {
  return obj instanceof Cypher;
};

Cypher.deleteLabeledNode = function (inputs) {
  var label, props;

  if (_.isString(inputs)) {
    label = inputs;
    props = _.flatten(Array.prototype.slice.call(arguments, 1));
  } else {
    label = inputs.label;
    props = inputs.props;
  }

  var _setQuery = Cypher._deleteLabeledNodeQuery(label, props);
  var _setCypherParams = Cypher._getParamKeys(props);

  // return new Cypher().done();

  var keys;
  if (props) {
    keys = _.isArray(props) ? props : [props];
  } else {
    keys = [];
  }

  return function (params, callback) {
    var cypher_params = _.pick(params, keys);
    if (_.size(cypher_params) !== keys.length) {
      callback(new Error('Missing paramater'));
    }

    callback(null, query, cypher_params);
  };
};

Cypher._getParamKeys = function (props) {
  var keys, values;

  keys = _.map(props, function (prop) {
    if (_.isString(prop)) {
      return prop;
    } else if (_.isObject(prop) && prop) {
      return prop;
    }
  });

};

Cypher._deleteLabeledNodeQuery = function (label, props) {
  var propString = _.map(props, function (prop) {
    if (_.isString(prop)) {
      return prop+':{'+prop+'}';
    } else {
      return prop.name + ':'+(prop.value ? prop.value : '{'+ (prop.param || prop.paramName) +'}');
    }
  }).join(', ');

  if (propString.length) {
    propString = ' {'+propString+'}';
  }

  Promise.method(Cypher.setPropString);

  var query = [
    'MATCH (_n:'+label+propString+')',
    'OPTIONAL MATCH (_n)-[_r]-()',
    'DELETE _n, _r'
  ].join('\n');

  return Promise.resolve(query);
};

Cypher.setPropString = function (props) {
  var propString = _.map(props, function (prop) {
    if (_.isString(prop)) {
      return prop+':{'+prop+'}';
    } else {
      return prop.name + ':'+(prop.value ? prop.value : '{'+ (prop.param || prop.paramName) +'}');
    }
  }).join(', ');

  if (propString.length) {
    propString = ' {'+propString+'}';
  }
  return propString;
};

// _deleteUser = Cypher.deleteLabeledNode({label: 'User', props: [{name: 'id', param: 'id'}]});
// _deleteUser = Cypher.deleteLabeledNode('User', 'id');

Cypher.exportQuery = function (_setQuery, _setCypherParams) {
  return function (params, callback) {
    return Promise.all([_setQuery(params), _setCypherParams(params)]).nodeify(function (err, arr) {
      callback(err, arr[0], arr[1]);
    });
  };
};

// Cypher.prototype.paramKeys = function (params) {
//   return _.pick(params, this.keys);
// };


Cypher.matchLabel = function (nodeName, label) {
  this.params = {};
  this.query = [
    'MATCH (user:User)',
    // Cypher.where('user', keys),
    'RETURN user'
  ].join('\n');
};

Cypher.prototype._add = function (el) {
  this.query.push(el);
};

Cypher.prototype._init = function () {
  this.params = {};
  this.query = [];
};

Cypher.prototype.setParams = function (params) {
  // this.pickParams =
};

Cypher.prototype.pickParams = function (arr) {
  _.pick()
};

Cypher.prototype._join = function () {
  return this.query = _(this.query).compact().join('\n');
};

Cypher.prototype.match = function () {
  var args = _.toArray(arguments);
  this._add();
};

Cypher.prototype.done = function () {
  if (_.isFunction(this.fn)) {
    // no need to reevaluate
    return this.fn;
  }
  var query = this.query || this._join();
  var that = this;

  this.fn = function (params, callback) {
    var cypher_params = that.getParams(params);
    var query = that.query;

    callback
    var p = Promise.resolve(params).bind(this);


    var _done;
    if (_.isFunction(callback)) {
      _done = function (err, query, params) {
        // console.log('done', err, results, this.query);
        callback(err, query, params);
      };
    }

    return p.nodeify(callback);
  };
  return this.fn;
};

/**
 *  Construct Query Helper Functions
 */

Cypher.where = function (name, keys) {
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

// Cypher.optionalMatch = function ();

module.exports = Cypher;