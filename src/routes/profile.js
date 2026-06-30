import express from 'express';
const router = express.Router();
import { resolve } from 'path';
import db from "../database.js"; //db hace referencia a la BBDD
import fse from 'fs-extra';
import fs from 'fs';
import funciones from "../lib/funciones.js";

//MOSTRAR PERFIL  -RUD  
router.get('/profile', async (req, res) => {
    //console.log(req.user.id);
    let tickets=null
    tickets = await db.query('select * from tickets where assigned_to_id=? and solved_at is null', [req.user.id]);
    //console.log(tickets);
    res.render('auth/profile', { tickets });
});
router.get('/profile/edit', (req, res) => {
    let permisos = { 'tecnicosan': false, 'admin': false };
    if (req.user.privilegio == 'admin')
        permisos = { 'esTecnico': false, 'esAdmin': true };
    if (req.user.privilegio == 'san')
        permisos = { 'esTecnico': true, 'esAdmin': false };
    //console.log(permisos);
    res.render('auth/profileEdit', { permisos });
});
router.post('/profile/edit', funciones.isAuthenticated, async (req, res) => {
    const rows = await db.query("SELECT * FROM usuarios WHERE id= ?", [req.body.id]);
    var user = rows[0];


    user.usuario = req.body.usuario;
    user.email = req.body.email;
    user.full_name = req.body.full_name;
    user.default_localizacion = req.body.default_localizacion;
    user.prefmap = req.body.prefmap;
    //user.contrasena = await funciones.encryptPass(req.body.newcontrasena);
    //console.log("guardando en la BBDD");
    //console.log(user);
    const result = await db.query("UPDATE usuarios SET ? where id= ?", [user, req.body.id]);
    req.flash("success", "Usuario editado correctamente.");
    res.redirect('/profile');
    /* } else {
        req.flash("warning", "No has puesto la contraseña actual correctamente!");
        res.redirect('/noperm');
    } */
});
router.get("/profile/delete/:id", funciones.isAuthenticated, async (req, res) => {
    console.log(req.params);
    const { id } = req.params;
    if (req.user.id == id) {
        const user = await db.query("SELECT * FROM usuarios where id=?", id);
        //borramos foto
        const filePath = resolve('src/public/img/profiles/' + user.pictureURL);
        fs.access(filePath, fs.constants.F_OK, async (err) => {
            if (err) {
                console.log("No tiene foto de perfil");
            } else {
                console.log('File exists. Deleting now ...');
                await fse.unlink(filePath);
            }
        });
        //hacemos logout
        req.logout(async function (err) {
            if (err) {
                return next(err);
            }
            await db.query("DELETE FROM sessions ");
            await db.query("DELETE FROM usuarios WHERE id=?", [id]);
        });
        req.flash("success", "Usuario borrado correctamente");
        res.redirect('/');
    } else {
        req.flash("warning", "Error al intentar la operación");
        res.redirect('/profile');
    }
});
router.post('/doAdmin', funciones.isAuthenticated, async (req, res) => {
    const { pass, privilegio } = req.body;
    console.log(pass + " / " + db.config.connectionConfig.masterpass);
    console.log(req.user);
    const validPassword = await funciones.verifyPassword(pass, db.config.connectionConfig.masterpass);

    if (validPassword) {
        req.user.privilegio = privilegio;
        console.log("guardando en la BBDD");
        const result = await db.query("UPDATE usuarios SET ? where id= ?", [req.user, req.user.id]);
        req.flash("success", "Permisos de usuario actualizados correctamente");
        funciones.insertarLog(req.user.usuario, "UPDATE usuarios", "Se le añade permisos de admin");
        res.redirect('/profile');
    } else {
        res.redirect('/noperm');
    }
});
router.get('/profile/changepass', async (req, res) => {
    const { id } = req.params;
    res.render("auth/changepass", { id });
});
router.post('/profile/changepass', async (req, res) => {

    const { newcontrasena, newcontrasena2, oldcontrasena, id } = req.body;
    //console.log(password + " "+ id);
    const rows = await db.query("SELECT * FROM usuarios WHERE id= ?", [req.body.id]);
    var user = rows[0];
    console.log(oldcontrasena + " / " + user.contrasena);
    const validPassword = await funciones.verifyPassword(oldcontrasena, user.contrasena);
    if (validPassword) {
        if (newcontrasena === newcontrasena2) {
            var encryptedPass = await funciones.encryptPass(newcontrasena);
            console.log("guardando en la BBDD");
            console.log(newcontrasena + " " + encryptedPass);
            await db.query("UPDATE usuarios set contrasena=? where id=?", [encryptedPass, id]);
            req.flash("success", "Contraseña actualizada correctamente");
            res.redirect("/profile/edit");
        } else {
            req.flash("warning", "Las contraseñas no coinciden");
            res.redirect("/profile/edit");
        }

    } else {
        req.flash("warning", "No has puesto la contraseña actual correctamente!");
        res.redirect('/noperm');
    }
});

export default router;