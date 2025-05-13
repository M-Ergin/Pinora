/* -----------------------------------------------------------
   0)  DOM hazır olduğunda çalışacak ana fonksiyon
----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------------------------------------------
     1)  LOGIN  /  REGISTER
  --------------------------------------------------------- */
  const loginBox    = document.getElementById("loginBox");
  const registerBox = document.getElementById("registerBox");

  if (loginBox || registerBox) {
    /* Giriş */
    window.login = () => {
      const u = document.getElementById("loginUsername")?.value.trim();
      const p = document.getElementById("loginPassword")?.value.trim();
      if (!u || !p) return alert("Lütfen tüm alanları doldurun!");

      fetch("/login", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ username: u, password: p })
      })
      .then(r => r.json())
      .then(d => d.success
        ? location.href = "/"
        : alert(d.message || "Giriş başarısız"))
      .catch(e => console.error("Giriş hatası:", e));
    };

    /* Kayıt */
    window.submitRegister = () => {
      const fullName = document.getElementById("registerFullName")?.value.trim();
      const username = document.getElementById("registerUsername")?.value.trim();
      const email    = document.getElementById("registerEmail")?.value.trim();
      const pass     = document.getElementById("registerPassword")?.value;
      const confirm  = document.getElementById("registerConfirmPassword")?.value;

      if (!fullName || !username || !email || !pass || !confirm)
        return alert("Lütfen tüm alanları doldurun!");
      if (pass !== confirm)
        return alert("Parolalar eşleşmiyor.");

      fetch("/register", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ fullName, username, email, password: pass })
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
          loginPage();
        } else {
          alert(d.message || "Kayıt başarısız");
        }
      })
      .catch(e => console.error("Kayıt hatası:", e));
    };

    /* Form görünüm geçişleri */
    window.loginPage = () => {
      registerBox && (registerBox.style.display = "none");
      loginBox    && (loginBox.style.display    = "block");
    };
    window.registerPage = () => {
      loginBox    && (loginBox.style.display    = "none");
      registerBox && (registerBox.style.display = "block");
    };
  }

  /* ---------------------------------------------------------
     2)  HESAP BİLGİLERİ ve ÇIKIŞ
  --------------------------------------------------------- */
  const accountInfo  = document.getElementById("accountInfo");
  const logoutButton = document.getElementById("logoutButton");

  if (accountInfo) {
    accountInfo.style.display = "none";

    fetch("/user", { credentials: "same-origin" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          document.getElementById("fullName").textContent = d.user.fullName;
          document.getElementById("username").textContent = d.user.username;
          document.getElementById("email")   .textContent = d.user.email;
          accountInfo.style.display = "block";
        } else {
          location.href = "/register.html";
        }
      })
      .catch(e => console.error("Hesap bilgisi hatası:", e));

    logoutButton?.addEventListener("click", () => {
      fetch("/logout", { method: "POST", credentials: "same-origin" })
        .then(() => location.href = "/register.html")
        .catch(e => console.error("Çıkış hatası:", e));
    });
  }

  /* ---------------------------------------------------------
     3)  TÜM KULLANICILARI LİSTELE
  --------------------------------------------------------- */
  const userListEl = document.getElementById("userList");
  if (userListEl) {
    fetch("/users", { credentials: "same-origin" })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.users)) {
          d.users.forEach(u => {
            const li = document.createElement("li");
            li.textContent = u;
            userListEl.appendChild(li);
          });
        } else {
          userListEl.innerHTML = "<li>Liste boş ya da erişim yok.</li>";
        }
      })
      .catch(e => {
        console.error("Kullanıcı listesi hatası:", e);
        userListEl.innerHTML = "<li>Bir hata oluştu.</li>";
      });
  }

  /* ---------------------------------------------------------
     4)  GALERİ  (mainPg için)
  --------------------------------------------------------- */
  const galleryEl = document.getElementById("gallery");
  if (galleryEl) {
    fetch("/posts")
      .then(r => r.json())
      .then(posts => {
        galleryEl.innerHTML = "";
        posts.forEach(p => {
          const li = document.createElement("li");
          li.className = "card";
          li.innerHTML = `
            <h2 class="postTitle">
              ${p.title}
              ${p.author ? `<span class="authorTag">@${p.author}</span>` : ""}
            </h2>
            <a href="/posts/${p.id}/download">
              <img src="${p.image}" alt="${p.title}">
            </a>
            <div class="descbox">
              <p>${p.description ?? ""}<p>
              <button class="likeBtn" data-id="${p.id}">
                ❤︎ <span>${p.likes}</span>
              </button>
            </div>`;
          galleryEl.appendChild(li);
        });

        /* Like butonları */
        galleryEl.querySelectorAll(".likeBtn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            const res = await fetch(`/posts/${id}/like`, {
              method: "POST",
              credentials: "include"
            });
            const data = await res.json();
            if (data.success) {
              btn.querySelector("span").textContent = data.likes;
              btn.disabled = true;
              btn.classList.add("liked");
            } else if (data.already) {
              alert("Bu gönderiyi zaten beğendiniz.");
              btn.disabled = true;
            } else {
              alert("Bir hata oluştu.");
            }
          });
        });
      })
      .catch(e => console.error("Galeri hatası:", e));
  }

});
