// public/ingreso.js
document.addEventListener("DOMContentLoaded", () => {
  // ====== FORM INGRESO ======
  const form = document.getElementById("form-ingreso");

  const fechaIngreso = document.getElementById("fechaIngreso");
  const numero = document.getElementById("numero");
  const fincaSelect = document.getElementById("fincaSelect");
  const color = document.getElementById("color");
  const sexo = document.getElementById("sexo");
  const edad = document.getElementById("edad");
  const raza = document.getElementById("raza");
  const pesoFinca = document.getElementById("pesoFinca");
  const peso = document.getElementById("peso");
  const marca = document.getElementById("marca");
  const proveedor = document.getElementById("proveedor");

  const valorKGingreso = document.getElementById("valorKGingreso");
  const flete = document.getElementById("flete");
  const comision = document.getElementById("comision");
  const mermas = document.getElementById("mermas");

  const btnLimpiar = document.getElementById("btn-limpiar-ingreso");
  const btnLogout = document.getElementById("btn-logout");
  const btnBack = document.getElementById("btn-back");

  // ====== FINCAS UI ======
  const newFincaName = document.getElementById("newFincaName");
  const btnAddFinca = document.getElementById("btn-add-finca");
  const btnRefreshFincas = document.getElementById("btn-refresh-fincas");
  const fincasSearch = document.getElementById("fincas-search");
  const fincasTotal = document.getElementById("fincas-total");
  const fincasTableBody = document.getElementById("fincas-table-body");
  const fincaFeedback = document.getElementById("finca-feedback");

  // ====== MODALES (reutilizables) ======
  const loadingModal = document.getElementById("loading-modal");
  const loadingTitle = document.getElementById("loading-title");
  const loadingSubtitle = document.getElementById("loading-subtitle");

  const actionSuccessModal = document.getElementById("action-success-modal");
  const actionSuccessTitle = document.getElementById("action-success-title");
  const actionSuccessMessage = document.getElementById("action-success-message");
  const actionSuccessClose = document.getElementById("action-success-close");

  const actionErrorModal = document.getElementById("action-error-modal");
  const actionErrorTitle = document.getElementById("action-error-title");
  const actionErrorMessage = document.getElementById("action-error-message");
  const actionErrorClose = document.getElementById("action-error-close");

  const confirmModal = document.getElementById("confirm-modal");
  const confirmTitle = document.getElementById("confirm-title");
  const confirmMessage = document.getElementById("confirm-message");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmAccept = document.getElementById("confirm-accept");

  const editFincaModal = document.getElementById("edit-finca-modal");
  const editFincaName = document.getElementById("editFincaName");
  const editFincaCancel = document.getElementById("edit-finca-cancel");
  const editFincaSave = document.getElementById("edit-finca-save");

  // Ingreso modales
  const warningModal = document.getElementById("warning-modal");
  const warningMessage = document.getElementById("warning-message");
  const warningClose = document.getElementById("warning-close");

  const successModal = document.getElementById("success-modal");
  const successClose = document.getElementById("success-close");
  const successGoDashboard = document.getElementById("success-go-dashboard");

  const errorModal = document.getElementById("error-modal");
  const errorMessage = document.getElementById("error-message");
  const errorClose = document.getElementById("error-close");

  // ====== HELPERS ======
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  function setLoading(text1 = "Procesando…", text2 = "Un momento por favor.") {
    if (loadingTitle) loadingTitle.textContent = text1;
    if (loadingSubtitle) loadingSubtitle.textContent = text2;
  }

  function showActionSuccess(title, message) {
    actionSuccessTitle.textContent = title || "Listo";
    actionSuccessMessage.textContent = message || "Acción completada.";
    show(actionSuccessModal);
  }

  function showActionError(title, message) {
    actionErrorTitle.textContent = title || "Error";
    actionErrorMessage.textContent = message || "Ocurrió un error.";
    show(actionErrorModal);
  }

  function setFeedback(msg, type = "info") {
    if (!fincaFeedback) return;
    fincaFeedback.textContent = msg;
    fincaFeedback.classList.remove("hidden");

    fincaFeedback.classList.remove(
      "text-gray-500",
      "text-emerald-600",
      "text-rose-600",
      "text-amber-600"
    );

    if (type === "ok") fincaFeedback.classList.add("text-emerald-600");
    else if (type === "error") fincaFeedback.classList.add("text-rose-600");
    else if (type === "warn") fincaFeedback.classList.add("text-amber-600");
    else fincaFeedback.classList.add("text-gray-500");

    clearTimeout(setFeedback._t);
    setFeedback._t = setTimeout(() => {
      fincaFeedback.classList.add("hidden");
    }, 2600);
  }

  function normalizeIndicativo(v) {
    return (v ?? "").toString().trim().toUpperCase();
  }

  // Confirm modal promise
  function confirmDialog({ title, message, acceptText = "Aceptar" }) {
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

  // Track changes for leaving page
  let isDirty = false;
  const markDirty = () => (isDirty = true);
  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", markDirty);
    el.addEventListener("change", markDirty);
  });

  // Uppercase animal id
  numero.addEventListener("input", () => {
    numero.value = numero.value.toUpperCase();
  });

  // Close on outside click (for all modals)
  [
    loadingModal,
    actionSuccessModal,
    actionErrorModal,
    confirmModal,
    editFincaModal,
    warningModal,
    successModal,
    errorModal,
  ].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide(modal);
    });
  });

  actionSuccessClose.addEventListener("click", () => hide(actionSuccessModal));
  actionErrorClose.addEventListener("click", () => hide(actionErrorModal));
  warningClose.addEventListener("click", () => hide(warningModal));
  errorClose.addEventListener("click", () => hide(errorModal));

  successClose.addEventListener("click", () => hide(successModal));
  successGoDashboard.addEventListener("click", () => {
    window.location.href = "/dashboard";
  });

  // ====== FINCAS STATE ======
  let fincasCache = []; // [{id, Indicativo, asociados}]
  let editingFinca = null; // {id, Indicativo, asociados}

  function updateFincasStats() {
    if (fincasTotal) fincasTotal.textContent = String(fincasCache.length || 0);
  }

  function renderFincasDropdown(selectedValue = "") {
    fincaSelect.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Seleccione...";
    fincaSelect.appendChild(opt0);

    fincasCache.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.Indicativo;
      opt.textContent = f.Indicativo === "..." ? "SIN ESPECIFICAR (...)" : f.Indicativo;
      fincaSelect.appendChild(opt);
    });

    if (selectedValue) {
      const exists = fincasCache.some((f) => f.Indicativo === selectedValue);
      fincaSelect.value = exists ? selectedValue : "";
    }
  }

  function renderFincasTable() {
    const q = (fincasSearch?.value ?? "").toString().trim().toUpperCase();
    const rows = !q
      ? fincasCache
      : fincasCache.filter((f) => (f.Indicativo || "").toUpperCase().includes(q));

    fincasTableBody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.className = "px-4 py-4 text-sm text-gray-500 dark:text-gray-400";
      td.textContent = "No hay fincas para mostrar con ese filtro.";
      tr.appendChild(td);
      fincasTableBody.appendChild(tr);
      return;
    }

    rows.forEach((f) => {
      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-gray-50 dark:hover:bg-[#252433] transition-colors";

      // Indicativo
      const tdName = document.createElement("td");
      tdName.className = "px-4 py-3 text-gray-800 dark:text-gray-100 font-semibold";
      tdName.textContent =
        f.Indicativo === "..." ? "SIN ESPECIFICAR (...)" : f.Indicativo;

      // asociados
      const tdAsoc = document.createElement("td");
      tdAsoc.className = "px-4 py-3 text-gray-700 dark:text-gray-200";
      tdAsoc.innerHTML = `<span class="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-[#2c2b3b] px-3 py-1.5 text-xs font-bold ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
        <span class="material-symbols-outlined text-[16px]">link</span>
        ${Number(f.asociados || 0).toLocaleString("es-CO")}
      </span>`;

      // acciones
      const tdAct = document.createElement("td");
      tdAct.className = "px-4 py-3";

      const wrap = document.createElement("div");
      wrap.className = "flex items-center gap-2";

      const btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className =
        "inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#2c2b3b] px-3 py-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
      btnEdit.innerHTML = `<span class="material-symbols-outlined text-[18px]">edit</span> Renombrar`;

      const btnDel = document.createElement("button");
      btnDel.type = "button";
      const canDelete = f.Indicativo !== "...";
      btnDel.className =
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs md:text-sm font-extrabold shadow-sm transition " +
        (canDelete
          ? "bg-rose-600 text-white hover:bg-rose-700"
          : "bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed");
      btnDel.innerHTML = `<span class="material-symbols-outlined text-[18px]">delete</span> Eliminar`;

      btnEdit.addEventListener("click", () => openEditFinca(f));
      if (canDelete) btnDel.addEventListener("click", () => deleteFincaCascade(f));

      wrap.appendChild(btnEdit);
      wrap.appendChild(btnDel);

      tdAct.appendChild(wrap);

      tr.appendChild(tdName);
      tr.appendChild(tdAsoc);
      tr.appendChild(tdAct);
      fincasTableBody.appendChild(tr);
    });
  }

  async function cargarFincas() {
    try {
      const res = await fetch("/api/fincas?withCounts=1");
      const data = await res.json();
      fincasCache = Array.isArray(data) ? data : [];
      updateFincasStats();
      renderFincasDropdown(fincaSelect.value);
      renderFincasTable();
    } catch (e) {
      fincasCache = [];
      updateFincasStats();
      renderFincasDropdown("");
      renderFincasTable();
      setFeedback("No se pudieron cargar las fincas.", "warn");
    }
  }

  async function agregarFinca() {
    const name = normalizeIndicativo(newFincaName.value);
    if (!name) {
      setFeedback("Escribe el indicativo de la finca.", "warn");
      return;
    }

    try {
      setLoading("Agregando finca…", "Guardando indicativo en la base de datos.");
      show(loadingModal);

      const res = await fetch("/api/fincas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Indicativo: name }),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setFeedback(err.error || "Esa finca ya existe.", "warn");
          showActionError("No se pudo agregar", err.error || "Esa finca ya existe.");
          return;
        }
        showActionError("No se pudo agregar", err.error || "Error creando finca.");
        return;
      }

      const creada = await res.json().catch(() => null);
      newFincaName.value = "";
      await cargarFincas();

      if (creada?.Indicativo) fincaSelect.value = creada.Indicativo;

      setFeedback("Finca agregada.", "ok");
      showActionSuccess("Finca creada", `Se agregó "${creada?.Indicativo || name}".`);
    } catch (e) {
      hide(loadingModal);
      showActionError("Error", e.message || "Error creando finca.");
      setFeedback("Error creando finca.", "error");
    }
  }

  function openEditFinca(finca) {
    editingFinca = finca;
    editFincaName.value = finca.Indicativo === "..." ? "" : finca.Indicativo;
    show(editFincaModal);
  }

  editFincaCancel.addEventListener("click", () => {
    editingFinca = null;
    hide(editFincaModal);
  });

  async function saveEditFinca() {
    if (!editingFinca) return;

    const nuevo = normalizeIndicativo(editFincaName.value);
    if (!nuevo) {
      showActionError("Nombre inválido", "Debes escribir el nuevo indicativo.");
      return;
    }

    if (editingFinca.Indicativo === "...") {
      showActionError("No permitido", 'No se puede renombrar la finca "...".');
      return;
    }

    const ok = await confirmDialog({
      title: "Renombrar finca",
      message:
        `Se cambiará "${editingFinca.Indicativo}" por "${nuevo}" y se actualizarán ` +
        `todos los registros del histórico asociados.\n\n¿Deseas continuar?`,
      acceptText: "Renombrar",
    });
    if (!ok) return;

    try {
      hide(editFincaModal);
      setLoading("Renombrando finca…", "Actualizando histórico asociado.");
      show(loadingModal);

      const res = await fetch(`/api/fincas/${encodeURIComponent(editingFinca.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Indicativo: nuevo }),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showActionError("No se pudo renombrar", err.error || "Error renombrando finca.");
        return;
      }

      const out = await res.json().catch(() => ({}));
      await cargarFincas();

      // Mantener dropdown consistente
      if (fincaSelect.value === editingFinca.Indicativo) {
        fincaSelect.value = nuevo;
      }

      const updatedHistorico = Number(out.updatedHistorico || 0);
      showActionSuccess(
        "Finca renombrada",
        `Se actualizó "${editingFinca.Indicativo}" → "${nuevo}". ` +
          `Registros del histórico actualizados: ${updatedHistorico.toLocaleString("es-CO")}.`
      );

      editingFinca = null;
    } catch (e) {
      hide(loadingModal);
      showActionError("Error", e.message || "Error renombrando finca.");
    }
  }

  editFincaSave.addEventListener("click", saveEditFinca);
  editFincaName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditFinca();
    }
  });

  async function deleteFincaCascade(finca) {
    if (finca.Indicativo === "...") {
      showActionError("No permitido", 'No se puede eliminar la finca "...".');
      return;
    }

    // Confirmación fuerte (explicita cascada)
    const ok = await confirmDialog({
      title: "Eliminar finca (cascada)",
      message:
        `Vas a eliminar la finca "${finca.Indicativo}".\n\n` +
        `⚠️ Esto también eliminará TODOS los registros del histórico asociados (${Number(
          finca.asociados || 0
        ).toLocaleString("es-CO")} aprox.).\n\n` +
        `¿Deseas continuar?`,
      acceptText: "Eliminar",
    });
    if (!ok) return;

    try {
      setLoading("Eliminando finca…", "Borrando finca y registros asociados.");
      show(loadingModal);

      const res = await fetch(
        `/api/fincas/${encodeURIComponent(finca.id)}?cascade=1`,
        { method: "DELETE" }
      );

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showActionError("No se pudo eliminar", err.error || "Error eliminando finca.");
        return;
      }

      const out = await res.json().catch(() => ({}));
      const deletedHistorico = Number(out.deletedHistorico || 0);

      // Si estaba seleccionada, limpiar select
      if (fincaSelect.value === finca.Indicativo) {
        fincaSelect.value = "";
      }

      await cargarFincas();

      showActionSuccess(
        "Finca eliminada",
        `Se eliminó "${finca.Indicativo}". Registros del histórico eliminados: ${deletedHistorico.toLocaleString(
          "es-CO"
        )}.`
      );
    } catch (e) {
      hide(loadingModal);
      showActionError("Error", e.message || "Error eliminando finca.");
    }
  }

  // Events fincas
  btnAddFinca.addEventListener("click", agregarFinca);
  newFincaName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarFinca();
    }
  });

  btnRefreshFincas.addEventListener("click", async () => {
    setLoading("Actualizando…", "Recargando lista de fincas.");
    show(loadingModal);
    await cargarFincas();
    hide(loadingModal);
    setFeedback("Lista actualizada.", "ok");
  });

  fincasSearch.addEventListener("input", renderFincasTable);

  // ===== Navegación / Logout =====
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (isDirty) {
        const ok = await confirmDialog({
          title: "Cerrar sesión",
          message:
            "Tienes cambios sin guardar. ¿Quieres salir de todas formas?",
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
          message:
            "Tienes cambios sin guardar. ¿Quieres volver y perderlos?",
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

  // ===== Limpiar =====
  function limpiarFormulario() {
    form.reset();
    renderFincasDropdown("");
    isDirty = false;
  }

  btnLimpiar.addEventListener("click", async () => {
    if (!isDirty) {
      limpiarFormulario();
      return;
    }
    const ok = await confirmDialog({
      title: "Limpiar formulario",
      message: "¿Seguro que deseas limpiar? Se perderán los datos ingresados.",
      acceptText: "Limpiar",
    });
    if (!ok) return;
    limpiarFormulario();
  });

  // ===== Submit ingreso =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (
      !fechaIngreso.value ||
      !numero.value ||
      !sexo.value ||
      !edad.value ||
      !raza.value ||
      !peso.value ||
      !valorKGingreso.value ||
      !marca.value ||
      !fincaSelect.value
    ) {
      warningMessage.textContent = "Por favor completa todos los campos obligatorios.";
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
      Destino: "",
      Finca: fincaSelect.value, // Indicativo
      Raza: raza.value,
      Flete: parseFloat(flete.value) || 0,
      Comision: parseFloat(comision.value) || 0,
      Mermas: parseFloat(mermas.value) || 0,
      Proveedor: proveedor.value || null,
      PesoFinca: parseFloat(pesoFinca.value) || 0,
    };

    setLoading("Guardando ingreso…", "Registrando ingreso en el histórico.");
    show(loadingModal);

    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      hide(loadingModal);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        errorMessage.textContent = err.error || "Ocurrió un error al registrar el ingreso.";
        show(errorModal);
        return;
      }

      show(successModal);
      limpiarFormulario();
    } catch (err) {
      console.error(err);
      hide(loadingModal);
      errorMessage.textContent =
        "No se pudo conectar con el servidor. Verifica la conexión.";
      show(errorModal);
    }
  });

  // ===== INIT =====
  cargarFincas();
});
