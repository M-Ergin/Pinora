/* —–––––––––––– Modüller –––––––––––– */
const express      = require("express");
const path         = require("path");
const bodyParser   = require("body-parser");
const cookieParser = require("cookie-parser");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const multer       = require("multer");
const http         = require("http");

/* —–––––––––––– Uygulama –––––––––––– */
const app    = express();
const server = http.createServer(app);
const io     = require("socket.io")(server);

/* — Veritabanı — */
const db = require("./page/database");

/* — Ayarlar — */
const PORT        = process.env.PORT || 5050;
const JWT_SECRET  = "gizli_anahtar";
const upload      = multer({ storage: multer.memoryStorage() });

/* — Orta katman — */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "page")));

/* — JWT koruma — */
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/register.html");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/register.html");
  }
}

/* ========== KULLANICI ROTALARI ========== */
app.get("/users", authMiddleware, (_, res) => {
  db.all("SELECT username FROM users", [], (e, rows) =>
    e ? res.status(500).json({success:false}) :
        res.json({success:true, users:rows.map(r=>r.username)})
  );
});

app.get("/user", authMiddleware, (req, res) => {
  db.get("SELECT fullName, username, email FROM users WHERE id = ?",
    [req.user.id],
    (e, u) => e ? res.status(500).json({success:false})
               : u ? res.json({success:true, user:u})
                    : res.status(404).json({success:false})
  );
});

app.post("/register", (req, res) => {
  const { fullName, username, email, password } = req.body;
  db.get("SELECT 1 FROM users WHERE username = ?", [username], (e, ex) => {
    if (ex) return res.status(400).json({success:false, message:"Kullanıcı adı mevcut"});
    bcrypt.hash(password, 10, (e2, hash) => {
      if (e2) return res.status(500).json({success:false});
      db.run(
        "INSERT INTO users (fullName, username, email, password) VALUES (?,?,?,?)",
        [fullName, username, email, hash],
        e3 => e3 ? res.status(500).json({success:false}) : res.json({success:true})
      );
    });
  });
});

app.post("/login", (req, res) => {
  const { username: field, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? OR email = ?", [field, field], (e, user) => {
    if (!user) return res.status(400).json({success:false, message:"Kullanıcı bulunamadı"});
    bcrypt.compare(password, user.password, (e2, ok) => {
      if (!ok) return res.status(400).json({success:false, message:"Parola yanlış"});
      const token = jwt.sign({ id:user.id, username:user.username }, JWT_SECRET, { expiresIn:"1h" });
      res.cookie("token", token, { httpOnly:true, maxAge:3600000, sameSite:"lax" })
         .json({success:true});
    });
  });
});

app.post("/logout", (_, res) => res.clearCookie("token").json({success:true}));

/* ========== POST ROTALARI ========== */

/* Post ekle */
app.post("/add-post",
  authMiddleware,
  upload.single("image"),
  (req,res)=>{
    const { title,description } = req.body;
    if (!req.file) return res.status(400).send("Görsel yok");

    db.run(`
      INSERT INTO posts (user_id,image,title,description)
      VALUES (?,?,?,?)
    `,[req.user.id,req.file.buffer,title,description],
    e => e ? res.status(500).send(e.message) : res.redirect("/"));
});


/* Post listesi */
app.get("/posts", (_, res) => {
  db.all(`
    SELECT  p.id,
            p.title,
            p.description,
            p.image,
            u.username                               AS author,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes
    FROM    posts p
    LEFT JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
  `, [], (e, rows) =>
    e ? res.status(500).send(e.message)
      : res.json(rows.map(r => ({
          id:          r.id,
          title:       r.title,
          description: r.description,
          author:      r.author ?? null,          // null → JS tarafında "" olur
          likes:       r.likes,
          image:       `data:image/png;base64,${r.image.toString("base64")}`
        })))
  );
});


/* Like (+1 / already) */
app.post("/posts/:id/like", authMiddleware, (req, res) => {
  const postId = req.params.id, userId = req.user.id;
  db.run("INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?,?)",
    [userId, postId],
    function (e) {
      if (e) return res.status(500).json({success:false});
      db.get("SELECT COUNT(*) AS c FROM likes WHERE post_id = ?", [postId], (e2,row)=>{
        if (e2) return res.status(500).json({success:false});
        if (this.changes === 0)
          return res.json({success:false, already:true, likes:row.c});
        /* posts.likes sütununu da tutarlı kılalım */
        db.run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId], () =>
          res.json({success:true, likes:row.c})
        );
      });
    });
});

/* Fotoğraf indir */
app.get("/posts/:id/download", (req, res) => {
  db.get("SELECT image, title FROM posts WHERE id = ?", [req.params.id], (e,row)=>{
    if (e || !row) return res.status(404).send("Bulunamadı");
    res.set({
      "Content-Type":"image/png",
      "Content-Disposition":`attachment; filename="${row.title||'foto'}.png"`
    });
    res.end(row.image);
  });
});

/* Ana sayfa */
app.get("/", authMiddleware, (_, res) =>
  res.sendFile(path.join(__dirname, "page", "mainPg.html")));

/* Socket.io sayaç */
const online = new Set();
io.on("connection", s => {
  online.add(s.id);
  io.emit("toplam-kullanici", online.size);
  s.on("disconnect", () => {
    online.delete(s.id);
    io.emit("toplam-kullanici", online.size);
  });
});

/* Sunucuyu başlat */
server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
