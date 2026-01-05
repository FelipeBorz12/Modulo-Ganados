// public/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // Helpers (robustos)
  // =========================
  const byId = (id) => document.getElementById(id);

  const on = (el, event, handler, opts) => {
    if (!el) return;
    el.addEventListener(event, handler, opts);
  };

  // =========================
  // ✅ Toast + Clipboard
  // =========================
  let toastTimer = null;

  function ensureToastEl() {
    let el = byId("ganados-toast");
    if (el) return el;

    el = document.createElement("div");
    el.id = "ganados-toast";
    el.className =
      "fixed right-4 bottom-6 z-[9999] hidden max-w-[92vw] md:max-w-md " +
      "rounded-full px-4 py-2 shadow-lg ring-1 ring-inset " +
      "bg-white dark:bg-[#2c2b3b] ring-gray-200 dark:ring-gray-700 " +
      "text-sm font-semibold text-gray-800 dark:text-gray-100 " +
      "flex items-center gap-2";

    const dot = document.createElement("span");
    dot.id = "ganados-toast-dot";
    dot.className = "inline-block size-2 rounded-full bg-emerald-500";
    el.appendChild(dot);

    const msg = document.createElement("span");
    msg.id = "ganados-toast-msg";
    msg.className = "truncate";
    el.appendChild(msg);

    document.body.appendChild(el);
    return el;
  }

  function showToast(message, type = "success") {
    const el = ensureToastEl();
    const msg = byId("ganados-toast-msg");
    const dot = byId("ganados-toast-dot");

    if (msg) msg.textContent = message;

    if (dot) {
      dot.classList.remove("bg-emerald-500", "bg-amber-500", "bg-rose-500");
      if (type === "warn") dot.classList.add("bg-amber-500");
      else if (type === "error") dot.classList.add("bg-rose-500");
      else dot.classList.add("bg-emerald-500");
    }

    el.classList.remove("hidden");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add("hidden");
    }, 1800);
  }

  async function copyToClipboard(text) {
    const value = (text ?? "").toString();
    if (!value) return false;

    // 1) Clipboard API (mejor)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_) {
      // seguimos a fallback
    }

    // 2) Fallback (textarea)
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  // =========================
  // ====== DOM BÁSICO ======
  // =========================
  const tablaHead = byId("tabla-head");
  const tablaBody = byId("tabla-body");
  const tablaWrapper = byId("tabla-wrapper");

  const totalGeneralEl = byId("total-general");
  const totalIngresosEl = byId("total-ingresos");
  const totalSalidasEl = byId("total-salidas");
  const totalValorIngresoEl = byId("total-valor-ingreso");
  const totalValorSalidaEl = byId("total-valor-salida");

  // ✅ Utilidad
  const totalUtilidadEl = byId("total-utilidad");
  const totalUtilidadPctEl = byId("total-utilidad-pct");

  const statPesoIngEl = byId("stat-peso-ing");
  const statPesoSalEl = byId("stat-peso-sal");
  const statPesoGananciaEl = byId("stat-peso-ganancia");
  const statValorIngEl = byId("stat-valor-ing");
  const statValorSalEl = byId("stat-valor-sal");
  const statPrediccionEl = byId("stat-prediccion");

  const btnIngresoTab = byId("btn-ingreso");
  const btnSalidaTab = byId("btn-salida");

  const btnActualizar = byId("btn-actualizar");
  const btnExportarTodo = byId("btn-exportar-todo");
  const btnExportarVista = byId("btn-exportar-vista");

  const selectionInfo = byId("selection-info");
  const selectionInfoMobile = byId("selection-info-mobile");

  // Date range TOP
  const rangePrevTop = byId("range-prev-top");
  const rangeNextTop = byId("range-next-top");
  const rangeClearTop = byId("range-clear-top");
  const dateFromTop = byId("date-from-top");
  const dateToTop = byId("date-to-top");

  // Date range BOTTOM
  const rangePrevBottom = byId("range-prev-bottom");
  const rangeNextBottom = byId("range-next-bottom");
  const rangeClearBottom = byId("range-clear-bottom");
  const dateFromBottom = byId("date-from-bottom");
  const dateToBottom = byId("date-to-bottom");

  // Pager TOP
  const pageInfoTop = byId("page-info-top");
  const pagePrevTop = byId("page-prev-top");
  const pageNextTop = byId("page-next-top");
  const pageSize100Top = byId("page-size-100-top");
  const pageSize200Top = byId("page-size-200-top");
  const pageSize300Top = byId("page-size-300-top");
  const pageSizeAllTop = byId("page-size-all-top");

  // Pager BOTTOM
  const pageInfoBottom = byId("page-info-bottom");
  const pagePrevBottom = byId("page-prev-bottom");
  const pageNextBottom = byId("page-next-bottom");
  const pageSize100Bottom = byId("page-size-100-bottom");
  const pageSize200Bottom = byId("page-size-200-bottom");
  const pageSize300Bottom = byId("page-size-300-bottom");
  const pageSizeAllBottom = byId("page-size-all-bottom");

  // Logout modal
  const btnLogout = byId("btn-logout");
  const logoutModal = byId("logout-modal");
  const logoutCancel = byId("logout-cancel");
  const logoutConfirm = byId("logout-confirm");

  // =========================
  // ====== ESTADO ======
  // =========================
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

  // Fechas (estado interno)
  let dateFrom = "";
  let dateTo = "";

  // =========================
  // ====== CONFIG DE COLUMNAS
  // =========================
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

  // =========================
  // ====== UTILIDADES ======
  // =========================
  function formatMoney(value) {
    const num = Number(value) || 0;
    return num.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
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
    if (!row) return null;

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

    if (key === "ValorKGingreso" || key === "ValorKGsalida" || key === "Flete" || key === "Comision" || key === "Mermas") {
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

  // =========================
  // ====== CABECERA + FILTROS
  // =========================
  function construirHead() {
    if (!tablaHead) return;
    const cols = getColumnConfig();
    tablaHead.innerHTML = "";

    const trHeader = document.createElement("tr");
    trHeader.className = "bg-gray-50 dark:bg-[#252433] text-gray-700 dark:text-gray-200";

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
    tablaHead.querySelectorAll("[data-sort-key]").forEach((b) => {
      on(b, "click", () => manejarOrden(b.dataset.sortKey));
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

  // =========================
  // ====== FECHAS
  // =========================
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

    const span = Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
    const stepDays = span + 1;

    const newFrom = new Date(a.getTime() + direction * stepDays * 86400000);
    const newTo = new Date(b.getTime() + direction * stepDays * 86400000);

    const iso = (d) => d.toISOString().slice(0, 10);
    applyDateChange(iso(newFrom), iso(newTo));
  }

  // =========================
  // ====== PAGINACIÓN
  // =========================
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

  // =========================
  // ====== CARGA DATOS
  // =========================
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

    const totalValorIngreso = ingresosContext.reduce((acc, r) => acc + (rawValue(r, "totalIngreso") || 0), 0);
    const totalValorSalida = salidasContext.reduce((acc, r) => acc + (rawValue(r, "totalSalidaCalc") || 0), 0);

    if (totalGeneralEl) totalGeneralEl.textContent = total;
    if (totalIngresosEl) totalIngresosEl.textContent = totalIngresos;
    if (totalSalidasEl) totalSalidasEl.textContent = totalSalidas;
    if (totalValorIngresoEl) totalValorIngresoEl.textContent = formatMoney(totalValorIngreso);
    if (totalValorSalidaEl) totalValorSalidaEl.textContent = formatMoney(totalValorSalida);

    const totalIngresoDeSalidas = salidasContext.reduce((acc, r) => acc + (rawValue(r, "totalIngreso") || 0), 0);
    const totalUtilidad = salidasContext.reduce((acc, r) => acc + (rawValue(r, "utilidad") || 0), 0);

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

  // =========================
  // ✅ Render con botón copiar junto al Número
  // =========================
  function renderTabla(filas) {
    if (!tablaBody) return;
    const cols = getColumnConfig();
    tablaBody.innerHTML = "";

    filas.forEach((row, idx) => {
      const numero = row.Numero;
      const isSelected = selectedNumeros.has(numero);

      const tr = document.createElement("tr");
      tr.className =
        "bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-[#252433] transition-colors";
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

        // ✅ Si es la columna "Numero", metemos: Numero + botón copiar
        if (col.key === "Numero") {
          const wrap = document.createElement("div");
          wrap.className = "flex items-center gap-2";

          const text = document.createElement("span");
          text.className = "font-extrabold tracking-wide";
          text.textContent = formatCell(col.key, val);

          const btnCopy = document.createElement("button");
          btnCopy.type = "button";
          btnCopy.className =
            "inline-flex items-center justify-center size-7 rounded-full " +
            "bg-white dark:bg-[#2c2b3b] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 " +
            "hover:bg-gray-50 dark:hover:bg-gray-800 transition";
          btnCopy.title = "Copiar número";
          btnCopy.setAttribute("aria-label", "Copiar número");

          // icon (material symbols ya lo tienes en la página)
          btnCopy.innerHTML = `<span class="material-symbols-outlined text-[18px]">content_copy</span>`;

          on(btnCopy, "click", async (e) => {
            e.stopPropagation();
            const ok = await copyToClipboard(numero);
            if (ok) showToast(`Copiado: ${numero}`, "success");
            else showToast("No se pudo copiar (permiso/HTTPS).", "warn");
          });

          wrap.appendChild(text);
          wrap.appendChild(btnCopy);
          td.appendChild(wrap);
        } else {
          td.textContent = formatCell(col.key, val);
        }

        // resaltar utilidad
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
    const headerCb = byId("select-all-checkbox");
    if (!headerCb) return;

    if (vistaFiltradaActual.length === 0) {
      headerCb.checked = false;
      headerCb.indeterminate = false;
      return;
    }

    const seleccionadosEnVista = vistaFiltradaActual.filter((r) => selectedNumeros.has(r.Numero)).length;

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

  // =========================
  // ====== ESTADÍSTICAS ======
  // =========================
  function actualizarEstadisticas(rows) {
    const setDash = () => {
      if (statPesoIngEl) statPesoIngEl.textContent = "-";
      if (statPesoSalEl) statPesoSalEl.textContent = "-";
      if (statPesoGananciaEl) statPesoGananciaEl.textContent = "-";
      if (statValorIngEl) statValorIngEl.textContent = "-";
      if (statValorSalEl) statValorSalEl.textContent = "-";
      if (statPrediccionEl) statPrediccionEl.textContent = "Sin datos suficientes para estimar.";
    };

    if (!rows || rows.length === 0) {
      setDash();
      return;
    }

    if (!statPesoIngEl || !statPesoSalEl || !statPesoGananciaEl || !statValorIngEl || !statValorSalEl || !statPrediccionEl) {
      return;
    }

    const pesosIng = rows.map((r) => Number(r.Peso)).filter((v) => Number.isFinite(v) && v > 0);
    const pesosSal = rows.map((r) => Number(r.PesoSalida)).filter((v) => Number.isFinite(v) && v > 0);
    const valIng = rows.map((r) => Number(r.ValorKGingreso)).filter((v) => Number.isFinite(v) && v > 0);
    const valSal = rows.map((r) => Number(r.ValorKGsalida)).filter((v) => Number.isFinite(v) && v > 0);

    const paresGanancia = rows
      .map((r) => {
        const pi = Number(r.Peso);
        const ps = Number(r.PesoSalida);
        if (Number.isFinite(pi) && Number.isFinite(ps) && ps > 0 && r.FechaSalida) return ps - pi;
        return null;
      })
      .filter((v) => v !== null);

    const prom = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const gPeso = prom(paresGanancia);
    const vIng = prom(valIng);
    const vSal = prom(valSal);

    statPesoIngEl.textContent = pesosIng.length ? `${pIng.toFixed(1)} kg` : "-";
    statPesoSalEl.textContent = pesosSal.length ? `${pSal.toFixed(1)} kg` : "-";
    statPesoGananciaEl.textContent = paresGanancia.length ? `${gPeso.toFixed(1)} kg` : "-";

    statValorIngEl.textContent = valIng.length ? formatMoney(vIng) : "-";
    statValorSalEl.textContent = valSal.length ? formatMoney(vSal) : "-";

    if (paresGanancia.length) {
      statPrediccionEl.textContent = `Si se mantiene la ganancia promedio actual de ${gPeso.toFixed(
        1
      )} kg por animal, los próximos lotes podrían comportarse de forma similar (estimación basada en el histórico actual).`;
    } else {
      statPrediccionEl.textContent =
        "Aún no hay suficientes registros con ingreso y salida para estimar una ganancia promedio de peso.";
    }
  }

  // =========================
  // ====== EXPORTAR ======
  // =========================
  function exportarVistaActual() {
    if (!vistaFiltradaActual.length) {
      alert("No hay datos para exportar.");
      return;
    }

    if (typeof XLSX === "undefined") {
      alert("No se pudo exportar: la librería XLSX no está cargada.");
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

    if (typeof XLSX === "undefined") {
      alert("No se pudo exportar: la librería XLSX no está cargada.");
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

  // =========================
  // ====== DRAG SCROLL (horizontal)
  // =========================
  function initDragScroll() {
    if (!tablaWrapper) return;

    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;

    const shouldIgnoreTarget = (target) => {
      if (!target) return false;
      return !!target.closest("input,button,select,textarea,label,a");
    };

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

  // =========================
  // ====== LOGOUT ======
  // =========================
  function initLogout() {
    if (!btnLogout || !logoutModal || !logoutCancel || !logoutConfirm) return;

    on(btnLogout, "click", () => logoutModal.classList.remove("hidden"));
    on(logoutCancel, "click", () => logoutModal.classList.add("hidden"));
    on(logoutConfirm, "click", () => (window.location.href = "/"));

    on(logoutModal, "click", (e) => {
      if (e.target === logoutModal) logoutModal.classList.add("hidden");
    });
  }

  // =========================
  // ====== INIT LISTENERS
  // =========================
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
    const onChangeBottom = () => applyDateChange(dateFromBottom?.value || "", dateToBottom?.value || "");

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

  // =========================
  // ====== INIT ======
  // =========================
  setTabStyles();
  setPageSizeStyles();

  initTabs();
  initActions();
  initPager();
  initDateNav();
  initDragScroll();
  initLogout();

  cargarDatos();
});
