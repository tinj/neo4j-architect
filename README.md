neo4j-architect
===============

Functional constructor for Neo4j queries and their results.

Basically, this makes it easy to combine and chain neo4j queries together.

It will also return an array of all the cypher queries, params and results if you pass in {neo4j: true} or {queries: true}. Queries for use with [Neo4j-Swagger](http://neo4j-swagger.tinj.com).

Check out [users.js](https://github.com/tinj/node-neo4j-swagger-api/blob/master/models/users.js) for an implementation.

In use at [Neo4j-Swagger](http://neo4j-swagger.tinj.com).


Big plans, more to come! Pull-requests welcome!

### Setup

```javascript

    // .env file
    NEO4J_URL=YOUR_NEO4J_URL

    // set the neo4j URL, only needs to be done once
    var Architect = require('neo4j-architect');

    // with a url
    Architect.init("http://someserver.graphenedb.com:1234");

    // without a url but with a .env, url = process.env.NEO4J_URL
    Architect.init();

    // without a url or .env, url = 'http://localhost:7474'
    Architect.init();

```

### Model

```javascript
    // user.js

    var Architect = require('neo4j-architect');
    Architect.init();
    var Construct = Architect.Construct;

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
    var _extractSingleUser = function (results, callback) {
      if (results.length) {
        callback(null, results[0].user._node.data);
      } else {
        callback(null, null);
      }
    }

    // _getSingleUserQuery -> db.query -> extractSingleUser
    var getUser = new Construct(_getSingleUserQuery).query().then(_extractSingleUser);

    // _createUserQuery -> db.query (assumed) -> extractSingleUser
    var createUser = new Construct(_createUserQuery, _extractSingleUser);

    // _createManySetupParams -> map(createUser) (chaining to a map of another Construct)
    var createUsers = new Construct(_createManySetupParams).map(createUser)

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

### Links
-------------
* [Neo4j-Swagger](http://neo4j-swagger.tinj.com)
* [Neo4j-Swagger Server](https://github.com/tinj/node-neo4j-swagger-api)
* [Neo4j-Swagger UI](https://github.com/tinj/neo4j-swagger-ui)
* [Node-Neo4j](https://github.com/thingdom/node-neo4j)
* [Neo4j](http://www.neo4j.org)
* [Graphene DB](http://www.graphenedb.com)


### License
MIT