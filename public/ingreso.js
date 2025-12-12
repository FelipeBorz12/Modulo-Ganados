// public/ingreso.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-ingreso');

  const fechaIngreso = document.getElementById('fechaIngreso');
  const numero = document.getElementById('numero');
  const finca = document.getElementById('finca');
  const color = document.getElementById('color');
  const sexo = document.getElementById('sexo');
  const edad = document.getElementById('edad');
  const raza = document.getElementById('raza');
  const pesoFinca = document.getElementById('pesoFinca');
  const peso = document.getElementById('peso');
  const marca = document.getElementById('marca');
  const proveedor = document.getElementById('proveedor');

  const valorKGingreso = document.getElementById('valorKGingreso');
  const flete = document.getElementById('flete');
  const comision = document.getElementById('comision');
  const mermas = document.getElementById('mermas');

  const btnLimpiar = document.getElementById('btn-limpiar-ingreso');

  const loadingModal = document.getElementById('loading-modal');
  const successModal = document.getElementById('success-modal');
  const successClose = document.getElementById('success-close');
  const errorModal = document.getElementById('error-modal');
  const errorMessage = document.getElementById('error-message');
  const errorClose = document.getElementById('error-close');
  const warningModal = document.getElementById('warning-modal');
  const warningMessage = document.getElementById('warning-message');
  const warningClose = document.getElementById('warning-close');

  const btnLogout = document.getElementById('btn-logout');

  // Uppercase para el número
  numero.addEventListener('input', () => {
    numero.value = numero.value.toUpperCase();
  });

  // Mostrar / ocultar modales helpers
  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  // Limpiar formulario
  function limpiarFormulario() {
    form.reset();
  }

  btnLimpiar.addEventListener('click', () => {
    limpiarFormulario();
  });

  warningClose.addEventListener('click', () => hide(warningModal));
  successClose.addEventListener('click', () => hide(successModal));
  errorClose.addEventListener('click', () => hide(errorModal));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!fechaIngreso.value || !numero.value || !sexo.value || !edad.value || !raza.value || !peso.value || !valorKGingreso.value || !finca.value || !marca.value) {
      warningMessage.textContent =
        'Por favor completa todos los campos obligatorios marcados.';
      show(warningModal);
      return;
    }

    const payload = {
      FechaIngreso: fechaIngreso.value,
      Numero: numero.value.toUpperCase().trim(),
      Color: color.value || null,
      Peso: parseFloat(peso.value) || 0,
      Sexo: sexo.value,
      Edad: edad.value,
      Marcallegada: marca.value,
      ValorKGingreso: parseFloat(valorKGingreso.value) || 0,
      Destino: '', // ingreso no define destino
      Finca: finca.value,
      Raza: raza.value,
      Flete: parseFloat(flete.value) || 0,
      Comision: parseFloat(comision.value) || 0,
      Mermas: parseFloat(mermas.value) || 0,
      Proveedor: proveedor.value || null,
      PesoFinca: parseFloat(pesoFinca.value) || 0,
    };

    show(loadingModal);
    try {
      const res = await fetch('/api/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent =
          err.error ||
          'Ocurrió un error al registrar el ingreso en la base de datos.';
        show(errorModal);
        return;
      }

      show(successModal);
      limpiarFormulario();
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo conectar con el servidor. Verifica la conexión.';
      show(errorModal);
    }
  });
});
