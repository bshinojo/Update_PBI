/* @ds-bundle: {"format":3,"namespace":"RFDDDesignSystem_cb1608","components":[],"sourceHashes":{"ui_kits/dashboard/BarChart.jsx":"145158ab9f00","ui_kits/dashboard/DashHeader.jsx":"6e9835eab5a5","ui_kits/dashboard/DataTable.jsx":"a4deae87997e","ui_kits/dashboard/Donut.jsx":"52cc159e6feb","ui_kits/dashboard/FilterBar.jsx":"2f5e25d4a3a5","ui_kits/dashboard/KpiTile.jsx":"052004e66de8","ui_kits/dashboard/LineChart.jsx":"37238d676ecb","ui_kits/website/Buttons.jsx":"88d35fbc0c17","ui_kits/website/ClientsWall.jsx":"c1c87c60b5eb","ui_kits/website/Differentiators.jsx":"05f9f25a7df9","ui_kits/website/FAQ.jsx":"a83e7b08dc82","ui_kits/website/Hero.jsx":"e43b98b201ef","ui_kits/website/ServicesGrid.jsx":"538b26157b44","ui_kits/website/SiteFooter.jsx":"ee182e70db50","ui_kits/website/SiteHeader.jsx":"d64002410de5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RFDDDesignSystem_cb1608 = window.RFDDDesignSystem_cb1608 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/dashboard/BarChart.jsx
try { (() => {
/* eslint-disable */
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const ACTUAL = [12.4, 14.1, 13.8, 16.2, 18.0, 17.1, 19.4, 20.2, 19.8, 21.6, 22.4, 24.1];
const BUDGET = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
window.BarChart = function BarChart() {
  const max = Math.max(...ACTUAL, ...BUDGET);
  const W = 520,
    H = 220,
    pad = 28,
    bw = (W - pad * 2) / MONTHS.length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, "Ventas Mensuales"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 22,
      color: '#0E2543',
      marginTop: 2
    }
  }, "Real vs. Presupuesto \xB7 2024")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      fontFamily: "'Inter'",
      fontSize: 11,
      color: '#4A5363'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 10,
      height: 10,
      background: '#0E2543',
      marginRight: 6,
      verticalAlign: 'middle'
    }
  }), "Real"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 10,
      height: 10,
      background: '#8FB8D6',
      marginRight: 6,
      verticalAlign: 'middle'
    }
  }), "Presupuesto"))), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: H,
    viewBox: `0 0 ${W} ${H}`
  }, [0, 0.5, 1].map(t => /*#__PURE__*/React.createElement("line", {
    key: t,
    x1: pad,
    x2: W - pad,
    y1: pad + (H - pad * 2) * t,
    y2: pad + (H - pad * 2) * t,
    stroke: "#EEF1F4",
    strokeWidth: "1"
  })), MONTHS.map((m, i) => {
    const ax = pad + i * bw + 4;
    const bx = ax + (bw - 8) / 2;
    const ah = (H - pad * 2) * ACTUAL[i] / max;
    const bh = (H - pad * 2) * BUDGET[i] / max;
    return /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: ax,
      y: H - pad - ah,
      width: (bw - 8) / 2 - 1,
      height: ah,
      fill: "#0E2543"
    }), /*#__PURE__*/React.createElement("rect", {
      x: bx,
      y: H - pad - bh,
      width: (bw - 8) / 2 - 1,
      height: bh,
      fill: "#8FB8D6"
    }), /*#__PURE__*/React.createElement("text", {
      x: ax + (bw - 8) / 2 - 1,
      y: H - 8,
      textAnchor: "middle",
      fontFamily: "'Inter'",
      fontSize: "10",
      fill: "#6B7585"
    }, m));
  })));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/BarChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashHeader.jsx
try { (() => {
/* eslint-disable */
window.DashHeader = function DashHeader({
  title,
  subtitle
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: '#fff',
      borderBottom: '1px solid #DEE2E8',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "",
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 32,
      background: '#DEE2E8'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 600,
      fontSize: 14,
      color: '#0E2543',
      lineHeight: 1.2
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585',
      marginTop: 2
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 12,
      color: '#6B7585'
    }
  }, "\xDAltima actualizaci\xF3n \xB7 hace 4 min"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: '#0E2543',
      color: '#F7F6F2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter'",
      fontWeight: 600,
      fontSize: 12
    }
  }, "JR")));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DataTable.jsx
try { (() => {
/* eslint-disable */
const ROWS = [{
  name: 'Bimbo Argentina',
  ventas: '$ 42,8 M',
  margen: '31,2 %',
  dso: 38,
  var: 14.2,
  kind: 'pos'
}, {
  name: 'Molinos Río',
  ventas: '$ 38,4 M',
  margen: '27,8 %',
  dso: 44,
  var: 8.1,
  kind: 'pos'
}, {
  name: 'Patagonia SA',
  ventas: '$ 22,1 M',
  margen: '24,4 %',
  dso: 52,
  var: -2.4,
  kind: 'neg'
}, {
  name: 'Amcor',
  ventas: '$ 18,9 M',
  margen: '29,1 %',
  dso: 41,
  var: 5.6,
  kind: 'pos'
}, {
  name: 'Prosegur',
  ventas: '$ 14,2 M',
  margen: '22,0 %',
  dso: 60,
  var: -6.8,
  kind: 'neg'
}, {
  name: 'Cotnyl',
  ventas: '$ 11,4 M',
  margen: '26,5 %',
  dso: 47,
  var: 1.2,
  kind: 'warn'
}];
window.DataTable = function DataTable() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px',
      borderBottom: '1px solid #DEE2E8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, "Top Cuentas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 22,
      color: '#0E2543'
    }
  }, "Performance por cliente \xB7 YTD")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: "'Inter'",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: '#F7F6F2'
    }
  }, ['Cliente', 'Ventas', 'Margen', 'DSO', 'Var. vs presup.'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 18px',
      textAlign: i === 0 ? 'left' : 'right',
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#6B7585',
      borderBottom: '1px solid #DEE2E8'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, ROWS.map(r => {
    const c = {
      pos: '#2E7D5B',
      neg: '#B23C3C',
      warn: '#C98A1F'
    }[r.kind];
    const a = {
      pos: '▲',
      neg: '▼',
      warn: '●'
    }[r.kind];
    return /*#__PURE__*/React.createElement("tr", {
      key: r.name,
      style: {
        borderBottom: '1px solid #EEF1F4'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 18px',
        color: '#0E2543',
        fontWeight: 500
      }
    }, r.name), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 18px',
        textAlign: 'right',
        color: '#2D3540',
        fontVariantNumeric: 'tabular-nums'
      }
    }, r.ventas), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 18px',
        textAlign: 'right',
        color: '#2D3540',
        fontVariantNumeric: 'tabular-nums'
      }
    }, r.margen), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 18px',
        textAlign: 'right',
        color: '#2D3540',
        fontVariantNumeric: 'tabular-nums'
      }
    }, r.dso, " d"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px 18px',
        textAlign: 'right',
        color: c,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums'
      }
    }, a, " ", r.var > 0 ? '+' : '', r.var, "%"));
  }))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DataTable.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Donut.jsx
try { (() => {
/* eslint-disable */
const SLICES = [{
  label: 'Productos A',
  value: 42,
  color: '#0E2543'
}, {
  label: 'Productos B',
  value: 28,
  color: '#2A4F86'
}, {
  label: 'Productos C',
  value: 18,
  color: '#8FB8D6'
}, {
  label: 'Otros',
  value: 12,
  color: '#C9A24E'
}];
window.Donut = function Donut() {
  const total = SLICES.reduce((s, x) => s + x.value, 0);
  const R = 70,
    r = 44,
    cx = 90,
    cy = 90;
  let acc = -Math.PI / 2;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      padding: 18,
      display: 'flex',
      gap: 20,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585',
      marginBottom: 12
    }
  }, "Mix de Ventas"), /*#__PURE__*/React.createElement("svg", {
    width: "180",
    height: "180"
  }, SLICES.map((s, i) => {
    const a = s.value / total * Math.PI * 2;
    const x1 = cx + R * Math.cos(acc),
      y1 = cy + R * Math.sin(acc);
    const x2 = cx + R * Math.cos(acc + a),
      y2 = cy + R * Math.sin(acc + a);
    const x3 = cx + r * Math.cos(acc + a),
      y3 = cy + r * Math.sin(acc + a);
    const x4 = cx + r * Math.cos(acc),
      y4 = cy + r * Math.sin(acc);
    const large = a > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
    acc += a;
    return /*#__PURE__*/React.createElement("path", {
      key: i,
      d: d,
      fill: s.color
    });
  }), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy - 4,
    textAnchor: "middle",
    fontFamily: "'Cormorant Garamond', serif",
    fontWeight: "500",
    fontSize: "22",
    fill: "#0E2543"
  }, "$184M"), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + 14,
    textAnchor: "middle",
    fontFamily: "'Inter'",
    fontSize: "10",
    letterSpacing: "0.14em",
    fill: "#6B7585"
  }, "YTD"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, SLICES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 0',
      borderBottom: '1px solid #EEF1F4',
      fontFamily: "'Inter'",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      background: s.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2D3540'
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontWeight: 600,
      color: '#0E2543'
    }
  }, s.value, "%")))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Donut.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/FilterBar.jsx
try { (() => {
/* eslint-disable */
const {
  useState
} = React;
window.FilterBar = function FilterBar() {
  const [period, setPeriod] = useState('YTD');
  const [region, setRegion] = useState('Todas');
  const periods = ['Hoy', 'Mes', 'Trim.', 'YTD', '12M'];
  const regions = ['Todas', 'AMBA', 'Centro', 'NOA', 'Patagonia'];
  const seg = active => ({
    fontFamily: "'Inter'",
    fontWeight: 500,
    fontSize: 12,
    padding: '6px 14px',
    cursor: 'pointer',
    background: active ? '#0E2543' : 'transparent',
    color: active ? '#F7F6F2' : '#2D3540',
    border: 'none',
    transition: 'all 140ms'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      borderBottom: '1px solid #DEE2E8',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, "Per\xEDodo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, periods.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    style: seg(period === p),
    onClick: () => setPeriod(p)
  }, p)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, "Regi\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, regions.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    style: seg(region === r),
    onClick: () => setRegion(r)
  }, r)))), /*#__PURE__*/React.createElement("button", {
    style: {
      marginLeft: 'auto',
      fontFamily: "'Inter'",
      fontSize: 12,
      fontWeight: 500,
      background: 'transparent',
      color: '#0E2543',
      border: '1px solid #0E2543',
      borderRadius: 4,
      padding: '6px 14px',
      cursor: 'pointer'
    }
  }, "Exportar \u25BE"));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/FilterBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KpiTile.jsx
try { (() => {
/* eslint-disable */
window.KpiTile = function KpiTile({
  label,
  value,
  delta,
  deltaKind = 'pos',
  sub
}) {
  const deltaColor = {
    pos: '#2E7D5B',
    neg: '#B23C3C',
    warn: '#C98A1F'
  }[deltaKind];
  const arrow = {
    pos: '▲',
    neg: '▼',
    warn: '●'
  }[deltaKind];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 700,
      fontSize: 32,
      lineHeight: 1.1,
      letterSpacing: '-0.01em',
      fontVariantNumeric: 'tabular-nums',
      color: '#0E2543',
      marginTop: 8
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 600,
      fontSize: 12,
      color: deltaColor
    }
  }, arrow, " ", delta), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 12,
      color: '#6B7585'
    }
  }, sub)));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KpiTile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/LineChart.jsx
try { (() => {
/* eslint-disable */
const SERIES = [40, 44, 42, 50, 58, 64, 62, 71, 75, 78, 82, 90];
window.LineChart = function LineChart() {
  const W = 520,
    H = 220,
    pad = 28;
  const max = 100;
  const pts = SERIES.map((v, i) => {
    const x = pad + i / (SERIES.length - 1) * (W - pad * 2);
    const y = H - pad - v / max * (H - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${pts.at(-1)[0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 4,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B7585'
    }
  }, "Margen Bruto Acumulado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 22,
      color: '#0E2543',
      marginTop: 2,
      marginBottom: 12
    }
  }, "Tendencia 12 meses"), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: H,
    viewBox: `0 0 ${W} ${H}`
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "lg",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#8FB8D6",
    stopOpacity: "0.4"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#8FB8D6",
    stopOpacity: "0"
  }))), [0, 0.25, 0.5, 0.75, 1].map(t => /*#__PURE__*/React.createElement("line", {
    key: t,
    x1: pad,
    x2: W - pad,
    y1: pad + (H - pad * 2) * t,
    y2: pad + (H - pad * 2) * t,
    stroke: "#EEF1F4",
    strokeWidth: "1"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#lg)"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "#0E2543",
    strokeWidth: "2"
  }), pts.map((p, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p[0],
    cy: p[1],
    r: "3",
    fill: "#fff",
    stroke: "#0E2543",
    strokeWidth: "1.5"
  }))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/LineChart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Buttons.jsx
try { (() => {
/* eslint-disable */
const {
  useState
} = React;
window.Button = function Button({
  variant = 'primary',
  children,
  onClick,
  style
}) {
  const base = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: '0.02em',
    padding: '12px 22px',
    borderRadius: 4,
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 140ms cubic-bezier(.2,.6,.2,1)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none'
  };
  const variants = {
    primary: {
      background: '#0E2543',
      color: '#F7F6F2'
    },
    secondary: {
      background: 'transparent',
      color: '#0E2543',
      borderColor: '#0E2543'
    },
    'on-dark-primary': {
      background: '#F7F6F2',
      color: '#0E2543'
    },
    'on-dark-secondary': {
      background: 'transparent',
      color: '#F7F6F2',
      borderColor: '#F7F6F2'
    },
    ghost: {
      background: 'transparent',
      color: '#0E2543'
    }
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = hover ? {
    primary: {
      background: '#163058',
      boxShadow: '0 2px 8px rgba(14,37,67,0.18)'
    },
    secondary: {
      background: '#0E2543',
      color: '#F7F6F2'
    },
    'on-dark-primary': {
      background: '#fff'
    },
    'on-dark-secondary': {
      background: 'rgba(247,246,242,0.1)'
    },
    ghost: {
      color: '#B08B3F'
    }
  }[variant] : {};
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...variants[variant],
      ...hoverStyle,
      ...style
    }
  }, children);
};
window.Editorial = function Editorial({
  children,
  dark,
  onClick
}) {
  return /*#__PURE__*/React.createElement("a", {
    onClick: onClick,
    style: {
      fontFamily: "'Inter', sans-serif",
      fontWeight: 500,
      fontSize: 13,
      letterSpacing: '0.04em',
      color: dark ? '#F7F6F2' : '#0E2543',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 32,
      height: 1,
      background: dark ? '#F7F6F2' : '#0E2543',
      marginRight: 12
    }
  }), children);
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Buttons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ClientsWall.jsx
try { (() => {
/* eslint-disable */
const CLIENTS = ['BIMBO', 'PROSEGUR', 'PATAGONIA', 'AMCOR', 'MOLINOS', 'ASPRO', 'ABIN', 'MOSQUI', 'COTNYL', 'MONTAGNE', 'GRETA', 'PAOLINI', 'ARIZMENDI', 'NUTROVO', 'ELEMON', 'JUÁREZ', 'DNTE', 'MOTOR'];
window.ClientsWall = function ClientsWall() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#F7F6F2',
      padding: '96px 0',
      borderTop: '1px solid #DEE2E8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '0 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#6B7585',
      marginBottom: 16
    }
  }, "Conf\xEDan en nosotros"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.1,
      color: '#0E2543',
      margin: '0 0 56px'
    }
  }, "Nuestros Clientes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      border: '1px solid #DEE2E8',
      background: '#fff'
    }
  }, CLIENTS.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      padding: '32px 16px',
      borderRight: (i + 1) % 6 === 0 ? 'none' : '1px solid #DEE2E8',
      borderBottom: i < 12 ? '1px solid #DEE2E8' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 88
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 20,
      letterSpacing: '0.08em',
      color: '#4A5363'
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 12,
      color: '#9099A7',
      marginTop: 16,
      fontStyle: 'italic'
    }
  }, "Wordmark placeholders \u2014 replace with each brand's real lockup.")));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ClientsWall.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Differentiators.jsx
try { (() => {
/* eslint-disable */
const DIFFS = ['Servicio altamente personalizado', 'Más de 30 años de experiencia', 'Manejo responsable de la información', 'Involucramiento directo de los socios', 'Especialistas en empresas familiares', 'Experiencia en múltiples industrias'];
window.Differentiators = function Differentiators() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#F7F6F2',
      borderBottom: '1px solid #DEE2E8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '40px 32px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24
    }
  }, DIFFS.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      paddingLeft: i % 3 === 0 ? 0 : 16,
      borderLeft: i % 3 === 0 ? 'none' : '1px solid #DEE2E8'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 24,
      height: 1,
      background: '#0E2543'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontWeight: 600,
      fontSize: 16,
      color: '#0E2543',
      lineHeight: 1.3
    }
  }, d)))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Differentiators.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/FAQ.jsx
try { (() => {
/* eslint-disable */
const {
  useState
} = React;
const FAQS = [{
  q: '¿Cuál es nuestra oferta de servicios diferencial sobre las consultoras de mercado?',
  a: 'Trabajamos en un equipo pequeño, en contacto directo con el cliente y con participación permanente de alguno de nuestros socios. Esto garantiza que los servicios los brinda un profesional experimentado, que interpreta las necesidades del cliente, evacúa sus inquietudes y lo acompaña en el proceso. Tenemos una vocación de compromiso de alta calidad con nuestros clientes, lo cual nos involucra de manera personal con las transacciones.'
}, {
  q: '¿Los valores de una valuación están al alcance de una Pyme?',
  a: 'RFDD ha rediseñado los procesos tradicionales de valuación de empresas de manera de contar con una gama de servicios de valuación, especialmente orientados para la satisfacción de las necesidades de las empresas medianas, adecuando las metodologías y logrando economías en los procedimientos utilizados.'
}, {
  q: '¿Qué significa actuar como piloto de crisis?',
  a: 'Las organizaciones suelen atravesar diversas crisis. Frecuentemente, estas situaciones son soportadas de manera traumática por la organización. Sin embargo, estas circunstancias pueden convertirse en excelentes oportunidades para incorporar los cambios y mejoras que la compañía necesita. RFDD realiza un diagnóstico objetivo y exhaustivo de la situación actual, elabora las alternativas de solución y acompaña al management o a los accionistas en todo el proceso de cambio.'
}, {
  q: '¿Puede RFDD convertirse en un hábil negociador externo?',
  a: 'Nuestro equipo está conformado por profesionales altamente calificados y con vasta experiencia en la negociación de condiciones con vistas al logro de objetivos de negocios.'
}];
window.FAQ = function FAQ() {
  const [open, setOpen] = useState(0);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      padding: '96px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 880,
      margin: '0 auto',
      padding: '0 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#6B7585',
      marginBottom: 16
    }
  }, "Preguntas Frecuentes"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 44,
      lineHeight: 1.1,
      color: '#0E2543',
      margin: '0 0 48px'
    }
  }, "Lo que solemos escuchar"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid #DEE2E8'
    }
  }, FAQS.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      borderBottom: '1px solid #DEE2E8'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      width: '100%',
      textAlign: 'left',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '24px 0',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontWeight: 600,
      fontSize: 19,
      color: '#0E2543',
      lineHeight: 1.4
    }
  }, f.q), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 28,
      color: '#0E2543',
      flexShrink: 0,
      lineHeight: 1,
      transform: open === i ? 'rotate(45deg)' : 'rotate(0)',
      transition: 'transform 240ms cubic-bezier(.2,.6,.2,1)'
    }
  }, "+")), open === i && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontSize: 16,
      lineHeight: 1.7,
      color: '#2D3540',
      paddingBottom: 28,
      paddingRight: 60
    }
  }, f.a))))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/FAQ.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
/* eslint-disable */
const {
  useState,
  useEffect
} = React;
const SLIDES = [{
  eyebrow: 'Fusiones y Adquisiciones',
  title: 'Te asesoramos para comprar o vender una compañía.',
  lead: 'Te ayudamos a atravesar el proceso de compraventa de una compañía, cuidando tus datos con la más alta responsabilidad.',
  primary: 'Contáctanos',
  secondary: 'Más Info'
}, {
  eyebrow: 'Valuaciones',
  title: 'Conocé el valor de tu empresa.',
  lead: 'Calculamos el valor de tu compañía y te mostramos la sensibilidad de este a cambios en las principales variables que afectan a tu negocio.',
  primary: 'Contáctanos',
  secondary: 'Más Info'
}, {
  eyebrow: 'Tableros de Gestión',
  title: 'Toda la información de tu empresa en un solo click.',
  lead: 'Diseñamos tableros a medida para cada cliente que generan información relevante para la toma de decisiones de manera dinámica, flexible y visual.',
  primary: 'Contáctanos',
  secondary: 'Más Info'
}];
window.Hero = function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[i];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      minHeight: 720,
      marginTop: -82,
      // tuck under transparent header
      background: 'linear-gradient(135deg, #0E2543 0%, #163058 50%, #1E3D6E 100%)',
      color: '#F7F6F2',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/pattern-waves.svg",
    alt: "",
    style: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      width: '100%',
      opacity: 0.18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '180px 32px 120px',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      animation: 'fadeUp 600ms cubic-bezier(.2,.6,.2,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: '0.32em',
      textTransform: 'uppercase',
      color: '#C9A24E',
      marginBottom: 24
    }
  }, slide.eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 72,
      lineHeight: 1.05,
      letterSpacing: '-0.01em',
      maxWidth: 880,
      margin: 0,
      color: '#F7F6F2'
    }
  }, slide.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontWeight: 400,
      fontSize: 19,
      lineHeight: 1.6,
      color: 'rgba(247,246,242,0.85)',
      maxWidth: 620,
      marginTop: 28
    }
  }, slide.lead), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "on-dark-primary"
  }, slide.primary), /*#__PURE__*/React.createElement(Button, {
    variant: "on-dark-secondary"
  }, slide.secondary))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 80,
      alignItems: 'center'
    }
  }, SLIDES.map((_, idx) => /*#__PURE__*/React.createElement("button", {
    key: idx,
    onClick: () => setI(idx),
    "aria-label": `Slide ${idx + 1}`,
    style: {
      width: idx === i ? 32 : 8,
      height: 2,
      padding: 0,
      border: 'none',
      background: idx === i ? '#F7F6F2' : 'rgba(247,246,242,0.4)',
      cursor: 'pointer',
      transition: 'all 240ms'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 16,
      fontFamily: "'Inter'",
      fontSize: 11,
      letterSpacing: '0.2em',
      color: 'rgba(247,246,242,0.6)'
    }
  }, String(i + 1).padStart(2, '0'), " / ", String(SLIDES.length).padStart(2, '0')))), /*#__PURE__*/React.createElement("style", null, `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ServicesGrid.jsx
try { (() => {
/* eslint-disable */
const SERVICES = [{
  title: 'Fusiones y Adquisiciones',
  items: ['Compra - Venta de Compañías', 'Valuación de Empresas', 'Transacciones Destacadas']
}, {
  title: 'Consultoría Estratégica',
  items: ['Control de Gestión', 'Presupuestos', 'Estrategia Corporativa', 'Evaluación de Proyectos de Inversión']
}, {
  title: 'Tableros de Gestión',
  items: ['Tablero de Ventas', 'Tablero de Créditos y Cobranzas', 'Tablero de Inventario', 'Tablero de Producción', 'Tablero de Resultados', 'Otros Tableros']
}];
window.ServicesGrid = function ServicesGrid() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      padding: '96px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '0 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#6B7585',
      marginBottom: 16
    }
  }, "Servicios"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 52,
      lineHeight: 1.1,
      color: '#0E2543',
      margin: 0,
      maxWidth: 720
    }
  }, "\xBFQu\xE9 podemos hacer por tu empresa?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 64,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32
    }
  }, SERVICES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.title,
    style: {
      background: '#F7F6F2',
      borderTop: '2px solid #0E2543',
      padding: '32px 28px',
      minHeight: 320,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 28,
      lineHeight: 1.2,
      color: '#0E2543',
      margin: 0
    }
  }, s.title), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '20px 0 0'
    }
  }, s.items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it,
    style: {
      fontFamily: "'Inter'",
      fontSize: 14,
      color: '#2D3540',
      padding: '8px 0',
      borderBottom: '1px solid rgba(14,37,67,0.08)'
    }
  }, it))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 24
    }
  }, /*#__PURE__*/React.createElement(Editorial, null, "M\xE1s Informaci\xF3n")))))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ServicesGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteFooter.jsx
try { (() => {
/* eslint-disable */
window.SiteFooter = function SiteFooter() {
  const cols = [{
    title: 'Fusiones y Adquisiciones',
    items: ['Compra-Venta de Compañías', 'Valuación de Empresas', 'Transacciones Destacadas']
  }, {
    title: 'Consultoría Estratégica',
    items: ['Control de Gestión', 'Presupuestos', 'Estrategia Corporativa', 'Evaluación de Proyectos']
  }, {
    title: 'Tableros de Gestión',
    items: ['Ventas', 'Créditos y Cobranzas', 'Inventario', 'Producción', 'Resultados']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: '#0E2543',
      color: '#F7F6F2',
      position: 'relative',
      paddingTop: 80,
      paddingBottom: 32,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/pattern-waves.svg",
    alt: "",
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      opacity: 0.12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '0 32px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "Romano, Fiocca & D\xEDaz Delfino",
    style: {
      width: 240,
      filter: 'brightness(0) invert(1)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontSize: 14,
      lineHeight: 1.6,
      color: 'rgba(247,246,242,0.7)',
      marginTop: 24,
      maxWidth: 280
    }
  }, "Acompa\xF1amos a empresas medianas y familiares a tomar mejores decisiones desde 1992.")), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 18,
      color: '#F7F6F2',
      marginBottom: 16
    }
  }, c.title), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    }
  }, c.items.map(it => /*#__PURE__*/React.createElement("li", {
    key: it,
    style: {
      fontFamily: "'Inter'",
      fontSize: 13,
      lineHeight: 2,
      color: 'rgba(247,246,242,0.7)',
      cursor: 'pointer'
    }
  }, it))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 500,
      fontSize: 18,
      color: '#F7F6F2',
      marginBottom: 16
    }
  }, "Newsletter"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Inter'",
      fontSize: 13,
      color: 'rgba(247,246,242,0.7)',
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, "An\xE1lisis trimestral del mercado argentino."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "EMAIL",
    style: {
      flex: 1,
      background: 'transparent',
      border: '1px solid rgba(247,246,242,0.3)',
      borderRight: 'none',
      padding: '10px 12px',
      color: '#F7F6F2',
      fontFamily: "'Inter'",
      fontSize: 13,
      letterSpacing: '0.18em',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      background: '#F7F6F2',
      color: '#0E2543',
      border: 'none',
      padding: '0 18px',
      cursor: 'pointer',
      fontFamily: "'Inter'",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '0.1em'
    }
  }, "\u2192")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 64,
      paddingTop: 24,
      borderTop: '1px solid rgba(247,246,242,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: "'Inter'",
      fontSize: 12,
      color: 'rgba(247,246,242,0.5)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2024 \xB7 Romano, Fiocca & D\xEDaz Delfino"), /*#__PURE__*/React.createElement("span", null, "Buenos Aires, Argentina"))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteHeader.jsx
try { (() => {
/* eslint-disable */
const {
  useState,
  useEffect
} = React;
window.SiteHeader = function SiteHeader({
  activeRoute,
  onNavigate
}) {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const onHero = activeRoute === 'inicio' && !scrolled;
  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    transition: 'all 240ms cubic-bezier(.2,.6,.2,1)',
    background: onHero ? 'transparent' : 'rgba(247,246,242,0.92)',
    backdropFilter: onHero ? 'none' : 'blur(12px)',
    borderBottom: onHero ? '1px solid transparent' : '1px solid #DEE2E8',
    color: onHero ? '#F7F6F2' : '#0E2543'
  };
  const linkStyle = {
    fontFamily: "'Inter'",
    fontWeight: 500,
    fontSize: 13,
    letterSpacing: '0.04em',
    color: 'inherit',
    cursor: 'pointer',
    padding: '6px 0',
    textDecoration: 'none',
    position: 'relative'
  };
  const items = [{
    id: 'inicio',
    label: 'Inicio'
  }, {
    id: 'servicios',
    label: 'Servicios',
    sub: ['Fusiones y Adquisiciones', 'Consultoría Estratégica', 'Tableros de Gestión']
  }, {
    id: 'demos',
    label: 'Demos',
    sub: ['Tablero de Ventas', 'Tablero de Créditos', 'Tablero de Inventario', 'Tablero de Producción', 'Tablero de Resultados']
  }, {
    id: 'equipo',
    label: 'Equipo'
  }, {
    id: 'informes',
    label: 'Informes'
  }, {
    id: 'contacto',
    label: 'Contacto'
  }];
  return /*#__PURE__*/React.createElement("header", {
    style: navStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '18px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNavigate('inicio'),
    style: {
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "Romano, Fiocca & D\xEDaz Delfino",
    style: {
      height: 40,
      transition: 'all 240ms',
      filter: onHero ? 'brightness(0) invert(1)' : 'none'
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 28,
      marginLeft: 'auto',
      alignItems: 'center'
    }
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it.id,
    style: {
      position: 'relative'
    },
    onMouseEnter: () => setOpenMenu(it.id),
    onMouseLeave: () => setOpenMenu(null)
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      ...linkStyle,
      borderBottom: activeRoute === it.id ? '1.5px solid currentColor' : '1.5px solid transparent'
    },
    onClick: () => onNavigate(it.id)
  }, it.label), it.sub && openMenu === it.id && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: -16,
      marginTop: 8,
      background: '#fff',
      border: '1px solid #DEE2E8',
      borderRadius: 6,
      boxShadow: '0 8px 24px rgba(14,37,67,0.10)',
      padding: '8px 0',
      minWidth: 240
    }
  }, it.sub.map(s => /*#__PURE__*/React.createElement("a", {
    key: s,
    style: {
      display: 'block',
      padding: '8px 18px',
      fontFamily: "'Inter'",
      fontSize: 13,
      color: '#0E2543',
      cursor: 'pointer',
      textDecoration: 'none'
    }
  }, s))))), /*#__PURE__*/React.createElement("a", {
    style: {
      ...linkStyle,
      border: '1px solid currentColor',
      padding: '8px 16px',
      borderRadius: 4,
      marginLeft: 8
    }
  }, "Iniciar Sesi\xF3n"))));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteHeader.jsx", error: String((e && e.message) || e) }); }

})();
