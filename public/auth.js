(function () {
  const form = document.getElementById('auth-form');
  const submit = document.getElementById('auth-submit');
  const switchButton = document.getElementById('auth-switch');
  const description = document.getElementById('auth-description');
  const error = document.getElementById('auth-error');
  let registering = false;

  switchButton.addEventListener('click', () => {
    registering = !registering;
    submit.textContent = registering ? 'Tạo tài khoản' : 'Đăng nhập';
    switchButton.textContent = registering ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới';
    description.textContent = registering ? 'Tạo tài khoản cá nhân để đồng bộ dữ liệu an toàn.' : 'Đăng nhập để đồng bộ dữ liệu giữa máy tính và điện thoại.';
    document.getElementById('auth-password').autocomplete = registering ? 'new-password' : 'current-password';
    error.textContent = '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    try {
      const response = await fetch(`/api/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('auth-email').value,
          password: document.getElementById('auth-password').value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Không thể đăng nhập');
      window.location.href = '/dashboard.html';
    } catch (requestError) {
      error.textContent = requestError.message;
      submit.disabled = false;
    }
  });
})();
