// public/modificaciones.js
document.addEventListener("DOMContentLoaded", () => {
  // ====== Buscar ======
  const formBuscar = document.getElementById("form-buscar-mod");
  const numeroBuscarMod = document.getElementById("numeroBuscarMod");
  const infoMod = document.getElementById("info-mod-encontrado");

  // ====== Form ======
  const formMods = document.getElementById("form-modificaciones");

  // Campos (TODOS los de historicoiys, excepto id)
  const modFechaIngreso = document.getElementById("mod-fechaIngreso");
  const modNumero = document.getElementById("mod-numero");
  const modFinca = document.getElementById("mod-finca");
  const modColor = document.getElementById("mod-color");
  const modSexo = document.getElementById("mod-sexo");
  const modEdad = document.getElementById("mod-edad");
  const modRaza = document.getElementById("mod-raza");
  const modPeso = document.getElementById("mod-peso");
  const modMarca = document.getElementById("mod-marca");
  const modProveedor = document.getElementById("mod-proveedor");
  const modValorKGingreso = document.getElementById("mod-valorKGingreso");
  const modFlete = document.getElementById("mod-flete");
  const modComision = document.getElementById("mod-comision");
  const modMermas = document.getElementById("mod-mermas");

  const modFechaSalida = document.getElementById("mod-fechaSalida");
  const modPesoSalida = document.getElementById("mod-pesoSalida");
  const modValorKGsalida = document.getElementById("mod-valorKGsalida");
  const modDestino = document.getElementById("mod-destino");

  // Botones
  const btnEliminar = document.getElementById("btn-eliminar-registro");
  const btnRevertir = document.getElementById("btn-revertir-cambios");
  const btnLogout = document.getElementById("btn-logout");
  const btnBack = document.getElementById("btn-back");

  // Modales
  const loadingModal = document.getElementById("loading-modal");
  const loadingTitle = document.getElementById("loading-title");
  const loadingSubtitle = document.getElementById("loading-subtitle");

  const successModal = document.getElementById("success-modal");
  const successTitle = document.getElementById("success-title");
  const successMessage = document.getElementById("success-message");
  const successClose = document.getElementById("success-close");

  const errorModal = document.getElementById("error-modal");
  const errorMessage = document.getElementById("error-message");
  const errorClose = document.getElementById("error-close");

  const warningModal = document.getElementById("warning-modal");
  const warningMessage = document.getElementById("warning-message");
  const warningClose = document.getElementById("warning-close");

  const confirmModal = document.getElementById("confirm-modal");
  const confirmTitle = document.getElementById("confirm-title");
  const confirmMessage = document.getElementById("confirm-message");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmAccept = document.getElementById("confirm-accept");

  const deleteModal = document.getElementById("delete-modal");
  const deleteCancel = document.getElementById("delete-cancel");
  const deleteConfirm = document.getElementById("delete-confirm");

  // ====== Estado ======
  let registroOriginal = null;
  let numeroActual = null; // el numero con el que se hace PUT/DELETE
  let isDirty = false;

  // ====== Helpers ======
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  function setLoading(t1 = "Procesando…", t2 = "Un momento por favor.") {
    if (loadingTitle) loadingTitle.textContent = t1;
    if (loadingSubtitle) loadingSubtitle.textContent = t2;
  }

  function setInfo(text, type = "info") {
    infoMod.textContent = text;
    infoMod.className =
      "mt-3 text-xs md:text-sm font-semibold " +
      (type === "ok"
        ? "text-emerald-600"
        : type === "error"
        ? "text-rose-600"
        : "text-gray-500 dark:text-gray-400");
  }

  function normalizeUpper(v) {
    return (v ?? "").toString().trim().toUpperCase();
  }

  function toFloat(v, fallback = 0) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  async function confirmDialog({ title, message, acceptText = "Aceptar" }) {
    return new Promise((resolve) => {
      confirmTitle.textContent = title || "Confirmar";
      confirmMessage.textContent = message || "¿Seguro?";
      confirmAccept.textContent = acceptText;

      const cleanup = () => {
        confirmCancel.removeEventListener("click", onCancel);
        confirmAccept.removeEventListener("click", onAccept);
        hide(confirmModal);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };
      const onAccept = () => {
        cleanup();
        resolve(true);
      };

      confirmCancel.addEventListener("click", onCancel);
      confirmAccept.addEventListener("click", onAccept);
      show(confirmModal);
    });
  }

  function disableForm(disabled) {
    const controls = formMods.querySelectorAll("input, select, button, textarea");
    controls.forEach((el) => {
      if (el.id === "btn-eliminar-registro") return;
      if (el.id === "btn-revertir-cambios") return;
      if (el.id === "btn-guardar-cambios") return;
      el.disabled = disabled;
    });

    btnEliminar.disabled = disabled;
    btnRevertir.disabled = disabled;
  }

  // Cerrar modales haciendo click fuera
  [loadingModal, successModal, errorModal, warningModal, confirmModal, deleteModal].forEach(
    (modal) => {
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) hide(modal);
      });
    }
  );

  successClose.addEventListener("click", () => hide(successModal));
  errorClose.addEventListener("click", () => hide(errorModal));
  warningClose.addEventListener("click", () => hide(warningModal));
  deleteCancel.addEventListener("click", () => hide(deleteModal));

  // Uppercase en búsqueda y número
  numeroBuscarMod.addEventListener("input", () => {
    numeroBuscarMod.value = normalizeUpper(numeroBuscarMod.value);
  });
  modNumero.addEventListener("input", () => {
    modNumero.value = normalizeUpper(modNumero.value);
    isDirty = true;
  });

  // Dirty tracking
  formMods.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => (isDirty = true));
    el.addEventListener("change", () => (isDirty = true));
  });

  // ====== FINCAS dropdown ======
  let fincasCache = [];

  async function cargarFincas(selectedValue = "") {
    try {
      const res = await fetch("/api/fincas");
      const data = await res.json();
      fincasCache = Array.isArray(data) ? data : [];

      modFinca.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Seleccione...";
      modFinca.appendChild(opt0);

      fincasCache.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.Indicativo;
        opt.textContent =
          f.Indicativo === "..." ? "SIN ESPECIFICAR (...)" : f.Indicativo;
        modFinca.appendChild(opt);
      });

      if (selectedValue) {
        const exists = fincasCache.some((f) => f.Indicativo === selectedValue);
        modFinca.value = exists ? selectedValue : "";
      }
    } catch (e) {
      modFinca.innerHTML = `<option value="">No se pudieron cargar fincas</option>`;
    }
  }

  // ====== Llenar / revertir ======
  function llenarFormularioDesdeRegistro(reg) {
    registroOriginal = { ...reg };
    numeroActual = reg.Numero;
    isDirty = false;

    modNumero.value = reg.Numero ?? "";
    modFechaIngreso.value = reg.FechaIngreso ?? "";
    modFinca.value = reg.Finca ?? "...";

    // Ingreso
    modColor.value = reg.Color ?? "";
    modSexo.value = reg.Sexo ?? "";
    modEdad.value = reg.Edad ?? "";
    modRaza.value = reg.Raza ?? "...";
    
    modPeso.value = reg.Peso ?? 0;
    modMarca.value = reg.Marcallegada ?? "";
    modProveedor.value = reg.Proveedor ?? "";
    modValorKGingreso.value = reg.ValorKGingreso ?? 0;
    modFlete.value = reg.Flete ?? 0;
    modComision.value = reg.Comision ?? 0;
    modMermas.value = reg.Mermas ?? 0;

    // Salida
    modFechaSalida.value = reg.FechaSalida ?? "";
    modPesoSalida.value = reg.PesoSalida ?? "";
    modValorKGsalida.value = reg.ValorKGsalida ?? 0;
    modDestino.value = reg.Destino ?? "";

    cargarFincas(reg.Finca ?? "...");

    disableForm(false);
  }

  function revertirCambios() {
    if (!registroOriginal) return;
    llenarFormularioDesdeRegistro(registroOriginal);
    setInfo("Cambios revertidos.", "ok");
  }

  btnRevertir.addEventListener("click", async () => {
    if (!registroOriginal) return;

    if (isDirty) {
      const ok = await confirmDialog({
        title: "Revertir cambios",
        message: "Se perderán los cambios no guardados.\n\n¿Deseas continuar?",
        acceptText: "Revertir",
      });
      if (!ok) return;
    }
    revertirCambios();
  });

  // ====== Logout / Back con confirm ======
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (isDirty) {
        const ok = await confirmDialog({
          title: "Cerrar sesión",
          message: "Tienes cambios sin guardar.\n\n¿Deseas salir de todas formas?",
          acceptText: "Salir",
        });
        if (!ok) return;
      }
      window.location.href = "/";
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", async () => {
      if (isDirty) {
        const ok = await confirmDialog({
          title: "Volver",
          message: "Tienes cambios sin guardar.\n\n¿Deseas volver y perderlos?",
          acceptText: "Volver",
        });
        if (!ok) return;
      }
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/dashboard";
    });
  }

  window.addEventListener("beforeunload", (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  // ====== Buscar ======
  formBuscar.addEventListener("submit", async (e) => {
    e.preventDefault();

    const numero = normalizeUpper(numeroBuscarMod.value);
    if (!numero) return;

    setLoading("Buscando registro…", "Consultando el histórico.");
    show(loadingModal);

    try {
      const res = await fetch(`/api/historicoiys/${encodeURIComponent(numero)}`);
      hide(loadingModal);

      if (!res.ok) {
        setInfo("No se encontró ningún registro con ese número.", "error");
        registroOriginal = null;
        numeroActual = null;
        formMods.reset();
        disableForm(true);
        return;
      }

      const data = await res.json();
      await cargarFincas(data.Finca ?? "...");
      llenarFormularioDesdeRegistro(data);

      setInfo("Registro cargado. Puedes modificar los datos.", "ok");
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent = "No se pudo buscar el registro. Revisa la conexión.";
      show(errorModal);
    }
  });

  // ====== Guardar ======
  formMods.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!numeroActual) {
      warningMessage.textContent =
        "Primero debes buscar un registro antes de guardar cambios.";
      show(warningModal);
      return;
    }

    // Validaciones mínimas basadas en esquema NOT NULL
    const nNumero = normalizeUpper(modNumero.value) || numeroActual;
    const nFechaIngreso = modFechaIngreso.value || null;

    if (!nFechaIngreso) {
      warningMessage.textContent = "FechaIngreso es obligatoria.";
      show(warningModal);
      return;
    }
    if (!nNumero) {
      warningMessage.textContent = "Numero es obligatorio.";
      show(warningModal);
      return;
    }
    if (!modSexo.value) {
      warningMessage.textContent = "Sexo es obligatorio.";
      show(warningModal);
      return;
    }
    if (!modEdad.value) {
      warningMessage.textContent = "Edad es obligatoria.";
      show(warningModal);
      return;
    }
    if (!modMarca.value) {
      warningMessage.textContent = "Marcallegada es obligatoria.";
      show(warningModal);
      return;
    }

    // Payload completo (sin id)
    const payload = {
      FechaIngreso: nFechaIngreso,
      Numero: nNumero,
      Color: modColor.value || null,
      Peso: toFloat(modPeso.value, 0),
      Sexo: modSexo.value || "",
      Edad: modEdad.value || "",

      FechaSalida: modFechaSalida.value || null,
      PesoSalida: modFechaSalida.value ? toFloat(modPesoSalida.value, 0) : null,

      Marcallegada: modMarca.value || "",
      ValorKGingreso: toFloat(modValorKGingreso.value, 0),
      ValorKGsalida: toFloat(modValorKGsalida.value, 0),

      Destino: modDestino.value || "",
      Finca: modFinca.value || "...",
      Raza: modRaza.value || "...",

      Flete: toFloat(modFlete.value, 0),
      Comision: toFloat(modComision.value, 0),
      Mermas: toFloat(modMermas.value, 0),

      Proveedor: modProveedor.value || null,
    };

    setLoading("Guardando cambios…", "Actualizando registro en la base de datos.");
    show(loadingModal);

    try {
      const res = await fetch(`/api/historicoiys/${encodeURIComponent(numeroActual)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent = err.error || "No se pudo actualizar el registro.";
        show(errorModal);
        return;
      }

      const actualizado = await res.json().catch(() => payload);
      llenarFormularioDesdeRegistro(actualizado);

      // si cambió el número, actualizar el numeroActual
      numeroActual = actualizado.Numero || payload.Numero;

      successTitle.textContent = "Cambios guardados";
      successMessage.textContent = "El registro fue actualizado correctamente.";
      show(successModal);
      setInfo("Cambios guardados correctamente.", "ok");
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        "No se pudo conectar con el servidor al guardar cambios.";
      show(errorModal);
    }
  });

  // ====== Eliminar ======
  btnEliminar.addEventListener("click", () => {
    if (!numeroActual) {
      warningMessage.textContent = "No hay registro cargado para eliminar.";
      show(warningModal);
      return;
    }
    show(deleteModal);
  });

  deleteConfirm.addEventListener("click", async () => {
    if (!numeroActual) {
      hide(deleteModal);
      return;
    }

    hide(deleteModal);
    setLoading("Eliminando registro…", "Borrando definitivamente del histórico.");
    show(loadingModal);

    try {
      const res = await fetch(`/api/historicoiys/${encodeURIComponent(numeroActual)}`, {
        method: "DELETE",
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent = err.error || "No se pudo eliminar el registro.";
        show(errorModal);
        return;
      }

      registroOriginal = null;
      numeroActual = null;
      isDirty = false;
      formMods.reset();
      disableForm(true);

      setInfo("Registro eliminado correctamente.", "ok");

      successTitle.textContent = "Registro eliminado";
      successMessage.textContent = "Se eliminó el registro correctamente.";
      show(successModal);
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        "No se pudo conectar con el servidor al eliminar el registro.";
      show(errorModal);
    }
  });

  // ====== INIT ======
  disableForm(true);
  cargarFincas("");
  setInfo("Ingresa el número y presiona Buscar.", "info");
});
