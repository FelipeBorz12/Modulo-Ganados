// public/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  // ====== DOM BÁSICO ======
  const tablaHead = document.getElementById('tabla-head');
  const tablaBody = document.getElementById('tabla-body');
  const tablaWrapper = document.getElementById('tabla-wrapper');

  const totalGeneralEl = document.getElementById('total-general');
  const totalIngresosEl = document.getElementById('total-ingresos');
  const totalSalidasEl = document.getElementById('total-salidas');
  const totalValorIngresoEl = document.getElementById('total-valor-ingreso');
  const totalValorSalidaEl = document.getElementById('total-valor-salida');

  const statPesoIngEl = document.getElementById('stat-peso-ing');
  const statPesoSalEl = document.getElementById('stat-peso-sal');
  const statPesoGananciaEl = document.getElementById('stat-peso-ganancia');
  const statValorIngEl = document.getElementById('stat-valor-ing');
  const statValorSalEl = document.getElementById('stat-valor-sal');
  const statPrediccionEl = document.getElementById('stat-prediccion');

  const btnIngresoTab = document.getElementById('btn-ingreso');
  const btnSalidaTab = document.getElementById('btn-salida');

  const btnActualizar = document.getElementById('btn-actualizar');
  const btnExportarTodo = document.getElementById('btn-exportar-todo');
  const btnExportarVista = document.getElementById('btn-exportar-vista');
  const selectionInfo = document.getElementById('selection-info');

  const scrollLeftBtn = document.getElementById('scroll-left');
  const scrollRightBtn = document.getElementById('scroll-right');

  const btnLogout = document.getElementById('btn-logout');
  const logoutModal = document.getElementById('logout-modal');
  const logoutCancel = document.getElementById('logout-cancel');
  const logoutConfirm = document.getElementById('logout-confirm');

  // ====== ESTADO ======
  let registros = [];
  let vistaActual = 'ingreso'; // 'ingreso' | 'salida'
  let filtros = {}; // {colKey: texto}
  let sortConfig = { key: null, direction: 'asc' };
  let vistaFiltradaActual = [];
  const selectedNumeros = new Set();

  // Configuración de columnas de datos (sin # ni checkbox)
  const columnasIngreso = [
    { key: 'Numero', label: 'Número' },
    { key: 'FechaIngreso', label: 'F Ingreso' },
    { key: 'Color', label: 'Color' },
    { key: 'Edad', label: 'Edad' },
    { key: 'Sexo', label: 'Sexo' },
    { key: 'Marcallegada', label: 'Marca' },
    { key: 'Peso', label: 'P Ingreso' },
    { key: 'ValorKGingreso', label: 'V Ingreso' },
    { key: 'Flete', label: 'V Flete' },
    { key: 'Comision', label: 'V Comisión' },
    { key: 'totalIngreso', label: 'T Ingreso' },
  ];

  const columnasSalida = [
    { key: 'Numero', label: 'Número' },
    { key: 'FechaSalida', label: 'F Salida' },
    { key: 'Destino', label: 'Destino' },
    { key: 'PesoSalida', label: 'P Salida' },
    { key: 'PesoFinca', label: 'P Finca' },
    { key: 'ValorKGsalida', label: 'V Salida' },
    { key: 'Flete', label: 'V Flete' },
    { key: 'Comision', label: 'V Comisión' },
    { key: 'totalSalida', label: 'T Salida' },
  ];

  function getColumnConfig() {
    return vistaActual === 'ingreso' ? columnasIngreso : columnasSalida;
  }

  // ====== UTILIDADES ======

  function formatMoney(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });
  }

  function rawValue(row, key) {
    if (key === 'totalIngreso') {
      // NUEVA FÓRMULA: Peso * ValorKGingreso + Flete
      const peso = Number(row.Peso) || 0;
      const valor = Number(row.ValorKGingreso) || 0;
      const flete = Number(row.Flete) || 0;
      return peso * valor + flete;
    }
    if (key === 'totalSalida') {
      const vSal = Number(row.ValorKGsalida) || 0;
      const c = Number(row.Comision) || 0;
      const f = Number(row.Flete) || 0;
      return vSal + c + f;
    }
    return row[key];
  }

  function formatCell(key, value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const v = value.trim();
      if (!v || v === '...') return '';
      return v;
    }

    if (key === 'totalIngreso' || key === 'totalSalida') {
      return formatMoney(value);
    }

    if (
      key === 'ValorKGingreso' ||
      key === 'ValorKGsalida' ||
      key === 'Flete' ||
      key === 'Comision'
    ) {
      const num = Number(value) || 0;
      return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    }

    return value;
  }

  function setTabStyles() {
    const active = ['bg-indigo-600', 'text-white', 'shadow'];
    const inactive = ['bg-transparent', 'text-indigo-700'];

    if (vistaActual === 'ingreso') {
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

  // ====== CABECERA + FILTROS ======

  function construirHead() {
    const cols = getColumnConfig();
    tablaHead.innerHTML = '';

    // Fila de encabezados (orden + selección)
    const trHeader = document.createElement('tr');
    trHeader.className = 'bg-indigo-600 text-white';

    // Columna # (sin sort)
    const thIndex = document.createElement('th');
    thIndex.className =
      'px-3 py-2 text-left align-bottom whitespace-nowrap text-sm md:text-base';
    thIndex.textContent = '#';
    trHeader.appendChild(thIndex);

    // Columna checkbox header
    const thCheck = document.createElement('th');
    thCheck.className = 'px-3 py-2 text-center align-bottom';
    const headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.id = 'select-all-checkbox';
    headerCheckbox.className =
      'h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500';
    headerCheckbox.addEventListener('change', () => {
      handleSelectAll(headerCheckbox.checked);
    });
    thCheck.appendChild(headerCheckbox);
    trHeader.appendChild(thCheck);

    // Resto de columnas de datos
    cols.forEach((col) => {
      const th = document.createElement('th');
      th.className =
        'px-3 py-2 text-left align-bottom whitespace-nowrap text-sm md:text-base';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.sortKey = col.key;
      btn.className = 'flex items-center gap-1';

      const spanLabel = document.createElement('span');
      spanLabel.textContent = col.label;

      const spanIcon = document.createElement('span');
      spanIcon.dataset.sortIcon = col.key;
      spanIcon.className = 'text-[10px] opacity-40';
      spanIcon.textContent = '⇅';

      btn.appendChild(spanLabel);
      btn.appendChild(spanIcon);
      th.appendChild(btn);
      trHeader.appendChild(th);
    });

    tablaHead.appendChild(trHeader);

    // Fila de filtros
    const trFilters = document.createElement('tr');
    trFilters.className = 'bg-indigo-50 text-[10px] md:text-xs';

    // Columna # sin filtro
    const thIndexFilter = document.createElement('th');
    thIndexFilter.className = 'px-3 py-1';
    trFilters.appendChild(thIndexFilter);

    // Columna checkbox sin filtro
    const thCheckFilter = document.createElement('th');
    thCheckFilter.className = 'px-3 py-1';
    trFilters.appendChild(thCheckFilter);

    // Filtros para cada columna de datos
    cols.forEach((col) => {
      const th = document.createElement('th');
      th.className = 'px-3 py-1';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filtrar...';
      input.className =
        'w-full px-2 py-1 rounded-md border border-indigo-100 bg-white text-[10px] md:text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400';
      input.dataset.filter = col.key;
      input.value = filtros[col.key] || '';

      input.addEventListener('input', () => {
        filtros[col.key] = input.value.trim().toLowerCase();
        aplicarFiltrosYRender();
      });

      th.appendChild(input);
      trFilters.appendChild(th);
    });

    tablaHead.appendChild(trFilters);

    // Listeners de orden
    tablaHead.querySelectorAll('[data-sort-key]').forEach((btn) => {
      btn.addEventListener('click', () =>
        manejarOrden(btn.dataset.sortKey)
      );
    });
  }

  function actualizarSortIcons() {
    const icons = tablaHead.querySelectorAll('[data-sort-icon]');
    icons.forEach((icon) => {
      const key = icon.dataset.sortIcon;
      if (sortConfig.key === key) {
        icon.textContent = sortConfig.direction === 'asc' ? '⇧' : '⇩';
        icon.classList.remove('opacity-40');
        icon.classList.add('opacity-90');
      } else {
        icon.textContent = '⇅';
        icon.classList.add('opacity-40');
      }
    });
  }

  function manejarOrden(key) {
    const cols = getColumnConfig();
    const existe = cols.some((c) => c.key === key);
    if (!existe) return;

    if (sortConfig.key === key) {
      sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortConfig.key = key;
      sortConfig.direction = 'asc';
    }
    aplicarFiltrosYRender();
  }

  // ====== CARGA Y FILTRADO ======

  async function cargarDatos() {
    try {
      const res = await fetch('/api/historicoiys');
      const data = await res.json();
      registros = Array.isArray(data) ? data : [];
      aplicarFiltrosYRender();
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  }

  function aplicarFiltrosYRender() {
    // 1. Filtros sobre todos los registros
    const filtradosGlobal = registros.filter((r) =>
      Object.entries(filtros).every(([key, val]) => {
        if (!val) return true;
        const raw = rawValue(r, key);
        const text = (raw ?? '').toString().toLowerCase();
        return text.includes(val);
      })
    );

    // 2. Contexto con selección
    const contextRows =
      selectedNumeros.size > 0
        ? filtradosGlobal.filter((r) => selectedNumeros.has(r.Numero))
        : filtradosGlobal;

    // 3. Ingresos/Salidas dentro del contexto (para totales y stats)
    const ingresosContext = contextRows.filter(
      (r) => !r.FechaSalida && !r.PesoSalida
    );
    const salidasContext = contextRows.filter(
      (r) => r.FechaSalida && r.PesoSalida
    );

    // 4. Totales
    const total = contextRows.length;
    const totalIngresos = ingresosContext.length;
    const totalSalidas = salidasContext.length;

    const totalValorIngreso = ingresosContext.reduce(
      (acc, r) => acc + rawValue(r, 'totalIngreso'),
      0
    );

    const totalValorSalida = salidasContext.reduce(
      (acc, r) => acc + rawValue(r, 'totalSalida'),
      0
    );

    totalGeneralEl.textContent = total;
    totalIngresosEl.textContent = totalIngresos;
    totalSalidasEl.textContent = totalSalidas;
    totalValorIngresoEl.textContent = formatMoney(totalValorIngreso);
    totalValorSalidaEl.textContent = formatMoney(totalValorSalida);

    // 5. Estadísticas
    actualizarEstadisticas(contextRows);

    // 6. Filas visibles según vista
    let visiblesBase =
      vistaActual === 'ingreso'
        ? filtradosGlobal.filter((r) => !r.FechaSalida && !r.PesoSalida)
        : filtradosGlobal.filter((r) => r.FechaSalida && r.PesoSalida);

    // Si hay selección, sólo lo seleccionado dentro de la vista
    if (selectedNumeros.size > 0) {
      visiblesBase = visiblesBase.filter((r) =>
        selectedNumeros.has(r.Numero)
      );
    }

    // Orden
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

          if (typeof va === 'number' && typeof vb === 'number') {
            return direction === 'asc' ? va - vb : vb - va;
          }

          const sa = va.toString().toLowerCase();
          const sb = vb.toString().toLowerCase();
          if (sa < sb) return direction === 'asc' ? -1 : 1;
          if (sa > sb) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      } else {
        sortConfig.key = null;
      }
    }

    vistaFiltradaActual = visibles;

    // 7. Renderizar
    construirHead();
    renderTabla(visibles);
    actualizarSortIcons();
    actualizarSelectionInfo(filtradosGlobal.length, contextRows.length);
    actualizarHeaderCheckbox();
    setTimeout(actualizarVisibilidadScrollButtons, 50);
  }

  function renderTabla(filas) {
    const cols = getColumnConfig();
    tablaBody.innerHTML = '';

    filas.forEach((row, idx) => {
      const numero = row.Numero;
      const isSelected = selectedNumeros.has(numero);

      const baseColor =
        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

      const tr = document.createElement('tr');
      tr.className =
        baseColor +
        ' hover:bg-indigo-50/60 transition-colors';

      tr.dataset.numero = numero;

      // Columna # (1..n)
      const tdIndex = document.createElement('td');
      tdIndex.className = 'px-3 py-1.5 whitespace-nowrap';
      tdIndex.textContent = idx + 1;
      tr.appendChild(tdIndex);

      // Columna checkbox
      const tdCheck = document.createElement('td');
      tdCheck.className = 'px-3 py-1.5 text-center';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className =
        'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';
      cb.checked = isSelected;
      cb.dataset.numero = numero;
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCheckboxChange(numero, cb.checked);
      });
      tdCheck.appendChild(cb);
      tr.appendChild(tdCheck);

      // Celdas de datos
      cols.forEach((col) => {
        const td = document.createElement('td');
        td.className = 'px-3 py-1.5 whitespace-nowrap';
        const val = rawValue(row, col.key);
        td.textContent = formatCell(col.key, val);
        tr.appendChild(td);
      });

      tablaBody.appendChild(tr);
    });
  }

  function handleCheckboxChange(numero, checked) {
    if (checked) {
      selectedNumeros.add(numero);
    } else {
      selectedNumeros.delete(numero);
    }
    aplicarFiltrosYRender();
  }

  function handleSelectAll(checked) {
    if (checked) {
      vistaFiltradaActual.forEach((r) => selectedNumeros.add(r.Numero));
    } else {
      vistaFiltradaActual.forEach((r) => selectedNumeros.delete(r.Numero));
    }
    aplicarFiltrosYRender();
  }

  function actualizarHeaderCheckbox() {
    const headerCb = document.getElementById('select-all-checkbox');
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
    if (selectedNumeros.size === 0) {
      selectionInfo.textContent =
        'Totales basados en todos los registros filtrados.';
    } else {
      selectionInfo.textContent = `Totales basados en ${totalContext} registro(s) seleccionados (de ${totalFiltrados} filtrados).`;
    }
  }

  // ====== ESTADÍSTICAS ======

  function actualizarEstadisticas(rows) {
    if (!rows || rows.length === 0) {
      statPesoIngEl.textContent = '-';
      statPesoSalEl.textContent = '-';
      statPesoGananciaEl.textContent = '-';
      statValorIngEl.textContent = '-';
      statValorSalEl.textContent = '-';
      statPrediccionEl.textContent =
        'Sin datos suficientes para estimar.';
      return;
    }

    const pesosIng = rows
      .map((r) => Number(r.Peso))
      .filter((v) => Number.isFinite(v) && v > 0);

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
        if (
          Number.isFinite(pi) &&
          Number.isFinite(ps) &&
          ps > 0 &&
          r.FechaSalida
        ) {
          return ps - pi;
        }
        return null;
      })
      .filter((v) => v !== null);

    const prom = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const pIng = prom(pesosIng);
    const pSal = prom(pesosSal);
    const gPeso = prom(paresGanancia);
    const vIng = prom(valIng);
    const vSal = prom(valSal);

    statPesoIngEl.textContent = pesosIng.length
      ? `${pIng.toFixed(1)} kg`
      : '-';
    statPesoSalEl.textContent = pesosSal.length
      ? `${pSal.toFixed(1)} kg`
      : '-';
    statPesoGananciaEl.textContent = paresGanancia.length
      ? `${gPeso.toFixed(1)} kg`
      : '-';

    statValorIngEl.textContent = valIng.length
      ? formatMoney(vIng)
      : '-';
    statValorSalEl.textContent = valSal.length
      ? formatMoney(vSal)
      : '-';

    if (paresGanancia.length) {
      statPrediccionEl.textContent = `Si se mantiene la ganancia promedio actual de ${gPeso.toFixed(
        1
      )} kg por animal, los próximos lotes podrían comportarse de forma similar (estimación basada en el histórico actual).`;
    } else {
      statPrediccionEl.textContent =
        'Aún no hay suficientes registros con ingreso y salida para estimar una ganancia promedio de peso.';
    }
  }

  // ====== EXPORTAR ======

  function exportarVistaActual() {
    if (!vistaFiltradaActual.length) {
      alert('No hay datos para exportar.');
      return;
    }

    const cols = getColumnConfig();
    const datos = vistaFiltradaActual.map((r, idx) => {
      const obj = { '#': idx + 1 };
      cols.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Historico_${vistaActual}_vista_${fecha}.xlsx`);
  }

  function exportarTodo() {
    if (!registros.length) {
      alert('No hay datos para exportar.');
      return;
    }

    const ingresosArr = registros.filter(
      (r) => !r.FechaSalida && !r.PesoSalida
    );
    const salidasArr = registros.filter(
      (r) => r.FechaSalida && r.PesoSalida
    );

    const wb = XLSX.utils.book_new();

    const datosIng = ingresosArr.map((r, idx) => {
      const obj = { '#': idx + 1 };
      columnasIngreso.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });
    const wsIng = XLSX.utils.json_to_sheet(datosIng);
    XLSX.utils.book_append_sheet(wb, wsIng, 'Ingresos');

    const datosSal = salidasArr.map((r, idx) => {
      const obj = { '#': idx + 1 };
      columnasSalida.forEach((col) => {
        obj[col.label] = rawValue(r, col.key);
      });
      return obj;
    });
    const wsSal = XLSX.utils.json_to_sheet(datosSal);
    XLSX.utils.book_append_sheet(wb, wsSal, 'Salidas');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Historico_completo_${fecha}.xlsx`);
  }

  // ====== SCROLL HORIZONTAL ======

  function actualizarVisibilidadScrollButtons() {
    const { scrollLeft, scrollWidth, clientWidth } = tablaWrapper;
    const hayOverflow = scrollWidth > clientWidth + 4;

    if (!hayOverflow) {
      scrollLeftBtn.classList.add('hidden');
      scrollRightBtn.classList.add('hidden');
      return;
    }

    scrollLeftBtn.classList.toggle('hidden', scrollLeft <= 0);
    scrollRightBtn.classList.toggle(
      'hidden',
      scrollLeft + clientWidth >= scrollWidth - 4
    );
  }

  scrollLeftBtn.addEventListener('click', () => {
    tablaWrapper.scrollBy({ left: -260, behavior: 'smooth' });
  });

  scrollRightBtn.addEventListener('click', () => {
    tablaWrapper.scrollBy({ left: 260, behavior: 'smooth' });
  });

  tablaWrapper.addEventListener('scroll', actualizarVisibilidadScrollButtons);
  window.addEventListener('resize', actualizarVisibilidadScrollButtons);

  // ====== LOGOUT ======

  btnLogout.addEventListener('click', () => {
    logoutModal.classList.remove('hidden');
  });

  logoutCancel.addEventListener('click', () => {
    logoutModal.classList.add('hidden');
  });

  logoutConfirm.addEventListener('click', () => {
    window.location.href = '/';
  });

  // ====== EVENTOS PRINCIPALES ======

  btnIngresoTab.addEventListener('click', () => {
    vistaActual = 'ingreso';
    setTabStyles();
    aplicarFiltrosYRender();
  });

  btnSalidaTab.addEventListener('click', () => {
    vistaActual = 'salida';
    setTabStyles();
    aplicarFiltrosYRender();
  });

  btnActualizar.addEventListener('click', () => {
    cargarDatos();
  });

  btnExportarVista.addEventListener('click', exportarVistaActual);
  btnExportarTodo.addEventListener('click', exportarTodo);

  // ====== INIT ======
  setTabStyles();
  cargarDatos().then(() => {
    setTimeout(actualizarVisibilidadScrollButtons, 200);
  });
});
