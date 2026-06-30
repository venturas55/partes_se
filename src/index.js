import express, { urlencoded, json } from "express";
import morgan from "morgan";
import { engine } from "express-handlebars"; //Para usar plantillas
import handlebars from "./lib/handlebars.js"; //Para usar funciones en las plantillas
import flash from "connect-flash"; //Para mostar mensajes
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
const MySQLStore = MySQLStoreFactory(session);
import { config } from "./config.js";
import passport from "passport";
import cors from "cors";
import "./lib/passport.js"; //para que se entere de la autentificacion que se ha creado
import * as path from "path";
import * as url from "url";
import logger from "./lib/logger.js"
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

//Inicializacion
const app = express();
app.set("trust proxy", true); 

//Configuracion
app.set("port", config.PORT);
app.set("views", path.join(__dirname, "views"));
app.engine(
  ".hbs",
  engine({
    //con esto se configura el app.engine
    defaultLayout: "main",
    layoutDir: path.join(app.get("views"), "layouts"),
    partialsDir: path.join(app.get("views"), "partials"),
    extname: ".hbs",
    helpers: handlebars, //no hay nada aun
  })
);
app.set("view engine", ".hbs"); //Para utilizar el app.engine
//Middleware
app.use(cors());
app.use(
  session({
    secret: "mysesion",
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(config.database),
  })
);
app.use(flash()); // Para poder usar el middleware de enviar mensajes popups
app.use(morgan("dev")); //Para que muestre mensajes relacionados con el desarrollo por consola
app.use(urlencoded({ extended: false })); //aceptar los datos desde los formularios sin aceptar imagenes ni nada raro
app.use(json()); //Para enviar y recibir jsons.
app.use(passport.initialize()); //iniciar passport
app.use(passport.session()); //para que sepa donde guardar y como manejar los datos

//Variables globales (que podrán ser usadas en cualquier vista)
app.use((req, res, next) => {
  app.locals.signupMessage = req.flash("signupMessage");
  app.locals.success = req.flash("success");
  app.locals.warning = req.flash("warning");
  app.locals.error = req.flash("error");
  app.locals.message = req.flash("message");
  app.locals.user = req.user;
  //app.locals.direccion = req.headers.host;
  //req.secure?app.locals.cabecera="https://": app.locals.cabecera="http://";
  //app.locals.cabecera2 = req.protocol + "://";
  //app.locals.puerto = app.get("port");
  next();
});

//Rutas
import rutas from "./routes/index.js";
import partes from "./routes/partes.js";
import tareas from "./routes/tareas.js";
import authentication from "./routes/authentication.js";
import documentos from "./routes/documentos.js";
import profile from "./routes/profile.js";
import tickets from "./routes/tickets.js";
import preventivos from "./routes/preventivos.js";
app.use(rutas); // Esta busca automáticamente index.js en la carpeta routes
app.use("/partes", partes);
app.use("/tareas", tareas);
app.use(authentication); // Si el archivo tiene exportación por defecto
app.use(documentos);
app.use(profile);
app.use("/tickets", tickets);
app.use("/mantenimientopreventivo", preventivos);

//Public
//Bootstrap
app.use('/uploads', express.static('uploads'));
app.use((express.static(path.join(__dirname,"public"))));
app.use("/css", express.static(path.join(__dirname, "../node_modules/bootstrap/dist/css")));
app.use('/js', express.static(path.join(__dirname, '../node_modules/@popperjs/core/dist/umd')))
app.use('/js', express.static(path.join(__dirname, '../node_modules/jquery/dist')))
app.use("/js", express.static(path.join(__dirname, "../node_modules/bootstrap/dist/js")));
app.use("/fonts", express.static(path.join(__dirname, "../node_modules/font-awesome/fonts")));
app.use("/css", express.static(path.join(__dirname, "../node_modules/font-awesome/css")));

//Leaflet
app.use("/leaflet", express.static(path.join(__dirname, "../node_modules", "leaflet", "dist")));



//Arrancar servidor
app.listen(app.get("port"), () => {
  console.log("Running on http://localhost:" + app.get("port"));
});

