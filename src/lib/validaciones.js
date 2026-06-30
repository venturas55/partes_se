import z from 'zod';
const ISO_DATETIME_REGEX = /\d{4}-[01]\d-[0-3]\d/;

const passmatchSchema = z.object({
    //fecha_hora: z.string().regex(ISO_DATETIME_REGEX, 'date must be a valid ISO date'),
    password: z.string(),
    confirmPassword: z.string(),

}).refine(
    (values) => {
        return values.password === values.confirmPassword;
    },
    {
        message: "Passwords must match!",
        path: ["confirmPassword"],
    }
);

export function validatePassMatch(object) {
    return passmatchSchema.safeParse(object);
}

export function validatePartialPassMatch(object) {
    return passmatchSchema.partial().safeParse(object);
}

/* ============MIDDLEWARES=========== */

export const imageSizeLimitErrorHandler = (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    req.flash("error", "Tamaño demasiado grande. Límite de 5MB.");
    return res.redirect("back"); // Redirige a la misma página
  }
  next(err); // Pasa el error a otro middleware si no es de tamaño
};

export const zipSizeLimitErrorHandler = (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    req.flash("error", "Tamaño demasiado grande. Límite de 200MB.");
    return res.redirect("back"); // Redirige a la misma página
  }
  next(err); // Pasa el error a otro middleware si no es de tamaño
};

export const pdfSizeLimitErrorHandler = (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    req.flash("error", "Tamaño demasiado grande. Límite de 15MB.");
    return res.redirect("back"); // Redirige a la misma página
  }
  next(err); // Pasa el error a otro middleware si no es de tamaño
};