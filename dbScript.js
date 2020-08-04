const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
 
// this is a top-level await 
(async () => {
    // open the database
    const db = await open({
      filename: '/tmp/database.db',
      driver: sqlite3.Database
    })
    await db.exec('CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR NOT NULL, birthDate DATE, email VARCHAR NOT NULL, phone INTEGER)');
    await db.exec('CREATE TABLE tag (id INTEGER PRIMARY KEY AUTOINCREMENT, text VARCHAR, userId INTEGER, noteId INTEGER)');
    await db.exec('CREATE TABLE note (id INTEGER PRIMARY KEY AUTOINCREMENT, text VARCHAR, userIdLike INTEGER NOT NULL, FOREIGN KEY (userIdLike) REFERENCES user (id), FOREIGN KEY (id) REFERENCES tag (noteId))');
})()