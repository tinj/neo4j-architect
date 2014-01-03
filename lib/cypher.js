var _ = require('underscore');

/**
 *  Util Functions
 */

function _whereTemplate (name, key, paramKey) {
  return name +'.'+key+'={'+(paramKey || key)+'}';
}



/**
 *  Construct Query Helper Functions
 */

exports.where = function (name, keys) {
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

