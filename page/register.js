/* ---------------------------------------------------
   Form görünümlerini değiştiren yardımcı fonksiyonlar
--------------------------------------------------- */
function registerPage() {
  document.getElementById("loginBox").style.display    = "none";
  document.getElementById("registerBox").style.display = "block";
}

function loginPage() {
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("loginBox").style.display    = "block";
}

/* ---------------------------------------------------
   Giriş  ( /login )
--------------------------------------------------- */
async function login(evt) {
  if (evt) evt.preventDefault();      // hem inline onsubmit hem addEventListener için

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!username || !password) return alert("Lütfen tüm alanları doldurun");

  try {
    const res = await fetch("/login", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",            // token çerezini güvenli aktar
      body   : JSON.stringify({ username, password })
    });

    if (!res.ok) throw new Error(`Sunucu hatası (${res.status})`);

    const data = await res.json();
    if (data.success) {
      location.href = "/";               // token alındı → ana sayfa
    } else {
      alert(data.message || "Giriş başarısız");
    }
  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

/* ---------------------------------------------------
   Kayıt  ( /register )
--------------------------------------------------- */
async function submitRegister(evt) {
  if (evt) evt.preventDefault();

  const fullName = document.getElementById("registerFullName").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const email    = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm  = document.getElementById("registerConfirmPassword").value;

  if (!fullName || !username || !email || !password || !confirm)
    return alert("Lütfen tüm alanları doldurun");

  if (password.length < 4)
    return alert("Parola en az 4 karakter olmalı");

  if (password !== confirm)
    return alert("Parolalar eşleşmiyor");

  try {
    const res = await fetch("/register", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body   : JSON.stringify({ fullName, username, email, password })
    });

    if (!res.ok) throw new Error(`Sunucu hatası (${res.status})`);

    const data = await res.json();
    if (data.success) {
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
      loginPage();
    } else {
      alert(data.message || "Kayıt başarısız");
    }
  } catch (err) {
    alert("Bağlantı hatası: " + err.message);
  }
}

/* ---------------------------------------------------
   Ek güvence:  JS dinleyicileri form submit'ine bağla
--------------------------------------------------- */
document.getElementById("loginForm")    ?.addEventListener("submit", login);
document.getElementById("registerForm") ?.addEventListener("submit", submitRegister);
