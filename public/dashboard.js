// public/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // DASHBOARD - TABLE + FILTERS + STATS + EXPORT + UI
  // ==============================

  // ====== ELEMENTS ======
  const tableBody = document.getElementById("tablaHistorico");
  const pagerPrev = document.getElementById("pagerPrev");
  const pagerNext = document.getElementById("pagerNext");
  const pagerInfo = document.getElementById("pagerInfo");
  const searchInput = document.getElementById("searchInput");
  const chipsContainer = document.getElementById("chipsContainer");
  const selectAllCheckbox = document.getElementById("selectAll");

  const btnExport = document.getElementById("btnExport");
  const btnRefresh = document.getElementById("btnRefresh");

  const datePrev = document.getElementById("datePrev");
  const dateNext = document.getElementById("dateNext");
  const dateLabel = document.getElementById("dateLabel");
  const btnCalendar = document.getElementById("btnCalendar");
  const datePicker = document.getElementById("datePicker");
  const btnHoy = document.getElementById("btnHoy");
  const btn7d = document.getElementById("btn7d");
  const btn30d = document.getElementById("btn30d");

  const fabMain = document.getElementById("fabMain");
  const fabMenu = document.getElementById("fabMenu");

  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebar = document.getElementById("sidebar");
  const btnMenu = document.getElementById("btnMenu");
  const btnCloseSidebar = document.getElementById("btnCloseSidebar");
  const btnLogout = document.getElementById("btnLogout");

  const logoutModal = document.getElementById("logoutModal");
  const logoutCancel = document.getElementById("logoutCancel");
  const logoutConfirm = document.getElementById("logoutConfirm");

  // Stats
  const statPesoIngEl = document.getElementById("statPesoIng");
  const statPesoSalEl = document.getElementById("statPesoSal");
  const statPesoGananciaEl = document.getElementById("statPesoGanancia");
  const statValorIngEl = document.getElementById("statValorIng");
  const statValorSalEl = document.getElementById("statValorSal");
  const statPrediccionEl = document.getElementById("statPrediccion");

  // ====== STATE ======
  let allRows = [];
  let filteredRows = [];
  let selectedIds = new Set();

  // paging
  const PAGE_SIZE = 10;
  let page = 1;

  // date context
  // modes: "hoy" (only today), "7d" (last 7 days), "30d" (last 30 days), "all"
  let dateMode = "all";
  let anchorDate = new Date(); // used for "hoy" label navigation

  // active chip filters
  // each filter is { key, label, predicate(row) }
  let chipFilters = [];

  // ====== HELPERS ======
  const fmtDate = (d) =>
    new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  const parseISODate = (s) => {
    if (!s) return null;
    // Accept "YYYY-MM-DD" or full timestamp
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatMoney = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  };

  const diffDays = (d1, d2) => {
    const a = parseISODate(d1);
    const b = parseISODate(d2);
    if (!a || !b) return null;
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  };

  const rawValue = (row, k) => {
    // allows access to properties even if case differs
    if (!row || !k) return undefined;
    if (k in row) return row[k];
    const keyLower = k.toLowerCase();
    for (const kk of Object.keys(row)) {
      if (kk.toLowerCase() === keyLower) return row[kk];
    }
    return undefined;
  };

  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");

  // ====== SESIÓN / API HELPERS ======
  async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: "same-origin", ...options });
    if (res.status === 401) {
      // Sesión vencida o no iniciada
      window.location.href = "/";
      throw new Error("NO_SESSION");
    }
    return res;
  }

  async function doLogout() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch (_) {
      // si falla igual redirigimos
    }
    window.location.href = "/";
  }

  // ====== INIT ======
  initSidebar();
  initLogout();
  initPager();
  initSearch();
  initDateNav();
  initQuickDateButtons();
  initFab();
  initExport();

  cargarDatos();

  // ====== DATA LOAD ======
  async function cargarDatos() {
    try {
      btnRefresh && (btnRefresh.disabled = true);

      const res = await apiFetch("/api/historicoiys");
      if (!res.ok) throw new Error("No se pudo cargar histórico");

      const data = await res.json();
      allRows = Array.isArray(data) ? data : [];

      // apply context filters
      applyAllFilters();

      // keep selection consistent
      selectedIds.clear();
      updateSelectionUI();

      render();
    } catch (e) {
      console.error(e);
      alert("Error cargando datos.");
    } finally {
      btnRefresh && (btnRefresh.disabled = false);
    }
  }

  // ====== FILTERS PIPELINE ======
  function applyAllFilters() {
    let rows = [...allRows];

    // date context filter
    rows = applyDateFilter(rows);

    // chip filters
    for (const f of chipFilters) {
      rows = rows.filter(f.predicate);
    }

    // search text
    const q = (searchInput?.value || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const fields = [
          r.Numero,
          r.Color,
          r.Sexo,
          r.Edad,
          r.Marcallegada,
          r.Destino,
          r.FincaNombre,
          r.FincaIndicativo,
          r.Raza,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return fields.includes(q);
      });
    }

    filteredRows = rows;

    // page reset if overflow
    const maxPage = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    if (page > maxPage) page = maxPage;
  }

  function applyDateFilter(rows) {
    if (dateMode === "all") return rows;

    const startEnd = getDateRange();
    if (!startEnd) return rows;

    const { start, end } = startEnd;
    return rows.filter((r) => {
      const d = parseISODate(r.FechaIngreso);
      if (!d) return false;
      return d >= start && d < end;
    });
  }

  function getDateRange() {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);

    if (dateMode === "hoy") {
      const start = new Date(d);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }

    if (dateMode === "7d") {
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { start, end };
    }

    if (dateMode === "30d") {
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start, end };
    }

    return null;
  }

  function updateDateLabel() {
    if (!dateLabel) return;

    if (dateMode === "all") {
      dateLabel.textContent = "Todo el histórico";
      return;
    }

    const { start, end } = getDateRange();
    if (!start || !end) return;

    const endMinus = new Date(end);
    endMinus.setDate(endMinus.getDate() - 1);

    if (dateMode === "hoy") {
      dateLabel.textContent = `Día: ${fmtDate(anchorDate)}`;
    } else if (dateMode === "7d") {
      dateLabel.textContent = `Últimos 7 días: ${fmtDate(start)} - ${fmtDate(endMinus)}`;
    } else if (dateMode === "30d") {
      dateLabel.textContent = `Últimos 30 días: ${fmtDate(start)} - ${fmtDate(endMinus)}`;
    }
  }

  // ====== RENDER ======
  function render() {
    applyAllFilters();
    updateDateLabel();

    renderChips();
    renderTable();
    renderPager();
    updateSelectionUI();

    // stats use selection if any, otherwise filtered dataset
    const contextRows = selectedIds.size
      ? filteredRows.filter((r) => selectedIds.has(r.id))
      : filteredRows;

    actualizarEstadisticas(contextRows);
  }

  function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const startIdx = (page - 1) * PAGE_SIZE;
    const pageRows = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);

    for (const r of pageRows) {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50";

      const checked = selectedIds.has(r.id);
      const utilidad = calcularUtilidad(r);

      tr.innerHTML = `
        <td class="px-3 py-2">
          <input type="checkbox" class="rowCheck rounded" data-id="${r.id}" ${checked ? "checked" : ""}/>
        </td>
        <td class="px-3 py-2 font-semibold">${r.Numero ?? ""}</td>
        <td class="px-3 py-2">${r.FincaIndicativo ?? r.FincaNombre ?? ""}</td>
        <td class="px-3 py-2">${r.Sexo ?? ""}</td>
        <td class="px-3 py-2">${fmtMaybeDate(r.FechaIngreso)}</td>
        <td class="px-3 py-2">${fmtMaybeDate(r.FechaSalida)}</td>
        <td class="px-3 py-2 text-right">${fmtNum(r.Peso)}</td>
        <td class="px-3 py-2 text-right">${fmtNum(r.PesoSalida)}</td>
        <td class="px-3 py-2 text-right">${fmtMoneyCell(utilidad)}</td>
      `;

      tableBody.appendChild(tr);
    }

    // bind checks
    tableBody.querySelectorAll(".rowCheck").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = Number(e.target.dataset.id);
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectionUI();
        render(); // update stats based on selection
      });
    });
  }

  function renderPager() {
    const total = filteredRows.length;
    const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pagerInfo) pagerInfo.textContent = `Página ${page} de ${maxPage} (${total} registro(s))`;

    pagerPrev && (pagerPrev.disabled = page <= 1);
    pagerNext && (pagerNext.disabled = page >= maxPage);
  }

  function renderChips() {
    if (!chipsContainer) return;
    chipsContainer.innerHTML = "";

    for (const f of chipFilters) {
      const chip = document.createElement("button");
      chip.className =
        "px-3 py-1 rounded-full text-sm bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-2";
      chip.innerHTML = `<span>${f.label}</span><span class="text-slate-500">✕</span>`;
      chip.addEventListener("click", () => {
        chipFilters = chipFilters.filter((x) => x.key !== f.key);
        render();
      });
      chipsContainer.appendChild(chip);
    }

    // "Clear"
    if (chipFilters.length) {
      const clear = document.createElement("button");
      clear.className = "px-3 py-1 rounded-full text-sm bg-rose-50 hover:bg-rose-100 border border-rose-200";
      clear.textContent = "Limpiar filtros";
      clear.addEventListener("click", () => {
        chipFilters = [];
        render();
      });
      chipsContainer.appendChild(clear);
    }
  }

  // ====== FORMATTERS ======
  function fmtMaybeDate(v) {
    const d = parseISODate(v);
    return d ? fmtDate(d) : "-";
  }

  function fmtNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(1) : "-";
  }

  function fmtMoneyCell(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    const cls = n >= 0 ? "text-emerald-700" : "text-rose-700";
    return `<span class="${cls}">${formatMoney(n)}</span>`;
  }

  // ====== BUSINESS CALCS ======
  function calcularUtilidad(r) {
    // utilidad = totalSalida - (totalIngreso + costos)
    const pesoIng = Number(r.Peso) || 0;
    const pesoSal = Number(r.PesoSalida) || 0;

    const vIng = Number(r.ValorKGingreso) || 0;
    const vSal = Number(r.ValorKGsalida) || 0;

    const totalIngreso = pesoIng * vIng;
    const totalSalida = pesoSal * vSal;

    const flete = Number(r.Flete) || 0;
    const comision = Number(r.Comision) || 0;
    const mermas = Number(r.Mermas) || 0;

    const costos = flete + comision + mermas;

    const utilidad = totalSalida - (totalIngreso + costos);
    return utilidad;
  }

  // Also expose some computed values for stats
  function enrichRow(r) {
    const pesoIng = Number(r.Peso) || 0;
    const pesoSal = Number(r.PesoSalida) || 0;
    const vIng = Number(r.ValorKGingreso) || 0;
    const vSal = Number(r.ValorKGsalida) || 0;

    const totalIngreso = pesoIng * vIng;
    const totalSalida = pesoSal * vSal;

    const flete = Number(r.Flete) || 0;
    const comision = Number(r.Comision) || 0;
    const mermas = Number(r.Mermas) || 0;

    const costos = flete + comision + mermas;
    const utilidad = totalSalida - (totalIngreso + costos);

    return { ...r, totalIngreso, totalSalida, costos, utilidad };
  }

  // ====== ESTADÍSTICAS ======
  function actualizarEstadisticas(rows) {
    const safeSet = (el, txt) => el && (el.textContent = txt);

    const arr = Array.isArray(rows) ? rows : [];
    if (!arr.length) {
      safeSet(statPesoIngEl, "-");
      safeSet(statPesoSalEl, "-");
      safeSet(statPesoGananciaEl, "-");
      safeSet(statValorIngEl, "-");
      safeSet(statValorSalEl, "-");
      if (statPrediccionEl) statPrediccionEl.textContent = "Sin datos suficientes para analizar.";
      return;
    }

    const esSalida = (r) => !!(r?.FechaSalida && (Number(r?.PesoSalida) || 0) > 0);

    // Normaliza sexo (Macho/Hembra)
    const normSexo = (s) => {
      const v = (s ?? "").toString().trim().toUpperCase();
      if (!v) return "N/A";
      if (v.startsWith("M")) return "MACHO";
      if (v.startsWith("H")) return "HEMBRA";
      return "OTRO";
    };

    const salidas = arr.filter(esSalida);

    const pesosIng = salidas.map((r) => Number(r.Peso)).filter((v) => Number.isFinite(v) && v > 0);
    const pesosSal = salidas.map((r) => Number(r.PesoSalida)).filter((v) => Number.isFinite(v) && v > 0);

    const valIng = salidas
      .map((r) => Number(r.ValorKGingreso))
      .filter((v) => Number.isFinite(v) && v > 0);

    const valSal = salidas
      .map((r) => Number(r.ValorKGsalida))
      .filter((v) => Number.isFinite(v) && v > 0);

    const difPesos = salidas
      .map((r) => {
        const pi = Number(r.Peso);
        const ps = Number(r.PesoSalida);
        if (Number.isFinite(pi) && Number.isFinite(ps) && ps > 0) return ps - pi;
        return null;
      })
      .filter((v) => v !== null);

    const diasArr = salidas
      .map((r) => diffDays(r.FechaIngreso, r.FechaSalida))
      .filter((v) => Number.isFinite(v) && v >= 0);

    const utilidades = salidas
      .map((r) => Number(rawValue(r, "utilidad")))
      .filter((v) => Number.isFinite(v));

    const ingresosTotal = salidas
      .map((r) => Number(rawValue(r, "totalIngreso")))
      .filter((v) => Number.isFinite(v) && v > 0);

    const prom = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const gPeso = prom(difPesos);
    const vIng = prom(valIng);
    const vSal = prom(valSal);

    const avgDias = prom(diasArr);
    const avgUtil = prom(utilidades);
    const avgIngreso = prom(ingresosTotal);

    const avgMargenPct = avgIngreso > 0 ? (avgUtil / avgIngreso) * 100 : 0;
    const avgUtilDia = avgDias > 0 ? avgUtil / avgDias : 0;
    const avgKgDia = avgDias > 0 ? gPeso / avgDias : 0;

    safeSet(statPesoIngEl, pesosIng.length ? `${pIng.toFixed(1)} kg` : "-");
    safeSet(statPesoSalEl, pesosSal.length ? `${pSal.toFixed(1)} kg` : "-");
    safeSet(statPesoGananciaEl, difPesos.length ? `${gPeso.toFixed(1)} kg` : "-");
    safeSet(statValorIngEl, valIng.length ? formatMoney(vIng) : "-");
    safeSet(statValorSalEl, valSal.length ? formatMoney(vSal) : "-");

    // Machos/Hembras (sobre el filtro actual)
    const sexCounts = arr.reduce(
      (acc, r) => {
        const k = normSexo(r.Sexo);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      { MACHO: 0, HEMBRA: 0, OTRO: 0, "N/A": 0 }
    );

    // Buckets por peso de ingreso para sugerencia
    function sugerenciaPesoIngreso() {
      if (salidas.length < 5) return null;

      const step = 25; // kg
      const buckets = new Map();

      for (const r of salidas) {
        const w = Number(r.Peso);
        const d = diffDays(r.FechaIngreso, r.FechaSalida);
        const u = Number(rawValue(r, "utilidad"));
        if (!Number.isFinite(w) || w <= 0) continue;
        if (!Number.isFinite(u)) continue;
        if (!Number.isFinite(d) || d <= 0) continue;

        const start = Math.floor(w / step) * step;
        const key = `${start}-${start + step}`;
        const b = buckets.get(key) || {
          key,
          start,
          end: start + step,
          n: 0,
          sumUtil: 0,
          sumDias: 0,
          sumIng: 0,
        };

        b.n += 1;
        b.sumUtil += u;
        b.sumDias += d;
        b.sumIng += Number(rawValue(r, "totalIngreso")) || 0;

        buckets.set(key, b);
      }

      const stats = Array.from(buckets.values())
        .map((b) => {
          const avgU = b.sumUtil / b.n;
          const avgD = b.sumDias / b.n;
          const avgUDia = avgD > 0 ? avgU / avgD : 0;
          const avgIng = b.sumIng / b.n;
          const avgMarg = avgIng > 0 ? (avgU / avgIng) * 100 : 0;
          return { ...b, avgU, avgD, avgUDia, avgMarg };
        })
        // Evita sugerencias con muy pocos datos
        .filter((b) => b.n >= 3);

      if (!stats.length) return null;

      const bestPorDia = [...stats].sort((a, b) => b.avgUDia - a.avgUDia)[0];
      const bestTotal = [...stats].sort((a, b) => b.avgU - a.avgU)[0];

      return { bestPorDia, bestTotal, step };
    }

    const sug = sugerenciaPesoIngreso();

    // Mensaje rico en "Predicción simple"
    if (statPrediccionEl) {
      const parts = [];

      const nSal = salidas.length;
      parts.push(
        `<strong>Resumen (según el filtro actual)</strong>: ${arr.length.toLocaleString("es-CO")} registro(s), ${nSal.toLocaleString("es-CO")} salida(s).`
      );

      parts.push(
        `Sexo: Machos ${sexCounts.MACHO.toLocaleString("es-CO")}, Hembras ${sexCounts.HEMBRA.toLocaleString(
          "es-CO"
        )}` +
          (sexCounts["N/A"] ? `, Sin dato ${sexCounts["N/A"].toLocaleString("es-CO")}` : "") +
          (sexCounts.OTRO ? `, Otros ${sexCounts.OTRO.toLocaleString("es-CO")}` : "")
      );

      if (nSal) {
        if (diasArr.length) parts.push(`Promedio días en hacienda (salidas): <strong>${avgDias.toFixed(1)}</strong> días.`);
        if (utilidades.length) {
          parts.push(`Utilidad promedio por animal (salidas): <strong>${formatMoney(avgUtil)}</strong> (${avgMargenPct.toFixed(2)}%).`);
          if (avgDias > 0) parts.push(`Utilidad promedio por día: <strong>${formatMoney(avgUtilDia)}</strong>.`);
        }
        if (difPesos.length) {
          parts.push(
            `Ganancia de peso promedio (salidas): <strong>${gPeso.toFixed(1)} kg</strong>` +
              (avgDias > 0 ? ` (~${avgKgDia.toFixed(2)} kg/día).` : ".")
          );
        }
      } else {
        parts.push("Aún no hay salidas dentro de este filtro, por eso no se puede analizar utilidad/tiempos.");
      }

      if (sug?.bestPorDia) {
        const b = sug.bestPorDia;
        const c = sug.bestTotal;

        parts.push(`<strong>Sugerencia de peso de ingreso</strong> (guía basada en tu histórico, no garantía):`);

        parts.push(
          `• Para <strong>maximizar utilidad por día</strong>: en tu histórico, los ingresos de <strong>${b.start}-${b.end} kg</strong> dieron mejor utilidad/día (n=${b.n}). ` +
            `Prom: ${formatMoney(b.avgU)} por animal en ${b.avgD.toFixed(1)} días (${formatMoney(b.avgUDia)}/día).`
        );

        if (c && c.key !== b.key) {
          parts.push(
            `• Para <strong>maximizar utilidad total</strong>: el rango <strong>${c.start}-${c.end} kg</strong> fue el mejor (n=${c.n}). ` +
              `Prom: ${formatMoney(c.avgU)} por animal (${c.avgMarg.toFixed(2)}%).`
          );
        }

        parts.push(
          `Tip: si el precio de compra sube o el de venta baja, filtra por fechas recientes y mira si el rango recomendado cambia.`
        );
      } else if (nSal) {
        parts.push(
          "Sugerencia de peso: todavía no hay suficientes salidas (con peso/días/utilidad) para recomendar un rango de peso de ingreso con confianza."
        );
      }

      statPrediccionEl.innerHTML = parts.join("<br>");
    }
  }

  // ====== EXPORTAR ======
  function initExport() {
    if (!btnExport) return;
    btnExport.addEventListener("click", exportToCSV);
  }

  function exportToCSV() {
    // Export selection if any else filtered
    const rows = selectedIds.size ? filteredRows.filter((r) => selectedIds.has(r.id)) : filteredRows;
    if (!rows.length) return alert("No hay datos para exportar.");

    // columns
    const cols = [
      "Numero",
      "FincaIndicativo",
      "Sexo",
      "FechaIngreso",
      "FechaSalida",
      "Peso",
      "PesoSalida",
      "ValorKGingreso",
      "ValorKGsalida",
      "Flete",
      "Comision",
      "Mermas",
      "Destino",
      "Raza",
    ];

    const header = cols.join(",");
    const lines = rows.map((r) =>
      cols
        .map((c) => {
          const v = rawValue(r, c);
          const s = v === null || v === undefined ? "" : String(v);
          // escape
          if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
          return s;
        })
        .join(",")
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // ====== PAGER ======
  function initPager() {
    pagerPrev && pagerPrev.addEventListener("click", () => (page = Math.max(1, page - 1)) && render());
    pagerNext && pagerNext.addEventListener("click", () => (page = page + 1) && render());

    selectAllCheckbox &&
      selectAllCheckbox.addEventListener("change", (e) => {
        const startIdx = (page - 1) * PAGE_SIZE;
        const pageRows = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);

        if (e.target.checked) {
          pageRows.forEach((r) => selectedIds.add(r.id));
        } else {
          pageRows.forEach((r) => selectedIds.delete(r.id));
        }

        updateSelectionUI();
        renderTable();
        actualizarEstadisticas(selectedIds.size ? filteredRows.filter((r) => selectedIds.has(r.id)) : filteredRows);
      });

    btnRefresh && btnRefresh.addEventListener("click", cargarDatos);
  }

  function updateSelectionUI() {
    if (!selectAllCheckbox) return;

    const startIdx = (page - 1) * PAGE_SIZE;
    const pageRows = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);

    if (!pageRows.length) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    const selectedCount = pageRows.filter((r) => selectedIds.has(r.id)).length;
    selectAllCheckbox.checked = selectedCount === pageRows.length;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < pageRows.length;
  }

  // ====== SEARCH ======
  function initSearch() {
    if (!searchInput) return;
    searchInput.addEventListener("input", () => {
      page = 1;
      render();
    });
  }

  // ====== DATE NAV ======
  function initDateNav() {
    if (btnCalendar && datePicker) {
      btnCalendar.addEventListener("click", () => datePicker.showPicker && datePicker.showPicker());
      datePicker.addEventListener("change", () => {
        const d = new Date(datePicker.value);
        if (!isNaN(d.getTime())) {
          anchorDate = d;
          dateMode = "hoy";
          page = 1;
          render();
        }
      });
    }

    datePrev &&
      datePrev.addEventListener("click", () => {
        if (dateMode === "all") return;
        anchorDate.setDate(anchorDate.getDate() - 1);
        page = 1;
        render();
      });

    dateNext &&
      dateNext.addEventListener("click", () => {
        if (dateMode === "all") return;
        anchorDate.setDate(anchorDate.getDate() + 1);
        page = 1;
        render();
      });
  }

  function initQuickDateButtons() {
    btnHoy &&
      btnHoy.addEventListener("click", () => {
        dateMode = "hoy";
        anchorDate = new Date();
        page = 1;
        render();
      });

    btn7d &&
      btn7d.addEventListener("click", () => {
        dateMode = "7d";
        anchorDate = new Date();
        page = 1;
        render();
      });

    btn30d &&
      btn30d.addEventListener("click", () => {
        dateMode = "30d";
        anchorDate = new Date();
        page = 1;
        render();
      });

    // clicking label toggles all
    dateLabel &&
      dateLabel.addEventListener("click", () => {
        dateMode = "all";
        page = 1;
        render();
      });

    updateDateLabel();
  }

  // ====== FAB ======
  function initFab() {
    if (!fabMain || !fabMenu) return;

    fabMain.addEventListener("click", () => {
      fabMenu.classList.toggle("hidden");
    });

    fabMenu.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        fabMenu.classList.add("hidden");
        if (action === "ingreso") window.location.href = "/ingreso.html";
        if (action === "salida") window.location.href = "/salida.html";
        if (action === "modificaciones") window.location.href = "/modificaciones.html";
      });
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!fabMenu.contains(target) && !fabMain.contains(target)) {
        fabMenu.classList.add("hidden");
      }
    });
  }

  // ====== SIDEBAR ======
  function initSidebar() {
    if (!sidebar || !sidebarOverlay) return;

    const openSidebar = () => {
      sidebar.classList.remove("-translate-x-full");
      sidebarOverlay.classList.remove("hidden");
    };

    const closeSidebar = () => {
      sidebar.classList.add("-translate-x-full");
      sidebarOverlay.classList.add("hidden");
    };

    btnMenu && btnMenu.addEventListener("click", openSidebar);
    btnCloseSidebar && btnCloseSidebar.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    // nav buttons
    sidebar.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nav = btn.dataset.nav;
        closeSidebar();
        if (nav === "dashboard") window.location.href = "/dashboard.html";
        if (nav === "ingreso") window.location.href = "/ingreso.html";
        if (nav === "salida") window.location.href = "/salida.html";
        if (nav === "modificaciones") window.location.href = "/modificaciones.html";
      });
    });
  }

  // ====== LOGOUT ======
  function initLogout() {
    const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

    on(btnLogout, "click", () => show(logoutModal));
    on(logoutCancel, "click", () => hide(logoutModal));
    on(logoutConfirm, "click", async () => {
      await doLogout();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide(logoutModal);
    });
  }
});
