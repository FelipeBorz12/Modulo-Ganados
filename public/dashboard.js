// public/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // DASHBOARD (HTML + UX)
  // - Loading modal inicial
  // - Predicción: clamp móvil + modal “ver más”
  // - Búsqueda global fluida (debounce)
  // - Filtros por columna con LUPA (se abren/cierra)
  // - Orden select
  // - Tabla: copiar número + borrar + selección
  // - Export: Todo (siempre) + Inteligente (filtros + selección)
  // - ✅ THEAD sticky SIN solapes y con offset correcto según tipo de scroll
  // - ✅ Ajuste automático de top sticky para evitar “espacio en blanco”
  // ==============================

  // ---------- helpers DOM ----------
  const $ = (id) => document.getElementById(id);
  const showEl = (el) => el && el.classList.remove("hidden");
  const hideEl = (el) => el && el.classList.add("hidden");

  // ---------- sticky offset (navbar + tabla) ----------
  const appHeader = $("app-header");
  const tablaHead = $("tabla-head");
  const tablaBody = $("tabla-body");
  const tablaWrapper = $("tabla-wrapper");

  function syncHeaderHeightVar() {
    const h = appHeader ? appHeader.offsetHeight : 72;
    document.documentElement.style.setProperty("--app-header-h", `${h}px`);
  }

  // Determina si la tabla está scrolleando VERTICALMENTE dentro del wrapper.
  // - Si sí: sticky top debe ser 0 (dentro del wrapper).
  // - Si no: sticky top debe ser la altura del header (scroll del page).
  function syncTableStickyTopVar() {
    const headerH = appHeader ? appHeader.offsetHeight : 72;

    let topPx = headerH;

    if (tablaWrapper) {
      const cs = getComputedStyle(tablaWrapper);
      const overflowY = cs.overflowY;

      const wrapperCanScrollY =
        overflowY !== "visible" &&
        overflowY !== "clip" &&
        (tablaWrapper.scrollHeight - tablaWrapper.clientHeight > 2);

      // Si el wrapper tiene scroll vertical real, sticky se pega al top del wrapper
      if (wrapperCanScrollY) topPx = 0;
    }

    document.documentElement.style.setProperty("--table-sticky-top", `${topPx}px`);
  }

  function syncTheadHeights() {
    const headRow = tablaHead?.querySelector("tr.head-row");
    const filterRow = tablaHead?.querySelector("tr.filter-row");

    if (headRow) {
      const h1 = Math.ceil(headRow.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--thead-row1-h", `${h1}px`);
    }
    if (filterRow) {
      const h2 = Math.ceil(filterRow.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--thead-row2-h", `${h2}px`);
    }
  }

  function syncAllStickyVars() {
    syncHeaderHeightVar();
    syncTableStickyTopVar();
    syncTheadHeights();
  }

  syncAllStickyVars();

  let headerResizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(headerResizeTimer);
    headerResizeTimer = setTimeout(() => {
      syncAllStickyVars();
    }, 80);
  });

  // ---------- Toast ----------
  const toast = $("toast");
  const toastText = $("toast-text");
  const toastBox = $("toast-box");

  // ---------- Loading ----------
  const loadingModal = $("loading-modal");

  // ---------- Tabs ----------
  const btnIngreso = $("btn-ingreso");
  const btnSalida = $("btn-salida");

  // ---------- Botones ----------
  const btnActualizar = $("btn-actualizar");
  const btnExportarTodo = $("btn-exportar-todo");
  const btnExportarVista = $("btn-exportar-vista");

  // ---------- Info selección ----------
  const selectionInfo = $("selection-info");
  const selectionInfoMobile = $("selection-info-mobile");

  // ---------- Totales (cards) ----------
  const elTotalGeneral = $("total-general");
  const elTotalIngresos = $("total-ingresos");
  const elTotalSalidas = $("total-salidas");

  // Totales dinero
  const elTotalCompraIngresos = $("total-valor-compra-ingresos");
  const elTotalCompraSalidas = $("total-valor-compra-salidas");
  const elTotalVentaSalidas = $("total-valor-venta-salidas");

  const elTotalUtilidad = $("total-utilidad");
  const elTotalUtilidadPct = $("total-utilidad-pct");

  // ---------- Stats cards ----------
  const elStatPesoIng = $("stat-peso-ing");
  const elStatPesoSal = $("stat-peso-sal");
  const elStatPesoGan = $("stat-peso-ganancia");
  const elStatValorIng = $("stat-valor-ing");
  const elStatValorSal = $("stat-valor-sal");

  const elStatDiasProm = $("stat-dias-prom");
  const elStatUtilProm = $("stat-utilidad-prom");
  const elStatUtilDia = $("stat-utilidad-dia");
  const elStatKgDia = $("stat-kg-dia");

  // ---------- Predicción panel ----------
  const elStatPred = $("stat-prediccion");
  const predPanel = $("pred-panel");
  const predToggleBtn = $("pred-toggle-btn");
  const predStaleBar = $("pred-stale-bar");
  const predRecalcBtn = $("pred-recalc-btn");
  const predMoreBtn = $("pred-more-btn");
  const predFade = $("pred-fade");

  // ---------- Pred modal ----------
  const predModal = $("pred-modal");
  const predModalContent = $("pred-modal-content");
  const predModalCloseX = $("pred-modal-close-x");
  const predModalAccept = $("pred-modal-accept");

  // ---------- Search + sort ----------
  const searchQ = $("search-q");
  const searchClear = $("search-clear");
  const sortBy = $("sort-by");

  // ---------- Date range (top) ----------
  const dateFromTop = $("date-from-top");
  const dateToTop = $("date-to-top");
  const rangePrevTop = $("range-prev-top");
  const rangeNextTop = $("range-next-top");
  const rangeClearTop = $("range-clear-top");

  // ---------- Date range (bottom) ----------
  const dateFromBottom = $("date-from-bottom");
  const dateToBottom = $("date-to-bottom");
  const rangePrevBottom = $("range-prev-bottom");
  const rangeNextBottom = $("range-next-bottom");
  const rangeClearBottom = $("range-clear-bottom");

  // ---------- Pager (top) ----------
  const pageInfoTop = $("page-info-top");
  const pagePrevTop = $("page-prev-top");
  const pageNextTop = $("page-next-top");
  const pageSize100Top = $("page-size-100-top");
  const pageSize200Top = $("page-size-200-top");
  const pageSize300Top = $("page-size-300-top");
  const pageSizeAllTop = $("page-size-all-top");

  // ---------- Pager (bottom) ----------
  const pageInfoBottom = $("page-info-bottom");
  const pagePrevBottom = $("page-prev-bottom");
  const pageNextBottom = $("page-next-bottom");
  const pageSize100Bottom = $("page-size-100-bottom");
  const pageSize200Bottom = $("page-size-200-bottom");
  const pageSize300Bottom = $("page-size-300-bottom");
  const pageSizeAllBottom = $("page-size-all-bottom");

  // ---------- Floating buttons ----------
  const fabTop = $("fab-top");
  const fabBottom = $("fab-bottom");

  // ---------- Logout ----------
  const btnLogout = $("btn-logout");
  const logoutModal = $("logout-modal");
  const logoutCancel = $("logout-cancel");
  const logoutConfirm = $("logout-confirm");

  // ---------- Delete modal ----------
  const deleteModal = $("delete-modal");
  const deleteCancel = $("delete-cancel");
  const deleteConfirm = $("delete-confirm");
  const deleteModalSub = $("delete-modal-sub");

  // ---------- estado ----------
  let allRows = [];
  let viewMode = "ingreso"; // "ingreso" | "salida"

  let page = 1;
  let pageSize = 100; // 100|200|300|Infinity

  // Selección (por id si existe; si no, por Numero)
  const selectedKeys = new Set();

  // Filtros por columna
  const columnFilters = { ingreso: {}, salida: {} };
  const columnFilterUIOpen = { ingreso: {}, salida: {} };

  const colFilterTimers = new Map();
  let pendingColFocus = null;

  // Search debounce
  let searchTimer = null;
  let searchValue = "";

  // Pred html (full)
  let predFullHTML = "-";

  // Predicciones: NO calcular hasta click
  let predExpanded = false;
  let predLoading = false;
  let predComputedHash = null;
  let lastBaseHash = null;

  // Delete state
  let pendingDeleteNumero = null;

  // ---------- formatos ----------
  const msDay = 24 * 60 * 60 * 1000;

  const fmtMoney = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  };

  const fmtNum = (n, digits = 1) => {
    const v = Number(n);
    return Number.isFinite(v) ? v.toFixed(digits) : "-";
  };

  const parseISODate = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const fmtDate = (d) =>
    new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const diffDays = (startISO, endISO) => {
    const a = parseISODate(startISO);
    const b = parseISODate(endISO);
    if (!a || !b) return null;
    const aa = new Date(a);
    aa.setHours(0, 0, 0, 0);
    const bb = new Date(b);
    bb.setHours(0, 0, 0, 0);
    return Math.round((bb.getTime() - aa.getTime()) / msDay);
  };

  const normSexo = (s) => {
    const v = (s ?? "").toString().trim().toUpperCase();
    if (!v) return "N/A";
    if (v.startsWith("M")) return "MACHO";
    if (v.startsWith("H")) return "HEMBRA";
    return "OTRO";
  };

  const rowKey = (r) => {
    if (r && r.id !== undefined && r.id !== null) return `id:${r.id}`;
    return `num:${r?.Numero ?? ""}`;
  };

  const hasSalida = (r) => {
    const ps = Number(r?.PesoSalida) || 0;
    return !!(r?.FechaSalida && ps > 0);
  };

  const safeText = (v) => (v === null || v === undefined ? "" : String(v));
  const nw = (s) => `<span class="kpi-number">${s}</span>`;

  // ---------- API ----------
  async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    if (res.status === 401) {
      window.location.href = "/";
      throw new Error("NO_SESSION");
    }
    return res;
  }

  async function doLogout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch (_) {}
    window.location.href = "/";
  }

  async function deleteByNumero(numero) {
    const res = await apiFetch(`/api/historicoiys/${encodeURIComponent(numero)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "No se pudo eliminar");
    }
  }

  // ---------- filtros ----------
  function getDateRangeFromInputs() {
    const fromVal = (dateFromTop?.value || "").trim();
    const toVal = (dateToTop?.value || "").trim();

    const from = fromVal ? new Date(fromVal + "T00:00:00") : null;
    const to = toVal ? new Date(toVal + "T23:59:59.999") : null;

    if (from && isNaN(from.getTime())) return { from: null, to: null };
    if (to && isNaN(to.getTime())) return { from: null, to: null };

    return { from, to };
  }

  function applyFiltersBase(rows) {
    let out = Array.isArray(rows) ? [...rows] : [];

    // rango de fechas (por FechaIngreso)
    const { from, to } = getDateRangeFromInputs();
    if (from || to) {
      out = out.filter((r) => {
        const d = parseISODate(r.FechaIngreso);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // búsqueda global (fluida)
    const q = (searchValue || "").trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        const fields = [
          r.Numero,
          r.FincaIndicativo,
          r.FincaNombre,
          r.Finca,
          r.Sexo,
          r.Edad,
          r.Marcallegada,
          r.Destino,
          r.Raza,
          r.Color,
          r.Proveedor,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(q);
      });
    }

    return out;
  }

  function applyViewMode(rows) {
    if (viewMode === "salida") return rows.filter(hasSalida);
    return rows;
  }

  function applySort(rows) {
    const key = sortBy?.value || "fecha_ing_desc";

    const getTime = (iso) => {
      const d = parseISODate(iso);
      return d ? d.getTime() : 0;
    };

    const copy = [...rows];

    copy.sort((a, b) => {
      if (key === "fecha_ing_desc") return getTime(b.FechaIngreso) - getTime(a.FechaIngreso);
      if (key === "fecha_ing_asc") return getTime(a.FechaIngreso) - getTime(b.FechaIngreso);

      if (key === "peso_desc") return (Number(b.Peso) || 0) - (Number(a.Peso) || 0);
      if (key === "peso_asc") return (Number(a.Peso) || 0) - (Number(b.Peso) || 0);

      if (key === "utilidad_desc") return (Number(b.utilidad) || 0) - (Number(a.utilidad) || 0);
      if (key === "utilidad_asc") return (Number(a.utilidad) || 0) - (Number(b.utilidad) || 0);

      if (key === "dias_desc") return (Number(b.dias) || 0) - (Number(a.dias) || 0);
      if (key === "dias_asc") return (Number(a.dias) || 0) - (Number(b.dias) || 0);

      return 0;
    });

    return copy;
  }

  // ---------- filtros por columna ----------
  function getCellValueForColumnFilter(r, key) {
    if (!r) return "";

    if (key === "Finca") {
      return safeText(r.FincaIndicativo ?? r.FincaNombre ?? r.Finca ?? "");
    }

    if (key === "FechaIngreso" || key === "FechaSalida") {
      const iso = safeText(r[key]);
      const d = parseISODate(r[key]);
      return d ? `${iso} ${fmtDate(d)}` : iso;
    }

    const numericKeys = new Set([
      "Peso",
      "_pesoIng",
      "_pesoSal",
      "gananciaKg",
      "dias",
      "ValorKGingreso",
      "_vIng",
      "_vSal",
      "totalIngreso",
      "totalSalida",
      "Flete",
      "Comision",
      "Mermas",
      "costos",
      "utilidad",
    ]);

    if (numericKeys.has(key)) {
      const n = Number(r[key]);
      return Number.isFinite(n) ? String(n) : "";
    }

    return safeText(r[key]);
  }

  function applyColumnFilters(rows, mode) {
    const filters = columnFilters[mode] || {};
    const activeKeys = Object.keys(filters).filter((k) => (filters[k] ?? "").toString().trim() !== "");
    if (!activeKeys.length) return rows;

    const normalized = {};
    activeKeys.forEach((k) => {
      normalized[k] = filters[k].toString().trim().toLowerCase();
    });

    return rows.filter((r) => {
      for (const k of activeKeys) {
        const q = normalized[k];
        const v = getCellValueForColumnFilter(r, k).toLowerCase();
        if (!v.includes(q)) return false;
      }
      return true;
    });
  }

  function restoreColumnFilterFocus() {
    if (!pendingColFocus) return;
    const el = document.getElementById(pendingColFocus.id);
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(pendingColFocus.pos, pendingColFocus.pos);
    } catch (_) {}
  }

  // ---------- cálculos negocio ----------
  function enrichRow(r) {
    const pesoIng = Number(r?.Peso) || 0;
    const pesoSal = Number(r?.PesoSalida) || 0;

    const vIng = Number(r?.ValorKGingreso) || 0;
    const vSal = Number(r?.ValorKGsalida) || 0;

    const totalIngreso = pesoIng * vIng;
    const totalSalida = pesoSal * vSal;

    const flete = Number(r?.Flete) || 0;
    const comision = Number(r?.Comision) || 0;
    const mermas = Number(r?.Mermas) || 0;

    const costos = flete + comision + mermas;
    const utilidad = totalSalida - (totalIngreso + costos);

    const dias = hasSalida(r) ? diffDays(r.FechaIngreso, r.FechaSalida) : null;
    const gananciaKg = hasSalida(r) ? pesoSal - pesoIng : null;

    return {
      ...r,
      _pesoIng: pesoIng,
      _pesoSal: pesoSal,
      _vIng: vIng,
      _vSal: vSal,
      totalIngreso,
      totalSalida,
      costos,
      utilidad,
      dias,
      gananciaKg,
    };
  }

  // ---------- predicción ----------
  function isMobile() {
    return !window.matchMedia("(min-width: 768px)").matches;
  }

  function applyPredView() {
    if (!elStatPred) return;

    elStatPred.innerHTML = predFullHTML || "-";

    if (isMobile() && predExpanded && predFullHTML && predFullHTML !== "-") {
      elStatPred.classList.add("clamp-3");
      showEl(predMoreBtn);
      if (predFade) {
        showEl(predFade);
        predFade.classList.remove("hidden");
      }
    } else {
      elStatPred.classList.remove("clamp-3");
      hideEl(predMoreBtn);
      if (predFade) predFade.classList.add("hidden");
    }
  }

  function openPredModal() {
    if (!predModal || !predModalContent) return;
    predModalContent.innerHTML = predFullHTML || "-";
    showEl(predModal);
  }

  function closePredModal() {
    hideEl(predModal);
  }

  function getBaseHash(baseRows) {
    const df = (dateFromTop?.value || "").trim();
    const dt = (dateToTop?.value || "").trim();
    const q = (searchValue || "").trim();
    const total = baseRows.length;
    const sal = baseRows.filter(hasSalida).length;
    return `${df}|${dt}|${q}|${total}|${sal}`;
  }

  function setPredButtonsLoading(isLoading, which = "toggle") {
    predLoading = !!isLoading;

    const btn =
      which === "recalc" ? predRecalcBtn : which === "toggle" ? predToggleBtn : null;

    if (!btn) return;

    btn.disabled = predLoading;

    if (which === "toggle") {
      if (predExpanded) {
        if (predLoading) {
          btn.innerHTML = `
            <span class="material-symbols-outlined spin text-[18px]">progress_activity</span>
            Cargando…
          `;
        } else {
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">expand_less</span>
            Ocultar
          `;
        }
      } else {
        if (predLoading) {
          btn.innerHTML = `
            <span class="material-symbols-outlined spin text-[18px]">progress_activity</span>
            Cargando…
          `;
        } else {
          btn.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">expand_more</span>
            Ver predicciones
          `;
        }
      }
    }

    if (which === "recalc") {
      if (predLoading) {
        btn.innerHTML = `
          <span class="material-symbols-outlined spin text-[18px]">progress_activity</span>
          Recalculando…
        `;
      } else {
        btn.innerHTML = `
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          Recalcular
        `;
      }
    }
  }

  function buildPredictionHTML(baseRows) {
    const salidas = baseRows.filter(hasSalida);

    const prom = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

    const dias = salidas.map((r) => r.dias).filter((v) => Number.isFinite(v) && v >= 0);
    const utils = salidas.map((r) => r.utilidad).filter((v) => Number.isFinite(v));
    const ingresos = salidas
      .map((r) => r.totalIngreso)
      .filter((v) => Number.isFinite(v) && v > 0);
    const ganKg = salidas.map((r) => r.gananciaKg).filter((v) => Number.isFinite(v));

    const d = prom(dias);
    const u = prom(utils);
    const ing = prom(ingresos);
    const g = prom(ganKg);

    const margenPct = ing && ing > 0 && u !== null ? (u / ing) * 100 : null;
    const uDia = d && d > 0 && u !== null ? u / d : null;
    const kgDia = d && d > 0 && g !== null ? g / d : null;

    const sexCounts = baseRows.reduce(
      (acc, r) => {
        const k = normSexo(r.Sexo);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      { MACHO: 0, HEMBRA: 0, OTRO: 0, "N/A": 0 },
    );

    function bestBucket(rows, step = 25) {
      const buckets = new Map();

      for (const r of rows) {
        if (!hasSalida(r)) continue;

        const w = Number(r._pesoIng);
        const dd = Number(r.dias);
        const uu = Number(r.utilidad);
        const ti = Number(r.totalIngreso);

        if (!Number.isFinite(w) || w <= 0) continue;
        if (!Number.isFinite(dd) || dd <= 0) continue;
        if (!Number.isFinite(uu)) continue;

        const start = Math.floor(w / step) * step;
        const key = `${start}-${start + step}`;

        const b = buckets.get(key) || {
          key,
          start,
          end: start + step,
          n: 0,
          sumU: 0,
          sumD: 0,
          sumIng: 0,
        };

        b.n += 1;
        b.sumU += uu;
        b.sumD += dd;
        b.sumIng += Number.isFinite(ti) ? ti : 0;

        buckets.set(key, b);
      }

      const stats = Array.from(buckets.values())
        .map((b) => {
          const avgU = b.sumU / b.n;
          const avgD = b.sumD / b.n;
          const avgUDia = avgD > 0 ? avgU / avgD : 0;
          const avgIng = b.sumIng / b.n;
          const avgMarg = avgIng > 0 ? (avgU / avgIng) * 100 : 0;
          return { ...b, avgU, avgD, avgUDia, avgMarg };
        })
        .filter((b) => b.n >= 3);

      if (!stats.length) return null;

      const bestPorDia = [...stats].sort((a, b) => b.avgUDia - a.avgUDia)[0];
      const bestTotal = [...stats].sort((a, b) => b.avgU - a.avgU)[0];

      return { step, bestPorDia, bestTotal };
    }

    const sugGlobal = bestBucket(baseRows, 25);
    const bySexo = (sx) => baseRows.filter((r) => normSexo(r.Sexo) === sx);
    const sugM = bestBucket(bySexo("MACHO"), 25);
    const sugH = bestBucket(bySexo("HEMBRA"), 25);

    const parts = [];

    parts.push(`<strong>Resumen (según tu filtro actual)</strong>`);
    parts.push(
      `• Registros filtrados: <strong>${nw(baseRows.length.toLocaleString("es-CO"))}</strong>`,
    );
    parts.push(
      `• Salidas en el filtro: <strong>${nw(salidas.length.toLocaleString("es-CO"))}</strong>`,
    );

    parts.push(
      `• Sexo: Machos <strong>${nw(sexCounts.MACHO.toLocaleString("es-CO"))}</strong>, Hembras <strong>${nw(
        sexCounts.HEMBRA.toLocaleString("es-CO"),
      )}</strong>` +
        (sexCounts["N/A"] ? `, Sin dato ${nw(sexCounts["N/A"].toLocaleString("es-CO"))}` : "") +
        (sexCounts.OTRO ? `, Otros ${nw(sexCounts.OTRO.toLocaleString("es-CO"))}` : ""),
    );

    if (!salidas.length) {
      parts.push(
        `<br><span class="text-amber-600 dark:text-amber-300"><strong>Ojo:</strong> Dentro del filtro no hay salidas, por eso no se puede medir utilidad/días.</span>`,
      );
      return parts.join("<br>");
    }

    if (d !== null)
      parts.push(
        `• Días promedio en finca (salidas): <strong>${nw(d.toFixed(1) + " días")}</strong>`,
      );

    if (u !== null) {
      parts.push(
        `• Utilidad promedio por animal: <strong>${nw(fmtMoney(u))}</strong>` +
          (margenPct === null ? "" : ` (<strong>${nw(margenPct.toFixed(2) + "%")}</strong>)`),
      );
    }

    if (uDia !== null)
      parts.push(`• Utilidad promedio por día: <strong>${nw(fmtMoney(uDia))}</strong>`);

    if (g !== null) {
      parts.push(
        `• Ganancia de peso promedio: <strong>${nw(g.toFixed(1) + " kg")}</strong>` +
          (kgDia === null ? "" : ` (~<strong>${nw(kgDia.toFixed(2) + " kg/día")}</strong>)`),
      );
    }

    if (sugGlobal?.bestPorDia) {
      const b = sugGlobal.bestPorDia;
      const c = sugGlobal.bestTotal;

      parts.push(`<br><strong>Sugerencia de peso de ingreso</strong> (basada en tu histórico, NO es garantía):`);
      parts.push(
        `• Para <strong>maximizar utilidad por día</strong>: ingresar animales en <strong>${nw(
          `${b.start}-${b.end} kg`,
        )}</strong> fue tu mejor rango (n=${nw(String(b.n))}). ` +
          `Prom: <strong>${nw(fmtMoney(b.avgU))}</strong> en <strong>${nw(b.avgD.toFixed(1) + " días")}</strong> (= ${nw(
            fmtMoney(b.avgUDia) + "/día",
          )}).`,
      );

      if (c && c.key !== b.key) {
        parts.push(
          `• Para <strong>maximizar utilidad total</strong>: el rango <strong>${nw(
            `${c.start}-${c.end} kg`,
          )}</strong> fue el mejor (n=${nw(String(c.n))}). ` +
            `Prom: <strong>${nw(fmtMoney(c.avgU))}</strong> por animal (margen ~${nw(c.avgMarg.toFixed(2) + "%")}).`,
        );
      }
    } else {
      parts.push(
        `<br><strong>Sugerencia de peso:</strong> todavía no hay suficientes salidas “completas” (peso/días/utilidad) para recomendar un rango con confianza (mínimo 3 casos por rango).`,
      );
    }

    const sexoSugLines = [];
    if (sugM?.bestPorDia) {
      const bb = sugM.bestPorDia;
      sexoSugLines.push(
        `• <strong>Machos</strong>: mejor por día <strong>${nw(`${bb.start}-${bb.end} kg`)}</strong> (n=${nw(
          String(bb.n),
        )}).`,
      );
    }
    if (sugH?.bestPorDia) {
      const bb = sugH.bestPorDia;
      sexoSugLines.push(
        `• <strong>Hembras</strong>: mejor por día <strong>${nw(`${bb.start}-${bb.end} kg`)}</strong> (n=${nw(
          String(bb.n),
        )}).`,
      );
    }
    if (sexoSugLines.length) {
      parts.push(`<br><strong>Rangos por sexo</strong> (si tus datos alcanzan):<br>${sexoSugLines.join("<br>")}`);
    }

    return parts.join("<br>");
  }

  async function computePredictionOnDemand(baseRows) {
    if (!elStatPred) return;
    if (predLoading) return;

    try {
      setPredButtonsLoading(true, "toggle");
      setPredButtonsLoading(true, "recalc");

      await new Promise((r) => setTimeout(r, 40));

      predFullHTML = buildPredictionHTML(baseRows);
      predComputedHash = getBaseHash(baseRows);

      applyPredView();
      hideEl(predStaleBar);
    } finally {
      setPredButtonsLoading(false, "toggle");
      setPredButtonsLoading(false, "recalc");
      predLoading = false;
    }
  }

  function updatePredUIState(baseRows) {
    if (!predPanel || !predToggleBtn || !elStatPred) return;

    lastBaseHash = getBaseHash(baseRows);

    if (!predExpanded) {
      hideEl(predPanel);
      predToggleBtn.setAttribute("aria-expanded", "false");
      setPredButtonsLoading(false, "toggle");
      hideEl(predStaleBar);
      hideEl(predMoreBtn);
      if (predFade) predFade.classList.add("hidden");
      return;
    }

    showEl(predPanel);
    predToggleBtn.setAttribute("aria-expanded", "true");
    setPredButtonsLoading(false, "toggle");

    const stale = !predComputedHash || predComputedHash !== lastBaseHash;

    if (stale) {
      showEl(predStaleBar);
      if (!predComputedHash) {
        elStatPred.innerHTML = `<span class="text-gray-500 dark:text-gray-400">Pulsa <strong>“Recalcular”</strong> para generar la predicción.</span>`;
      }
    } else {
      hideEl(predStaleBar);
    }

    applyPredView();
  }

  // ---------- render ----------
  function setActiveTabUI() {
    const on = "bg-white dark:bg-[#1a1926] text-primary shadow-sm";
    const off = "text-gray-600 dark:text-gray-200/80";

    [btnIngreso, btnSalida].forEach((b) => {
      if (!b) return;
      b.classList.remove(
        "bg-white",
        "dark:bg-[#1a1926]",
        "text-primary",
        "shadow-sm",
        "text-gray-600",
        "dark:text-gray-200/80",
      );
    });

    if (btnIngreso) {
      if (viewMode === "ingreso") btnIngreso.className = btnIngreso.className + " " + on;
      else btnIngreso.className = btnIngreso.className + " " + off;
    }

    if (btnSalida) {
      if (viewMode === "salida") btnSalida.className = btnSalida.className + " " + on;
      else btnSalida.className = btnSalida.className + " " + off;
    }
  }

  function render() {
    setActiveTabUI();

    const base = applyFiltersBase(allRows).map(enrichRow);

    renderTotales(base);
    renderStats(base);

    updatePredUIState(base);

    const view = applyViewMode(base);
    const colFiltered = applyColumnFilters(view, viewMode);
    const sortedView = applySort(colFiltered);

    const size = pageSize === Infinity ? sortedView.length : pageSize;
    const maxPage = Math.max(1, Math.ceil(sortedView.length / Math.max(1, size)));
    if (page > maxPage) page = maxPage;

    const startIdx = (page - 1) * size;
    const pageRows = sortedView.slice(startIdx, startIdx + size);

    renderPager(sortedView.length, pageRows.length, startIdx);
    renderTable(pageRows, viewMode);
    updateSelectionInfo(sortedView);

    restoreColumnFilterFocus();
  }

  function renderTotales(baseRows) {
    const totalContexto = allRows.length;
    const totalSalidas = baseRows.filter(hasSalida).length;

    const ingresosRows = baseRows.filter((r) => !hasSalida(r));
    const totalIngresos = ingresosRows.length;

    const sumCompraIngresos = ingresosRows.reduce((a, r) => a + (Number(r.totalIngreso) || 0), 0);

    const salidas = baseRows.filter(hasSalida);

    const sumCompraSalidas = salidas.reduce((a, r) => a + (Number(r.totalIngreso) || 0), 0);
    const sumVentaSalidas = salidas.reduce((a, r) => a + (Number(r.totalSalida) || 0), 0);
    const sumUtil = salidas.reduce((a, r) => a + (Number(r.utilidad) || 0), 0);
    const margen = sumCompraSalidas > 0 ? (sumUtil / sumCompraSalidas) * 100 : null;

    if (elTotalGeneral) elTotalGeneral.textContent = totalContexto.toLocaleString("es-CO");
    if (elTotalIngresos) elTotalIngresos.textContent = totalIngresos.toLocaleString("es-CO");
    if (elTotalSalidas) elTotalSalidas.textContent = totalSalidas.toLocaleString("es-CO");

    if (elTotalCompraIngresos) elTotalCompraIngresos.textContent = fmtMoney(sumCompraIngresos);
    if (elTotalCompraSalidas) elTotalCompraSalidas.textContent = fmtMoney(sumCompraSalidas);
    if (elTotalVentaSalidas) elTotalVentaSalidas.textContent = fmtMoney(sumVentaSalidas);

    if (elTotalUtilidad) elTotalUtilidad.textContent = fmtMoney(sumUtil);
    if (elTotalUtilidadPct) elTotalUtilidadPct.textContent = margen === null ? "-" : `${margen.toFixed(2)}%`;
  }

  function renderStats(baseRows) {
    const salidas = baseRows.filter(hasSalida);

    const prom = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

    const pesosIng = salidas.map((r) => r._pesoIng).filter((v) => Number.isFinite(v) && v > 0);
    const pesosSal = salidas.map((r) => r._pesoSal).filter((v) => Number.isFinite(v) && v > 0);
    const ganKg = salidas.map((r) => r.gananciaKg).filter((v) => Number.isFinite(v));
    const vIng = salidas.map((r) => r._vIng).filter((v) => Number.isFinite(v) && v > 0);
    const vSal = salidas.map((r) => r._vSal).filter((v) => Number.isFinite(v) && v > 0);

    const dias = salidas.map((r) => r.dias).filter((v) => Number.isFinite(v) && v >= 0);
    const utils = salidas.map((r) => r.utilidad).filter((v) => Number.isFinite(v));

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const g = prom(ganKg);
    const vI = prom(vIng);
    const vS = prom(vSal);

    const d = prom(dias);
    const u = prom(utils);

    const uDia = d && d > 0 && u !== null ? u / d : null;
    const kgDia = d && d > 0 && g !== null ? g / d : null;

    if (elStatPesoIng) elStatPesoIng.textContent = pIng === null ? "-" : `${pIng.toFixed(1)} kg`;
    if (elStatPesoSal) elStatPesoSal.textContent = pSal === null ? "-" : `${pSal.toFixed(1)} kg`;
    if (elStatPesoGan) elStatPesoGan.textContent = g === null ? "-" : `${g.toFixed(1)} kg`;

    if (elStatDiasProm) elStatDiasProm.textContent = d === null ? "-" : `${d.toFixed(0)} días`;

    if (elStatValorIng) elStatValorIng.textContent = vI === null ? "-" : fmtMoney(vI);
    if (elStatValorSal) elStatValorSal.textContent = vS === null ? "-" : fmtMoney(vS);

    if (elStatUtilProm) {
      if (u === null) elStatUtilProm.textContent = "-";
      else {
        const n = Number(u);
        elStatUtilProm.innerHTML = `<span class="${n >= 0 ? "text-emerald-600" : "text-rose-500"}">${fmtMoney(n)}</span>`;
      }
    }

    if (elStatUtilDia) {
      if (uDia === null) elStatUtilDia.textContent = "-";
      else {
        const n = Number(uDia);
        elStatUtilDia.innerHTML = `<span class="${n >= 0 ? "text-emerald-600" : "text-rose-500"}">${fmtMoney(n)}</span>`;
      }
    }

    if (elStatKgDia) elStatKgDia.textContent = kgDia === null ? "-" : `${Number(kgDia).toFixed(2)} kg/día`;
  }

  function renderPager(total, pageCount, startIdx) {
    const start = total ? startIdx + 1 : 0;
    const end = total ? startIdx + pageCount : 0;
    const txt = `Mostrando ${start.toLocaleString("es-CO")}–${end.toLocaleString("es-CO")} de ${total.toLocaleString(
      "es-CO",
    )}`;

    if (pageInfoTop) pageInfoTop.textContent = txt;
    if (pageInfoBottom) pageInfoBottom.textContent = txt;

    const maxPage = Math.max(1, Math.ceil(total / (pageSize === Infinity ? total || 1 : pageSize)));

    const disablePrev = page <= 1 || pageSize === Infinity;
    const disableNext = page >= maxPage || pageSize === Infinity;

    if (pagePrevTop) pagePrevTop.disabled = disablePrev;
    if (pagePrevBottom) pagePrevBottom.disabled = disablePrev;
    if (pageNextTop) pageNextTop.disabled = disableNext;
    if (pageNextBottom) pageNextBottom.disabled = disableNext;
  }

  function updateSelectionInfo(viewRowsAll) {
    const selectedInView = viewRowsAll.filter((r) => selectedKeys.has(rowKey(r))).length;
    const msg = selectedKeys.size
      ? `Seleccionados: ${selectedKeys.size.toLocaleString("es-CO")} (en esta vista: ${selectedInView.toLocaleString(
          "es-CO",
        )}).`
      : "Totales basados en todos los registros filtrados.";

    if (selectionInfo) selectionInfo.textContent = msg;
    if (selectionInfoMobile) selectionInfoMobile.textContent = msg;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
      ta.remove();
      return ok;
    }
  }

  let toastTimer = null;
  function showToast(message, variant = "success") {
    if (!toast || !toastText || !toastBox) return;

    toastText.textContent = message;

    toastBox.classList.remove("bg-black/80", "bg-emerald-600/90", "bg-rose-600/90");
    if (variant === "success") toastBox.classList.add("bg-emerald-600/90");
    else if (variant === "error") toastBox.classList.add("bg-rose-600/90");
    else toastBox.classList.add("bg-black/80");

    showEl(toast);

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hideEl(toast), 1600);
  }

  function openDeleteModal(numero) {
    pendingDeleteNumero = numero;

    if (deleteModalSub) {
      deleteModalSub.innerHTML =
        `Vas a eliminar el registro del animal <strong class="kpi-number">${numero}</strong>. ` +
        `Esta acción <strong>no se puede deshacer</strong>.`;
    }

    showEl(deleteModal);
  }

  function closeDeleteModal() {
    pendingDeleteNumero = null;
    hideEl(deleteModal);
  }

  // ==============================
  // Tabla + Header sticky + LUPA por columna
  // ==============================
  function renderTable(rows, mode) {
    if (!tablaHead || !tablaBody) return;

    const colsIngreso = [
      { key: "_select", label: "" },
      { key: "Numero", label: "Número" },
      { key: "Finca", label: "Finca" },
      { key: "Sexo", label: "Sexo" },
      { key: "FechaIngreso", label: "Ingreso" },
      { key: "Peso", label: "Peso (kg)" },
      { key: "Raza", label: "Raza" },
      { key: "Color", label: "Color" },
      { key: "Edad", label: "Edad" },
      { key: "Marcallegada", label: "Marca" },
      { key: "Proveedor", label: "Proveedor" },
      { key: "ValorKGingreso", label: "$/kg compra" },
      { key: "totalIngreso", label: "Total compra" },
      { key: "_actions", label: "" },
    ];

    const colsSalida = [
      { key: "_select", label: "" },
      { key: "Numero", label: "Número" },
      { key: "Finca", label: "Finca" },
      { key: "Sexo", label: "Sexo" },
      { key: "FechaIngreso", label: "Ingreso" },
      { key: "FechaSalida", label: "Salida" },
      { key: "dias", label: "Días" },
      { key: "_pesoIng", label: "Peso Ing" },
      { key: "_pesoSal", label: "Peso Sal" },
      { key: "gananciaKg", label: "Ganancia" },
      { key: "_vIng", label: "$/kg compra" },
      { key: "_vSal", label: "$/kg venta" },
      { key: "totalIngreso", label: "Total compra" },
      { key: "totalSalida", label: "Total venta" },
      { key: "Flete", label: "Flete" },
      { key: "Comision", label: "Comisión" },
      { key: "Mermas", label: "Mermas" },
      { key: "costos", label: "Costos" },
      { key: "utilidad", label: "Utilidad" },
      { key: "Destino", label: "Destino" },
      { key: "Raza", label: "Raza" },
      { key: "Color", label: "Color" },
      { key: "Edad", label: "Edad" },
      { key: "Marcallegada", label: "Marca" },
      { key: "Proveedor", label: "Proveedor" },
      { key: "_actions", label: "" },
    ];

    const cols = mode === "salida" ? colsSalida : colsIngreso;

    tablaHead.innerHTML = "";

    // ---- fila 1: títulos (sticky) ----
    const theadRow = document.createElement("tr");
    theadRow.className = "head-row";

    // select-all
    const thSelect = document.createElement("th");
    thSelect.className =
      "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-300";

    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.className = "rounded border-gray-300 dark:border-gray-600";

    const pageKeys = rows.map((r) => rowKey(r));
    const selectedCount = pageKeys.filter((k) => selectedKeys.has(k)).length;
    selectAll.checked = rows.length > 0 && selectedCount === rows.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < rows.length;

    selectAll.addEventListener("change", (e) => {
      if (e.target.checked) pageKeys.forEach((k) => selectedKeys.add(k));
      else pageKeys.forEach((k) => selectedKeys.delete(k));
      render();
    });

    thSelect.appendChild(selectAll);
    theadRow.appendChild(thSelect);

    cols.slice(1).forEach((c) => {
      const th = document.createElement("th");
      th.className =
        "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-300 whitespace-nowrap";
      th.textContent = c.label;
      theadRow.appendChild(th);
    });

    tablaHead.appendChild(theadRow);

    // ---- fila 2: filtros (sticky) -> LUPA / INPUT ----
    const filterRow = document.createElement("tr");
    filterRow.className = "filter-row";

    const thEmpty = document.createElement("th");
    thEmpty.className = "th-filter";
    filterRow.appendChild(thEmpty);

    cols.slice(1).forEach((c) => {
      const th = document.createElement("th");
      th.className = "th-filter";

      if (c.key === "_actions") {
        th.innerHTML = "";
        filterRow.appendChild(th);
        return;
      }

      const currentVal = (columnFilters[mode]?.[c.key] ?? "").toString();
      const hasVal = currentVal.trim().length > 0;

      if (hasVal) columnFilterUIOpen[mode][c.key] = true;

      const isOpen = !!columnFilterUIOpen[mode][c.key];

      if (isOpen) th.style.minWidth = "210px";
      else th.style.minWidth = "";

      const wrap = document.createElement("div");
      wrap.className = "colf-wrap";

      if (!isOpen) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "colf-btn";
        btn.title = "Buscar en esta columna";
        btn.innerHTML = `<span class="material-symbols-outlined text-[20px] text-gray-600 dark:text-gray-200">search</span>`;

        btn.addEventListener("mousedown", (e) => e.stopPropagation());
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          columnFilterUIOpen[mode][c.key] = true;

          const id = `colf-${mode}-${c.key}`;
          pendingColFocus = { id, pos: currentVal.length };

          render();
        });

        wrap.appendChild(btn);
        th.appendChild(wrap);
        filterRow.appendChild(th);
        return;
      }

      const box = document.createElement("div");
      box.className = "relative";

      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.id = `colf-${mode}-${c.key}`;
      input.value = currentVal;
      input.placeholder = "Buscar…";

      input.className =
        "colf-input border-0 bg-gray-100/80 dark:bg-white/10 text-xs text-gray-900 dark:text-white " +
        "ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-primary";

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className =
        "absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-full " +
        "hover:bg-gray-200/70 dark:hover:bg-white/10 transition flex items-center justify-center";
      clearBtn.title = "Limpiar";
      clearBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] text-gray-500">close</span>`;

      const setClearVisible = () => {
        if ((input.value || "").trim()) clearBtn.classList.remove("hidden");
        else clearBtn.classList.add("hidden");
      };
      setClearVisible();

      input.addEventListener("mousedown", (e) => e.stopPropagation());
      input.addEventListener("click", (e) => e.stopPropagation());
      clearBtn.addEventListener("mousedown", (e) => e.stopPropagation());
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        input.value = "";
        setClearVisible();

        if (!columnFilters[mode]) columnFilters[mode] = {};
        delete columnFilters[mode][c.key];
        columnFilterUIOpen[mode][c.key] = false;

        page = 1;
        render();
      });

      input.addEventListener("input", (e) => {
        const val = e.target.value || "";
        const id = e.target.id;
        const pos = e.target.selectionStart ?? val.length;

        pendingColFocus = { id, pos };
        setClearVisible();

        if (colFilterTimers.has(id)) clearTimeout(colFilterTimers.get(id));

        colFilterTimers.set(
          id,
          setTimeout(() => {
            const v = val.trim();
            if (!columnFilters[mode]) columnFilters[mode] = {};

            if (v) {
              columnFilters[mode][c.key] = v;
              columnFilterUIOpen[mode][c.key] = true;
            } else {
              delete columnFilters[mode][c.key];
              columnFilterUIOpen[mode][c.key] = false;
            }

            page = 1;
            render();
          }, 320),
        );
      });

      box.appendChild(input);
      box.appendChild(clearBtn);
      wrap.appendChild(box);
      th.appendChild(wrap);
      filterRow.appendChild(th);
    });

    tablaHead.appendChild(filterRow);

    // Body
    tablaBody.innerHTML = "";

    const rightCols = new Set(["Peso", "_pesoIng", "_pesoSal", "gananciaKg", "dias"]);
    const moneyCols = new Set([
      "ValorKGingreso",
      "totalIngreso",
      "totalSalida",
      "costos",
      "utilidad",
      "_vIng",
      "_vSal",
      "Flete",
      "Comision",
      "Mermas",
    ]);

    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50/70 dark:hover:bg-white/5";

      const k = rowKey(r);
      const checked = selectedKeys.has(k);

      // select cell
      const td0 = document.createElement("td");
      td0.className = "px-3 py-2";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "rounded border-gray-300 dark:border-gray-600";
      chk.checked = checked;
      chk.addEventListener("change", (e) => {
        if (e.target.checked) selectedKeys.add(k);
        else selectedKeys.delete(k);
        render();
      });
      td0.appendChild(chk);
      tr.appendChild(td0);

      cols.slice(1).forEach((c) => {
        const td = document.createElement("td");
        td.className = "px-3 py-2 whitespace-nowrap";

        if (c.key === "_actions") {
          td.className = "px-3 py-2 whitespace-nowrap text-right";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold " +
            "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition";
          btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">delete</span> Borrar`;
          btn.addEventListener("click", () => {
            const numero = r?.Numero ?? "";
            if (!numero) return alert("No se pudo identificar el Número para borrar.");
            openDeleteModal(numero);
          });
          td.appendChild(btn);
          tr.appendChild(td);
          return;
        }

        if (c.key === "Numero") {
          const numero = safeText(r.Numero);
          td.innerHTML = `
            <div class="flex items-center gap-2">
              <span class="font-extrabold">${numero}</span>
              <button type="button"
                class="inline-flex items-center justify-center size-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition"
                aria-label="Copiar número"
                title="Copiar número"
                data-copy="${numero}"
              >
                <span class="material-symbols-outlined text-[18px] text-gray-700 dark:text-gray-200">content_copy</span>
              </button>
            </div>
          `;
          td.querySelector("button")?.addEventListener("click", async (e) => {
            const val = e.currentTarget.getAttribute("data-copy") || "";
            if (!val) return;
            const ok = await copyToClipboard(val);
            if (ok) showToast("Número copiado ✅", "success");
            else showToast("No se pudo copiar ❌", "error");
          });
          tr.appendChild(td);
          return;
        }

        let v = r[c.key];

        if (c.key === "Finca") v = r.FincaIndicativo ?? r.FincaNombre ?? r.Finca ?? "";

        if (c.key === "FechaIngreso" || c.key === "FechaSalida") {
          const d = parseISODate(v);
          td.textContent = d ? fmtDate(d) : "-";
          tr.appendChild(td);
          return;
        }

        if (rightCols.has(c.key)) {
          td.classList.add("text-right", "tabular-nums");
          td.textContent = v === null || v === undefined ? "-" : fmtNum(v, c.key === "dias" ? 0 : 1);
          tr.appendChild(td);
          return;
        }

        if (moneyCols.has(c.key)) {
          td.classList.add("text-right", "tabular-nums");
          const n = Number(v);
          if (!Number.isFinite(n)) td.textContent = "-";
          else {
            if (c.key === "utilidad") {
              td.innerHTML = `<span class="${n >= 0 ? "text-emerald-600" : "text-rose-500"}">${fmtMoney(n)}</span>`;
            } else {
              td.textContent = fmtMoney(n);
            }
          }
          tr.appendChild(td);
          return;
        }

        td.textContent = v === null || v === undefined ? "" : String(v);
        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });

    // ✅ recalcula offsets y alturas del sticky SIN crear “espacio arriba”
    requestAnimationFrame(() => {
      syncAllStickyVars();
    });
  }

  // ---------- export ----------
  function exportXLSX(rows, filename) {
    if (!rows.length) return alert("No hay datos para exportar.");

    const data = rows.map((r) => {
      const rr = enrichRow(r);
      return {
        Numero: rr.Numero ?? "",
        Finca: rr.FincaIndicativo ?? rr.FincaNombre ?? rr.Finca ?? "",
        Sexo: rr.Sexo ?? "",
        FechaIngreso: rr.FechaIngreso ?? "",
        FechaSalida: rr.FechaSalida ?? "",
        Dias: rr.dias ?? "",
        PesoIngreso: rr._pesoIng ?? "",
        PesoSalida: rr._pesoSal ?? "",
        GananciaKg: rr.gananciaKg ?? "",
        ValorKGCompra: rr._vIng ?? "",
        ValorKGVenta: rr._vSal ?? "",
        TotalCompra: rr.totalIngreso ?? "",
        TotalVenta: rr.totalSalida ?? "",
        Flete: rr.Flete ?? "",
        Comision: rr.Comision ?? "",
        Mermas: rr.Mermas ?? "",
        Costos: rr.costos ?? "",
        Utilidad: rr.utilidad ?? "",
        Raza: rr.Raza ?? "",
        Color: rr.Color ?? "",
        Edad: rr.Edad ?? "",
        Marca: rr.Marcallegada ?? "",
        Destino: rr.Destino ?? "",
        Proveedor: rr.Proveedor ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historico");
    XLSX.writeFile(wb, filename);
  }

  // ---------- eventos ----------
  function bindTabs() {
    if (btnIngreso)
      btnIngreso.addEventListener("click", () => {
        viewMode = "ingreso";
        page = 1;
        render();
      });

    if (btnSalida)
      btnSalida.addEventListener("click", () => {
        viewMode = "salida";
        page = 1;
        render();
      });
  }

  function bindPager() {
    const setSize = (n) => {
      pageSize = n;
      page = 1;
      render();
      syncPageSizeButtonsUI();
    };

    const prev = () => {
      page = Math.max(1, page - 1);
      render();
    };
    const next = () => {
      page = page + 1;
      render();
    };

    pagePrevTop && pagePrevTop.addEventListener("click", prev);
    pagePrevBottom && pagePrevBottom.addEventListener("click", prev);
    pageNextTop && pageNextTop.addEventListener("click", next);
    pageNextBottom && pageNextBottom.addEventListener("click", next);

    pageSize100Top && pageSize100Top.addEventListener("click", () => setSize(100));
    pageSize200Top && pageSize200Top.addEventListener("click", () => setSize(200));
    pageSize300Top && pageSize300Top.addEventListener("click", () => setSize(300));
    pageSizeAllTop && pageSizeAllTop.addEventListener("click", () => setSize(Infinity));

    pageSize100Bottom && pageSize100Bottom.addEventListener("click", () => setSize(100));
    pageSize200Bottom && pageSize200Bottom.addEventListener("click", () => setSize(200));
    pageSize300Bottom && pageSize300Bottom.addEventListener("click", () => setSize(300));
    pageSizeAllBottom && pageSizeAllBottom.addEventListener("click", () => setSize(Infinity));

    syncPageSizeButtonsUI();
  }

  function syncPageSizeButtonsUI() {
    const allBtns = [
      [pageSize100Top, 100],
      [pageSize200Top, 200],
      [pageSize300Top, 300],
      [pageSizeAllTop, Infinity],
      [pageSize100Bottom, 100],
      [pageSize200Bottom, 200],
      [pageSize300Bottom, 300],
      [pageSizeAllBottom, Infinity],
    ];

    allBtns.forEach(([btn, val]) => {
      if (!btn) return;
      btn.classList.remove("bg-white", "dark:bg-[#1a1926]", "text-primary", "shadow-sm");
      if (pageSize === val)
        btn.className = btn.className + " bg-white dark:bg-[#1a1926] text-primary shadow-sm";
    });
  }

  function bindDates() {
    const syncFromTopToBottom = () => {
      if (dateFromBottom) dateFromBottom.value = dateFromTop?.value || "";
      if (dateToBottom) dateToBottom.value = dateToTop?.value || "";
    };
    const syncFromBottomToTop = () => {
      if (dateFromTop) dateFromTop.value = dateFromBottom?.value || "";
      if (dateToTop) dateToTop.value = dateToBottom?.value || "";
    };

    const onChangeTop = () => {
      syncFromTopToBottom();
      page = 1;
      render();
    };
    const onChangeBottom = () => {
      syncFromBottomToTop();
      page = 1;
      render();
    };

    dateFromTop && dateFromTop.addEventListener("change", onChangeTop);
    dateToTop && dateToTop.addEventListener("change", onChangeTop);

    dateFromBottom && dateFromBottom.addEventListener("change", onChangeBottom);
    dateToBottom && dateToBottom.addEventListener("change", onChangeBottom);

    const shiftRange = (dir) => {
      const fromVal = (dateFromTop?.value || "").trim();
      const toVal = (dateToTop?.value || "").trim();
      if (!fromVal && !toVal) return;

      const from = fromVal ? new Date(fromVal + "T00:00:00") : null;
      const to = toVal ? new Date(toVal + "T00:00:00") : null;

      let spanDays = 1;
      if (from && to) {
        spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / msDay) + 1);
      }

      const move = (d) => {
        if (!d) return null;
        const nd = new Date(d);
        nd.setDate(nd.getDate() + dir * spanDays);
        return nd;
      };

      const nf = move(from);
      const nt = move(to);

      const toInput = (d) => {
        if (!d) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      };

      if (dateFromTop) dateFromTop.value = toInput(nf);
      if (dateToTop) dateToTop.value = toInput(nt);

      syncFromTopToBottom();
      page = 1;
      render();
    };

    const clearRange = () => {
      if (dateFromTop) dateFromTop.value = "";
      if (dateToTop) dateToTop.value = "";
      if (dateFromBottom) dateFromBottom.value = "";
      if (dateToBottom) dateToBottom.value = "";
      page = 1;
      render();
    };

    rangePrevTop && rangePrevTop.addEventListener("click", () => shiftRange(-1));
    rangePrevBottom && rangePrevBottom.addEventListener("click", () => shiftRange(-1));
    rangeNextTop && rangeNextTop.addEventListener("click", () => shiftRange(+1));
    rangeNextBottom && rangeNextBottom.addEventListener("click", () => shiftRange(+1));

    rangeClearTop && rangeClearTop.addEventListener("click", clearRange);
    rangeClearBottom && rangeClearBottom.addEventListener("click", clearRange);
  }

  function bindActions() {
    btnActualizar && btnActualizar.addEventListener("click", cargarDatos);

    btnExportarTodo &&
      btnExportarTodo.addEventListener("click", () => {
        exportXLSX(allRows, `historico_TODO_${new Date().toISOString().slice(0, 10)}.xlsx`);
      });

    btnExportarVista &&
      btnExportarVista.addEventListener("click", () => {
        const base = applyFiltersBase(allRows).map(enrichRow);

        const view = applyViewMode(base);
        const colFiltered = applyColumnFilters(view, viewMode);
        const rowsForExport = applySort(colFiltered);

        let rowsToExport = rowsForExport;
        let suffix = `FILTRO_${viewMode}`;

        if (selectedKeys.size > 0) {
          const selectedInView = rowsForExport.filter((r) => selectedKeys.has(rowKey(r)));
          if (!selectedInView.length) {
            return alert(
              "Tienes registros seleccionados, pero ninguno está dentro de la vista/filtros actuales.\n\n" +
                "Quita filtros o selecciona dentro de esta vista para exportar.",
            );
          }
          rowsToExport = selectedInView;
          suffix = `SELECCION_${viewMode}_${selectedInView.length}`;
        }

        if (!rowsToExport.length) {
          return alert("No hay datos para exportar con la vista/filtros actuales.");
        }

        exportXLSX(rowsToExport, `historico_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      });
  }

  function bindFab() {
    fabTop &&
      fabTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    fabBottom &&
      fabBottom.addEventListener("click", () =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
      );
  }

  function bindLogout() {
    const open = () => logoutModal && logoutModal.classList.remove("hidden");
    const close = () => logoutModal && logoutModal.classList.add("hidden");

    btnLogout && btnLogout.addEventListener("click", open);
    logoutCancel && logoutCancel.addEventListener("click", close);
    logoutConfirm && logoutConfirm.addEventListener("click", async () => await doLogout());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    logoutModal &&
      logoutModal.addEventListener("click", (e) => {
        if (e.target === logoutModal) close();
      });
  }

  function bindPredModal() {
    predMoreBtn && predMoreBtn.addEventListener("click", openPredModal);

    const close = () => closePredModal();
    predModalCloseX && predModalCloseX.addEventListener("click", close);
    predModalAccept && predModalAccept.addEventListener("click", close);

    predModal &&
      predModal.addEventListener("click", (e) => {
        if (e.target === predModal) close();
      });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    window.addEventListener("resize", () => applyPredView());
  }

  function bindPredPanel() {
    if (predToggleBtn) {
      predToggleBtn.addEventListener("click", async () => {
        predExpanded = !predExpanded;

        const base = applyFiltersBase(allRows).map(enrichRow);

        if (predExpanded) {
          showEl(predPanel);
          predToggleBtn.setAttribute("aria-expanded", "true");
          setPredButtonsLoading(false, "toggle");

          const currentHash = getBaseHash(base);
          const stale = !predComputedHash || predComputedHash !== currentHash;

          if (stale) await computePredictionOnDemand(base);
          else applyPredView();
        } else {
          hideEl(predPanel);
          predToggleBtn.setAttribute("aria-expanded", "false");
          setPredButtonsLoading(false, "toggle");
          hideEl(predMoreBtn);
          if (predFade) predFade.classList.add("hidden");
        }

        updatePredUIState(base);
      });
    }

    if (predRecalcBtn) {
      predRecalcBtn.addEventListener("click", async () => {
        const base = applyFiltersBase(allRows).map(enrichRow);
        await computePredictionOnDemand(base);
        updatePredUIState(base);
      });
    }
  }

  function bindDeleteModal() {
    deleteCancel && deleteCancel.addEventListener("click", closeDeleteModal);

    deleteConfirm &&
      deleteConfirm.addEventListener("click", async () => {
        const numero = pendingDeleteNumero;
        if (!numero) return closeDeleteModal();

        try {
          deleteConfirm.disabled = true;
          await deleteByNumero(numero);

          allRows = allRows.filter((r) => String(r?.Numero ?? "") !== String(numero));

          closeDeleteModal();
          page = 1;
          render();
        } catch (e) {
          console.error(e);
          alert("No se pudo eliminar el registro. Revisa consola / backend.");
        } finally {
          deleteConfirm.disabled = false;
        }
      });

    deleteModal &&
      deleteModal.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeDeleteModal();
      });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDeleteModal();
    });
  }

  function bindDragScroll() {
    if (!tablaWrapper) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    tablaWrapper.addEventListener("mousedown", (e) => {
      if (e.target.closest("button, input, select, textarea, label, a")) return;

      isDown = true;
      tablaWrapper.classList.add("dragging");
      startX = e.pageX - tablaWrapper.offsetLeft;
      scrollLeft = tablaWrapper.scrollLeft;
    });

    tablaWrapper.addEventListener("mouseleave", () => {
      isDown = false;
      tablaWrapper.classList.remove("dragging");
    });

    tablaWrapper.addEventListener("mouseup", () => {
      isDown = false;
      tablaWrapper.classList.remove("dragging");
    });

    tablaWrapper.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tablaWrapper.offsetLeft;
      const walk = (x - startX) * 1.2;
      tablaWrapper.scrollLeft = scrollLeft - walk;
    });
  }

  function bindSearchAndSort() {
    const apply = (val) => {
      searchValue = val || "";
      page = 1;
      render();
    };

    searchQ &&
      searchQ.addEventListener("input", (e) => {
        const val = e.target.value || "";
        if (searchClear) {
          if (val.trim()) showEl(searchClear);
          else hideEl(searchClear);
        }

        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => apply(val), 280);
      });

    searchClear &&
      searchClear.addEventListener("click", () => {
        if (searchQ) searchQ.value = "";
        hideEl(searchClear);
        apply("");
      });

    sortBy &&
      sortBy.addEventListener("change", () => {
        page = 1;
        render();
      });
  }

  // ---------- carga ----------
  async function cargarDatos() {
    try {
      showEl(loadingModal);
      btnActualizar && (btnActualizar.disabled = true);

      const res = await apiFetch("/api/historicoiys");
      if (!res.ok) throw new Error("No se pudo cargar histórico");

      const data = await res.json();
      allRows = Array.isArray(data) ? data : [];

      selectedKeys.clear();
      page = 1;

      const base = applyFiltersBase(allRows).map(enrichRow);
      lastBaseHash = getBaseHash(base);

      render();

      // ✅ luego de render, recalcula sticky (evita espacios blancos)
      requestAnimationFrame(() => {
        syncAllStickyVars();
      });

      setTimeout(() => hideEl(loadingModal), 120);
    } catch (e) {
      console.error(e);
      alert("Error cargando datos (revisa consola / backend).");
      hideEl(loadingModal);
    } finally {
      btnActualizar && (btnActualizar.disabled = false);
    }
  }

  // ---------- init ----------
  bindTabs();
  bindPager();
  bindDates();
  bindActions();
  bindFab();
  bindLogout();
  bindPredModal();
  bindPredPanel();
  bindDeleteModal();
  bindDragScroll();
  bindSearchAndSort();

  applyPredView();
  cargarDatos();
});
