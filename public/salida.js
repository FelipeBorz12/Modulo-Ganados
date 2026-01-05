// public/salida.js
document.addEventListener("DOMContentLoaded", () => {
  // ====== DOM: Buscar ======
  const formBuscar = document.getElementById("form-buscar-salida");
  const numeroBuscarSalida = document.getElementById("numeroBuscarSalida");
  const infoEncontrado = document.getElementById("info-salida-encontrado");
  const btnLimpiarTodo = document.getElementById("btn-limpiar-todo");

  // ====== DOM: Ingreso (solo lectura) ======
  const ing = {
    FechaIngreso: document.getElementById("ing-FechaIngreso"),
    Numero: document.getElementById("ing-Numero"),
    Finca: document.getElementById("ing-Finca"),
    Color: document.getElementById("ing-Color"),
    Peso: document.getElementById("ing-Peso"),
    Sexo: document.getElementById("ing-Sexo"),
    Edad: document.getElementById("ing-Edad"),
    Marcallegada: document.getElementById("ing-Marcallegada"),
    ValorKGingreso: document.getElementById("ing-ValorKGingreso"),
    Raza: document.getElementById("ing-Raza"),
    Proveedor: document.getElementById("ing-Proveedor"),
    PesoFinca: document.getElementById("ing-PesoFinca"),
    Flete: document.getElementById("ing-Flete"),
    Comision: document.getElementById("ing-Comision"),
    Mermas: document.getElementById("ing-Mermas"),
    Destino: document.getElementById("ing-Destino"),
  };

  // ====== DOM: Salida (editable) ======
  const formSalida = document.getElementById("form-salida");
  const fechaSalida = document.getElementById("fechaSalida");
  const destino = document.getElementById("destino");
  const pesoSalida = document.getElementById("pesoSalida");
  const pesoFincaSalida = document.getElementById("pesoFincaSalida");
  const valorKGsalida = document.getElementById("valorKGsalida");
  const fleteSalida = document.getElementById("fleteSalida");
  const comisionSalida = document.getElementById("comisionSalida");
  const mermasSalida = document.getElementById("mermasSalida");

  const btnLimpiarSalida = document.getElementById("btn-limpiar-salida");
  const btnGuardarText = document.getElementById("btn-guardar-text");
  const calcTotalSalidaEl = document.getElementById("calc-total-salida");

  // ====== DOM: Modales ======
  const loadingModal = document.getElementById("loading-modal");
  const successModal = document.getElementById("success-modal");
  const successClose = document.getElementById("success-close");
  const errorModal = document.getElementById("error-modal");
  const errorMessage = document.getElementById("error-message");
  const errorClose = document.getElementById("error-close");
  const warningModal = document.getElementById("warning-modal");
  const warningMessage = document.getElementById("warning-message");
  const warningClose = document.getElementById("warning-close");

  const clearModal = document.getElementById("clear-modal");
  const clearCancel = document.getElementById("clear-cancel");
  const clearConfirm = document.getElementById("clear-confirm");

  const overwriteModal = document.getElementById("overwrite-modal");
  const overwriteCancel = document.getElementById("overwrite-cancel");
  const overwriteConfirm = document.getElementById("overwrite-confirm");

  const btnLogout = document.getElementById("btn-logout");
  const logoutModal = document.getElementById("logout-modal");
  const logoutCancel = document.getElementById("logout-cancel");
  const logoutConfirm = document.getElementById("logout-confirm");

  // ====== Helpers ======
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  const moneyCOP = (n) =>
    (Number(n) || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  // ====== Estado ======
  let registroActual = null;
  let existeSalida = false;
  let submitPending = false;

  // ====== Seguridad: Ingreso readonly ======
  Object.values(ing).forEach((input) => {
    if (!input) return;
    input.readOnly = true;
    input.tabIndex = -1;
  });

  // Uppercase número
  if (numeroBuscarSalida) {
    numeroBuscarSalida.addEventListener("input", () => {
      numeroBuscarSalida.value = numeroBuscarSalida.value.toUpperCase();
    });
  }

  // ====== Logout con modal ======
  if (btnLogout && logoutModal && logoutCancel && logoutConfirm) {
    btnLogout.addEventListener("click", () => show(logoutModal));
    logoutCancel.addEventListener("click", () => hide(logoutModal));
    logoutConfirm.addEventListener("click", () => (window.location.href = "/"));
    logoutModal.addEventListener("click", (e) => {
      if (e.target === logoutModal) hide(logoutModal);
    });
  }

  // ====== Cerrar modales básicos ======
  if (warningClose) warningClose.addEventListener("click", () => hide(warningModal));
  if (successClose) successClose.addEventListener("click", () => hide(successModal));
  if (errorClose) errorClose.addEventListener("click", () => hide(errorModal));

  // ====== Cálculo total salida (UI) ======
  function updateCalc() {
    const ps = Number(pesoSalida?.value) || 0;
    const vs = Number(valorKGsalida?.value) || 0;
    const total = ps * vs;
    if (calcTotalSalidaEl) calcTotalSalidaEl.textContent = moneyCOP(total);
  }

  ["input", "change"].forEach((ev) => {
    if (pesoSalida) pesoSalida.addEventListener(ev, updateCalc);
    if (valorKGsalida) valorKGsalida.addEventListener(ev, updateCalc);
  });

  // ====== Limpiar (salida solamente) ======
  function limpiarSalidaEditable() {
    if (fechaSalida) fechaSalida.value = "";
    if (pesoSalida) pesoSalida.value = "";
    if (pesoFincaSalida) pesoFincaSalida.value = "";
    if (destino) destino.value = "";
    if (valorKGsalida) valorKGsalida.value = "";
    if (fleteSalida) fleteSalida.value = "0";
    if (comisionSalida) comisionSalida.value = "0";
    if (mermasSalida) mermasSalida.value = "0";
    updateCalc();
  }

  // ====== Limpiar todo (registro + salida + info) ======
  function limpiarTodo() {
    registroActual = null;
    existeSalida = false;
    submitPending = false;

    // Buscar
    if (numeroBuscarSalida) numeroBuscarSalida.value = "";

    // Ingreso
    Object.values(ing).forEach((input) => {
      if (!input) return;
      input.value = "";
    });

    // Salida
    limpiarSalidaEditable();

    // Estado UI
    if (btnGuardarText) btnGuardarText.textContent = "Guardar salida";
    if (infoEncontrado) {
      infoEncontrado.textContent =
        "Ingresa el número y presiona Buscar.";
      infoEncontrado.className =
        "mt-3 text-xs md:text-sm text-gray-500 dark:text-gray-400";
    }
  }

  if (btnLimpiarTodo) {
    btnLimpiarTodo.addEventListener("click", () => {
      // Modal warning reutilizable
      if (warningMessage) {
        warningMessage.textContent =
          "Se limpiarán todos los campos y se deseleccionará el registro actual.";
      }
      show(warningModal);
      // al cerrar, limpiamos
      const once = () => {
        hide(warningModal);
        limpiarTodo();
        warningClose?.removeEventListener("click", once);
      };
      warningClose?.addEventListener("click", once);
    });
  }

  // Botón limpiar salida -> confirm modal
  if (btnLimpiarSalida && clearModal && clearCancel && clearConfirm) {
    btnLimpiarSalida.addEventListener("click", () => show(clearModal));
    clearCancel.addEventListener("click", () => hide(clearModal));
    clearConfirm.addEventListener("click", () => {
      hide(clearModal);
      limpiarSalidaEditable();
    });
    clearModal.addEventListener("click", (e) => {
      if (e.target === clearModal) hide(clearModal);
    });
  }

  // ====== Rellenar Ingreso ======
  function fillIngreso(data) {
    if (!data) return;
    if (ing.FechaIngreso) ing.FechaIngreso.value = data.FechaIngreso || "";
    if (ing.Numero) ing.Numero.value = (data.Numero || "").toUpperCase();
    if (ing.Finca) ing.Finca.value = data.Finca || "";
    if (ing.Color) ing.Color.value = data.Color || "";
    if (ing.Sexo) ing.Sexo.value = data.Sexo || "";
    if (ing.Edad) ing.Edad.value = data.Edad || "";
    if (ing.Raza) ing.Raza.value = data.Raza || "";
    if (ing.Proveedor) ing.Proveedor.value = data.Proveedor || "";
    if (ing.Marcallegada) ing.Marcallegada.value = data.Marcallegada || "";
    if (ing.PesoFinca) ing.PesoFinca.value = data.PesoFinca ?? "";
    if (ing.Peso) ing.Peso.value = data.Peso ?? "";
    if (ing.ValorKGingreso) ing.ValorKGingreso.value = data.ValorKGingreso ?? "";
    if (ing.Flete) ing.Flete.value = data.Flete ?? "0";
    if (ing.Comision) ing.Comision.value = data.Comision ?? "0";
    if (ing.Mermas) ing.Mermas.value = data.Mermas ?? "0";
    if (ing.Destino) ing.Destino.value = data.Destino || "";
  }

  // ====== Rellenar Salida desde data (si ya existía) ======
  function fillSalidaFromData(data) {
    if (!data) return;
    if (fechaSalida) fechaSalida.value = data.FechaSalida || "";
    if (pesoSalida) pesoSalida.value = data.PesoSalida ?? "";
    if (pesoFincaSalida) pesoFincaSalida.value = data.PesoFinca ?? "";
    if (destino) destino.value = data.Destino || "";
    if (valorKGsalida) valorKGsalida.value = data.ValorKGsalida ?? "";
    if (fleteSalida) fleteSalida.value = (data.Flete ?? "0").toString();
    if (comisionSalida) comisionSalida.value = (data.Comision ?? "0").toString();
    if (mermasSalida) mermasSalida.value = (data.Mermas ?? "0").toString();
    updateCalc();
  }

  // ====== Buscar ======
  if (formBuscar) {
    formBuscar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const numero = (numeroBuscarSalida?.value || "").toUpperCase().trim();
      if (!numero) return;

      show(loadingModal);
      try {
        const res = await fetch(`/api/historicoiys/${encodeURIComponent(numero)}`);
        hide(loadingModal);

        if (!res.ok) {
          limpiarTodo();
          if (infoEncontrado) {
            infoEncontrado.textContent = "No se encontró ningún registro con ese número.";
            infoEncontrado.className =
              "mt-3 text-xs md:text-sm text-rose-600 font-semibold";
          }
          return;
        }

        const data = await res.json();
        registroActual = data;

        fillIngreso(data);
        fillSalidaFromData(data);

        existeSalida = !!(data.FechaSalida && (data.PesoSalida ?? null) !== null);

        if (btnGuardarText) {
          btnGuardarText.textContent = existeSalida ? "Actualizar salida" : "Guardar salida";
        }

        if (infoEncontrado) {
          if (existeSalida) {
            infoEncontrado.textContent =
              "Registro encontrado. Este animal ya tiene salida registrada (puedes actualizarla).";
            infoEncontrado.className =
              "mt-3 text-xs md:text-sm text-amber-600 font-semibold";
          } else {
            infoEncontrado.textContent =
              "Registro encontrado. Completa los datos de salida.";
            infoEncontrado.className =
              "mt-3 text-xs md:text-sm text-emerald-600 font-semibold";
          }
        }
      } catch (err) {
        console.error(err);
        hide(loadingModal);
        if (errorMessage) {
          errorMessage.textContent =
            "No se pudo buscar el registro. Revisa la conexión.";
        }
        show(errorModal);
      }
    });
  }

  // ====== Confirm sobrescribir (si ya existía salida) ======
  function askOverwriteIfNeeded() {
    return new Promise((resolve) => {
      if (!existeSalida || !overwriteModal || !overwriteCancel || !overwriteConfirm) {
        resolve(true);
        return;
      }

      show(overwriteModal);

      const cleanup = () => {
        overwriteCancel.removeEventListener("click", onCancel);
        overwriteConfirm.removeEventListener("click", onConfirm);
        overwriteModal.removeEventListener("click", onBackdrop);
      };

      const onCancel = () => {
        cleanup();
        hide(overwriteModal);
        resolve(false);
      };

      const onConfirm = () => {
        cleanup();
        hide(overwriteModal);
        resolve(true);
      };

      const onBackdrop = (e) => {
        if (e.target === overwriteModal) onCancel();
      };

      overwriteCancel.addEventListener("click", onCancel);
      overwriteConfirm.addEventListener("click", onConfirm);
      overwriteModal.addEventListener("click", onBackdrop);
    });
  }

  // ====== Guardar salida ======
  if (formSalida) {
    formSalida.addEventListener("submit", async (e) => {
      e.preventDefault();

      const numero = (registroActual?.Numero || "").toString().trim();
      if (!numero) {
        if (warningMessage) {
          warningMessage.textContent =
            "Primero debes buscar un registro válido antes de guardar.";
        }
        show(warningModal);
        return;
      }

      if (!fechaSalida?.value || !pesoSalida?.value || !valorKGsalida?.value) {
        if (warningMessage) {
          warningMessage.textContent =
            "Completa al menos: fecha salida, peso salida y valor kg salida.";
        }
        show(warningModal);
        return;
      }

      // Si ya existe, confirmamos sobrescritura
      const ok = await askOverwriteIfNeeded();
      if (!ok) return;

      const payload = {
        Numero: numero.toUpperCase().trim(),
        FechaSalida: fechaSalida.value,
        PesoSalida: parseFloat(pesoSalida.value) || 0,
        PesoFinca: parseFloat(pesoFincaSalida?.value) || 0,
        Destino: destino?.value || "",
        ValorKGsalida: parseFloat(valorKGsalida.value) || 0,
        Flete: parseFloat(fleteSalida?.value) || 0,
        Comision: parseFloat(comisionSalida?.value) || 0,
        Mermas: parseFloat(mermasSalida?.value) || 0,
      };

      show(loadingModal);
      try {
        const res = await fetch("/api/salidas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        hide(loadingModal);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (errorMessage) {
            errorMessage.textContent = err.error || "No se pudo registrar la salida.";
          }
          show(errorModal);
          return;
        }

        // si el backend devuelve el registro actualizado, lo tomamos
        const updated = await res.json().catch(() => null);
        if (updated && typeof updated === "object") {
          registroActual = { ...registroActual, ...updated };
          existeSalida = true;
          if (btnGuardarText) btnGuardarText.textContent = "Actualizar salida";
          fillSalidaFromData(registroActual);
        } else {
          existeSalida = true;
          if (btnGuardarText) btnGuardarText.textContent = "Actualizar salida";
        }

        show(successModal);
      } catch (err) {
        console.error(err);
        hide(loadingModal);
        if (errorMessage) {
          errorMessage.textContent =
            "No se pudo conectar con el servidor al registrar la salida.";
        }
        show(errorModal);
      }
    });
  }

  // Init
  limpiarSalidaEditable();
  updateCalc();
});
