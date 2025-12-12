// public/salida.js
document.addEventListener('DOMContentLoaded', () => {
  // Formularios y campos
  const formBuscar = document.getElementById('form-buscar-salida');
  const numeroBuscarSalida = document.getElementById('numeroBuscarSalida');
  const infoEncontrado = document.getElementById('info-salida-encontrado');

  const formSalida = document.getElementById('form-salida');

  // Campos de solo lectura (ingreso)
  const salidaNumero = document.getElementById('salida-numero');
  const salidaFinca = document.getElementById('salida-finca');
  const salidaPesoIngreso = document.getElementById('salida-peso-ingreso');
  const salidaValorIngreso = document.getElementById('salida-valor-ingreso');

  // Campos EDITABLES de salida
  const fechaSalida = document.getElementById('fechaSalida');
  const pesoSalida = document.getElementById('pesoSalida');
  const pesoFincaSalida = document.getElementById('pesoFincaSalida');
  const destino = document.getElementById('destino');
  const valorKGsalida = document.getElementById('valorKGsalida');
  const fleteSalida = document.getElementById('fleteSalida');
  const comisionSalida = document.getElementById('comisionSalida');
  const mermasSalida = document.getElementById('mermasSalida');

  const btnLimpiarSalida = document.getElementById('btn-limpiar-salida');

  // Modales
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

  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  // Seguridad: asegurar que los campos de ingreso son solo lectura
  [salidaNumero, salidaFinca, salidaPesoIngreso, salidaValorIngreso].forEach(
    (input) => {
      if (!input) return;
      input.readOnly = true;
      input.tabIndex = -1;
      input.classList.add('bg-slate-50');
    }
  );

  // Uppercase número
  numeroBuscarSalida.addEventListener('input', () => {
    numeroBuscarSalida.value = numeroBuscarSalida.value.toUpperCase();
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  warningClose.addEventListener('click', () => hide(warningModal));
  successClose.addEventListener('click', () => hide(successModal));
  errorClose.addEventListener('click', () => hide(errorModal));

  function limpiarCamposSalida() {
    fechaSalida.value = '';
    pesoSalida.value = '';
    pesoFincaSalida.value = '';
    destino.value = '';
    valorKGsalida.value = '';
    fleteSalida.value = '0';
    comisionSalida.value = '0';
    mermasSalida.value = '0';
  }

  btnLimpiarSalida.addEventListener('click', () => {
    limpiarCamposSalida();
  });

  // Buscar animal por número
  formBuscar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const numero = numeroBuscarSalida.value.toUpperCase().trim();
    if (!numero) return;

    show(loadingModal);
    try {
      const res = await fetch(
        `/api/historicoiys/${encodeURIComponent(numero)}`
      );
      hide(loadingModal);

      if (!res.ok) {
        infoEncontrado.textContent =
          'No se encontró ningún registro con ese número.';
        infoEncontrado.className =
          'mt-3 text-xs md:text-sm text-rose-600 font-medium';
        limpiarCamposSalida();
        salidaNumero.value = '';
        salidaFinca.value = '';
        salidaPesoIngreso.value = '';
        salidaValorIngreso.value = '';
        return;
      }

      const data = await res.json();

      // Llenar datos de ingreso (solo mostrar)
      salidaNumero.value = data.Numero || '';
      salidaFinca.value = data.Finca || '';
      salidaPesoIngreso.value = data.Peso || '';
      salidaValorIngreso.value = data.ValorKGingreso || '';

      // Cargar datos de salida si ya existían
      fechaSalida.value = data.FechaSalida || '';
      pesoSalida.value = data.PesoSalida || '';
      pesoFincaSalida.value = data.PesoFinca || '';
      destino.value = data.Destino || '';
      valorKGsalida.value = data.ValorKGsalida || '';
      fleteSalida.value = data.Flete || '0';
      comisionSalida.value = data.Comision || '0';
      mermasSalida.value = data.Mermas || '0';

      infoEncontrado.textContent = 'Registro encontrado. Completa los datos de salida.';
      infoEncontrado.className =
        'mt-3 text-xs md:text-sm text-emerald-600 font-medium';
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo buscar el registro. Revisa la conexión.';
      show(errorModal);
    }
  });

  // Guardar salida
  formSalida.addEventListener('submit', async (e) => {
    e.preventDefault();

    const numero = salidaNumero.value.trim();
    if (!numero) {
      warningMessage.textContent =
        'Primero debes buscar y seleccionar un registro válido.';
      show(warningModal);
      return;
    }

    if (!fechaSalida.value || !pesoSalida.value || !valorKGsalida.value) {
      warningMessage.textContent =
        'Completa al menos fecha de salida, peso salida y valor kg salida.';
      show(warningModal);
      return;
    }

    const payload = {
      Numero: numero,
      FechaSalida: fechaSalida.value,
      PesoSalida: parseFloat(pesoSalida.value) || 0,
      PesoFinca: parseFloat(pesoFincaSalida.value) || 0,
      Destino: destino.value || '',
      ValorKGsalida: parseFloat(valorKGsalida.value) || 0,
      Flete: parseFloat(fleteSalida.value) || 0,
      Comision: parseFloat(comisionSalida.value) || 0,
      Mermas: parseFloat(mermasSalida.value) || 0,
    };

    show(loadingModal);
    try {
      const res = await fetch('/api/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent =
          err.error || 'No se pudo registrar la salida.';
        show(errorModal);
        return;
      }

      show(successModal);
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo conectar con el servidor al registrar la salida.';
      show(errorModal);
    }
  });
});
