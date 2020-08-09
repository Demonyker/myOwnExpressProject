const express = require('express');
const app = express();
const port = 3001;
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const { open } = require('sqlite');
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const client = require('redis').createClient();
const helmet = require('helmet')
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'myproject';

// Use connect method to connect to the server
MongoClient.connect(url, {
  useUnifiedTopology: true,  // установка опций
  useNewUrlParser: true
}, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  client.close();
});
client.on('error', function (err) {
  console.log('Error ' + err);
});
const server = app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

let db = new sqlite3.Database('/tmp/database.db');
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'My app',
      description: 'My express first app',
      contact: {
        name: 'Alexey Abramenko'
      },
      servers: ["http://localhost:3000"]
    }
  },
  apis: ["index.js"]
}
app.use(bodyParser.urlencoded({ extended: true }));
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api/v1', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(helmet());
    /**
     * @swagger
     * /users:
     *  post:
     *    description: request for add user.
     *    requestBody:
     *     required: true
     *     content:
     *      application/json:
     *       schema:
     *        type: object
     *        properties:
     *         username:
     *          type: string
     *    responses: 
     *     '201':
     *      description: Created User
     */
    app.post('/users', (req, res) => {
      const {
        name,
        birthDate,
        email,
        phone,
        password,
      } = req.body;
      db.run(`INSERT INTO user(name, birthDate, email, phone, password) VALUES(?, ?, ?, ?, ?)`, [name, birthDate, email, phone, password], function(e) {
        if (e) {
          console.log(e)
        }
      })

      res.send('USER HAS BEEN ADD');
    })

    app.get('/users', (req, res) => {
      const { id } = req.query;
      const isHaveId = Boolean(id);
      const sql = isHaveId ? `SELECT * FROM user WHERE id = ?` : `SELECT * FROM user`;
      const type = isHaveId ? 'get' : 'all';
      db[type](sql, [id], function(e, result) {
        if(e) {
          console.log(e)
        }
        console.log(result)
        res.send(result)
      })
    })

    app.put('/users', (req, res) => {
      const { name, value, id, senderId } = req.body;
      if (senderId !== id) {
        res.send('No access')
      } else {
      db.run(`UPDATE user SET name = ? WHERE id = ?`, [value, id], function(e) {
        if (e) {
          console.log(e)
        }
      })
      res.send('user updated')}
    })

    app.post('/notes', (req, res) => {
      const { text, userId } = req.body;
      console.log(text, userId)
      db.run(`INSERT INTO note(text, userIdLike) VALUES(?, ?)`, [text, userId], function(e) {
        if (e) {
          console.log(e)
        }
      })

      res.send('ROW HAS BEEN ADD');
    })

    app.get('/notes', (req, res) => {
      const { id } = req.query;
      const isHaveId = Boolean(id);
      const sql = isHaveId ? `SELECT * FROM note WHERE id = ?` : `SELECT * FROM note`;
      const type = isHaveId ? 'get' : 'all';
      db[type](sql, [id], function(e, result) {
        if(e) {
          console.log(e)
        }
        res.send(result)
      })
    })

    app.put('/notes', (req, res) => {
      const { value, id, userId } = req.body;
      db.get(`SELECT * FROM note WHERE id = ?`, [id], function(e, note) {
        if(e) {
          console.log(e)
        }
        if (note.userIdLike === Number(userId)) {
          db.run(`UPDATE note SET text = ? WHERE id = ?`, [value, id], function(e) {
            if (e) {
              console.log(e)
            }
          })
          res.send('note updated')
        } else {
          res.send('No access')
        }
      })
    })

    app.delete('/notes', (req, res) => {
      const { id } = req.body;
      db.run(`DELETE FROM note WHERE id = ?`, [id], function(e) {
        if (e) {
          console.log(e)
        }
      })
      res.send('note deleted')
    })

    app.post('/tags', (req, res) => {
      const { text, userId, noteId } = req.body;
      db.run(`INSERT INTO tag(text, userId, noteId) VALUES(?, ?, ?)`, [text, userId, noteId], function(e) {
        if (e) {
          console.log(e)
        }
      })

      res.send('TAG HAS BEEN ADD');
    })

    app.get('/tags', (req, res) => {
      const { noteId } = req.query;
      db.all(`SELECT * FROM tag WHERE noteId = ?`, [noteId], function(e, r) {
        if(e) {
          console.log(e)
        }
        res.send(r)
      })
    })

    app.post('/auth', (req, res) => {
      const { email, password} = req.body;
      const user = {
        email,
        password,
      }
      res.send('test')
      passport.use(new LocalStrategy(
        function(email, password, done) {
            db.get(`SELECT * FROM user WHERE email = ?`, [email], function(e, r) {
              if (e) {
                return done(e)
              }

              if (!r) {
                return done(null, false)
              }

              if (password !== r.password) {
                return done(null, false)
              }

              return done(null, r)
            })
        }
      ))
    })

    app.post('/note/like', (req, res) => {
      const { userId, noteId, likeId } = req.body;
      client.lpush(`note_${noteId}`, String(likeId))
      client.lrange(`note_${noteId}`, '0', '-1', function(e,r) {
        const numberOfLikes = r.length;
        client.hset(`user_${userId}`, `note_${noteId}`, String(numberOfLikes))
        client.hgetall(`user_${userId}`, function (e, r) {
          const likesSummary = Object.entries(r)
          .filter(item => item[0] !== 'likesSummary')
          .map(item => item[1])
          .reduce((acc, item) => { return Number(acc) + Number(item)}, 0)
          client.hset(`user_${userId}`, 'likesSummary', likesSummary)
          client.hgetall(`user_${userId}`, function (e, r) {
            console.log(r)
          })
        })
      })
      client.lrange(`note_${noteId}`, '0', '-1', function(e,r) { 
        console.log(r)
      })
      res.send('like note')
    })