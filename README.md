neo4j-architect
===============

Functional constructor for Neo4j queries and their results.

Basically, this makes it easy to combine and chain neo4j queries together.

It also will return an array of all the cypher queries, params and results if you pass in

Check out [Neo4j-Swagger Server](https://github.com/tinj/node-neo4j-swagger-api/blob/master/models/users.js) for an implementation.

### Setup

In you .env file, set NEO4J_URL = YOUR_NEO4J_URL (default localhost:7474)

### Model

```javascript
    // user.js
    var Construct = require('neo4j-architect');
    var getUser = new Construct().query(_getSingleUserQuery).then(_singleUser);
    var createUser = new Construct(_createUserQuery, _singleUser);
    var createUsers = new Construct().then(createManySetupParams).map(createUser)

    module.exports = {
      getUser: getUser.fn(),
      createUser: createUser.fn(),
      createUsers: createUsers.fn()
    };
```

### Route

```javascript
    var Users = require('./user.js');

    exports.getUser = function (id, options, callback) {
      Users.getUser({id: id}, options, function (err, results, queries) {
        callback(err, results, queries);
      });
    };
```

Links
-------------
[Neo4j-Swagger Server](https://github.com/tinj/node-neo4j-swagger-api)
[Neo4j-Swagger UI](https://github.com/tinj/neo4j-swagger-ui)
[Node-Neo4j](https://github.com/thingdom/node-neo4j)
[Neo4j](http://www.neo4j.org)


### License
MIT