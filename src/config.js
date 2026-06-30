import 'dotenv/config'

const {
  PORT = 4000,
  DB_HOST = "localhost",
  DB_USER = "usuario",
  DB_PASS = "contrasena",
  DB_NAME = "dbname",
  DB_PORT = 3306,
  EMAIL_SERVICE="ovh",
  EMAIL_HOST="smtp.mail.ovh.net",
  EMAIL_PORT="465",
  EMAIL_SECURITY="TRUE",
  EMAIL_ACCOUNT = "email@adress.es",
  EMAIL_PASS = "your pass",
  EMAIL_RESPONSABLE= "rESPONABLEEMAIL",
  NODE_DOCKER_PORT = 5002,
  MYSQL_LOCAL_PORT = 3307,
  MYSQL_DOCKER_PORT = 3306,
  EMAIL_AUTH_NEEDED ="true",
} = process.env;

const database = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
};


export const config = {
  database,
  PORT,
  DB_HOST,
  DB_USER,
  DB_PASS,
  DB_NAME,
  DB_PORT,
  EMAIL_SERVICE,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURITY,
  EMAIL_ACCOUNT,
  EMAIL_AUTH_NEEDED,
  EMAIL_PASS,
  EMAIL_RESPONSABLE
  };