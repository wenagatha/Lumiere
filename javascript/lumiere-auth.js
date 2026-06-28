/* ── Particles ── */
(function(){
  const bg = document.getElementById('bg');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      bottom:-10px;
      opacity:0;
      animation-duration:${8 + Math.random()*12}s;
      animation-delay:${Math.random()*10}s;
    `;
    bg.appendChild(p);
  }
})();

/* ── Tab switch ── */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('form-' + name).classList.add('active');
}

function autoSwitchTab() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'login' || tab === 'register') switchTab(tab);
}

/* ── Password toggle ── */
function togglePass(id, btn) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const regPass = document.getElementById('reg-pass');
  const regConfirm = document.getElementById('reg-pass2');
  const registerBtn = document.getElementById('register-btn');
  const passwordRules = document.querySelectorAll('#password-rules .password-rule');

  const validators = {
    length: value => value.length >= 8,
    uppercase: value => /[A-Z]/.test(value),
    number: value => /\d/.test(value),
  };

  function updatePasswordRules() {
    const value = regPass.value;
    let allMet = true;
    passwordRules.forEach(ruleEl => {
      const rule = ruleEl.dataset.rule;
      const met = validators[rule](value);
      ruleEl.classList.toggle('met', met);
      if (!met) allMet = false;
    });
    registerBtn.disabled = !allMet || regConfirm.value !== value || !regConfirm.value;
  }

  function updateConfirmState() {
    registerBtn.disabled = !regPass.value || regConfirm.value !== regPass.value ||
      !Array.from(passwordRules).every(ruleEl => ruleEl.classList.contains('met'));
  }

  regPass.addEventListener('input', () => { updatePasswordRules(); updateConfirmState(); });
  regConfirm.addEventListener('input', updateConfirmState);

  autoSwitchTab();
  updatePasswordRules();
  updateConfirmState();

  // ── Register (POST ke backand/register.php, format & nama field TIDAK diubah) ──
  document.getElementById('register-form-el').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!document.getElementById('agree').checked) {
      showToast('Anda harus menyetujui Syarat & Ketentuan ⚠️');
      return;
    }
    if (regPass.value !== regConfirm.value) {
      showToast('Password tidak cocok ⚠️');
      return;
    }

    const formData = new FormData(this); // sudah berisi nama_depan, nama_belakang, email, no_telp, password, promo_email
    fetch('../backand/register.php', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'sukses') {
          showToast('Akun berhasil dibuat! Silakan masuk ✨');
          setTimeout(() => switchTab('login'), 1800);
        } else {
          showToast(data.pesan);
        }
      })
      .catch(() => showToast('Terjadi kesalahan. Coba lagi.'));
  });

  // ── Login (POST ke backand/login.php, format & nama field TIDAK diubah) ──
  document.getElementById('login-form-el').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(this); // berisi email, password

    fetch('../backand/login.php', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'sukses') {
          localStorage.setItem('lum_user', JSON.stringify(data.user));
          showToast('Login berhasil! Mengalihkan...');
          setTimeout(() => window.location.href = data.redirect, 1200);
        } else {
          showToast(data.pesan);
        }
      })
      .catch(() => showToast('Terjadi kesalahan. Coba lagi.'));
  });
});

/* ── Enter key submits the active form ── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
  if (document.getElementById('form-login').classList.contains('active')) {
    e.preventDefault();
    document.getElementById('login-form-el').requestSubmit();
  } else {
    e.preventDefault();
    document.getElementById('register-form-el').requestSubmit();
  }
});
