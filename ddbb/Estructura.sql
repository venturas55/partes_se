
SET NAMES utf8;
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `partes`;
CREATE TABLE partes (
    id_parte INT UNSIGNED AUTO_INCREMENT,
    fecha DATE NOT NULL DEFAULT (CURRENT_DATE),
    turno ENUM('m','t','n') NOT NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id_parte)
);

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int unsigned AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL,
  `num_empleado` varchar(4) NOT NULL,
  `contrasena` varchar(250) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `privilegio` varchar(20) DEFAULT NULL,
  `pictureURL` varchar(100) CHARACTER SET utf16 COLLATE utf16_spanish2_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
);

CREATE TABLE parte_usuarios (
    id_parte INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,

    PRIMARY KEY(id_parte,id_usuario),

    FOREIGN KEY(id_parte)
        REFERENCES partes(id_parte)
        ON DELETE CASCADE,

    FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id)
        ON DELETE CASCADE
);

DROP TABLE IF EXISTS `tareas`;
CREATE TABLE tareas (
    id_tarea INT UNSIGNED AUTO_INCREMENT,
    id_parte INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    id_usuario_creador INT UNSIGNED NULL,
    titulo VARCHAR(200),
    descripcion TEXT NOT NULL,
    estado ENUM(
        'pendiente',
        'en_progreso',
        'finalizada'
    ) DEFAULT 'finalizada',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY(id_tarea),

    FOREIGN KEY(id_parte)
        REFERENCES partes(id_parte)
        ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_creador)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

CREATE TABLE adjuntos (
    id_adjunto CHAR(36) PRIMARY KEY,
    id_tarea INT UNSIGNED NOT NULL,
    tipo ENUM('foto','documento') NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion VARCHAR(250),
    ruta VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100),
    tamano BIGINT UNSIGNED,
    sha256 CHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_tarea(id_tarea),
    FOREIGN KEY(id_tarea)
        REFERENCES tareas(id_tarea)
        ON DELETE CASCADE
);

DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
  `fecha` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `usuario` varchar(50) NOT NULL,
  `accion` varchar(100) DEFAULT NULL,
  `observacion` varchar(250) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='tabla de logs';




DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `ticket_id` int unsigned AUTO_INCREMENT,
  `elemento` varchar(10) NOT NULL,
  `created_by_id` int unsigned NOT NULL,
  `assigned_to_id` int unsigned DEFAULT NULL,
  `resolved_by_id` int unsigned DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `solved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`ticket_id`),
  KEY `created_by_id` (`created_by_id`),
  KEY `assigned_to_id` (`assigned_to_id`),
  KEY `resolved_by_id` (`resolved_by_id`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`created_by_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`assigned_to_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`resolved_by_id`) REFERENCES `usuarios` (`id`)
) ;


DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `user_id` int(11) NOT NULL,
  `hashedtoken` varchar(200) NOT NULL,
  `expires` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`hashedtoken`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='tabla de tokens';

