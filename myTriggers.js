const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
 
// this is a top-level await 
(async () => {
    // open the database
    const db = await open({
      filename: '/tmp/database.db',
      driver: sqlite3.Database
    })
    await db.exec('CREATE TRIGGER count_tags AFTER INSERT ON tag BEGIN UPDATE note SET tags_count = (SELECT COUNT(id) FROM tag WHERE noteId = NEW.noteId) WHERE id = NEW.noteId; END');
    await db.exec('CREATE TRIGGER count_notes AFTER INSERT ON note BEGIN UPDATE user SET notes_count = (SELECT COUNT(id) FROM note WHERE userIdLike = NEW.userIdLike) WHERE id = NEW.userIdLike; END');
})()