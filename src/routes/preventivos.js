import express from 'express';
const router = express.Router();
import db from "../database.js";
import funciones from "../lib/funciones.js";
import {
  queryListadoPreventivosUsers,
} from "../lib/queries.js";
import moment from 'moment';
moment().format();
import * as url from "url";
import fs from 'fs';
import fse from 'fs-extra';
import { join, extname as _extname, resolve } from 'path';
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import multer, { diskStorage } from 'multer';
import { imageSizeLimitErrorHandler } from "../lib/validaciones.js";
import htmlTopdf from '../lib/pdfcontroller.js';

const storage = diskStorage({
    destination: (req, file, cb) => {
        const nif = req.body.nif;
        const dir = join(__dirname, '../public/img/preventivos/', nif);
        try {
            // Crear la carpeta si no existe (de forma sincrónica y sin callback)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log('📁 Carpeta creada:', dir);
            } else {
                console.log('📁 Carpeta ya existe:', dir);
            }

            cb(null, dir); // Devolver la ruta correctamente
        } catch (err) {
            console.error('❌ Error al crear carpeta:', err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const fecha = req.body.fecha.replace(/-/g, "");
        cb(null, fecha + "-" + file.fieldname + _extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000, }, //5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|jfif|png|bmp|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(_extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        return cb(("Error: Archivo debe ser una extension válida"));
    }
});

//preventivo
// Ruta vista principal
router.get('/list', async (req, res) => {
    //const preventivos = await db.query("select * from preventivos order by created_at");
    try {
        const preventivos = await db.query(queryListadoPreventivosUsers + " order by p.created_at,p.nif desc");
        const usuarios = await db.query("select * from usuarios");
        res.render('preventivo/list', {
            preventivos, usuarios
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar mostrar los preventivos: " + error);
        res.redirect("/");
    }
});
// Ruta para crear un nuevo preventivo (formulario)
router.get('/add', funciones.isAuthenticated, async (req, res) => {
    try {
        //const usuarios = await db.query("select * from usuarios");
        res.render('preventivo/add');
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar añadir el mantenimiento preventivo:" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});
// Ruta para crear un nuevo preventivo (formulario)
router.get('/add/:nif', funciones.isAuthenticated, async (req, res) => {
    const {
        nif
    } = req.params;
    try {
        //Leer el ultimo preventivo asociado
        const [ultimoPreventivo] = await db.query("select * from preventivos where nif=? order by fecha desc ", nif);
        res.render('preventivo/add', { nif, ultimoPreventivo });
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar añadir el mantenimiento preventivo:" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});

// Ruta para crear un nuevo preventivo (envío del formulario)
router.post('/add', funciones.isAuthenticated, upload.fields([
    { name: 'foto_estructura', maxCount: 1 },
    { name: 'foto_linterna', maxCount: 1 },
    { name: 'foto_monitoreo', maxCount: 1 },
    { name: 'foto_alimentacion', maxCount: 1 },
    { name: 'foto_general', maxCount: 1 }
]), imageSizeLimitErrorHandler, async (req, res) => {
    if (req.body.alimentacion_ah == "")
        req.body.alimentacion_ah = 0;
    if (req.body.alimentacion_vcc == "")
        req.body.alimentacion_vcc = 0;

    // Verificar si se subieron fotos y guardarlas en la base de datos
    const foto_estructura = req.files && req.files.foto_estructura ? req.files.foto_estructura[0].filename : null;
    const foto_linterna = req.files && req.files.foto_linterna ? req.files.foto_linterna[0].filename : null;
    const foto_monitoreo = req.files && req.files.foto_monitoreo ? req.files.foto_monitoreo[0].filename : null;
    const foto_alimentacion = req.files && req.files.foto_alimentacion ? req.files.foto_alimentacion[0].filename : null;
    const foto_general = req.files && req.files.foto_general ? req.files.foto_general[0].filename : null;

    if (foto_estructura) req.body.foto_estructura = foto_estructura;
    if (foto_linterna) req.body.foto_linterna = foto_linterna;
    if (foto_monitoreo) req.body.foto_monitoreo = foto_monitoreo;
    if (foto_alimentacion) req.body.foto_alimentacion = foto_alimentacion;
    if (foto_general) req.body.foto_general = foto_general;

    try {
        //TODO:    telecontrol_tipo
        console.log("req.body: ", req.body);
        const result = await db.query("insert into preventivos set ? ", [req.body]);
        console.log("Result: ", result);
        funciones.insertarLog(req.user.usuario, "INSERT preventivo", "ID: " + result.insertId);
        req.flash("success", "Preventivo añadido correctamente");
        res.redirect('/mantenimientopreventivo/list/');

    } catch (error) {
        //console.error(error);
        req.flash("error", "Hubo algun error al insertar el preventivo: \n" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});

// Ruta para editar un preventivo
router.get('/edit/:id', funciones.isAuthenticated, funciones.hasSanPrivileges, async (req, res) => {
    const {
        id
    } = req.params;
    //console.log(id);
    try {
        const preventivo = await db.query(queryListadoPreventivosUsers + " where preventivo_id=?", id);
        console.log(preventivo[0]);
        res.render('preventivo/edit', {
            preventivo: preventivo[0],
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar mostrar el preventivo" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});
// Ruta POST para EDITAR o CERRAR un preventivo
router.post('/edit/:id', funciones.isAuthenticated, funciones.hasSanPrivileges, upload.fields([
    { name: 'foto_estructura', maxCount: 1 },
    { name: 'foto_linterna', maxCount: 1 },
    { name: 'foto_monitoreo', maxCount: 1 },
    { name: 'foto_alimentacion', maxCount: 1 },
    { name: 'foto_general', maxCount: 1 }
]), imageSizeLimitErrorHandler, async (req, res) => {


    // Verificar si se subieron fotos y guardarlas en la base de datos
    const foto_estructura = req.files && req.files.foto_estructura ? req.files.foto_estructura[0].filename : null;
    const foto_linterna = req.files && req.files.foto_linterna ? req.files.foto_linterna[0].filename : null;
    const foto_monitoreo = req.files && req.files.foto_monitoreo ? req.files.foto_monitoreo[0].filename : null;
    const foto_alimentacion = req.files && req.files.foto_alimentacion ? req.files.foto_alimentacion[0].filename : null;
    const foto_general = req.files && req.files.foto_general ? req.files.foto_general[0].filename : null;

    if (foto_estructura) req.body.foto_estructura = foto_estructura;
    if (foto_linterna) req.body.foto_linterna = foto_linterna;
    if (foto_monitoreo) req.body.foto_monitoreo = foto_monitoreo;
    if (foto_alimentacion) req.body.foto_alimentacion = foto_alimentacion;
    if (foto_general) req.body.foto_general = foto_general;

    if (req.body.accion == "Guardar") {
        console.log("Guardando");
        try {
            delete req.body.accion;
            const item = await db.query("update preventivos set ? where preventivo_id=?", [req.body, req.body.preventivo_id]);
            const [preventivo] = await db.query(queryListadoPreventivosUsers + " where preventivo_id=?", req.body.preventivo_id);
            console.log(preventivo);
            funciones.insertarLog(req.user.usuario, "UPDATE preventivo ", "NIF: " + preventivo.nif + " -preventivo: " + req.body.preventivo_id);
            req.flash("success", "Preventivo actualizado correctamente");
            res.redirect("/mantenimientopreventivo/list/");
        } catch (error) {
            console.error(error);
            req.flash("error", "Hubo algun error al intentar modificar el preventivo" + error);
            res.redirect("/mantenimientopreventivo/list");
        }


    } else if (req.body.accion == "Cerrar") {
        let completado = true;
        //console.log("Cerrando");
        //console.log(item);

        Object.entries(req.body).forEach(([key, value]) => {
            //console.log(key + " = "+value);
            if (!value)
                completado = false;
        });
        //console.log(completado);
        if (completado) {
            delete req.body.accion;
            req.body.solved_at = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
            req.body.solved_by_id = req.user.id;
            req.body.completado = completado;
            //console.log("completado", req.body);
            const item = await db.query("update preventivos set ? where preventivo_id=?", [req.body, req.body.preventivo_id]);
            const [preventivo] = await db.query(queryListadoPreventivosUsers + " where preventivo_id=?", req.body.preventivo_id);
            funciones.insertarLog(req.user.usuario, "UPDATED and CLOSED", "NIF: " + preventivo.nif + " -preventivo: " + req.body.preventivo_id);
            req.flash("success", "Preventivo cerrado correctamente");
            res.redirect("/mantenimientopreventivo/list");
        } else {
            req.flash("warning", "Tienes que completar todos los campos del preventivo");
            res.redirect("/mantenimientopreventivo/edit/" + req.body.preventivo_id);
        }
    }
});

router.get('/reabrir/:id', funciones.isAuthenticated, funciones.hasSanPrivileges, async (req, res) => {
    const {
        id
    } = req.params;
    try {
        //Leer el ultimo preventivo asociado
        const update = await db.query("update preventivos set completado=false, solved_at=null where preventivo_id=?", id);
        const preventivo = await db.query(queryListadoPreventivosUsers + " where preventivo_id=?", id);
        console.log(preventivo[0]);
        res.render('preventivo/edit', {
            preventivo: preventivo[0],
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar reabrir el mantenimiento preventivo:" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});

// Ruta para mostrar un ticket cerrado
router.get('/cerrado/:id', funciones.isAuthenticated, funciones.hasSanPrivileges, async (req, res) => {
    const {
        id
    } = req.params;

    try {
        const rows = await db.query("select preventivo_id from preventivos order by preventivo_id asc");
        const listado = rows.map(r => r.preventivo_id);
        const [preventivo] = await db.query(queryListadoPreventivosUsers + " where p.preventivo_id=?", id);
        const currentId = parseInt(preventivo.preventivo_id);
        const index = listado.indexOf(currentId);
        //console.log(listado);
        let nextId = index !== -1 && index < listado.length - 1 ? listado[index + 1] : listado[0];
        let prevId = index > 0 ? listado[index - 1] : listado[listado.length  - 1];
        res.render('preventivo/edit', {
            preventivo, nextId, prevId
        });

    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar mostrar el preventivo" + error);
        res.redirect("/");
    }
});

//Ruta para borrar un preventivo.
router.get("/delete/:id", funciones.isAuthenticated, funciones.isAdmin, async (req, res) => {
    //console.log(req.params.idObs);
    const {
        id
    } = req.params;
    try {
        await db.query("delete from preventivos where preventivo_id=?", [id]);
        req.flash("success", "Preventivo eliminado correctamente.");
        res.redirect("/mantenimientopreventivo/list");
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar borrar el preventivo" + error);
        res.redirect("/mantenimientopreventivo/list");
    }
});

router.post('/eliminar-foto', async (req, res) => {
    const { id, campo } = req.body; // ej: id del preventivo, campo: 'foto_general', ruta: '26046.7/foto.jpg'
    console.log("Voy");
    let columna = campo.split("-")[1].split(".")[0]
    console.log("id: ", id + " foto: ", columna)

    try {
        // Quitar ruta en la base de datos
        await db.query(`UPDATE preventivos SET ${columna} = NULL WHERE preventivo_id = ?`, [id]);
        const [row] = await db.query(`SELECT * FROM preventivos WHERE preventivo_id = ?`, [id]);
        console.log(row.nif)

        // Borrar imagen del disco
        const filePath = resolve('src/public/img/preventivos/' + row.nif + '/' + campo);
        fs.access(filePath, fs.constants.F_OK, async (err) => {
            if (err) {
                console.log("❌ No existe foto", err);
            } else {
                console.log('✅ File exists. Deleting now...');
                // No uses await aquí; esta función no es async
                fse.unlink(filePath)
                    .then(() => console.log("🗑 Archivo borrado correctamente"))
                    .catch((error) => console.error("❌ Error al borrar archivo:", error));
            }
        });



        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error eliminando imagen:', err);
        res.status(500).send('Error al eliminar la imagen');
    }
});

//PARA LA EXPORTACION DE FICHAS A PDF
router.get('/cerrado/:id/pdf',
    funciones.isAuthenticated,
    async (req, res, next) => {
        try {
            const { id } = req.params;

            const preventivos = await db.query(
                queryListadoPreventivosUsers + " where p.preventivo_id=?",
                [id]
            );

            if (!preventivos.length) {
                return res.status(404).send("Preventivo no encontrado");
            }

            preventivos[0].tieneFotos =
                preventivos[0].foto_estructura ||
                preventivos[0].foto_linterna ||
                preventivos[0].foto_monitoreo ||
                preventivos[0].foto_alimentacion ||
                preventivos[0].foto_general;

            req.app.render(
                'preventivo/pdf',
                {
                    layout: 'layoutPuppeteer',
                    preventivo: preventivos[0],
                    baseURL: `${req.protocol}://${req.get('host')}`
                },
                async (err, html) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error renderizando vista");
                    }

                    try {
                        console.log("Render OK, generando PDF...");
                        const pdf = await htmlTopdf(html);
                        console.log("PDF generado");

                        res.set({
                            "Content-Type": "application/pdf",
                            "Content-Length": pdf.length,
                            "Content-Disposition": `attachment; filename=preventivo-${id}.pdf`
                        });

                        return res.send(pdf);

                    } catch (pdfError) {
                        console.error(pdfError);
                        return res.status(500).send("Error generando PDF");
                    }
                }
            );

        } catch (error) {
            console.error(error);
            return res.status(500).send("Error interno del servidor");
        }
    }
);
router.get("/print-multiple",
    funciones.isAuthenticated,
    async (req, res, next) => {
        try {
            const ids = req.query.ids?.split(",");

            if (!ids || !ids.length) {
                return res.status(400).send("No hay IDs");
            }

            const preventivos = await db.query(
                queryListadoPreventivosUsers + ` WHERE p.preventivo_id IN (?)`,
                [ids]
            );

            let htmlFinal = "";

            for (let i = 0; i < preventivos.length; i++) {
                preventivos[i].tieneFotos =
                    preventivos[i].foto_estructura ||
                    preventivos[i].foto_linterna ||
                    preventivos[i].foto_monitoreo ||
                    preventivos[i].foto_alimentacion ||
                    preventivos[i].foto_general;
                preventivos[i].indice = i + 1;
                preventivos[i].totalSeleccionadas = preventivos.length;
                const html = await new Promise((resolve, reject) => {
                    req.app.render(
                        "preventivo/pdf",
                        {
                            layout: "layoutPuppeteer",
                            preventivo: preventivos[i],
                            baseURL: `${req.protocol}://${req.get("host")}`
                        },
                        (err, html) => {
                            if (err) reject(err);
                            else resolve(html);
                        }
                    );
                });

                htmlFinal += html;

                if (i < preventivos.length - 1) {
                    htmlFinal += `<div style="page-break-after: always;"></div>`;
                }
            }
            console.log("Render OK, generando PDF...");
            //const pdf = await htmlTopdf(htmlFinal);
            const pdf = await htmlTopdf(htmlFinal, { timeout: 60000 });
            console.log("PDF generado");

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=preventivos-multiple.pdf`,
                "Content-Length": pdf.length
            });

            return res.send(pdf);

        } catch (error) {
            console.error(error);
            //next(error);
            return res.status(500).send("Error generando PDF múltiple");
            //res.status(500).send("Error generando PDF múltiple");
        }
    }
);

router.get(
    '/cerrado/:id/ver',
    funciones.isAuthenticated,
    funciones.hasSanPrivileges,
    async (req, res) => {
        try {
            const { id } = req.params;

            const preventivos = await db.query(
                queryListadoPreventivosUsers + " where p.preventivo_id=?",
                [id]
            );
            preventivos.tieneFotos =
                preventivos.foto_estructura ||
                preventivos.foto_linterna ||
                preventivos.foto_monitoreo ||
                preventivos.foto_alimentacion ||
                preventivos.foto_general;
            if (!preventivos.length) {
                return res.status(404).send("Preventivo no encontrado");
            }
            res.render('preventivo/pdf', { layout: 'layoutPuppeteer', preventivo: preventivos[0] }
            );
        } catch (error) {
            console.error(error);
            res.status(500).send("Error interno del servidor");
        }
    }
);

export default router;