neo4j-architect
===============

Functional constructor for Neo4j queries and their results.

Basically, this makes it easy to combine and chain neo4j queries together.

It will also return an array of all the cypher queries, params and results if you pass in {neo4j: true} or {queries: true}. Queries for use with [Neo4j-Swagger](http://neo4j-swagger.tinj.com).

Check out [users.js](https://github.com/tinj/node-neo4j-swagger-api/blob/master/models/users.js) for an implementation.

In use at [Neo4j-Swagger](http://neo4j-swagger.tinj.com).


Big plans, more to come!

### Setup

In you .env file, set NEO4J_URL = YOUR_NEO4J_URL (default localhost:7474)

### Model

```javascript
    // user.js
    var Construct = require('neo4j-architect');

    // construct the cypher query and params
    var _getSingleUserQuery = function (params, callback) {
      var cypher_params = {
        id: params.id
      };

      var query = [
        'MATCH (user:User)',
        'WHERE user.id = {id}'
        'RETURN user'
      ].join('\n');

      callback(null, query, cypher_params);
    }

    // extract the data from the cypher results
    var _singleUserResult = function (results, callback) {
      if (results.length) {
        callback(null, results[0].user._node.data);
      } else {
        callback(null, null);
      }
    }

    var getUser = new Construct().query(_getSingleUserQuery).then(_singleUserResult);
    var createUser = new Construct(_createUserQuery, _singleUserResult);
    var createUsers = new Construct().then(_createManySetupParams).map(createUser)

    module.exports = {
      getUser: getUser.fn(),
      createUser: createUser.fn(),
      createUsers: createUsers.fn()
    };
```

### Route

```javascript
    var Users = require('./user.js');

    // set options to {neo4j: true} or {queries: true} to return all queries/results
    exports.getUser = function (id, options, callback) {
      Users.getUser({id: id}, options, function (err, results, queries) {
        callback(err, results, queries);
      });
    };
```

Links
-------------
* [Neo4j-Swagger](http://neo4j-swagger.tinj.com)
* [Neo4j-Swagger Server](https://github.com/tinj/node-neo4j-swagger-api)
* [Neo4j-Swagger UI](https://github.com/tinj/neo4j-swagger-ui)
* [Node-Neo4j](https://github.com/thingdom/node-neo4j)
* [Neo4j](http://www.neo4j.org)


### License
MIT