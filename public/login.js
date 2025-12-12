// public/login.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const messageEl = document.getElementById('message');
  const button = document.getElementById('login-button');

  const pinInput = document.getElementById('pin');
  const togglePinBtn = document.getElementById('toggle-pin');
  const iconEye = document.getElementById('icon-eye');
  const iconEyeOff = document.getElementById('icon-eye-off');

  const loadingModal = document.getElementById('loading-modal');

  // Solo mostramos errores en rojo
  function setMessage(text) {
    messageEl.textContent = text || '';
    messageEl.classList.remove('text-red-500');
    if (!text) return;
    messageEl.classList.add('text-red-500');
  }

  function showLoading() {
    loadingModal.classList.remove('hidden');
  }

  function hideLoading() {
    loadingModal.classList.add('hidden');
  }

  // Mostrar / ocultar clave
  togglePinBtn.addEventListener('click', () => {
    const isPassword = pinInput.type === 'password';
    pinInput.type = isPassword ? 'text' : 'password';

    iconEye.classList.toggle('hidden', !isPassword);
    iconEyeOff.classList.toggle('hidden', isPassword);
  });

  // Forzar usuario en MAYÚSCULAS (opcional pero útil)
  const usernameInput = document.getElementById('username');
  usernameInput.addEventListener('input', () => {
    usernameInput.value = usernameInput.value.toUpperCase();
  });

  // Envío del formulario
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    button.disabled = true;
    button.textContent = 'Validando...';

    const username = form.username.value.trim();
    const pin = form.pin.value.trim();

    if (!username) {
      setMessage('Ingresa el nombre de usuario.');
      button.disabled = false;
      button.textContent = 'Ingresar';
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setMessage('La clave debe tener exactamente 4 dígitos numéricos.');
      button.disabled = false;
      button.textContent = 'Ingresar';
      return;
    }

    try {
      // RUTA RELATIVA → en / => /api/login, en /ganados => /ganados/api/login
      const response = await fetch('api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Modal de carga mientras redirige
        showLoading();

        // RUTA RELATIVA → en / => /dashboard.html, en /ganados => /ganados/dashboard.html
        window.location.href = 'dashboard.html';
      } else {
        setMessage(data.error || 'Usuario o clave incorrectos.');
        button.disabled = false;
        button.textContent = 'Ingresar';
      }
    } catch (error) {
      console.error('Error en la petición de login:', error);
      setMessage('No se pudo conectar con el servidor.');
      button.disabled = false;
      button.textContent = 'Ingresar';
    } finally {
      // Si la respuesta fue OK, deja el botón deshabilitado y el modal activo
      // El flujo pasa a la redirección
    }
  });
});
