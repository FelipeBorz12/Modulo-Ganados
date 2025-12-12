// public/modificaciones.js
document.addEventListener('DOMContentLoaded', () => {
  const formBuscar = document.getElementById('form-buscar-mod');
  const numeroBuscarMod = document.getElementById('numeroBuscarMod');
  const infoMod = document.getElementById('info-mod-encontrado');

  const formMods = document.getElementById('form-modificaciones');

  // Campos ingreso
  const modFechaIngreso = document.getElementById('mod-fechaIngreso');
  const modNumero = document.getElementById('mod-numero');
  const modFinca = document.getElementById('mod-finca');
  const modColor = document.getElementById('mod-color');
  const modSexo = document.getElementById('mod-sexo');
  const modEdad = document.getElementById('mod-edad');
  const modRaza = document.getElementById('mod-raza');
  const modPesoFinca = document.getElementById('mod-pesoFinca');
  const modPeso = document.getElementById('mod-peso');
  const modMarca = document.getElementById('mod-marca');
  const modProveedor = document.getElementById('mod-proveedor');
  const modValorKGingreso = document.getElementById('mod-valorKGingreso');
  const modFlete = document.getElementById('mod-flete');
  const modComision = document.getElementById('mod-comision');
  const modMermas = document.getElementById('mod-mermas');

  // Campos salida
  const modFechaSalida = document.getElementById('mod-fechaSalida');
  const modPesoSalida = document.getElementById('mod-pesoSalida');
  const modPesoFincaSalida = document.getElementById('mod-pesoFincaSalida');
  const modDestino = document.getElementById('mod-destino');
  const modValorKGsalida = document.getElementById('mod-valorKGsalida');
  const modFleteSalida = document.getElementById('mod-fleteSalida');
  const modComisionSalida = document.getElementById('mod-comisionSalida');
  const modMermasSalida = document.getElementById('mod-mermasSalida');

  const btnEliminar = document.getElementById('btn-eliminar-registro');
  const btnRevertir = document.getElementById('btn-revertir-cambios');
  const btnLogout = document.getElementById('btn-logout');

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
  const deleteModal = document.getElementById('delete-modal');
  const deleteCancel = document.getElementById('delete-cancel');
  const deleteConfirm = document.getElementById('delete-confirm');

  let registroOriginal = null; // para revertir
  let numeroActual = null;

  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  numeroBuscarMod.addEventListener('input', () => {
    numeroBuscarMod.value = numeroBuscarMod.value.toUpperCase();
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  successClose.addEventListener('click', () => hide(successModal));
  errorClose.addEventListener('click', () => hide(errorModal));
  warningClose.addEventListener('click', () => hide(warningModal));
  deleteCancel.addEventListener('click', () => hide(deleteModal));

  function llenarFormularioDesdeRegistro(reg) {
    registroOriginal = { ...reg };
    numeroActual = reg.Numero;

    modFechaIngreso.value = reg.FechaIngreso || '';
    modNumero.value = reg.Numero || '';
    modFinca.value = reg.Finca || '';
    modColor.value = reg.Color || '';
    modSexo.value = reg.Sexo || '';
    modEdad.value = reg.Edad || '';
    modRaza.value = reg.Raza || '';
    modPesoFinca.value = reg.PesoFinca ?? '';
    modPeso.value = reg.Peso ?? '';
    modMarca.value = reg.Marcallegada || '';
    modProveedor.value = reg.Proveedor || '';
    modValorKGingreso.value = reg.ValorKGingreso ?? '';
    modFlete.value = reg.Flete ?? '';
    modComision.value = reg.Comision ?? '';
    modMermas.value = reg.Mermas ?? '';

    modFechaSalida.value = reg.FechaSalida || '';
    modPesoSalida.value = reg.PesoSalida ?? '';
    modPesoFincaSalida.value = reg.PesoFinca ?? '';
    modDestino.value = reg.Destino || '';
    modValorKGsalida.value = reg.ValorKGsalida ?? '';
    modFleteSalida.value = reg.Flete ?? '';
    modComisionSalida.value = reg.Comision ?? '';
    modMermasSalida.value = reg.Mermas ?? '';
  }

  function revertirCambios() {
    if (!registroOriginal) return;
    llenarFormularioDesdeRegistro(registroOriginal);
  }

  btnRevertir.addEventListener('click', () => {
    if (!registroOriginal) return;
    revertirCambios();
  });

  // Buscar registro
  formBuscar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const numero = numeroBuscarMod.value.toUpperCase().trim();
    if (!numero) return;

    show(loadingModal);
    try {
      const res = await fetch(
        `/api/historicoiys/${encodeURIComponent(numero)}`
      );
      hide(loadingModal);

      if (!res.ok) {
        infoMod.textContent =
          'No se encontró ningún registro con ese número.';
        infoMod.className =
          'mt-3 text-xs md:text-sm text-rose-600 font-medium';
        registroOriginal = null;
        numeroActual = null;
        return;
      }

      const data = await res.json();
      llenarFormularioDesdeRegistro(data);

      infoMod.textContent = 'Registro cargado. Puedes modificar los datos.';
      infoMod.className =
        'mt-3 text-xs md:text-sm text-emerald-600 font-medium';
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo buscar el registro. Revisa la conexión.';
      show(errorModal);
    }
  });

  // Guardar cambios
  formMods.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!numeroActual) {
      warningMessage.textContent =
        'Primero debes buscar un registro antes de guardar cambios.';
      show(warningModal);
      return;
    }

    const payload = {
      FechaIngreso: modFechaIngreso.value || null,
      Numero: modNumero.value.toUpperCase().trim() || numeroActual,
      Color: modColor.value || null,
      Peso: parseFloat(modPeso.value) || 0,
      Sexo: modSexo.value || '',
      Edad: modEdad.value || '',
      FechaSalida: modFechaSalida.value || null,
      PesoSalida: modFechaSalida.value
        ? parseFloat(modPesoSalida.value) || 0
        : null,
      Marcallegada: modMarca.value || '',
      ValorKGingreso: parseFloat(modValorKGingreso.value) || 0,
      ValorKGsalida: parseFloat(modValorKGsalida.value) || 0,
      Destino: modDestino.value || '',
      Finca: modFinca.value || '...',
      Raza: modRaza.value || '...',
      Flete: parseFloat(modFlete.value || modFleteSalida.value) || 0,
      Comision:
        parseFloat(modComision.value || modComisionSalida.value) || 0,
      Mermas: parseFloat(modMermas.value || modMermasSalida.value) || 0,
      Proveedor: modProveedor.value || null,
      PesoFinca: parseFloat(
        modPesoFincaSalida.value || modPesoFinca.value
      ) || 0,
    };

    show(loadingModal);
    try {
      const res = await fetch(
        `/api/historicoiys/${encodeURIComponent(numeroActual)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent =
          err.error || 'No se pudo actualizar el registro.';
        show(errorModal);
        return;
      }

      const actualizado = await res.json().catch(() => payload);
      llenarFormularioDesdeRegistro(actualizado);
      show(successModal);
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo conectar con el servidor al guardar cambios.';
      show(errorModal);
    }
  });

  // Eliminar registro
  btnEliminar.addEventListener('click', () => {
    if (!numeroActual) {
      warningMessage.textContent =
        'No hay registro cargado para eliminar.';
      show(warningModal);
      return;
    }
    show(deleteModal);
  });

  deleteConfirm.addEventListener('click', async () => {
    if (!numeroActual) {
      hide(deleteModal);
      return;
    }

    show(loadingModal);
    hide(deleteModal);
    try {
      const res = await fetch(
        `/api/historicoiys/${encodeURIComponent(numeroActual)}`,
        { method: 'DELETE' }
      );
      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent =
          err.error || 'No se pudo eliminar el registro.';
        show(errorModal);
        return;
      }

      registroOriginal = null;
      numeroActual = null;
      formMods.reset();
      infoMod.textContent = 'Registro eliminado correctamente.';
      infoMod.className =
        'mt-3 text-xs md:text-sm text-emerald-600 font-medium';
      show(successModal);
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        'No se pudo conectar con el servidor al eliminar el registro.';
      show(errorModal);
    }
  });
});
