document.addEventListener('DOMContentLoaded', function () {

  const inputBusqueda = document.getElementById("myInput");
  const filtroTrabajador = document.getElementById("filtroTrabajador");
  const suma = document.getElementById("suma");

  function filtrarYContar() {

    const texto = inputBusqueda ? inputBusqueda.value.toLowerCase() : "";
    const trabajador = filtroTrabajador ? filtroTrabajador.value : "";

    const filas = document.querySelectorAll(".listado .fila");

    let visibleCount = 0;

    filas.forEach(fila => {

      // filtro texto
      const coincideTexto =
        fila.textContent.toLowerCase().includes(texto);

      // filtro trabajador
      let coincideTrabajador = true;

      if (trabajador) {

        const trabajadores =
          fila.dataset.trabajadores
            .split(',')
            .filter(Boolean);

        coincideTrabajador =
          trabajadores.includes(trabajador);
      }

      const visible =
        coincideTexto && coincideTrabajador;

      fila.style.display = visible ? "" : "none";

      if (visible) {
        visibleCount++;
      }
    });

    if (suma) {
      suma.textContent = visibleCount;
    }
  }

  if (inputBusqueda) {
    inputBusqueda.addEventListener("keyup", filtrarYContar);
  }

  if (filtroTrabajador) {
    filtroTrabajador.addEventListener("change", filtrarYContar);
  }

  filtrarYContar();
});