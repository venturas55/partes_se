import upload from '../middlewares/upload.js';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import express from 'express';
import { createTransport } from 'nodemailer';
import { config } from '../config.js';
const router = express.Router();
import db from "../database.js"; //db hace referencia a la BBDD
import funciones from "../lib/funciones.js";
import { join } from 'path';
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));


//MOSTRAR PAGINA INICIAL
router.get('/list', async (req, res) => {

    const partes = await db.query(
        "SELECT * FROM partes ORDER BY fecha DESC"
    );
    

    await Promise.all(partes.map(async (p) => {

        const usuarios = await db.query(
            `SELECT u.*
             FROM parte_usuarios pu
             LEFT JOIN usuarios u ON pu.id_usuario = u.id
             WHERE pu.id_parte = ?`,
            [p.id_parte]
        );

        p.usuarios = usuarios;
    }));
console.log(partes);
    res.render('partes/list', { partes });
});

// Ruta para crear un nuevo parte (formulario)
router.get('/add', funciones.isAuthenticated, async (req, res) => {
    try {
        const usuarios = await db.query("select * from usuarios");
        res.render('partes/add', {
            usuarios
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Hubo algun error al intentar añadir el parte" + error);
        res.redirect("/partes/list");
    }
});

// Ruta para crear un nuevo parte (envío del formulario)
router.post('/add', funciones.isAuthenticated, async (req, res) => {
    try {
        const { fecha, turno, observaciones, usuarios } = req.body;
        console.log(req.body);

        // 1. Insertar el parte
        const result = await db.query(
            `INSERT INTO partes (fecha, turno, observaciones)
       VALUES (?, ?, ?)`,
            [fecha, turno, observaciones || null]
        );

        const id_parte = result.insertId;

        console.log("Id parte:", id_parte)

        // 2. Insertar usuarios en parte_usuarios (si existen)
        console.log(usuarios);
        if (usuarios) {
            // Si solo viene uno, lo convertimos a array
            const listaUsuarios = Array.isArray(usuarios)
                ? usuarios
                : [usuarios];

            const values = listaUsuarios.map(id_usuario => [
                id_parte,
                id_usuario
            ]);

            await db.query(
                `INSERT INTO parte_usuarios (id_parte, id_usuario)
         VALUES ?`,
                [values]
            );
        }

        req.flash('success', 'Parte creado correctamente');
        res.redirect('/partes/list');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Error al crear el parte');
        res.redirect('/partes/list');
    }
});

router.get('/:id', async (req, res) => {

    const { id } = req.params;

    const [parte] = await db.query(
        'SELECT * FROM partes WHERE id_parte = ?',
        [id]
    );
    console.log(parte);
    const tareas = await db.query(
        'SELECT * FROM tareas WHERE id_parte = ? ORDER BY fecha_inicio asc',
        [id]
    );

    const usuarios = await db.query(
        'SELECT * FROM parte_usuarios pu left join usuarios u on pu.id_usuario=u.id WHERE id_parte = ?',
        [id]
    );

    const [adjuntos] = await db.query(
        `SELECT *
         FROM adjuntos
         WHERE id_tarea IN (
             SELECT id_tarea
             FROM tareas
             WHERE id_parte = ?
         )`,
        [id]
    );

    res.render('partes/detalle', {
        parte,
        tareas,
        usuarios,
        adjuntos
    });

});

router.get('/editar/:id', async (req, res) => {
    const { id } = req.params;

    const [parte] = await db.query(
        'SELECT * FROM partes WHERE id_parte = ?',
        [id]
    );
    console.log(parte);
    const usuarios = await db.query(
        'SELECT * FROM usuarios ORDER BY full_name'
    );
    console.log(usuarios);
    const usuariosParte = await db.query(`
        SELECT *
        FROM parte_usuarios pu left join usuarios u on pu.id_usuario=u.id 
        WHERE pu.id_parte = ?
    `, [id]);
    console.log(usuariosParte);
    let seleccionados;
    if (usuariosParte)
        seleccionados = usuariosParte.map(u => u.id_usuario);

    res.render('partes/editar', {
        parte,
        usuarios: usuarios.map(u => ({
            ...u,
            checked: seleccionados.includes(u.id)
        }))
    });
});

// Ruta para crear un nuevo parte (envío del formulario)
router.post('/editar/:id', funciones.isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { fecha, turno, observaciones, usuarios } = req.body;
    const [parte] = await db.query(
        'SELECT * FROM partes WHERE id_parte = ?',
        [id]
    );
    try {
        await db.query(
            `UPDATE partes
             SET fecha = ?, turno = ?, observaciones = ?
             WHERE id_parte = ?`,
            [fecha, turno, observaciones, id]
        );

        // Eliminar asignaciones anteriores
        await db.query(
            'DELETE FROM parte_usuarios WHERE id_parte = ?',
            [id]
        );

        // Insertar nuevas asignaciones
        for (const idUsuario of usuarios) {
            await db.query(
                `INSERT INTO parte_usuarios (id_parte, id_usuario)
                 VALUES (?, ?)`,
                [id, idUsuario]
            );
        }

        res.redirect('/partes/list');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al actualizar el parte');
    }
});

router.post('/:id/tareas/add', upload.single('adjunto'), async (req, res) => {

    const { id } = req.params;
    const { descripcion, hora_inicio, hora_fin } = req.body;

    const [parte] = await db.query(
        'SELECT * FROM partes WHERE id_parte = ?',
        [id]
    );

    // Obtener la fecha en horario local
    const fecha = parte.fecha;
    const fechaBase = [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, '0'),
        String(fecha.getDate()).padStart(2, '0')
    ].join('-');

    const fecha_inicio = hora_inicio
        ? `${fechaBase} ${hora_inicio}:00`
        : null;

    const fecha_fin = hora_fin
        ? `${fechaBase} ${hora_fin}:00`
        : null;

    const result = await db.query(
        `INSERT INTO tareas
            (id_parte, descripcion, fecha_inicio, fecha_fin)
            VALUES (?, ?, ?, ?)`,
        [id, descripcion, fecha_inicio, fecha_fin]
    );

    const id_tarea = result.insertId;

    if (req.file) {

        const mime = req.file.mimetype;
        const tipo = mime.startsWith('image/')
            ? 'foto'
            : 'documento';

        await db.query(
            `INSERT INTO adjuntos
                (
                    id_adjunto,
                    id_tarea,
                    tipo,
                    nombre,
                    ruta,
                    mime_type,
                    tamano
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                uuidv4(),
                id_tarea,
                tipo,
                req.file.originalname,
                req.file.path,
                mime,
                req.file.size
            ]
        );
    }

    res.redirect(`/partes/${id}`);
});

//GESTION LOGS
router.get("/logs", funciones.isAuthenticated, async (req, res) => {
    var logs = await db.query("select * from logs WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 100 DAY) ORDER BY fecha DESC");
    res.render("documentos/listadoLogs", { logs });
});

router.get("/logsAll", funciones.isAuthenticated, funciones.isAdmin, async (req, res) => {
    var logs = await db.query("select * from logs order by fecha desc");
    res.render("documentos/listadoLogs", { logs });
});

//MOSTRAR ERROR
router.get('/error', (req, res) => {
    res.render('estaticas/error');
});
router.get('/noperm', (req, res) => {
    res.render('estaticas/noPermission');
});

//MOSTRAR PRUEBA
router.get("/runSQLfile/:filename", funciones.isAdmin, (req, res) => {
    let filename = req.params.filename + ".sql";
    console.log("Ejecutando prueba");
    try {

        funciones.consultaPrueba(filename);
        req.flash("success", "Archivo " + filename + " ejecutada correctamente");
        res.redirect("/");
    }
    catch {
        req.flash("error", "Archivo " + filename + " no ejecutada correctamente");
        res.redirect("/");
    }
});
router.post("/pruebaPost", funciones.isAdmin, async (req, res) => {
    var password = req.masterPass;
    userpass = req.body.pass;
    //console.log("==>" + req.masterPass);
    const validPassword = await funciones.verifyPassword(userpass, password);
    if (validPassword) {
        funciones.consultaPrueba();
        req.flash("success", "Prueba ejecutada correctamente crack");
        res.redirect("/");
    } else {
        req.flash("warning", "Sucedió algun error!");
        res.redirect("/noperm");
    }

});

router.get('/errortest', (req, res) => {
    throw new Error('Error de prueba');
});

router.post('/cerrar/parte/:id_parte', async (req, res) => { //:email

    const { id_parte } = req.params;

    const [parte] = await db.query(
        'SELECT * FROM partes WHERE id_parte = ?',
        [id_parte]
    );
    const tareas = await db.query(
        'SELECT * FROM tareas WHERE id_parte = ? ORDER BY fecha_inicio asc',
        [id_parte]
    );

    const usuarios = await db.query(
        'SELECT * FROM parte_usuarios pu left join usuarios u on pu.id_usuario=u.id WHERE pu.id_parte = ?',
        [id_parte]
    );
    console.log("PU:", usuarios);
    const usuariosHtml = usuarios
        .map(u => `<li>${u.full_name || u.usuario}</li>`)
        .join('');

    const tareasHtml = tareas
        .map(t => `<tr> <td style="padding:8px;border:1px solid #ddd;"> ${t.descripcion} </td> <td style="padding:8px;border:1px solid #ddd;"> ${new Date(t.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} </td> <td style="padding:8px;border:1px solid #ddd;"> ${new Date(t.fecha_fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} </td> </tr>`)
        .join('');



    var transporter;
    if (config.EMAIL_AUTH_NEEDED == "true") {
        transporter = createTransport({
            //service: config.EMAIL_SERVICE,
            host: config.EMAIL_HOST,
            port: config.EMAIL_PORT,
            secure: config.EMAIL_SECURITY,
            auth: {
                user: config.EMAIL_ACCOUNT,
                pass: config.EMAIL_PASS,
            },
            secureConnection: false, // TLS requires secureConnection to be false
            attachments: [{
                filename: 'ccby.png',
                path: join(__dirname, '../public/img/ccby.png'),
                cid: 'ccby'
            }]

        });
    } else {
        let seguridad;
        if (config.EMAIL_PORT == 465)
            seguridad = true;
        else
            seguridad = false;
        console.log(`Intentando enviar email con la siguiente configuracion \n \t host: ${config.EMAIL_HOST} \n \t port:  ${config.EMAIL_PORT} \n \t secure:  ${config.EMAIL_SECURITY}`);
        transporter = createTransport({
            //service: config.EMAIL_SERVICE,
            host: config.EMAIL_HOST,
            port: config.EMAIL_PORT,
            secure: seguridad,
        });
    }

    transporter.verify(function (error, success) {
        if (error) {
            console.log(">", error);
        } else {
            console.log("Server is ready to take our messages");
        }
    });
    console.log("Destino:", config.EMAIL_RESPONSABLE)

    var mailOptions = {
        from: `"Gestor de Partes" <${config.EMAIL_ACCOUNT}>`,
        to: `${config.EMAIL_RESPONSABLE}`,
        subject: `Parte de trabajo #${parte.id_parte} cerrado`,
        replyTo: `${config.EMAIL_ACCOUNT}`,
        html: ` 
                    <div style="max-width:900px; margin:auto; background:white; border-radius:8px; overflow:hidden;">
                        <div style="background:#0d6efd; color:white; padding:20px;">
                            <h2 style="margin:0;">
                                Parte de trabajo #${parte.id_parte}
                            </h2>
                            <p style="margin:5px 0 0 0;">
                                Parte cerrado correctamente
                            </p>
                        </div>

                        <div style="padding:20px;">

                            <h3>Datos del parte</h3>

                            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd;"><strong>Fecha</strong></td>
                                    <td style="padding:8px; border:1px solid #ddd;">
                                        ${new Date(parte.fecha).toLocaleDateString('es-ES')}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd;"><strong>Turno</strong></td>
                                    <td style="padding:8px; border:1px solid #ddd;">
                                        ${parte.turno}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:8px; border:1px solid #ddd;"><strong>Observaciones</strong></td>
                                    <td style="padding:8px; border:1px solid #ddd;">
                                        ${parte.observaciones || '-'}
                                    </td>
                                </tr>
                            </table>

                            <h3>Trabajadores durante el turno</h3>

                            <ul>
                                ${usuariosHtml}
                            </ul>

                            <h3>Tareas realizadas</h3>

                            <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f0f0f0;">
                                        <th style="padding:10px;border:1px solid #ddd;">Descripción</th>
                                        <th style="padding:10px;border:1px solid #ddd;">Inicio</th>
                                        <th style="padding:10px;border:1px solid #ddd;">Fin</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    ${tareasHtml}
                                </tbody>
                            </table>

                        </div>

                        <div style="background:#f8f9fa; padding:15px; text-align:center; color:#666;">
                            Gestor de Partes · Correo generado automáticamente
                        </div>

                    </div>

                </body>
                </html>
                    `
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error("Error:");
            console.log(error);
            req.flash("error", "Error al enviar el eMail con parte:", `host: ${config.EMAIL_HOST} \n \t port:  ${config.EMAIL_PORT} \n \t secure:  ${config.EMAIL_SECURITY}`, error)
            res.redirect("/error");

        } else {
            console.log('Email sent: ' + info.response);
            req.flash("success", "Se ha enviado un parte.");
            res.redirect("/partes/list");
        }
    });
    console.log("email enviado");

});

export default router;