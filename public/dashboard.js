// public/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  // ====== HELPERS ======
  const on = (el, ev, fn, opts) => {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
  };

  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  // ====== DOM BÁSICO ======
  const tablaHead = document.getElementById("tabla-head");
  const tablaBody = document.getElementById("tabla-body");
  const tablaWrapper = document.getElementById("tabla-wrapper");

  const totalGeneralEl = document.getElementById("total-general");
  const totalIngresosEl = document.getElementById("total-ingresos");
  const totalSalidasEl = document.getElementById("total-salidas");
  const totalValorIngresoEl = document.getElementById("total-valor-ingreso");
  const totalValorSalidaEl = document.getElementById("total-valor-salida");

  const totalUtilidadEl = document.getElementById("total-utilidad");
  const totalUtilidadPctEl = document.getElementById("total-utilidad-pct");

  const statPesoIngEl = document.getElementById("stat-peso-ing");
  const statPesoSalEl = document.getElementById("stat-peso-sal");
  const statPesoGananciaEl = document.getElementById("stat-peso-ganancia");
  const statValorIngEl = document.getElementById("stat-valor-ing");
  const statValorSalEl = document.getElementById("stat-valor-sal");
  const statPrediccionEl = document.getElementById("stat-prediccion");

  const btnIngresoTab = document.getElementById("btn-ingreso");
  const btnSalidaTab = document.getElementById("btn-salida");

  const btnActualizar = document.getElementById("btn-actualizar");
  const btnExportarTodo = document.getElementById("btn-exportar-todo");
  const btnExportarVista = document.getElementById("btn-exportar-vista");

  const selectionInfo = document.getElementById("selection-info");
  const selectionInfoMobile = document.getElementById("selection-info-mobile");

  // Date range TOP
  const rangePrevTop = document.getElementById("range-prev-top");
  const rangeNextTop = document.getElementById("range-next-top");
  const rangeClearTop = document.getElementById("range-clear-top");
  const dateFromTop = document.getElementById("date-from-top");
  const dateToTop = document.getElementById("date-to-top");

  // Date range BOTTOM
  const rangePrevBottom = document.getElementById("range-prev-bottom");
  const rangeNextBottom = document.getElementById("range-next-bottom");
  const rangeClearBottom = document.getElementById("range-clear-bottom");
  const dateFromBottom = document.getElementById("date-from-bottom");
  const dateToBottom = document.getElementById("date-to-bottom");

  // Pager TOP
  const pageInfoTop = document.getElementById("page-info-top");
  const pagePrevTop = document.getElementById("page-prev-top");
  const pageNextTop = document.getElementById("page-next-top");
  const pageSize100Top = document.getElementById("page-size-100-top");
  const pageSize200Top = document.getElementById("page-size-200-top");
  const pageSize300Top = document.getElementById("page-size-300-top");
  const pageSizeAllTop = document.getElementById("page-size-all-top");

  // Pager BOTTOM
  const pageInfoBottom = document.getElementById("page-info-bottom");
  const pagePrevBottom = document.getElementById("page-prev-bottom");
  const pageNextBottom = document.getElementById("page-next-bottom");
  const pageSize100Bottom = document.getElementById("page-size-100-bottom");
  const pageSize200Bottom = document.getElementById("page-size-200-bottom");
  const pageSize300Bottom = document.getElementById("page-size-300-bottom");
  const pageSizeAllBottom = document.getElementById("page-size-all-bottom");

  // Floating top/bottom (si existen)
  const fabTop = document.getElementById("fab-top");
  const fabBottom = document.getElementById("fab-bottom");
  const pageTop = document.getElementById("page-top");
  const pageBottom = document.getElementById("page-bottom");

  // Logout modal
  const btnLogout = document.getElementById("btn-logout");
  const logoutModal = document.getElementById("logout-modal");
  const logoutCancel = document.getElementById("logout-cancel");
  const logoutConfirm = document.getElementById("logout-confirm");

  // ====== ESTADO ======
  let registros = [];
  let vistaActual = "ingreso"; // 'ingreso' | 'salida'
  let filtros = {}; // {colKey: texto}
  let sortConfig = { key: null, direction: "asc" };
  let vistaFiltradaActual = [];
  const selectedNumeros = new Set();

  // Paginación
  let pageSize = 200; // default
  let pageIndex = 1; // 1..n (si Todos => 1)
  let totalRowsAfterFilters = 0;

  // Fechas
  let dateFrom = "";
  let dateTo = "";

  // ====== CONFIG DE COLUMNAS ======
  const columnasIngreso = [
    { key: "Numero", label: "Número" },
    { key: "FechaIngreso", label: "F Ingreso" },
    { key: "Finca", label: "Finca" },
    { key: "Color", label: "Color" },
    { key: "Edad", label: "Edad" },
    { key: "Sexo", label: "Sexo" },
    { key: "Marcallegada", label: "Marca" },
    { key: "Peso", label: "P Ingreso" },
    { key: "ValorKGingreso", label: "Precio ingreso" },
    { key: "Flete", label: "Valor flete" },
    { key: "totalIngreso", label: "Valor total ingreso" },
  ];

  const columnasSalida = [
    { key: "Numero", label: "Número" },

    { key: "ValorKGingreso", label: "Precio ingreso" },
    { key: "FechaIngreso", label: "Fecha ingreso" },
    { key: "Peso", label: "Peso ingreso" },
    { key: "Flete", label: "Valor flete" },
    { key: "totalIngreso", label: "Valor total ingreso" },

    { key: "FechaSalida", label: "Fecha salida" },
    { key: "PesoSalida", label: "Peso salida" },
    { key: "diasEnHacienda", label: "Días en hacienda" },
    { key: "diferenciaPeso", label: "Diferencia peso" },

    { key: "ValorKGsalida", label: "Valor salida" },
    { key: "totalSalidaCalc", label: "Valor total salida" },
    { key: "utilidad", label: "Utilidad" },

    { key: "Destino", label: "Destino" },
    { key: "Finca", label: "Finca" },
  ];

  function getColumnConfig() {
    return vistaActual === "ingreso" ? columnasIngreso : columnasSalida;
  }

  // ====== UTILIDADES ======
  function formatMoney(value) {
    const num = Number(value) || 0;
    // ⚠️ toLocaleString mete NBSP entre $ y número -> lo cambiamos por espacio normal
    return num
      .toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      })
      .replace(/\u00A0/g, " ");
  }

  function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return num.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  }

  function formatNumber1(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return num.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  }

  function parseISODate(d) {
    if (!d) return null;
    const t = new Date(d + "T00:00:00");
    return Number.isNaN(t.getTime()) ? null : t;
  }

  function diffDays(aISO, bISO) {
    const a = parseISODate(aISO);
    const b = parseISODate(bISO);
    if (!a || !b) return null;
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function rawValue(row, key) {
    if (key === "totalIngreso") {
      const peso = Number(row.Peso) || 0;
      const precio = Number(row.ValorKGingreso) || 0;
      const flete = Number(row.Flete) || 0;
      return peso * precio + flete;
    }

    if (key === "diasEnHacienda") {
      const d = diffDays(row.FechaIngreso, row.FechaSalida);
      return d == null ? null : d;
    }

    if (key === "diferenciaPeso") {
      const pi = Number(row.Peso) || 0;
      const ps = Number(row.PesoSalida) || 0;
      if (!row.FechaSalida || !ps) return null;
      return ps - pi;
    }

    if (key === "totalSalidaCalc") {
      const ps = Number(row.PesoSalida) || 0;
      const precioSal = Number(row.ValorKGsalida) || 0;
      if (!row.FechaSalida || !ps) return null;
      return ps * precioSal;
    }

    if (key === "utilidad") {
      if (!row.FechaSalida || !row.PesoSalida) return null;
      const ingreso = rawValue(row, "totalIngreso") || 0;
      const salida = rawValue(row, "totalSalidaCalc") || 0;
      return salida - ingreso;
    }

    return row[key];
  }

  function formatCell(key, value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "string") {
      const v = value.trim();
      if (!v || v === "...") return "";
      return v;
    }

    if (key === "totalIngreso" || key === "totalSalidaCalc" || key === "utilidad") {
      return formatMoney(value);
    }

    if (
      key === "ValorKGingreso" ||
      key === "ValorKGsalida" ||
      key === "Flete" ||
      key === "Comision" ||
      key === "Mermas"
    ) {
      return formatNumber(value);
    }

    if (key === "Peso" || key === "PesoSalida" || key === "PesoFinca") {
      return formatNumber1(value);
    }

    if (key === "diferenciaPeso") {
      const num = Number(value);
      const s = num > 0 ? "+" : "";
      return `${s}${formatNumber1(num)}`;
    }

    return value;
  }

  async function copyToClipboard(text) {
    const value = (text ?? "").toString();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  function setTabStyles() {
    const active = ["bg-primary", "text-white", "shadow"];
    const inactive = ["bg-transparent", "text-gray-600", "dark:text-gray-300"];

    if (!btnIngresoTab || !btnSalidaTab) return;

    if (vistaActual === "ingreso") {
      btnIngresoTab.classList.add(...active);
      btnIngresoTab.classList.remove(...inactive);

      btnSalidaTab.classList.remove(...active);
      btnSalidaTab.classList.add(...inactive);
    } else {
      btnSalidaTab.classList.add(...active);
      btnSalidaTab.classList.remove(...inactive);

      btnIngresoTab.classList.remove(...active);
      btnIngresoTab.classList.add(...inactive);
    }
  }

  function setPageSizeStyles() {
    const btns = [
      pageSize100Top,
      pageSize200Top,
      pageSize300Top,
      pageSizeAllTop,
      pageSize100Bottom,
      pageSize200Bottom,
      pageSize300Bottom,
      pageSizeAllBottom,
    ].filter(Boolean);

    btns.forEach((b) => {
      b.classList.remove("bg-primary", "text-white", "shadow");
      b.classList.add("text-gray-600", "dark:text-gray-300");
    });

    const activate = (el) => {
      if (!el) return;
      el.classList.add("bg-primary", "text-white", "shadow");
      el.classList.remove("text-gray-600", "dark:text-gray-300");
    };

    if (pageSize === 100) {
      activate(pageSize100Top);
      activate(pageSize100Bottom);
    } else if (pageSize === 200) {
      activate(pageSize200Top);
      activate(pageSize200Bottom);
    } else if (pageSize === 300) {
      activate(pageSize300Top);
      activate(pageSize300Bottom);
    } else {
      activate(pageSizeAllTop);
      activate(pageSizeAllBottom);
    }
  }

  // ====== CABECERA + FILTROS ======
  function construirHead() {
    if (!tablaHead) return;
    const cols = getColumnConfig();
    tablaHead.innerHTML = "";

    const trHeader = document.createElement("tr");
    trHeader.className = "bg-gray-50 dark:bg-surface-dark-2 text-gray-700 dark:text-gray-200";

    // Columna #
    const thIndex = document.createElement("th");
    thIndex.className =
      "px-3 py-3 text-left align-bottom whitespace-nowrap text-xs md:text-sm font-extrabold uppercase tracking-wider";
    thIndex.textContent = "#";
    trHeader.appendChild(thIndex);

    // Checkbox header
    const thCheck = document.createElement("th");
    thCheck.className = "px-3 py-3 text-center align-bottom";
    const headerCheckbox = document.createElement("input");
    headerCheckbox.type = "checkbox";
    headerCheckbox.id = "select-all-checkbox";
    headerCheckbox.className =
      "h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary";
    on(headerCheckbox, "change", () => handleSelectAll(headerCheckbox.checked));
    thCheck.appendChild(headerCheckbox);
    trHeader.appendChild(thCheck);

    cols.forEach((col) => {
      const th = document.createElement("th");
      th.className =
        "px-3 py-3 text-left align-bottom whitespace-nowrap text-xs md:text-sm font-extrabold uppercase tracking-wider";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.sortKey = col.key;
      btn.className = "flex items-center gap-1 hover:text-primary transition-colors";

      const spanLabel = document.createElement("span");
      spanLabel.textContent = col.label;

      const spanIcon = document.createElement("span");
      spanIcon.dataset.sortIcon = col.key;
      spanIcon.className = "text-[10px] opacity-50";
      spanIcon.textContent = "⇅";

      btn.appendChild(spanLabel);
      btn.appendChild(spanIcon);
      th.appendChild(btn);
      trHeader.appendChild(th);
    });

    tablaHead.appendChild(trHeader);

    // Filtros
    const trFilters = document.createElement("tr");
    trFilters.className = "bg-white dark:bg-surface-dark";

    const thIndexFilter = document.createElement("th");
    thIndexFilter.className = "px-3 py-2";
    trFilters.appendChild(thIndexFilter);

    const thCheckFilter = document.createElement("th");
    thCheckFilter.className = "px-3 py-2";
    trFilters.appendChild(thCheckFilter);

    cols.forEach((col) => {
      const th = document.createElement("th");
      th.className = "px-3 py-2";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Filtrar...";
      input.className =
        "w-full rounded-full border-0 bg-gray-50 dark:bg-gray-800 py-2 px-3 text-xs md:text-sm text-gray-900 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary";
      input.dataset.filter = col.key;
      input.value = filtros[col.key] || "";

      on(input, "input", () => {
        filtros[col.key] = input.value.trim().toLowerCase();
        pageIndex = 1;
        aplicarFiltrosYRender();
      });

      th.appendChild(input);
      trFilters.appendChild(th);
    });

    tablaHead.appendChild(trFilters);

    // Orden
    tablaHead.querySelectorAll("[data-sort-key]").forEach((btn) => {
      on(btn, "click", () => manejarOrden(btn.dataset.sortKey));
    });
  }

  function actualizarSortIcons() {
    if (!tablaHead) return;
    const icons = tablaHead.querySelectorAll("[data-sort-icon]");
    icons.forEach((icon) => {
      const key = icon.dataset.sortIcon;
      if (sortConfig.key === key) {
        icon.textContent = sortConfig.direction === "asc" ? "⇧" : "⇩";
        icon.classList.remove("opacity-50");
        icon.classList.add("opacity-90");
      } else {
        icon.textContent = "⇅";
        icon.classList.add("opacity-50");
        icon.classList.remove("opacity-90");
      }
    });
  }

  function manejarOrden(key) {
    const cols = getColumnConfig();
    const existe = cols.some((c) => c.key === key);
    if (!existe) return;

    if (sortConfig.key === key) {
      sortConfig.direction = sortConfig.direction === "asc" ? "desc" : "asc";
    } else {
      sortConfig.key = key;
      sortConfig.direction = "asc";
    }
    pageIndex = 1;
    aplicarFiltrosYRender();
  }

  // ====== FECHAS ======
  function dateKeyForVista() {
    return vistaActual === "ingreso" ? "FechaIngreso" : "FechaSalida";
  }

  function syncDateInputs() {
    if (dateFromTop) dateFromTop.value = dateFrom || "";
    if (dateToTop) dateToTop.value = dateTo || "";
    if (dateFromBottom) dateFromBottom.value = dateFrom || "";
    if (dateToBottom) dateToBottom.value = dateTo || "";
  }

  function applyDateChange(from, to) {
    dateFrom = from || "";
    dateTo = to || "";
    pageIndex = 1;
    syncDateInputs();
    aplicarFiltrosYRender();
  }

  function moveDateRange(direction) {
    if (!dateFrom || !dateTo) return;

    const a = parseISODate(dateFrom);
    const b = parseISODate(dateTo);
    if (!a || !b) return;

    const span = Math.max(0, Math.floor((b - a) / 86400000));
    const stepDays = span + 1;

    const newFrom = new Date(a.getTime() + direction * stepDays * 86400000);
    const newTo = new Date(b.getTime() + direction * stepDays * 86400000);

    const iso = (d) => d.toISOString().slice(0, 10);
    applyDateChange(iso(newFrom), iso(newTo));
  }

  // ====== PAGINACIÓN ======
  function totalPages(total) {
    if (pageSize === Infinity) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }

  function clampPageIndex() {
    const pages = totalPages(totalRowsAfterFilters);
    pageIndex = Math.min(Math.max(1, pageIndex), pages);
  }

  function updatePageInfo() {
    const total = totalRowsAfterFilters;
    const pages = totalPages(total);
    clampPageIndex();

    let start = 0;
    let end = 0;

    if (total === 0) {
      start = 0;
      end = 0;
    } else if (pageSize === Infinity) {
      start = 1;
      end = total;
    } else {
      start = (pageIndex - 1) * pageSize + 1;
      end = Math.min(total, pageIndex * pageSize);
    }

    const msg = `Mostrando ${start}–${end} de ${total}`;
    if (pageInfoTop) pageInfoTop.textContent = msg;
    if (pageInfoBottom) pageInfoBottom.textContent = msg;

    const disablePrev = pageIndex <= 1 || total === 0 || pageSize === Infinity;
    const disableNext = pageIndex >= pages || total === 0 || pageSize === Infinity;

    if (pagePrevTop) pagePrevTop.disabled = disablePrev;
    if (pagePrevBottom) pagePrevBottom.disabled = disablePrev;
    if (pageNextTop) pageNextTop.disabled = disableNext;
    if (pageNextBottom) pageNextBottom.disabled = disableNext;

    const dim = (btn, disabled) => {
      if (!btn) return;
      btn.classList.toggle("opacity-40", disabled);
      btn.classList.toggle("pointer-events-none", disabled);
    };

    dim(pagePrevTop, disablePrev);
    dim(pagePrevBottom, disablePrev);
    dim(pageNextTop, disableNext);
    dim(pageNextBottom, disableNext);
  }

  function sliceByPage(rows) {
    totalRowsAfterFilters = rows.length;
    clampPageIndex();
    updatePageInfo();

    if (pageSize === Infinity) return rows;
    const startIdx = (pageIndex - 1) * pageSize;
    return rows.slice(startIdx, startIdx + pageSize);
  }

  // ====== CARGA DATOS ======
  async function cargarDatos() {
    try {
      const res = await fetch("/api/historicoiys");
      const data = await res.json();
      registros = Array.isArray(data) ? data : [];
      aplicarFiltrosYRender();
    } catch (err) {
      console.error("Error al cargar datos:", err);
    }
  }

  function aplicarFiltrosYRender() {
    const dateKey = dateKeyForVista();

    const filtradosFechas = registros.filter((r) => {
      if (!dateFrom && !dateTo) return true;

      const v = r[dateKey];
      if (!v) return false;

      const t = parseISODate(v);
      if (!t) return false;

      const fromT = dateFrom ? parseISODate(dateFrom) : null;
      const toT = dateTo ? parseISODate(dateTo) : null;

      if (fromT && t < fromT) return false;
      if (toT && t > toT) return false;
      return true;
    });

    const filtradosGlobal = filtradosFechas.filter((r) =>
      Object.entries(filtros).every(([key, val]) => {
        if (!val) return true;
        const raw = rawValue(r, key);
        const text = (raw ?? "").toString().toLowerCase();
        return text.includes(val);
      })
    );

    const contextRows =
      selectedNumeros.size > 0
        ? filtradosGlobal.filter((r) => selectedNumeros.has(r.Numero))
        : filtradosGlobal;

    const ingresosContext = contextRows.filter((r) => !r.FechaSalida && !r.PesoSalida);
    const salidasContext = contextRows.filter((r) => r.FechaSalida && r.PesoSalida);

    const total = contextRows.length;
    const totalIngresos = ingresosContext.length;
    const totalSalidas = salidasContext.length;

    const totalValorIngreso = ingresosContext.reduce(
      (acc, r) => acc + (rawValue(r, "totalIngreso") || 0),
      0
    );

    const totalValorSalida = salidasContext.reduce(
      (acc, r) => acc + (rawValue(r, "totalSalidaCalc") || 0),
      0
    );

    if (totalGeneralEl) totalGeneralEl.textContent = total;
    if (totalIngresosEl) totalIngresosEl.textContent = totalIngresos;
    if (totalSalidasEl) totalSalidasEl.textContent = totalSalidas;
    if (totalValorIngresoEl) totalValorIngresoEl.textContent = formatMoney(totalValorIngreso);
    if (totalValorSalidaEl) totalValorSalidaEl.textContent = formatMoney(totalValorSalida);

    const totalIngresoDeSalidas = salidasContext.reduce(
      (acc, r) => acc + (rawValue(r, "totalIngreso") || 0),
      0
    );

    const totalUtilidad = salidasContext.reduce(
      (acc, r) => acc + (rawValue(r, "utilidad") || 0),
      0
    );

    if (totalUtilidadEl) totalUtilidadEl.textContent = formatMoney(totalUtilidad);

    if (totalUtilidadPctEl) {
      if (totalIngresoDeSalidas > 0) {
        const pct = (totalUtilidad / totalIngresoDeSalidas) * 100;
        totalUtilidadPctEl.textContent = `${pct.toFixed(2)}%`;
      } else {
        totalUtilidadPctEl.textContent = "-";
      }
    }

    actualizarEstadisticas(contextRows);

    let visiblesBase =
      vistaActual === "ingreso"
        ? filtradosGlobal.filter((r) => !r.FechaSalida && !r.PesoSalida)
        : filtradosGlobal.filter((r) => r.FechaSalida && r.PesoSalida);

    if (selectedNumeros.size > 0) {
      visiblesBase = visiblesBase.filter((r) => selectedNumeros.has(r.Numero));
    }

    let visibles = visiblesBase;
    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const cols = getColumnConfig();
      if (cols.some((c) => c.key === key)) {
        visibles = [...visiblesBase].sort((a, b) => {
          const va = rawValue(a, key);
          const vb = rawValue(b, key);

          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;

          if (typeof va === "number" && typeof vb === "number") {
            return direction === "asc" ? va - vb : vb - va;
          }

          const sa = va.toString().toLowerCase();
          const sb = vb.toString().toLowerCase();
          if (sa < sb) return direction === "asc" ? -1 : 1;
          if (sa > sb) return direction === "asc" ? 1 : -1;
          return 0;
        });
      } else {
        sortConfig.key = null;
      }
    }

    const visiblesPaginados = sliceByPage(visibles);
    vistaFiltradaActual = visiblesPaginados;

    construirHead();
    renderTabla(visiblesPaginados);
    actualizarSortIcons();
    actualizarSelectionInfo(filtradosGlobal.length, contextRows.length);
    actualizarHeaderCheckbox();
    setPageSizeStyles();
  }

  function renderTabla(filas) {
    if (!tablaBody) return;
    const cols = getColumnConfig();
    tablaBody.innerHTML = "";

    filas.forEach((row, idx) => {
      const numero = row.Numero;
      const isSelected = selectedNumeros.has(numero);

      const tr = document.createElement("tr");
      tr.className =
        "bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-surface-dark-2 transition-colors";
      tr.dataset.numero = numero;

      // #
      const tdIndex = document.createElement("td");
      tdIndex.className = "px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200";
      tdIndex.textContent =
        pageSize === Infinity ? idx + 1 : (pageIndex - 1) * pageSize + (idx + 1);
      tr.appendChild(tdIndex);

      // checkbox
      const tdCheck = document.createElement("td");
      tdCheck.className = "px-3 py-2 text-center";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className =
        "h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary";
      cb.checked = isSelected;
      cb.dataset.numero = numero;
      on(cb, "click", (e) => {
        e.stopPropagation();
        handleCheckboxChange(numero, cb.checked);
      });
      tdCheck.appendChild(cb);
      tr.appendChild(tdCheck);

      // data
      cols.forEach((col) => {
        const td = document.createElement("td");
        td.className = "px-3 py-2 whitespace-nowrap text-gray-800 dark:text-gray-200";

        const val = rawValue(row, col.key);

        // ✅ Número con botón copiar
        if (col.key === "Numero") {
          td.className = "px-3 py-2 whitespace-nowrap";
          const wrap = document.createElement("div");
          wrap.className = "flex items-center gap-2";

          const strong = document.createElement("span");
          strong.className = "font-extrabold text-gray-900 dark:text-white";
          strong.textContent = formatCell(col.key, val);

          const btnCopy = document.createElement("button");
          btnCopy.type = "button";
          btnCopy.className =
            "inline-flex items-center justify-center size-8 rounded-full bg-white dark:bg-[#2c2b3b] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
          btnCopy.title = "Copiar número";

          const icon = document.createElement("span");
          icon.className = "material-symbols-outlined text-[18px]";
          icon.textContent = "content_copy";

          btnCopy.appendChild(icon);

          on(btnCopy, "click", async (e) => {
            e.stopPropagation();
            const ok = await copyToClipboard(numero);
            if (ok) {
              icon.textContent = "check";
              setTimeout(() => (icon.textContent = "content_copy"), 900);
            }
          });

          wrap.appendChild(strong);
          wrap.appendChild(btnCopy);
          td.appendChild(wrap);
          tr.appendChild(td);
          return;
        }

        td.textContent = formatCell(col.key, val);

        if (col.key === "utilidad") {
          const u = Number(val) || 0;
          td.classList.add("font-bold");
          if (u > 0) td.classList.add("text-emerald-600");
          if (u < 0) td.classList.add("text-rose-500");
        }

        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });
  }

  function handleCheckboxChange(numero, checked) {
    if (checked) selectedNumeros.add(numero);
    else selectedNumeros.delete(numero);
    pageIndex = 1;
    aplicarFiltrosYRender();
  }

  function handleSelectAll(checked) {
    if (checked) {
      vistaFiltradaActual.forEach((r) => selectedNumeros.add(r.Numero));
    } else {
      vistaFiltradaActual.forEach((r) => selectedNumeros.delete(r.Numero));
    }
    pageIndex = 1;
    aplicarFiltrosYRender();
  }

  function actualizarHeaderCheckbox() {
    const headerCb = document.getElementById("select-all-checkbox");
    if (!headerCb) return;

    if (vistaFiltradaActual.length === 0) {
      headerCb.checked = false;
      headerCb.indeterminate = false;
      return;
    }

    const seleccionadosEnVista = vistaFiltradaActual.filter((r) =>
      selectedNumeros.has(r.Numero)
    ).length;

    if (seleccionadosEnVista === 0) {
      headerCb.checked = false;
      headerCb.indeterminate = false;
    } else if (seleccionadosEnVista === vistaFiltradaActual.length) {
      headerCb.checked = true;
      headerCb.indeterminate = false;
    } else {
      headerCb.checked = false;
      headerCb.indeterminate = true;
    }
  }

  function actualizarSelectionInfo(totalFiltrados, totalContext) {
    const msg =
      selectedNumeros.size === 0
        ? "Totales basados en todos los registros filtrados."
        : `Totales basados en ${totalContext} registro(s) seleccionados (de ${totalFiltrados} filtrados).`;

    if (selectionInfo) selectionInfo.textContent = msg;
    if (selectionInfoMobile) selectionInfoMobile.textContent = msg;
  }

  // ====== ESTADÍSTICAS ======
  function actualizarEstadisticas(rows) {
    const safeSet = (el, txt) => el && (el.textContent = txt);

    if (!rows || rows.length === 0) {
      safeSet(statPesoIngEl, "-");
      safeSet(statPesoSalEl, "-");
      safeSet(statPesoGananciaEl, "-");
      safeSet(statValorIngEl, "-");
      safeSet(statValorSalEl, "-");
      safeSet(statPrediccionEl, "Sin datos suficientes para estimar.");
      return;
    }

    const pesosIng = rows.map((r) => Number(r.Peso)).filter((v) => Number.isFinite(v) && v > 0);
    const pesosSal = rows
      .map((r) => Number(r.PesoSalida))
      .filter((v) => Number.isFinite(v) && v > 0);

    const valIng = rows
      .map((r) => Number(r.ValorKGingreso))
      .filter((v) => Number.isFinite(v) && v > 0);

    const valSal = rows
      .map((r) => Number(r.ValorKGsalida))
      .filter((v) => Number.isFinite(v) && v > 0);

    const paresGanancia = rows
      .map((r) => {
        const pi = Number(r.Peso);
        const ps = Number(r.PesoSalida);
        if (Number.isFinite(pi) && Number.isFinite(ps) && ps > 0 && r.FechaSalida) {
          return ps - pi;
        }
        return null;
      })
      .filter((v) => v !== null);

    const prom = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const gPeso = prom(paresGanancia);
    const vIng = prom(valIng);
    const vSal = prom(valSal);

    safeSet(statPesoIngEl, pesosIng.length ? `${pIng.toFixed(1)} kg` : "-");
    safeSet(statPesoSalEl, pesosSal.length ? `${pSal.toFixed(1)} kg` : "-");
    safeSet(statPesoGananciaEl, paresGanancia.length ? `${gPeso.toFixed(1)} kg` : "-");
    safeSet(statValorIngEl, valIng.length ? formatMoney(vIng) : "-");
    safeSet(statValorSalEl, valSal.length ? formatMoney(vSal) : "-");

    if (paresGanancia.length) {
      safeSet(
        statPrediccionEl,
        `Si se mantiene la ganancia promedio actual de ${gPeso.toFixed(
          1
        )} kg por animal, los próximos lotes podrían comportarse de forma similar (estimación basada en el histórico actual).`
      );
    } else {
      safeSet(
        statPrediccionEl,
        "Aún no hay suficientes registros con ingreso y salida para estimar una ganancia promedio de peso."
      );
    }
  }

  // ====== EXPORTAR ======
  function exportarVistaActual() {
    if (!vistaFiltradaActual.length) {
      alert("No hay datos para exportar.");
      return;
    }

    const cols = getColumnConfig();
    const datos = vistaFiltradaActual.map((r, idx) => {
      const obj = { "#": idx + 1 };
      cols.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");

    const fecha = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Historico_${vistaActual}_vista_${fecha}.xlsx`);
  }

  function exportarTodo() {
    if (!registros.length) {
      alert("No hay datos para exportar.");
      return;
    }

    const ingresosArr = registros.filter((r) => !r.FechaSalida && !r.PesoSalida);
    const salidasArr = registros.filter((r) => r.FechaSalida && r.PesoSalida);

    const wb = XLSX.utils.book_new();

    const datosIng = ingresosArr.map((r, idx) => {
      const obj = { "#": idx + 1 };
      columnasIngreso.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });
    const wsIng = XLSX.utils.json_to_sheet(datosIng);
    XLSX.utils.book_append_sheet(wb, wsIng, "Ingresos");

    const datosSal = salidasArr.map((r, idx) => {
      const obj = { "#": idx + 1 };
      columnasSalida.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });
    const wsSal = XLSX.utils.json_to_sheet(datosSal);
    XLSX.utils.book_append_sheet(wb, wsSal, "Salidas");

    const fecha = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Historico_completo_${fecha}.xlsx`);
  }

  // ====== DRAG SCROLL ======
  function initDragScroll() {
    if (!tablaWrapper) return;

    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;

    const shouldIgnoreTarget = (target) => !!target?.closest("input,button,select,textarea,label,a");

    const onDown = (e) => {
      if (shouldIgnoreTarget(e.target)) return;
      isDown = true;
      tablaWrapper.classList.add("dragging");
      startX = e.clientX;
      scrollLeftStart = tablaWrapper.scrollLeft;
      try {
        tablaWrapper.setPointerCapture(e.pointerId);
      } catch (_) {}
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDown) return;
      const walk = e.clientX - startX;
      tablaWrapper.scrollLeft = scrollLeftStart - walk;
      e.preventDefault();
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      tablaWrapper.classList.remove("dragging");
    };

    on(tablaWrapper, "pointerdown", onDown, { passive: false });
    on(tablaWrapper, "pointermove", onMove, { passive: false });
    on(tablaWrapper, "pointerup", onUp);
    on(tablaWrapper, "pointercancel", onUp);
    on(tablaWrapper, "pointerleave", onUp);

    on(tablaWrapper, "dragstart", (e) => e.preventDefault());
  }

  // ====== LOGOUT ======
  function initLogout() {
    if (!btnLogout || !logoutModal || !logoutCancel || !logoutConfirm) return;

    on(btnLogout, "click", () => logoutModal.classList.remove("hidden"));
    on(logoutCancel, "click", () => logoutModal.classList.add("hidden"));
    on(logoutConfirm, "click", () => (window.location.href = "/"));
    on(logoutModal, "click", (e) => {
      if (e.target === logoutModal) logoutModal.classList.add("hidden");
    });
  }

  // ====== INIT LISTENERS ======
  function initTabs() {
    on(btnIngresoTab, "click", () => {
      vistaActual = "ingreso";
      setTabStyles();
      pageIndex = 1;
      aplicarFiltrosYRender();
    });

    on(btnSalidaTab, "click", () => {
      vistaActual = "salida";
      setTabStyles();
      pageIndex = 1;
      aplicarFiltrosYRender();
    });
  }

  function initActions() {
    on(btnActualizar, "click", cargarDatos);
    on(btnExportarVista, "click", exportarVistaActual);
    on(btnExportarTodo, "click", exportarTodo);
  }

  function initPager() {
    const setSize = (n) => {
      pageSize = n;
      pageIndex = 1;
      setPageSizeStyles();
      aplicarFiltrosYRender();
    };

    on(pageSize100Top, "click", () => setSize(100));
    on(pageSize200Top, "click", () => setSize(200));
    on(pageSize300Top, "click", () => setSize(300));
    on(pageSizeAllTop, "click", () => setSize(Infinity));

    on(pageSize100Bottom, "click", () => setSize(100));
    on(pageSize200Bottom, "click", () => setSize(200));
    on(pageSize300Bottom, "click", () => setSize(300));
    on(pageSizeAllBottom, "click", () => setSize(Infinity));

    const prev = () => {
      pageIndex = Math.max(1, pageIndex - 1);
      aplicarFiltrosYRender();
    };

    const next = () => {
      pageIndex = pageIndex + 1;
      aplicarFiltrosYRender();
    };

    on(pagePrevTop, "click", prev);
    on(pagePrevBottom, "click", prev);
    on(pageNextTop, "click", next);
    on(pageNextBottom, "click", next);
  }

  function initDateNav() {
    const onChangeTop = () => applyDateChange(dateFromTop?.value || "", dateToTop?.value || "");
    const onChangeBottom = () =>
      applyDateChange(dateFromBottom?.value || "", dateToBottom?.value || "");

    on(dateFromTop, "change", onChangeTop);
    on(dateToTop, "change", onChangeTop);
    on(dateFromBottom, "change", onChangeBottom);
    on(dateToBottom, "change", onChangeBottom);

    on(rangeClearTop, "click", () => applyDateChange("", ""));
    on(rangeClearBottom, "click", () => applyDateChange("", ""));

    on(rangePrevTop, "click", () => moveDateRange(-1));
    on(rangePrevBottom, "click", () => moveDateRange(-1));
    on(rangeNextTop, "click", () => moveDateRange(1));
    on(rangeNextBottom, "click", () => moveDateRange(1));
  }

  function initFab() {
    on(fabTop, "click", () => {
      (pageTop || document.documentElement).scrollIntoView({ behavior: "smooth" });
    });
    on(fabBottom, "click", () => {
      (pageBottom || document.documentElement).scrollIntoView({ behavior: "smooth" });
    });
  }

  // ====== INIT ======
  setTabStyles();
  setPageSizeStyles();

  initTabs();
  initActions();
  initPager();
  initDateNav();
  initDragScroll();
  initLogout();
  initFab();

  cargarDatos();
});
