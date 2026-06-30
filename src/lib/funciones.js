import bcryptjs from 'bcryptjs';
import { join } from 'path';
import fse from 'fs-extra';
import { promises as fs } from "fs";
import db from "../database.js";
import mysqldump from 'mysqldump';
import { stringify } from 'querystring';
import { createInterface } from 'readline';
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const funciones = {};

funciones.getFotosOrdenadas = async (nif) => {
    const directorio = join(__dirname, "../public/img/imagenes", nif);

    try {
        const files = await fs.readdir(directorio);

        const archivosConFechas = await Promise.all(
            files.map(async (file) => {
                const rutaCompleta = join(directorio, file);
                const stats = await fs.stat(rutaCompleta);
                return {
                    file,
                    time: stats.mtime,
                };
            })
        );

        archivosConFechas.sort((a, b) => b.time - a.time);
        return archivosConFechas.map(f => f.file);

    } catch (err) {
        //if (err.code === "ENOENT") return [];
        console.error("Error al leer imágenes:", err);
        return [];
    }
};

funciones.listadoCarpetas = async () => {
    const source = join(__dirname, "../public/img/imagenes");

    try {
        return await fs.readdir(source);
    } catch (err) {
        //if (err.code === "ENOENT") return [];
        console.error("Error al leer carpetas:", err);
        return [];
    }
};

funciones.listadoBackups = async () => {
    const directorio = join(__dirname, "../public/dumpSQL");
    try {
        const files = await fs.readdir(directorio);
        const documentos = await Promise.all(
            files.map(async (file) => {
                const stats = await fs.stat(join(directorio, file));
                return {
                    name: file,
                    created_at: stats.birthtime
                };
            })
        );
        return documentos.sort((a, b) => b.created_at - a.created_at);
    } catch (err) {
        if (err.code === "ENOENT") return [];
        throw err;
    }
};

funciones.listadoBackupsFotos = async () => {
    const directorio = join(__dirname, "../public/dumpFOTOS");
    try {
        const files = await fs.readdir(directorio);
        const backups = await Promise.all(
            files.map(async (file) => {
                const stats = await fs.stat(join(directorio, file));

                return {
                    name: file,
                    size: (stats.size / (1024 * 1024)).toFixed(2),
                    created_at: stats.birthtime,
                };
            })
        );
        return backups.sort((a, b) => b.created_at - a.created_at);
    } catch (err) {
        if (err.code === "ENOENT") return [];
        throw err;
    }
};

funciones.encryptPass = async (password) => {
    const sal = await bcryptjs.genSalt(10);
    password = await bcryptjs.hash(password, sal);
    return password;
};

funciones.verifyPassword = async (password, hashedPassword) => {
    try {
        return await bcryptjs.compare(password, hashedPassword);
    } catch (e) {
        console.log(e);
    }
}

funciones.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/signin');
}

funciones.isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/profile');
}

funciones.hasSanPrivileges = (req, res, next) => {
    if (req.user.privilegio == "san" || req.user.privilegio == "admin") {
        return next();
    }
    return res.redirect('/noperm');
}

funciones.hasNotSanPrivileges = (req, res, next) => {
    if (req.user.privilegio != "san" && req.user.privilegio != "admin") {
        return next();
    }
    return res.redirect('/noperm');
}

funciones.isAdmin = (req, res, next) => {
    if (req.user.privilegio == "admin") {
        return next();
    }
    return res.redirect('/noperm');
}

funciones.isNotAdmin = (req, res, next) => {
    if (!req.user.privilegio == "admin") {
        return next();
    }
    return res.redirect('/noperm');
}

funciones.insertarLog = async (usuario, accion, observacion) => {
    const log = {
        usuario,
        accion,
        observacion
    }
    try {
        console.log("Insertando log: " + stringify(log));
        const a = await db.query("insert into logs SET ?", [log]);
        return a;
    } catch (err) {
        console.log(err);
        return "error";
    }

}

funciones.dumpearSQL = async (operacion) => {
    try {
        // dump the result straight to a file
        console.log("===============================");
        console.log(db.config.connectionConfig);
        var tables = [];
        switch (operacion) {
            case 'balizamiento':
                tables.push("balizamiento", "localizacion", "lampara", "fondeos");
                break;
            case 'mantenimiento':
                tables.push("mantenimiento", "observaciones");
                break;
            case 'completo':
                tables.push("balizamiento", "localizacion", "lampara", "fondeos", "mantenimiento", "observaciones", "tickets", "inventario", "logs", "usuarios", "preventivos");
                break;
            default:
                console.warn("Operación no reconocida:", operacion);
                return;
        }
        const dir = './src/public/dumpSQL';
        await fse.ensureDir(dir); // crea la carpeta si no existe
        const filePath = `${dir}/dumpSAN-${operacion}-${Date.now()}.sql`;
        mysqldump({
            connection: {
                host: db.config.connectionConfig.host,
                user: db.config.connectionConfig.user,
                password: db.config.connectionConfig.password,
                database: db.config.connectionConfig.database,
            },
            dumpToFile: filePath,
            dump: {
                tables,
            }
        });
        console.log("Dump SQL generado correctamente en:", filePath);
    } catch (error) {
        console.error("Error al generar el dump SQL:", error);
    }

}

funciones.runSQLrecovery = (file) => {
    let ruta = join(__dirname, '..', 'public', 'dumpSQL', file);

    var rl = createInterface({
        input: fse.createReadStream(ruta),
        terminal: false
    });
    let total = "";
    rl.on('line', function (chunk) {

        //Para evitar ejecucion de comentarios en la query
        if (chunk.toString('ascii').charAt(0) != '/')
            total += chunk.toString('ascii');


        if (chunk.toString('ascii').charAt(chunk.length - 1) == ';') {
            db.query(total, function (err, sets, fields) { if (err) console.log(err); });
            total = "";
        }
    });
    rl.on('close', function () {
        console.log("finished");
    });
}

funciones.getCode = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; //abcdefghijklmnopqrstuvwxyz
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 6) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

funciones.sendRecoveryMail = async (email, token) => (req, res) => {
}

funciones.consultaPrueba = async (filename) => {
    let ruta = join(__dirname, '..', '..', 'database', filename);

    var rl = createInterface({
        input: fse.createReadStream(ruta),
        terminal: false
    });
    rl.on('line', function (chunk) {
        db.query(chunk.toString('ascii'), function (err, sets, fields) {
            if (err) console.log(err);
        });
    });
    rl.on('close', function () {
        console.log("finished");
    });

}

export default funciones;