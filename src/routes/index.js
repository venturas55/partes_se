import express from 'express';
const router = express.Router();
import db from "../database.js"; //db hace referencia a la BBDD
import funciones from "../lib/funciones.js";

//MOSTRAR PAGINA INICIAL
router.get('/', async (req, res) => {
    var partes = await db.query("select * from partes ORDER BY fecha DESC");
    res.render('partes/list', { partes, });
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


export default router;