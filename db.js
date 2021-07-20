const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const SECRET_KEY = process.env.JWT;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

User.byToken = async (token) => {
  try {
    const data = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(data.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const validUser = await bcrypt.compare(password, user.password);
  if (validUser) {
    const token = jwt.sign({ userId: user.id }, SECRET_KEY);
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const hashPassword = async (plainPassword) => {
  const SALT_COUNT = 5;
  const hashedPw = await bcrypt.hash(plainPassword, SALT_COUNT);
  return hashedPw;
};

User.beforeCreate(async (user) => {
  user.password = await hashPassword(user.password);
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};