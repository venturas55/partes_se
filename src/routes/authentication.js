import express from 'express';
const router = express.Router();
import { createTransport } from 'nodemailer';
import passport from 'passport';
import funciones from '../lib/funciones.js';
import db from "../database.js"; //db hace referencia a la BBDD
import { config } from '../config.js';
import { join } from 'path';
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

//GESTION SIGNIN registrarse C---
router.get('/signup', funciones.isNotAuthenticated, (req, res) => {
    res.render('auth/signup')
});
router.post('/signup', passport.authenticate('local.signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    //passReqToCallback: true,
    failureFlash: true
}));

//GESTION LOGIN login
router.get('/signin', funciones.isNotAuthenticated, (req, res) => {
    res.render('auth/signin');
});
router.post('/signin', (req, res, next) => {
    const p = passport.authenticate('local.signin', {
        successRedirect: '/profile',
        failureRedirect: '/signin',
        failureFlash: true
    })(req, res, next);
});

//GESTION logout
router.get('/logout', (req, res) => {
    //helpers.insertarLog(req.user.usuario, "LOGOUT usuario", req.user.id + " " + req.user.usuario);
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
})

//GESTION recuperacion contraseña
router.get('/profile/email/recordarpass/', async (req, res) => {
    res.render('auth/recoverypass');
});
router.post('/profile/email/recordarpass/', async (req, res) => { //:email

    var transporter;
    console.log("EMAIL_AUTH_NEEDED: " + config.EMAIL_AUTH_NEEDED);
    if (config.EMAIL_AUTH_NEEDED == "true") {
        console.log("IF con AUTH")
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
            /*    tls: {
                   rejectUnauthorized: false // (opcional) si es un servidor que usa TLS autofirmado
                         ciphers: 'SSLv3'
               } */
            //secureConnection: false, // TLS requires secureConnection to be false
        });
    }

    transporter.verify(function (error, success) {
        if (error) {
            console.log(">", error);
        } else {
            console.log("Server is ready to take our messages");
        }
    });

    const email = req.body.email;
    const usuario = req.body.usuario;
    var rows = await db.query("SELECT * FROM usuarios WHERE usuario = ? AND email= ?", [usuario, email]);
    if (rows.length > 0) {
        var user = rows[0];
        const user_id = user.id;
        var token = funciones.getCode();
        const hash = await funciones.encryptPass(token);
        //console.log(hash);
        var hasAnyToken = await db.query("SELECT * FROM tokens WHERE user_id=?", [user_id]);
        if (hasAnyToken.length > 0) {
            rows = await db.query("UPDATE tokens set hashedtoken=? , expires =NOW()+ interval 24 hour where user_id=?", [hash, user_id,]);
        } else {
            rows = await db.query("INSERT INTO tokens (user_id,hashedtoken, expires) VALUES (?,?, NOW()+ interval 24 hour)", [user_id, hash]);
        }
        //var exito = await helpers.sendRecoveryMail(email,token); NOFUNCIONA 
        //console.log(email + " " + token);
        var mailOptions = {
            from: `"WEBSAN Support" <${config.EMAIL_ACCOUNT}>`,
            to: email,
            subject: 'Restablecer contraseña BBDD SAN',
            replyTo: `${config.EMAIL_ACCOUNT}`,
            html: ` 
                    <!DOCTYPE html>
                    <html lang="es">
                        <head>
                        <meta charset="UTF-8">
                        <title>Restablecer Contraseña</title>
                        </head>
                        <body style="background-color: #f8f9fa; padding: 20px; font-family: Arial, sans-serif; color: #212529;">
                            <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); padding: 30px;">
                                <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h2 style="margin: 0; font-size: 24px;">Restablece tu contraseña ${user.usuario}</h2>
                                </td>
                                </tr>
                                <tr>
                                <td style="padding-bottom: 20px; font-size: 16px; line-height: 1.5;">
                                    Hola, hemos recibido una solicitud para restablecer tu contraseña. Si tú no realizaste esta solicitud, puedes ignorar este correo.
                                </td>
                                </tr>
                                <tr>
                                <td style="padding-bottom: 30px; font-size: 16px; line-height: 1.5;">
                                    Para cambiar tu contraseña, haz clic en el siguiente botón:
                                </td>
                                </tr>
                                <tr>
                                <td align="center" style="padding-bottom: 30px;">
                                    <a href="http://${req.headers.host}/profile/email/verifypass/${user_id}/${token}" 
                                    style="background-color: #0d6efd; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px; display: inline-block;">
                                    Restablecer contraseña
                                    </a>
                                </td>

                                </tr>
                                <tr>
                                <td style="font-size: 14px; color: #6c757d;">
                                    Este enlace es válido por 24 horas. Si tienes problemas, copia y pega esta URL en tu navegador:
                                    <br><br>
                                    <a href="http://${req.headers.host}/profile/email/verifypass/${user_id}/${token}" style="color: #0d6efd; word-break: break-all;">
                                    http://${req.headers.host}/profile/email/verifypass/${user_id}/${token}
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td style="padding-bottom: 20px; font-size: 16px; line-height: 1.5;">
                                Recuerda que tu usuario es ${user.usuario} 
                                </td>
                                </tr>
                                <tr>
                                <td style="padding-top: 30px; font-size: 12px; color: #adb5bd; text-align: center;">
                                <span>Autoridad Portuaria de Valencia 2025</span>
                                    <a rel="license" target="_blank" href="http://creativecommons.org/licenses/by/4.0/">
                                        <img alt="Creative Commons License" src="cid:ccby"/>
                                    </a><span >Autor: </span> <a target="_blank" style="text-decoration:none;" href="https://guardiandelfaro.es">Adrian de Haro </a>
                                    <span style="display: inline-block;transform: rotate(180deg);"> &copy; </span>
                                    <span> bajo licencia</span> <a rel="license" target="_blank" style="text-decoration:none;" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons.</a>
                                </td>
                                </tr>
                            </table>
                        </body>
                    </html>
                    `
            //TODO: LA URL DEL SERVIDOR DESPLEGADO
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.error("Error:");
                console.log(error);
                req.flash("error", "Error al enviar el eMail para restablecer contraseña:", `host: ${config.EMAIL_HOST} \n \t port:  ${config.EMAIL_PORT} \n \t secure:  ${config.EMAIL_SECURITY}`, error)
                res.redirect("/error");

            } else {
                console.log('Email sent: ' + info.response);
                req.flash("success", "Se ha enviado un token a la dirección de correo asociada para restablecer contraseña.");
                res.redirect("/");
            }
        });
        console.log("email enviado");

    } else {
        req.flash("error", "El usuario y/o el correo no corresponden con ningún usuario.")
        res.redirect("/error");
    }



});
router.get('/profile/email/verifypass/:user_id/:code', async (req, res) => {
    const { user_id, code } = req.params;
    await db.query("DELETE FROM tokens WHERE expires < NOW()");
    var [token] = await db.query("SELECT * FROM tokens WHERE user_id=? ", [user_id]);
    console.log(token);
    //  localhost:5001/profile/email/verifypass/1/1ZEFGJ      hashedtoken
    //console.log(code + " == " + token.hashedtoken);
    if (token) {

        const validToken = await funciones.verifyPassword(code, token.hashedtoken)
        console.log(validToken);
        if (validToken) {
            req.flash("success", "Token proporcionado correcto");
            res.redirect("/profile/recoverysetpass/" + user_id);
        }
        else {
            req.flash("error", "Token proporcionado incorrecto");
            res.redirect("/error");
        }
    } else {
        req.flash("error", "Token proporcionado expirado"); //TODO: NO REDIRECIONA
        res.redirect("/error");
    }
});
router.get('/profile/recoverysetpass/:id', async (req, res) => {
    const { id } = req.params;
    res.render("auth/recoverysetnewpass", { id });
});
router.post('/profile/recoverysetpass', async (req, res) => {
    const { password, id } = req.body;
    //console.log(password + " "+ id);
    var encryptedPass = await funciones.encryptPass(password);
    const result = await db.query("UPDATE usuarios set contrasena=? where id=?", [encryptedPass, id]);
    req.flash("success", "Contraseña actualizada correctamente");
    res.redirect("/");
});

export default router;
