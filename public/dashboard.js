// public/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // DASHBOARD (TU HTML NUEVO)
  // ==============================

  // ---------- helpers DOM ----------
  const $ = (id) => document.getElementById(id);

  // Tabla
  const tablaHead = $("tabla-head");
  const tablaBody = $("tabla-body");
  const tablaWrapper = $("tabla-wrapper");

  // Tabs
  const btnIngreso = $("btn-ingreso");
  const btnSalida = $("btn-salida");

  // Botones
  const btnActualizar = $("btn-actualizar");
  const btnExportarTodo = $("btn-exportar-todo");
  const btnExportarVista = $("btn-exportar-vista");

  // Info selección (texto)
  const selectionInfo = $("selection-info");
  const selectionInfoMobile = $("selection-info-mobile");

  // Totales (cards)
  const elTotalGeneral = $("total-general");
  const elTotalIngresos = $("total-ingresos");
  const elTotalSalidas = $("total-salidas");
  const elTotalValorIngreso = $("total-valor-ingreso");
  const elTotalValorSalida = $("total-valor-salida");
  const elTotalUtilidad = $("total-utilidad");
  const elTotalUtilidadPct = $("total-utilidad-pct");

  // Stats cards
  const elStatPesoIng = $("stat-peso-ing");
  const elStatPesoSal = $("stat-peso-sal");
  const elStatPesoGan = $("stat-peso-ganancia");
  const elStatValorIng = $("stat-valor-ing");
  const elStatValorSal = $("stat-valor-sal");
  const elStatPred = $("stat-prediccion");

  // Date range (top)
  const dateFromTop = $("date-from-top");
  const dateToTop = $("date-to-top");
  const rangePrevTop = $("range-prev-top");
  const rangeNextTop = $("range-next-top");
  const rangeClearTop = $("range-clear-top");

  // Date range (bottom)
  const dateFromBottom = $("date-from-bottom");
  const dateToBottom = $("date-to-bottom");
  const rangePrevBottom = $("range-prev-bottom");
  const rangeNextBottom = $("range-next-bottom");
  const rangeClearBottom = $("range-clear-bottom");

  // Pager (top)
  const pageInfoTop = $("page-info-top");
  const pagePrevTop = $("page-prev-top");
  const pageNextTop = $("page-next-top");
  const pageSize100Top = $("page-size-100-top");
  const pageSize200Top = $("page-size-200-top");
  const pageSize300Top = $("page-size-300-top");
  const pageSizeAllTop = $("page-size-all-top");

  // Pager (bottom)
  const pageInfoBottom = $("page-info-bottom");
  const pagePrevBottom = $("page-prev-bottom");
  const pageNextBottom = $("page-next-bottom");
  const pageSize100Bottom = $("page-size-100-bottom");
  const pageSize200Bottom = $("page-size-200-bottom");
  const pageSize300Bottom = $("page-size-300-bottom");
  const pageSizeAllBottom = $("page-size-all-bottom");

  // Floating buttons
  const fabTop = $("fab-top");
  const fabBottom = $("fab-bottom");

  // Logout
  const btnLogout = $("btn-logout");
  const logoutModal = $("logout-modal");
  const logoutCancel = $("logout-cancel");
  const logoutConfirm = $("logout-confirm");

  // ---------- estado ----------
  let allRows = [];
  let viewMode = "ingreso"; // "ingreso" | "salida"

  let page = 1;
  let pageSize = 100; // 100|200|300|Infinity

  // Selección (por id si existe; si no, por Numero)
  const selectedKeys = new Set();

  // ---------- formatos ----------
  const msDay = 24 * 60 * 60 * 1000;

  const fmtMoney = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
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
    new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  const diffDays = (startISO, endISO) => {
    const a = parseISODate(startISO);
    const b = parseISODate(endISO);
    if (!a || !b) return null;
    const aa = new Date(a); aa.setHours(0, 0, 0, 0);
    const bb = new Date(b); bb.setHours(0, 0, 0, 0);
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
    // prefer id, fallback Numero
    if (r && (r.id !== undefined && r.id !== null)) return `id:${r.id}`;
    return `num:${r?.Numero ?? ""}`;
  };

  const hasSalida = (r) => {
    const ps = Number(r?.PesoSalida) || 0;
    return !!(r?.FechaSalida && ps > 0);
  };

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
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch (_) {}
    window.location.href = "/";
  }

  // ---------- filtros ----------
  function getDateRangeFromInputs() {
    // usamos top como fuente principal
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

    return out;
  }

  function applyViewMode(rows) {
    if (viewMode === "salida") return rows.filter(hasSalida);
    return rows;
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
    const gananciaKg = hasSalida(r) ? (pesoSal - pesoIng) : null;

    return { ...r, _pesoIng: pesoIng, _pesoSal: pesoSal, _vIng: vIng, _vSal: vSal, totalIngreso, totalSalida, costos, utilidad, dias, gananciaKg };
  }

  // ---------- render ----------
  function setActiveTabUI() {
    const on = "bg-white dark:bg-[#1a1926] text-primary shadow-sm";
    const off = "text-gray-600 dark:text-gray-200/80";

    [btnIngreso, btnSalida].forEach((b) => {
      if (!b) return;
      b.classList.remove("bg-white", "dark:bg-[#1a1926]", "text-primary", "shadow-sm", "text-gray-600", "dark:text-gray-200/80");
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

    // Totales globales (sobre el filtro, no importa el tab)
    renderTotales(base);

    // Estadísticas (sobre salidas dentro del filtro)
    renderStats(base);

    // Vista tabla según tab
    const view = applyViewMode(base);

    // Paginación
    const size = pageSize === Infinity ? view.length : pageSize;
    const maxPage = Math.max(1, Math.ceil(view.length / Math.max(1, size)));
    if (page > maxPage) page = maxPage;

    const startIdx = (page - 1) * size;
    const pageRows = view.slice(startIdx, startIdx + size);

    renderPager(view.length, pageRows.length, startIdx);
    renderTable(pageRows, viewMode);

    updateSelectionInfo(view, pageRows);
  }

  function renderTotales(baseRows) {
    const totalContexto = allRows.length;
    const totalFiltrado = baseRows.length;
    const totalSalidas = baseRows.filter(hasSalida).length;

    // Dinero y utilidad SOLO en salidas (tiene sentido)
    const salidas = baseRows.filter(hasSalida);
    const sumIng = salidas.reduce((a, r) => a + (Number(r.totalIngreso) || 0), 0);
    const sumSal = salidas.reduce((a, r) => a + (Number(r.totalSalida) || 0), 0);
    const sumUtil = salidas.reduce((a, r) => a + (Number(r.utilidad) || 0), 0);
    const margen = sumIng > 0 ? (sumUtil / sumIng) * 100 : null;

    if (elTotalGeneral) elTotalGeneral.textContent = totalContexto.toLocaleString("es-CO");
    if (elTotalIngresos) elTotalIngresos.textContent = totalFiltrado.toLocaleString("es-CO");
    if (elTotalSalidas) elTotalSalidas.textContent = totalSalidas.toLocaleString("es-CO");

    if (elTotalValorIngreso) elTotalValorIngreso.textContent = fmtMoney(sumIng);
    if (elTotalValorSalida) elTotalValorSalida.textContent = fmtMoney(sumSal);

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
    const ingresos = salidas.map((r) => r.totalIngreso).filter((v) => Number.isFinite(v) && v > 0);

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const g = prom(ganKg);
    const vI = prom(vIng);
    const vS = prom(vSal);

    const d = prom(dias);
    const u = prom(utils);
    const ing = prom(ingresos);

    const margenPct = ing && ing > 0 && u !== null ? (u / ing) * 100 : null;
    const uDia = d && d > 0 && u !== null ? (u / d) : null;
    const kgDia = d && d > 0 && g !== null ? (g / d) : null;

    if (elStatPesoIng) elStatPesoIng.textContent = pIng === null ? "-" : `${pIng.toFixed(1)} kg`;
    if (elStatPesoSal) elStatPesoSal.textContent = pSal === null ? "-" : `${pSal.toFixed(1)} kg`;
    if (elStatPesoGan) elStatPesoGan.textContent = g === null ? "-" : `${g.toFixed(1)} kg`;

    if (elStatValorIng) elStatValorIng.textContent = vI === null ? "-" : fmtMoney(vI);
    if (elStatValorSal) elStatValorSal.textContent = vS === null ? "-" : fmtMoney(vS);

    // Sex counts (sobre el filtro actual, incluyendo ingresos sin salida)
    const sexCounts = baseRows.reduce(
      (acc, r) => {
        const k = normSexo(r.Sexo);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      { MACHO: 0, HEMBRA: 0, OTRO: 0, "N/A": 0 }
    );

    // --- sugerencia por buckets de Peso ingreso, optimizando utilidad ---
    function bestBucket(rows, step = 25) {
      // requiere: salidas con peso, días y utilidad
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

        const b = buckets.get(key) || { key, start, end: start + step, n: 0, sumU: 0, sumD: 0, sumIng: 0 };
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
        .filter((b) => b.n >= 3); // mínimo para “no inventar”

      if (!stats.length) return null;

      const bestPorDia = [...stats].sort((a, b) => b.avgUDia - a.avgUDia)[0];
      const bestTotal = [...stats].sort((a, b) => b.avgU - a.avgU)[0];

      return { step, bestPorDia, bestTotal };
    }

    const sugGlobal = bestBucket(baseRows, 25);

    // si hay suficientes datos por sexo, también sacamos recomendación
    const salidasM = baseRows.filter((r) => normSexo(r.Sexo) === "MACHO");
    const salidasH = baseRows.filter((r) => normSexo(r.Sexo) === "HEMBRA");
    const sugM = bestBucket(salidasM, 25);
    const sugH = bestBucket(salidasH, 25);

    // --- mensaje “Predicción simple” (en realidad: sugerencia útil) ---
    if (elStatPred) {
      const parts = [];

      parts.push(`<strong>Resumen (según tu filtro actual)</strong>`);
      parts.push(`• Registros filtrados: <strong>${baseRows.length.toLocaleString("es-CO")}</strong>`);
      parts.push(`• Salidas en el filtro: <strong>${salidas.length.toLocaleString("es-CO")}</strong>`);

      parts.push(
        `• Sexo: Machos <strong>${sexCounts.MACHO.toLocaleString("es-CO")}</strong>, Hembras <strong>${sexCounts.HEMBRA.toLocaleString("es-CO")}</strong>` +
          (sexCounts["N/A"] ? `, Sin dato ${sexCounts["N/A"].toLocaleString("es-CO")}` : "") +
          (sexCounts.OTRO ? `, Otros ${sexCounts.OTRO.toLocaleString("es-CO")}` : "")
      );

      if (!salidas.length) {
        parts.push(
          `<span class="text-amber-600 dark:text-amber-300"><strong>Ojo:</strong> Dentro del filtro no hay salidas, por eso no se puede medir utilidad/días.</span>`
        );
        elStatPred.innerHTML = parts.join("<br>");
        return;
      }

      if (d !== null) parts.push(`• Días promedio en finca (salidas): <strong>${d.toFixed(1)}</strong> días`);
      if (u !== null) {
        parts.push(`• Utilidad promedio por animal: <strong>${fmtMoney(u)}</strong>` + (margenPct === null ? "" : ` (<strong>${margenPct.toFixed(2)}%</strong>)`));
      }
      if (uDia !== null) parts.push(`• Utilidad promedio por día: <strong>${fmtMoney(uDia)}</strong>`);
      if (g !== null) parts.push(`• Ganancia de peso promedio: <strong>${g.toFixed(1)} kg</strong>` + (kgDia === null ? "" : ` (~<strong>${kgDia.toFixed(2)} kg/día</strong>)`));

      // Sugerencia global
      if (sugGlobal?.bestPorDia) {
        const b = sugGlobal.bestPorDia;
        const c = sugGlobal.bestTotal;

        parts.push(`<br><strong>Sugerencia de peso de ingreso</strong> (basada en tu histórico, NO es garantía):`);
        parts.push(
          `• Para <strong>maximizar utilidad por día</strong>: ingresar animales en <strong>${b.start}-${b.end} kg</strong> fue tu mejor rango (n=${b.n}). ` +
            `Prom: <strong>${fmtMoney(b.avgU)}</strong> en <strong>${b.avgD.toFixed(1)} días</strong> (= ${fmtMoney(b.avgUDia)}/día).`
        );

        if (c && c.key !== b.key) {
          parts.push(
            `• Para <strong>maximizar utilidad total</strong>: el rango <strong>${c.start}-${c.end} kg</strong> fue el mejor (n=${c.n}). ` +
              `Prom: <strong>${fmtMoney(c.avgU)}</strong> por animal (margen ~${c.avgMarg.toFixed(2)}%).`
          );
        }
      } else {
        parts.push(
          `<br><strong>Sugerencia de peso:</strong> todavía no hay suficientes salidas “completas” (peso/días/utilidad) para recomendar un rango con confianza (mínimo 3 casos por rango).`
        );
      }

      // Sugerencia por sexo (si alcanza)
      const sexoSugLines = [];
      if (sugM?.bestPorDia) {
        const b = sugM.bestPorDia;
        sexoSugLines.push(`• <strong>Machos</strong>: mejor por día <strong>${b.start}-${b.end} kg</strong> (n=${b.n}).`);
      }
      if (sugH?.bestPorDia) {
        const b = sugH.bestPorDia;
        sexoSugLines.push(`• <strong>Hembras</strong>: mejor por día <strong>${b.start}-${b.end} kg</strong> (n=${b.n}).`);
      }
      if (sexoSugLines.length) {
        parts.push(`<br><strong>Rangos por sexo</strong> (si tus datos alcanzan):<br>${sexoSugLines.join("<br>")}`);
      }

      parts.push(
        `<br><span class="text-xs text-gray-500 dark:text-gray-400">Tip: si cambian los precios (compra/venta), usa un rango de fechas reciente; la recomendación puede moverse.</span>`
      );

      elStatPred.innerHTML = parts.join("<br>");
    }
  }

  function renderPager(total, pageCount, startIdx) {
    const start = total ? startIdx + 1 : 0;
    const end = total ? startIdx + pageCount : 0;
    const txt = `Mostrando ${start.toLocaleString("es-CO")}–${end.toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")}`;

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

  function updateSelectionInfo(viewRowsAll, pageRows) {
    const selectedInView = viewRowsAll.filter((r) => selectedKeys.has(rowKey(r))).length;
    const msg =
      selectedKeys.size
        ? `Seleccionados: ${selectedKeys.size.toLocaleString("es-CO")} (en esta vista: ${selectedInView.toLocaleString("es-CO")}).`
        : "Totales basados en todos los registros filtrados.";

    if (selectionInfo) selectionInfo.textContent = msg;
    if (selectionInfoMobile) selectionInfoMobile.textContent = msg;

    // si no hay nada seleccionado, limpiamos el “select all” de header si existe
    // (lo maneja renderTable)
  }

  function renderTable(rows, mode) {
    if (!tablaHead || !tablaBody) return;

    // columnas según modo
    const colsIngreso = [
      { key: "_select", label: "" },
      { key: "Numero", label: "Número" },
      { key: "Finca", label: "Finca" },
      { key: "Sexo", label: "Sexo" },
      { key: "FechaIngreso", label: "Ingreso" },
      { key: "Peso", label: "Peso (kg)" },
      { key: "ValorKGingreso", label: "$/kg compra" },
      { key: "totalIngreso", label: "Total compra" },
      { key: "Raza", label: "Raza" },
      { key: "Color", label: "Color" },
      { key: "Edad", label: "Edad" },
      { key: "Marcallegada", label: "Marca" },
      { key: "Proveedor", label: "Proveedor" },
      { key: "Destino", label: "Destino" },
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
      { key: "costos", label: "Costos" },
      { key: "utilidad", label: "Utilidad" },
    ];

    const cols = mode === "salida" ? colsSalida : colsIngreso;

    // Header
    tablaHead.innerHTML = "";
    const theadRow = document.createElement("tr");
    theadRow.className = "bg-gray-50 dark:bg-[#232235]";

    // Select-all header checkbox
    const thSelect = document.createElement("th");
    thSelect.className = "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-300";
    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.className = "rounded border-gray-300 dark:border-gray-600";

    // estado del select-all (solo respecto a las filas de ESTA página)
    const pageKeys = rows.map((r) => rowKey(r));
    const selectedCount = pageKeys.filter((k) => selectedKeys.has(k)).length;
    selectAll.checked = rows.length > 0 && selectedCount === rows.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < rows.length;

    selectAll.addEventListener("change", (e) => {
      if (e.target.checked) pageKeys.forEach((k) => selectedKeys.add(k));
      else pageKeys.forEach((k) => selectedKeys.delete(k));
      render(); // recalcula y re-render
    });

    thSelect.appendChild(selectAll);
    theadRow.appendChild(thSelect);

    // resto headers
    cols.slice(1).forEach((c) => {
      const th = document.createElement("th");
      th.className =
        "px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-300 whitespace-nowrap";
      th.textContent = c.label;
      theadRow.appendChild(th);
    });

    tablaHead.appendChild(theadRow);

    // Body
    tablaBody.innerHTML = "";

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

      // cells
      cols.slice(1).forEach((c) => {
        const td = document.createElement("td");
        td.className = "px-3 py-2 whitespace-nowrap";

        let v = r[c.key];

        // Finca (tu tabla usa "Finca" como texto; a veces llega "FincaNombre/FincaIndicativo")
        if (c.key === "Finca") {
          v = r.FincaIndicativo ?? r.FincaNombre ?? r.Finca ?? "";
        }

        // fechas
        if (c.key === "FechaIngreso" || c.key === "FechaSalida") {
          const d = parseISODate(v);
          td.textContent = d ? fmtDate(d) : "-";
          tr.appendChild(td);
          return;
        }

        // num formatting
        const right = new Set(["Peso", "_pesoIng", "_pesoSal", "gananciaKg", "dias"]);
        const moneyCols = new Set(["ValorKGingreso", "totalIngreso", "totalSalida", "costos", "utilidad", "_vIng", "_vSal"]);

        if (right.has(c.key)) {
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

        // default
        td.textContent = v === null || v === undefined ? "" : String(v);
        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });
  }

  // ---------- export ----------
  function exportXLSX(rows, filename) {
    if (!rows.length) return alert("No hay datos para exportar.");

    // Aplana y limpia columnas útiles
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
    if (btnIngreso) btnIngreso.addEventListener("click", () => { viewMode = "ingreso"; page = 1; render(); });
    if (btnSalida) btnSalida.addEventListener("click", () => { viewMode = "salida"; page = 1; render(); });
  }

  function bindPager() {
    const setSize = (n) => {
      pageSize = n;
      page = 1;
      render();
      syncPageSizeButtonsUI();
    };

    const prev = () => { page = Math.max(1, page - 1); render(); };
    const next = () => { page = page + 1; render(); };

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
      [pageSize100Top, 100], [pageSize200Top, 200], [pageSize300Top, 300], [pageSizeAllTop, Infinity],
      [pageSize100Bottom, 100], [pageSize200Bottom, 200], [pageSize300Bottom, 300], [pageSizeAllBottom, Infinity],
    ];

    allBtns.forEach(([btn, val]) => {
      if (!btn) return;
      btn.classList.remove("bg-white", "dark:bg-[#1a1926]", "text-primary", "shadow-sm");
      if (pageSize === val) btn.className = btn.className + " bg-white dark:bg-[#1a1926] text-primary shadow-sm";
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

    const onChangeTop = () => { syncFromTopToBottom(); page = 1; render(); };
    const onChangeBottom = () => { syncFromBottomToTop(); page = 1; render(); };

    dateFromTop && dateFromTop.addEventListener("change", onChangeTop);
    dateToTop && dateToTop.addEventListener("change", onChangeTop);

    dateFromBottom && dateFromBottom.addEventListener("change", onChangeBottom);
    dateToBottom && dateToBottom.addEventListener("change", onChangeBottom);

    const shiftRange = (dir /* -1 | +1 */) => {
      // usa top
      const fromVal = (dateFromTop?.value || "").trim();
      const toVal = (dateToTop?.value || "").trim();

      if (!fromVal && !toVal) return; // nada que mover

      const from = fromVal ? new Date(fromVal + "T00:00:00") : null;
      const to = toVal ? new Date(toVal + "T00:00:00") : null;

      // si solo hay uno, movemos 1 día
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

    btnExportarTodo && btnExportarTodo.addEventListener("click", () => {
      exportXLSX(allRows, `historico_todo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    btnExportarVista && btnExportarVista.addEventListener("click", () => {
      const base = applyFiltersBase(allRows);
      const view = applyViewMode(base);
      exportXLSX(view, `historico_vista_${viewMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  function bindFab() {
    fabTop && fabTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    fabBottom && fabBottom.addEventListener("click", () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }

  function bindLogout() {
    const show = () => logoutModal && logoutModal.classList.remove("hidden");
    const hide = () => logoutModal && logoutModal.classList.add("hidden");

    btnLogout && btnLogout.addEventListener("click", show);
    logoutCancel && logoutCancel.addEventListener("click", hide);
    logoutConfirm && logoutConfirm.addEventListener("click", async () => { await doLogout(); });

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });

    // click fuera (modal overlay)
    logoutModal && logoutModal.addEventListener("click", (e) => {
      if (e.target === logoutModal) hide();
    });
  }

  function bindDragScroll() {
    if (!tablaWrapper) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    tablaWrapper.addEventListener("mousedown", (e) => {
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

  // ---------- carga ----------
  async function cargarDatos() {
    try {
      btnActualizar && (btnActualizar.disabled = true);

      const res = await apiFetch("/api/historicoiys");
      if (!res.ok) throw new Error("No se pudo cargar histórico");

      const data = await res.json();
      allRows = Array.isArray(data) ? data : [];

      // limpia selección si cambió dataset
      selectedKeys.clear();
      page = 1;

      render();
    } catch (e) {
      console.error(e);
      alert("Error cargando datos (revisa consola / backend).");
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
  bindDragScroll();

  cargarDatos();
});
