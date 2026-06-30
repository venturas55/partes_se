import multer, { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/tareas/');
    },
    filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

export default multer({ storage });