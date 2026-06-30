import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import db from "../database.js";
import funciones from "./funciones.js";

passport.use(
    "local.signin",
    new LocalStrategy(
        {
            //name del formulario
            usernameField: "usuario",
            passwordField: "password",
            passReqToCallback: true,
        },
        async (req, username, password, done) => {
            const rows = await db.query("SELECT * FROM usuarios WHERE usuario= ?", [username]);
           
            if (rows.length > 0) {
                const user = rows[0];
                const validPassword = await funciones.verifyPassword(password,user.contrasena);
                if (validPassword){
                    req.flash("success", "Bienvenido");
                    done(null, user);
                }
                else{
                    req.flash("warning", "Contraseña incorrecta");
                    done(null, false);

                }
            } else {
                req.flash("warning", "El usuario no existe");
                return done(null, false);
            }
        }
    )
);

passport.use(
    "local.signup",
    new LocalStrategy(
        {
            usernameField: "usuario",
            passwordField: "password",
            passReqToCallback: true,
        },
        async (req, username, password, done) => {


            //const { cuerpo } = req.body;
            const newUser = {
                usuario:    username,
                contrasena: password,
                email:      req.body.email,
                full_name:  req.body.fullname,
                privilegio: "",
            };
            newUser.contrasena = await funciones.encryptPass(password);
            const result = await db.query("INSERT INTO usuarios SET ?", [newUser]);
            newUser.id = result.insertId;
            return done(null, newUser); //Es el que se almacena en sesion
           }
    )
);

//comprobar esto
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const rows = await db.query("SELECT * FROM usuarios WHERE id= ?", [id]);
    done(null, rows[0]);
});
