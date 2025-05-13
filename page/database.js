const sqlite3 = require("sqlite3").verbose();

/* — Bağlantı — */
const db = new sqlite3.Database("./mydb.sqlite3", err => {
  if (err) console.error("DB bağlantı hatası:", err.message);
  else      console.log("✅ Veritabanı bağlandı");
});

/* — Tablolar — */
db.serialize(() => {
  /* USERS */
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName  TEXT NOT NULL,
      username  TEXT NOT NULL UNIQUE,
      email     TEXT NOT NULL UNIQUE,
      password  TEXT NOT NULL
    );`);

  /* POSTS (likes sütunu geriye dönük uyum için duruyor) */
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER,
      image       BLOB NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      likes       INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`);

  /* YENİ: LIKE eşleme tablosu */
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      user_id INTEGER,
      post_id INTEGER,
      liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );`);
});

module.exports = db;
