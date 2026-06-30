import { format, register } from "timeago.js";
const helpers = {};
register(
  "es_ES",
  (number, index, total_sec) =>
    [
      ["ahora", "ahorita"],
      ["hace %s segundos", "en %s segundos"],
      ["hace 1 minuto", "en 1 minuto"],
      ["hace %s minutos", "en %s minutos"],
      ["hace 1 hora", "en 1 hora"],
      ["hace %s horas", "in %s horas"],
      ["hace 1 dia", "en 1 dia"],
      ["hace %s dias", "en %s dias"],
      ["hace 1 semana", "en 1 semana"],
      ["hace %s semanas", "en %s semanas"],
      ["1 mes", "en 1 mes"],
      ["hace %s meses", "en %s meses"],
      ["hace 1 año", "en 1 año"],
      ["hace %s años", "en %s años"],
    ][index]
);

register(
  "es_ES2",
  (number, index, total_sec) =>
    [
      ["justo ahora", "ahora mismo"],
      ["durante %s segundos", "en %s segundos"],
      ["durante 1 minuto", "en 1 minuto"],
      ["durante %s minutos", "en %s minutos"],
      ["durante 1 hora", "en 1 hora"],
      ["durante %s horas", "in %s horas"],
      ["durante 1 dia", "en 1 dia"],
      ["durante %s dias", "en %s dias"],
      ["durante 1 semana", "en 1 semana"],
      ["durante %s semanas", "en %s semanas"],
      ["1 mes", "en 1 mes"],
      ["durante %s meses", "en %s meses"],
      ["durante 1 año", "en 1 año"],
      ["durante %s años", "en %s años"],
    ][index]
);

helpers.timeagoSpCerrado = (timestamp) => {
  return format(timestamp, "es_ES");
};
helpers.timeagoSp = (timestamp) => {
  return format(timestamp, "es_ES2");
};
helpers.timeago = (fecha) => {
  var timestamp = new Date(fecha);
  return format(timestamp);
};

helpers.turno = (turno) => {
  switch (turno) {
    case 't':
      return "Tarde";
    case 'm':
      return "Mañana";
    case 'n':
      return "Noche";
  }
}

/* helpers.formatearSp = (fecha) => {
  console.log(fecha);
  console.log(fecha instanceof Date);
  if (fecha != null) {
    var timestamp = new Date(fecha);
    let mnth = ("0" + (timestamp.getMonth() + 1)).slice(-2);
    let day = ("0" + timestamp.getDate()).slice(-2);
    return [day, mnth, timestamp.getFullYear()].join("/");
  } else {
    return null;
  }
}; */

helpers.formatearSp = (fecha) => {
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
};

//Este es el formateo necesario para encajar una fecha en un input de type="date"
helpers.formatearEn = (fecha) => {
  var timestamp = new Date(fecha);
  let mnth = ("0" + (timestamp.getMonth() + 1)).slice(-2);
  let day = ("0" + timestamp.getDate()).slice(-2);
  return [timestamp.getFullYear(), mnth, day].join("-");
};

helpers.formatearHora = (fecha) => {
  if (fecha != null) {
    var timestamp = new Date(fecha);
    let hora = timestamp.getHours() < 10 ? '0' + timestamp.getHours() : timestamp.getHours();
    let minuto = timestamp.getMinutes() < 10 ? '0' + timestamp.getMinutes() : timestamp.getMinutes();
    return [hora, minuto].join(":");
  } else {
    return null;
  }
};

helpers.getLatIALAformat = (lat) => {
  var lattext = "";
  var latabs = Math.abs(lat);
  lattext =
    Math.trunc(latabs) +
    "º " +
    ((latabs - Math.trunc(latabs)) * 60).toFixed(3) +
    "´";
  lat > 0 ? (lattext += "N") : (lattext += "S");
  return lattext;
};

helpers.getLngIALAformat = (lng) => {
  var lngtext = "";
  var lngabs = Math.abs(lng);
  lngtext =
    Math.trunc(lngabs) +
    "º " +
    ((lngabs - Math.trunc(lngabs)) * 60).toFixed(3) +
    "´";
  lng > 0 ? (lngtext += "E") : (lngtext += "W");
  return lngtext;
};

helpers.suma = (balizas) => {
  var total = 0;
  balizas.forEach((element) => {
    total++;
  });
  return total;
};

helpers.esAdmin = (value) => {
  return value == "admin";
};

helpers.esTecnico = (value) => {
  return value == "san";
};
helpers.when = (operand_1, operator, operand_2, options) => {
  var operators = {
    eq: function (l, r) {
      return l == r;
    },
    noteq: function (l, r) {
      return l != r;
    },
    gt: function (l, r) {
      return Number(l) > Number(r);
    },
    or: function (l, r) {
      return l || r;
    },
    and: function (l, r) {
      return l && r;
    },
    "%": function (l, r) {
      return l % r === 0;
    },
  },
    result = operators[operator](operand_1, operand_2);

  if (result) return options.fn(this);
  else return options.inverse(this);
};

helpers.tiempo_activo = (fecha1, fecha2) => {
  let timestamp1 = new Date(fecha1);
  let timestamp2 = new Date(fecha2)

  let totalSegundos = (timestamp2.getTime() - timestamp1.getTime()) / 1000

  // Calcular días, horas y minutos
  const dias = Math.floor(totalSegundos / (3600 * 24)); // 1 día = 86400 segundos
  const horas = Math.floor((totalSegundos % (3600 * 24)) / 3600); // 1 hora = 3600 segundos
  const minutos = Math.floor((totalSegundos % 3600) / 60); // 1 minuto = 60 segundos

  // Devolver el resultado como un objeto o un string
  if (dias > 0)
    return `${dias} días ${horas} horas`;
  else
    return `${horas} horas ${minutos} minutos`;
};

helpers.estadoBadge = (value) => {
  if (value === "ok") return '<span class="estado-ok">OK</span>';
  if (value === "ko") return '<span class="estado-ko">KO</span>';
  return '<span class="estado-na">N/A</span>';
};

helpers.eq = (a, b) => {
  return a === b;
};
export default helpers;
