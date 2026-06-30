import express from 'express';
const router = express.Router();
import db from "../database.js"; //db hace referencia a la BBDD
import funciones from "../lib/funciones.js";

//MOSTRAR PAGINA INICIAL
router.get('/list', async (req, res) => {
    try {
        const tareas = await db.query(` 
                    SELECT
                t.*,
            JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', u.id,
                        'usuario', u.usuario,
                        'nombre', u.full_name
                    )
                ) AS usuarios
            FROM tareas t
            LEFT JOIN parte_usuarios pu
                ON pu.id_parte = t.id_parte
            LEFT JOIN usuarios u
                ON u.id = pu.id_usuario
            GROUP BY t.id_tarea;
        `);
        tareas.forEach(t => {
            t.usuarios = JSON.parse(t.usuarios);
            /*   console.log(t.fecha_inicio);
              console.log(t.fecha_inicio.toISOString());
               console.log(t.fecha_inicio.toString()); */
        });
        const empleados = await db.query(`
            SELECT DISTINCT
                u.id,
                u.full_name
            FROM usuarios u
            ORDER BY u.full_name
        `);
        //console.log(tareas);

        res.render('tareas/list', {
            tareas, empleados
        });

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});


router.post('/:id/delete', async (req, res) => {

    const { id } = req.params;

    const tarea = await db.query(
        'SELECT id_parte FROM tareas WHERE id_tarea = ?',
        [id]
    );

    await db.query(
        'DELETE FROM tareas WHERE id_tarea = ?',
        [id]
    );

    res.redirect(`/partes/${tarea[0].id_parte}`);
});

router.post('/:id/edit', async (req, res) => {
    const { id } = req.params;
    const { descripcion, hora_inicio, hora_fin } = req.body;
    try {

        const [tarea] = await db.query(
            'SELECT * FROM tareas WHERE id_tarea = ?',
            [id]
        );

        const [parte] = await db.query(
            'SELECT * FROM partes WHERE id_parte = ?',
            [tarea.id_parte]
        );
        const f = parte.fecha;

        const fecha = [
            f.getFullYear(),
            String(f.getMonth() + 1).padStart(2, '0'),
            String(f.getDate()).padStart(2, '0')
        ].join('-');
        const inicio = hora_inicio ? `${fecha} ${hora_inicio}:00` : null;
        const fin = hora_fin ? `${fecha} ${hora_fin}:00` : null;

        await db.query(
            `UPDATE tareas
             SET descripcion = ?,
                 fecha_inicio = ?,
                 fecha_fin = ?
             WHERE id_tarea = ?`,
            [descripcion, inicio, fin, id]
        );

        res.redirect(`/partes/${tarea.id_parte}`);

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});


export default router;